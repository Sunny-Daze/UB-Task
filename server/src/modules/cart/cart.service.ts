import db from '../../db/postgres.db.js';
import { httpError } from '../../shared/httpError.js';
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
import type { Cart, CartView } from './cart.types.js';
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

// fixed response for cart operations
const buildCartView = async (cart: Cart | null): Promise<CartView> => {
  if (!cart) {
    return { id: null, status: null, items: [], subtotal: 0, item_count: 0 };
  }

  const items = await findCartItemsDetailed(cart.id);
  const subtotal = items.reduce((sum, i) => sum + i.line_total, 0);
  const item_count = items.reduce((sum, i) => sum + i.quantity, 0);

  return { id: cart.id, status: cart.status, items, subtotal, item_count };
};

export const getActiveCart = async (userId: string): Promise<CartView> => {
  const cart = await findActiveCart(userId);
  return buildCartView(cart);
};

export const addItem = async (userId: string, input: AddItemInput): Promise<CartView> => {
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

  // inserts or updates
  await upsertCartItem({
    cartId: cart.id,
    productId: input.productId,
    quantity: input.quantity,
  });

  return buildCartView(cart);
};

export const updateItem = async (
  userId: string,
  productId: string,
  input: UpdateItemInput
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

  return buildCartView(cart);
};

export const removeItem = async (userId: string, productId: string): Promise<CartView> => {
  const cart = await findActiveCart(userId);
  if (!cart) {
    throw httpError(404, 'Item not in cart');
  }

  const removed = await deleteCartItem(cart.id, productId);
  if (!removed) {
    throw httpError(404, 'Item not in cart');
  }

  return buildCartView(cart);
};

export const clearCart = async (userId: string): Promise<CartView> => {
  const cart = await findActiveCart(userId);
  if (!cart) return buildCartView(null);

  await deleteAllCartItems(cart.id);

  return buildCartView(cart);
};
