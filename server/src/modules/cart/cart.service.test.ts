import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AppError } from '../../shared/httpError.js';
import type { ValidateCouponResult } from '../coupons/coupons.types.js';
import type { Cart, CartItem, CartItemDetailed } from './cart.types.js';

/**
 * cart.service reaches the database through three boundaries, all mocked here:
 *   - cart.repository (cart + cart_item rows)
 *   - the shared pg pool (`db.query`) used directly by fetchProductStock
 *   - the coupons module (repository row + validateCoupon) for coupon evaluation
 * roundTo / httpError are pure and left real.
 */
const dbQuery = jest.fn<(text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>>();

const findActiveCart = jest.fn<(userId: string) => Promise<Cart | null>>();
const createActiveCart = jest.fn<(userId: string) => Promise<Cart>>();
const findCartItem = jest.fn<() => Promise<CartItem | null>>();
const findCartItemsDetailed = jest.fn<() => Promise<CartItemDetailed[]>>();
const upsertCartItem = jest.fn<() => Promise<void>>();
const updateCartItemQuantity = jest.fn<() => Promise<void>>();
const deleteCartItem = jest.fn<() => Promise<boolean>>();
const deleteAllCartItems = jest.fn<() => Promise<void>>();

const findCouponByCodeForUser =
  jest.fn<() => Promise<{ id: string; config: { name: string } } | null>>();
const validateCoupon = jest.fn<() => Promise<ValidateCouponResult>>();

jest.unstable_mockModule('../../db/postgres.db.js', () => ({ default: { query: dbQuery } }));
jest.unstable_mockModule('./cart.repository.js', () => ({
  findActiveCart,
  createActiveCart,
  findCartItem,
  findCartItemsDetailed,
  upsertCartItem,
  updateCartItemQuantity,
  deleteCartItem,
  deleteAllCartItems,
}));
jest.unstable_mockModule('../coupons/coupons.repository.js', () => ({ findCouponByCodeForUser }));
jest.unstable_mockModule('../coupons/coupons.service.js', () => ({ validateCoupon }));

const { getActiveCart, addItem, updateItem, removeItem, clearCart } =
  await import('./cart.service.js');

const USER = 'user-1';

const makeCart = (overrides: Partial<Cart> = {}): Cart => ({
  id: 'cart-1',
  user_id: USER,
  status: 'active',
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

const makeDetailedItem = (overrides: Partial<CartItemDetailed> = {}): CartItemDetailed => ({
  product_id: 'p1',
  name: 'Widget',
  price: 50,
  image_uri: null,
  quantity: 2,
  line_total: 100,
  ...overrides,
});

const stock = (qty: number) => dbQuery.mockResolvedValue({ rows: [{ stock_quantity: qty }] });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getActiveCart', () => {
  it('returns an empty cart view when the user has no active cart', async () => {
    findActiveCart.mockResolvedValue(null);

    const view = await getActiveCart(USER);

    expect(view).toEqual({
      id: null,
      status: null,
      items: [],
      subtotal: 0,
      item_count: 0,
      applied_coupon: null,
      final_amount: 0,
    });
    expect(findCartItemsDetailed).not.toHaveBeenCalled();
  });

  it('computes subtotal and item_count from the cart items', async () => {
    findActiveCart.mockResolvedValue(makeCart());
    findCartItemsDetailed.mockResolvedValue([
      makeDetailedItem({ quantity: 2, line_total: 100 }),
      makeDetailedItem({ product_id: 'p2', quantity: 3, line_total: 30 }),
    ]);

    const view = await getActiveCart(USER);

    expect(view.subtotal).toBe(130);
    expect(view.item_count).toBe(5);
    expect(view.applied_coupon).toBeNull();
    expect(view.final_amount).toBe(130);
  });

  it('applies a valid coupon to the final amount', async () => {
    findActiveCart.mockResolvedValue(makeCart());
    findCartItemsDetailed.mockResolvedValue([makeDetailedItem({ quantity: 2, line_total: 100 })]);
    findCouponByCodeForUser.mockResolvedValue({ id: 'coupon-1', config: { name: 'Save20' } });
    validateCoupon.mockResolvedValue({
      valid: true,
      coupon_id: 'coupon-1',
      discount: { original_amount: 100, discount_amount: 20, final_amount: 80 },
    });

    const view = await getActiveCart(USER, 'SAVE20CODE');

    expect(validateCoupon).toHaveBeenCalledWith(USER, 'SAVE20CODE', 100);
    expect(view.applied_coupon).toEqual({
      code: 'SAVE20CODE',
      coupon_id: 'coupon-1',
      name: 'Save20',
      valid: true,
      discount_amount: 20,
      final_amount: 80,
    });
    expect(view.final_amount).toBe(80);
  });

  it('reports an invalid coupon without changing the final amount', async () => {
    findActiveCart.mockResolvedValue(makeCart());
    findCartItemsDetailed.mockResolvedValue([makeDetailedItem({ quantity: 2, line_total: 100 })]);
    findCouponByCodeForUser.mockResolvedValue({ id: 'coupon-1', config: { name: 'Expired' } });
    validateCoupon.mockResolvedValue({ valid: false, reason: 'expired' });

    const view = await getActiveCart(USER, 'EXPIREDXYZ');

    expect(view.applied_coupon).toMatchObject({
      valid: false,
      reason: 'expired',
      discount_amount: 0,
      final_amount: 100,
    });
    expect(view.final_amount).toBe(100);
  });
});

describe('addItem', () => {
  it('throws 404 when the product does not exist', async () => {
    dbQuery.mockResolvedValue({ rows: [] }); // no stock row

    await expect(addItem(USER, { productId: 'p1', quantity: 1 })).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(upsertCartItem).not.toHaveBeenCalled();
  });

  it('throws 409 when requested quantity plus existing exceeds stock', async () => {
    stock(5);
    findActiveCart.mockResolvedValue(makeCart());
    findCartItem.mockResolvedValue({ id: 'i1', cart_id: 'cart-1', product_id: 'p1', quantity: 4 });

    // existing 4 + requested 2 = 6 > 5
    await expect(addItem(USER, { productId: 'p1', quantity: 2 })).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(upsertCartItem).not.toHaveBeenCalled();
  });

  it('creates a cart when none exists and upserts the item', async () => {
    stock(10);
    findActiveCart.mockResolvedValue(null);
    createActiveCart.mockResolvedValue(makeCart());
    findCartItem.mockResolvedValue(null);
    findCartItemsDetailed.mockResolvedValue([makeDetailedItem({ quantity: 2, line_total: 100 })]);

    const view = await addItem(USER, { productId: 'p1', quantity: 2 });

    expect(createActiveCart).toHaveBeenCalledWith(USER);
    expect(upsertCartItem).toHaveBeenCalledWith({
      cartId: 'cart-1',
      productId: 'p1',
      quantity: 2,
    });
    expect(view.subtotal).toBe(100);
  });
});

describe('updateItem', () => {
  it('throws 404 when there is no active cart', async () => {
    findActiveCart.mockResolvedValue(null);

    await expect(updateItem(USER, 'p1', { quantity: 1 })).rejects.toBeInstanceOf(AppError);
    expect(updateCartItemQuantity).not.toHaveBeenCalled();
  });

  it('throws 404 when the item is not in the cart', async () => {
    findActiveCart.mockResolvedValue(makeCart());
    findCartItem.mockResolvedValue(null);

    await expect(updateItem(USER, 'p1', { quantity: 1 })).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws 409 when the new quantity exceeds stock', async () => {
    findActiveCart.mockResolvedValue(makeCart());
    findCartItem.mockResolvedValue({ id: 'i1', cart_id: 'cart-1', product_id: 'p1', quantity: 1 });
    stock(3);

    await expect(updateItem(USER, 'p1', { quantity: 5 })).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('updates the quantity on the happy path', async () => {
    findActiveCart.mockResolvedValue(makeCart());
    findCartItem.mockResolvedValue({ id: 'i1', cart_id: 'cart-1', product_id: 'p1', quantity: 1 });
    stock(10);
    findCartItemsDetailed.mockResolvedValue([makeDetailedItem({ quantity: 3, line_total: 150 })]);

    const view = await updateItem(USER, 'p1', { quantity: 3 });

    expect(updateCartItemQuantity).toHaveBeenCalledWith({
      cartId: 'cart-1',
      productId: 'p1',
      quantity: 3,
    });
    expect(view.item_count).toBe(3);
  });
});

describe('removeItem', () => {
  it('throws 404 when there is no active cart', async () => {
    findActiveCart.mockResolvedValue(null);

    await expect(removeItem(USER, 'p1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 404 when the item was not present to remove', async () => {
    findActiveCart.mockResolvedValue(makeCart());
    deleteCartItem.mockResolvedValue(false);

    await expect(removeItem(USER, 'p1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('removes the item and returns the updated view', async () => {
    findActiveCart.mockResolvedValue(makeCart());
    deleteCartItem.mockResolvedValue(true);
    findCartItemsDetailed.mockResolvedValue([]);

    const view = await removeItem(USER, 'p1');

    expect(deleteCartItem).toHaveBeenCalledWith('cart-1', 'p1');
    expect(view.items).toEqual([]);
    expect(view.subtotal).toBe(0);
  });
});

describe('clearCart', () => {
  it('returns an empty view when there is no active cart and deletes nothing', async () => {
    findActiveCart.mockResolvedValue(null);

    const view = await clearCart(USER);

    expect(deleteAllCartItems).not.toHaveBeenCalled();
    expect(view.id).toBeNull();
    expect(view.items).toEqual([]);
  });

  it('deletes all items for an active cart', async () => {
    findActiveCart.mockResolvedValue(makeCart());
    findCartItemsDetailed.mockResolvedValue([]);

    const view = await clearCart(USER);

    expect(deleteAllCartItems).toHaveBeenCalledWith('cart-1');
    expect(view.subtotal).toBe(0);
  });
});
