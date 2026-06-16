import db from '../../db/postgres.db.js';
import { httpError } from '../../shared/httpError.js';
import { roundTo } from '../../shared/math.js';
import { findCouponByCodeForUser } from '../coupons/coupons.repository.js';
import * as couponsService from '../coupons/coupons.service.js';
import {
  createActiveCart,
  deleteAllCartItems,
  deleteCartItem,
  findActiveCart,
  findCartItem,
  findCartItemsDetailed,
  updateCartItemQuantity,
  upsertCartItem,
} from './cart.repository.js';
import type { AppliedCouponView, Cart, CartView } from './cart.types.js';
import type { AddItemInput, UpdateItemInput } from './cart.validation.js';

const getOrCreateActiveCart = async (userId: string): Promise<Cart> => {
  const existing = await findActiveCart(userId);
  if (existing) return existing;

  return createActiveCart(userId);
};

const fetchProductStock = async (productId: string): Promise<number | null> => {
  const { rows } = await db.query(`SELECT stock_quantity FROM products WHERE id = $1`, [productId]);

  return rows[0]?.stock_quantity ?? null;
};

const evaluateCouponCode = async (
  userId: string,
  code: string,
  subtotal: number
): Promise<AppliedCouponView | null> => {
  const couponRow = await findCouponByCodeForUser(code, userId);
  const name = couponRow?.config.name ?? '';

  const result = await couponsService.validateCoupon(userId, code, subtotal);

  if (result.valid) {
    return {
      code,
      coupon_id: result.coupon_id,
      name,
      valid: true,
      discount_amount: result.discount.discount_amount,
      final_amount: result.discount.final_amount,
    };
  }

  return {
    code,
    coupon_id: couponRow?.id ?? '',
    name,
    valid: false,
    reason: result.reason,
    discount_amount: 0,
    final_amount: roundTo(subtotal, 2),
  };
};

const buildCartView = async (
  cart: Cart | null,
  userId: string,
  code?: string
): Promise<CartView> => {
  if (!cart) {
    return {
      id: null,
      status: null,
      items: [],
      subtotal: 0,
      item_count: 0,
      applied_coupon: null,
      final_amount: 0,
    };
  }

  const items = await findCartItemsDetailed(cart.id);
  const subtotal = roundTo(
    items.reduce((sum, i) => sum + i.line_total, 0),
    2
  );
  const item_count = items.reduce((sum, i) => sum + i.quantity, 0);

  const applied_coupon =
    code && code.length > 0 ? await evaluateCouponCode(userId, code, subtotal) : null;
  const final_amount = applied_coupon?.valid ? applied_coupon.final_amount : subtotal;

  return {
    id: cart.id,
    status: cart.status,
    items,
    subtotal,
    item_count,
    applied_coupon,
    final_amount,
  };
};

export const getActiveCart = async (userId: string, code?: string): Promise<CartView> => {
  const cart = await findActiveCart(userId);

  return buildCartView(cart, userId, code);
};

export const addItem = async (
  userId: string,
  input: AddItemInput,
  code?: string
): Promise<CartView> => {
  const stock = await fetchProductStock(input.productId);
  if (stock === null) {
    throw httpError(404, 'Product not found');
  }

  const cart = await getOrCreateActiveCart(userId);
  const existingItem = await findCartItem(cart.id, input.productId);
  const totalRequested = (existingItem?.quantity ?? 0) + input.quantity;
  if (totalRequested > stock) {
    throw httpError(409, 'Out of stock');
  }

  await upsertCartItem({
    cartId: cart.id,
    productId: input.productId,
    quantity: input.quantity,
  });

  return buildCartView(cart, userId, code);
};

export const updateItem = async (
  userId: string,
  productId: string,
  input: UpdateItemInput,
  code?: string
): Promise<CartView> => {
  const cart = await findActiveCart(userId);
  if (!cart) {
    throw httpError(404, 'Item not in cart');
  }

  const existingItem = await findCartItem(cart.id, productId);
  if (!existingItem) {
    throw httpError(404, 'Item not in cart');
  }

  const stock = await fetchProductStock(productId);
  if (stock === null) {
    throw httpError(404, 'Product not found');
  }

  if (input.quantity > stock) {
    throw httpError(409, 'Out of stock');
  }

  await updateCartItemQuantity({
    cartId: cart.id,
    productId,
    quantity: input.quantity,
  });

  return buildCartView(cart, userId, code);
};

export const removeItem = async (
  userId: string,
  productId: string,
  code?: string
): Promise<CartView> => {
  const cart = await findActiveCart(userId);
  if (!cart) {
    throw httpError(404, 'Item not in cart');
  }

  const removed = await deleteCartItem(cart.id, productId);
  if (!removed) {
    throw httpError(404, 'Item not in cart');
  }

  return buildCartView(cart, userId, code);
};

export const clearCart = async (userId: string, code?: string): Promise<CartView> => {
  const cart = await findActiveCart(userId);
  if (!cart) return buildCartView(null, userId, code);

  await deleteAllCartItems(cart.id);

  return buildCartView(cart, userId, code);
};
