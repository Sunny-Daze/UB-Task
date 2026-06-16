import { CouponDiscountType, CouponStatus } from '../../constants/index.js';
import { withTransaction } from '../../db/transaction.js';
import { httpError } from '../../shared/httpError.js';
import { roundTo } from '../../shared/math.js';
import { issueCouponsForUserAfterOrder } from '../coupons/coupons.service.js';
import { findOrdersForUser } from './orders.repository.js';
import type {
  IssuedCouponSummary,
  OrderItem,
  OrderSummary,
  OrderView,
  PlaceOrderResult,
} from './orders.types.js';
import type { PlaceOrderInput } from './orders.validation.js';

interface AppliedCoupon {
  id: string;
  code: string;
  discount_amount: number;
}

export const placeOrder = async (
  userId: string,
  input: PlaceOrderInput
): Promise<PlaceOrderResult> => {
  const { order, newOrderCount } = await withTransaction(async (client) => {
    // lock the user's active cart
    const cartRes = await client.query(
      `SELECT id FROM carts
       WHERE user_id = $1 AND status = 'active'
       FOR UPDATE`,
      [userId]
    );
    if (cartRes.rowCount === 0) {
      throw httpError(400, 'No active cart');
    }

    const cartId = cartRes.rows[0].id as string;

    // lock the products quantity
    const itemsRes = await client.query(
      `SELECT
         ci.product_id, ci.quantity,
         p.name, p.price::float AS price, p.stock_quantity
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.cart_id = $1
       FOR UPDATE OF p`,
      [cartId]
    );
    if (itemsRes.rowCount === 0) {
      throw httpError(400, 'Cart is empty');
    }

    const items = itemsRes.rows as Array<{
      product_id: string;
      quantity: number;
      name: string;
      price: number;
      stock_quantity: number;
    }>;

    for (const item of items) {
      if (item.quantity > item.stock_quantity) {
        throw httpError(409, `Low stock for ${item.name}`);
      }
    }

    const subtotal = roundTo(
      items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      2
    );

    let applied: AppliedCoupon | null = null;
    let total = subtotal;

    if (input.coupon_code) {
      const couponRes = await client.query(
        `SELECT
           c.id, c.code, c.status, c.expires_at, c.assigned_user_id,
           cc.discount_type,
           cc.discount_value::float AS discount_value,
           cc.max_discount_amount::float AS max_discount_amount,
           cc.min_order_amount::float AS min_order_amount
         FROM coupons c
         JOIN coupon_configurations cc ON cc.id = c.coupon_configuration_id
         WHERE c.code = $1
         FOR UPDATE OF c`,
        [input.coupon_code]
      );
      if (couponRes.rowCount === 0) throw httpError(400, 'Coupon not found');
      const coupon = couponRes.rows[0];

      if (coupon.assigned_user_id && coupon.assigned_user_id !== userId) {
        throw httpError(400, 'Coupon not assigned to user');
      }
      if (coupon.status !== CouponStatus.ACTIVE) {
        throw httpError(400, `Coupon is ${coupon.status}`);
      }
      if (new Date(coupon.expires_at).getTime() < Date.now()) {
        throw httpError(400, 'Coupon has expired');
      }
      if (coupon.min_order_amount !== null && subtotal < coupon.min_order_amount) {
        throw httpError(400, `Order subtotal below coupon minimum of ${coupon.min_order_amount}`);
      }

      let discount: number;
      if (coupon.discount_type === CouponDiscountType.FLAT) {
        discount = Math.min(coupon.discount_value, subtotal);
      } else {
        discount = subtotal * (coupon.discount_value / 100);
        if (coupon.max_discount_amount !== null) {
          discount = Math.min(discount, coupon.max_discount_amount);
        }
      }
      discount = roundTo(discount, 2);
      total = roundTo(subtotal - discount, 2);
      applied = { id: coupon.id, code: coupon.code, discount_amount: discount };
    }

    // insert order
    const orderRes = await client.query(
      `INSERT INTO orders (user_id, cart_id, subtotal, total, status)
       VALUES ($1, $2, $3, $4, 'confirmed')
       RETURNING id, user_id, status, created_at`,
      [userId, cartId, subtotal, total]
    );
    const orderRow = orderRes.rows[0];

    // insert order items
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderRow.id, item.product_id, item.name, item.price, item.quantity]
      );
    }

    // reduce stock quantity
    for (const item of items) {
      await client.query(
        `UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = current_timestamp
         WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }

    // update used coupon
    if (applied) {
      await client.query(
        `INSERT INTO coupon_usage
           (coupon_id, user_id, order_id, original_amount, discount_amount, final_amount)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [applied.id, userId, orderRow.id, subtotal, applied.discount_amount, total]
      );
      await client.query(`UPDATE coupons SET status = 'used' WHERE id = $1`, [applied.id]);
    }

    // change cart status
    await client.query(
      `UPDATE carts SET status = 'checked_out', updated_at = current_timestamp WHERE id = $1`,
      [cartId]
    );

    // update users successfull order count
    const userRes = await client.query(
      `UPDATE users SET successful_order_count = successful_order_count + 1
       WHERE id = $1
       RETURNING successful_order_count`,
      [userId]
    );
    const newOrderCount = userRes.rows[0].successful_order_count as number;

    const orderItems: OrderItem[] = items.map((i) => ({
      product_id: i.product_id,
      product_name: i.name,
      unit_price: i.price,
      quantity: i.quantity,
      image_uri: null,
      line_total: roundTo(i.price * i.quantity, 2),
    }));

    const order: OrderView = {
      id: orderRow.id,
      user_id: orderRow.user_id,
      subtotal,
      total,
      status: orderRow.status,
      items: orderItems,
      applied_coupon: applied
        ? {
            coupon_id: applied.id,
            code: applied.code,
            discount_amount: applied.discount_amount,
          }
        : null,
      created_at: orderRow.created_at,
    };

    return { order, newOrderCount };
  });

  let issued_coupons: IssuedCouponSummary[] = [];
  try {
    const newCoupons = await issueCouponsForUserAfterOrder(userId, newOrderCount);
    issued_coupons = newCoupons.map((c) => ({
      id: c.id,
      code: c.code,
      expires_at: c.expires_at,
      configuration_name: '',
    }));
  } catch (err) {
    console.error('Coupon creation failed in placeOrder:', { userId, orderId: order.id, err });
  }

  return { order, issued_coupons };
};

export const listMyOrders = async (userId: string): Promise<OrderSummary[]> => {
  return findOrdersForUser(userId);
};
