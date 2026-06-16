import db from '../../db/postgres.db.js';
import type { Cart, CartItem, CartItemDetailed } from './cart.types.js';

const CART_COLS = `id, user_id, status, created_at, updated_at`;

export const findActiveCart = async (userId: string): Promise<Cart | null> => {
  try {
    const { rows } = await db.query(
      `SELECT ${CART_COLS} FROM carts WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    return rows[0] ?? null;
  } catch (err) {
    console.error('Error in findActiveCart:', { userId, err });
    throw err;
  }
};

export const createActiveCart = async (userId: string): Promise<Cart> => {
  try {
    const { rows } = await db.query(
      `INSERT INTO carts (user_id, status) VALUES ($1, 'active')
       RETURNING ${CART_COLS}`,
      [userId]
    );

    return rows[0] as Cart;
  } catch (err) {
    console.error('Error in createActiveCart:', { userId, err });
    throw err;
  }
};

export const findCartItem = async (cartId: string, productId: string): Promise<CartItem | null> => {
  try {
    const { rows } = await db.query(
      `SELECT id, cart_id, product_id, quantity
       FROM cart_items WHERE cart_id = $1 AND product_id = $2`,
      [cartId, productId]
    );

    return rows[0] ?? null;
  } catch (err) {
    console.error('Error in findCartItem:', { cartId, productId, err });
    throw err;
  }
};

export const upsertCartItem = async ({
  cartId,
  productId,
  quantity,
}: {
  cartId: string;
  productId: string;
  quantity: number;
}): Promise<CartItem> => {
  try {
    const { rows } = await db.query(
      `INSERT INTO cart_items (cart_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (cart_id, product_id)
       DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
       RETURNING id, cart_id, product_id, quantity`,
      [cartId, productId, quantity]
    );

    return rows[0] as CartItem;
  } catch (err) {
    console.error('Error in upsertCartItem:', { cartId, productId, quantity, err });
    throw err;
  }
};

export const updateCartItemQuantity = async ({
  cartId,
  productId,
  quantity,
}: {
  cartId: string;
  productId: string;
  quantity: number;
}): Promise<CartItem | null> => {
  try {
    const { rows } = await db.query(
      `UPDATE cart_items SET quantity = $3
       WHERE cart_id = $1 AND product_id = $2
       RETURNING id, cart_id, product_id, quantity`,
      [cartId, productId, quantity]
    );

    return rows[0] ?? null;
  } catch (err) {
    console.error('Error in updateCartItemQuantity:', { cartId, productId, quantity, err });
    throw err;
  }
};

export const deleteCartItem = async (cartId: string, productId: string): Promise<boolean> => {
  try {
    const result = await db.query(`DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2`, [
      cartId,
      productId,
    ]);

    return (result.rowCount ?? 0) > 0;
  } catch (err) {
    console.error('Error in deleteCartItem:', { cartId, productId, err });
    throw err;
  }
};

export const deleteAllCartItems = async (cartId: string): Promise<number> => {
  try {
    const result = await db.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId]);

    return result.rowCount ?? 0;
  } catch (err) {
    console.error('Error in deleteAllCartItems:', { cartId, err });
    throw err;
  }
};

export const findCartItemsDetailed = async (cartId: string): Promise<CartItemDetailed[]> => {
  try {
    const { rows } = await db.query(
      `SELECT ci.product_id, p.name, p.price::float AS price, p.image_uri,
              ci.quantity, (p.price::float * ci.quantity) AS line_total
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.cart_id = $1
       ORDER BY ci.id`,
      [cartId]
    );

    return rows as CartItemDetailed[];
  } catch (err) {
    console.error('Error in findCartItemsDetailed:', { cartId, err });
    throw err;
  }
};
