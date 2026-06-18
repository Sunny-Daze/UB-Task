import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CouponDiscountType, CouponStatus } from '../../constants/index.js';
import type { Coupon } from '../coupons/coupons.types.js';
import type { OrderSummary } from './orders.types.js';

/**
 * placeOrder does all its work inside a single withTransaction() callback that issues
 * a fixed sequence of SQL statements against the pg client. Rather than drive the real
 * pool, we mock withTransaction to invoke the callback with a fake client whose query()
 * routes on the SQL text and returns canned rows. issueCouponsForUserAfterOrder (the
 * post-commit side effect) and findOrdersForUser are mocked directly.
 */
const withTransaction =
  jest.fn<(fn: (client: FakeClient) => Promise<unknown>) => Promise<unknown>>();
const issueCouponsForUserAfterOrder = jest.fn<() => Promise<Coupon[]>>();
const findOrdersForUser = jest.fn<() => Promise<OrderSummary[]>>();

jest.unstable_mockModule('../../db/transaction.js', () => ({ withTransaction }));
jest.unstable_mockModule('../coupons/coupons.service.js', () => ({
  issueCouponsForUserAfterOrder,
}));
jest.unstable_mockModule('./orders.repository.js', () => ({ findOrdersForUser }));

const { placeOrder, listMyOrders } = await import('./orders.service.js');

const USER = 'user-1';

interface ItemRow {
  product_id: string;
  quantity: number;
  name: string;
  price: number;
  stock_quantity: number;
}

interface CouponRow {
  id: string;
  code: string;
  status: string;
  expires_at: Date;
  assigned_user_id: string | null;
  discount_type: string;
  discount_value: number;
  max_discount_amount: number | null;
  min_order_amount: number | null;
}

interface FakeClient {
  query: jest.Mock;
}

interface ScenarioOptions {
  cartRows?: Array<{ id: string }>;
  itemRows?: ItemRow[];
  couponRow?: CouponRow | null;
  newOrderCount?: number;
}

const makeItem = (overrides: Partial<ItemRow> = {}): ItemRow => ({
  product_id: 'p1',
  quantity: 2,
  name: 'Widget',
  price: 50,
  stock_quantity: 10,
  ...overrides,
});

const makeCouponRow = (overrides: Partial<CouponRow> = {}): CouponRow => ({
  id: 'coupon-1',
  code: 'SAVE20CODE',
  status: CouponStatus.ACTIVE,
  expires_at: new Date(Date.now() + 86_400_000),
  assigned_user_id: USER,
  discount_type: CouponDiscountType.FLAT,
  discount_value: 20,
  max_discount_amount: null,
  min_order_amount: null,
  ...overrides,
});

/**
 * Builds a fake pg client and wires withTransaction to run the service callback with
 * it. Returns the client so tests can assert which statements were issued.
 */
const runWith = ({
  cartRows = [{ id: 'cart-1' }],
  itemRows = [makeItem()],
  couponRow = null,
  newOrderCount = 1,
}: ScenarioOptions): FakeClient => {
  const query = jest.fn(async (text: string) => {
    if (text.includes('FROM carts')) return { rows: cartRows, rowCount: cartRows.length };
    if (text.includes('FROM cart_items')) return { rows: itemRows, rowCount: itemRows.length };
    if (text.includes('FROM coupons'))
      return { rows: couponRow ? [couponRow] : [], rowCount: couponRow ? 1 : 0 };
    if (text.includes('INSERT INTO orders'))
      return {
        rows: [
          {
            id: 'order-1',
            user_id: USER,
            status: 'confirmed',
            created_at: new Date('2024-01-01T00:00:00Z'),
          },
        ],
        rowCount: 1,
      };
    if (text.includes('UPDATE users'))
      return { rows: [{ successful_order_count: newOrderCount }], rowCount: 1 };
    // order_items / products / coupon_usage / coupons / carts updates
    return { rows: [], rowCount: 1 };
  }) as unknown as jest.Mock;

  const client: FakeClient = { query };
  withTransaction.mockImplementation((fn) => fn(client));
  return client;
};

const sqlIssued = (client: FakeClient, fragment: string): boolean =>
  client.query.mock.calls.some(([text]) => String(text).includes(fragment));

beforeEach(() => {
  jest.clearAllMocks();
  issueCouponsForUserAfterOrder.mockResolvedValue([]);
});

describe('placeOrder', () => {
  it('throws 400 when the user has no active cart', async () => {
    runWith({ cartRows: [] });

    await expect(placeOrder(USER, {})).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 when the cart is empty', async () => {
    runWith({ itemRows: [] });

    await expect(placeOrder(USER, {})).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 409 when an item exceeds available stock', async () => {
    runWith({ itemRows: [makeItem({ quantity: 5, stock_quantity: 2 })] });

    await expect(placeOrder(USER, {})).rejects.toMatchObject({ statusCode: 409 });
  });

  it('places an order without a coupon and returns issued coupons', async () => {
    const client = runWith({ itemRows: [makeItem({ quantity: 2, price: 50 })], newOrderCount: 3 });
    issueCouponsForUserAfterOrder.mockResolvedValue([
      {
        id: 'new-coupon',
        coupon_configuration_id: 'cfg-1',
        assigned_user_id: USER,
        code: 'REWARD1234',
        status: CouponStatus.ACTIVE,
        expires_at: new Date('2024-02-01T00:00:00Z'),
        created_at: new Date('2024-01-01T00:00:00Z'),
      },
    ]);

    const result = await placeOrder(USER, {});

    expect(result.order.subtotal).toBe(100);
    expect(result.order.total).toBe(100);
    expect(result.order.status).toBe('confirmed');
    expect(result.order.applied_coupon).toBeNull();
    expect(result.order.items).toEqual([
      {
        product_id: 'p1',
        product_name: 'Widget',
        unit_price: 50,
        quantity: 2,
        image_uri: null,
        line_total: 100,
      },
    ]);
    expect(issueCouponsForUserAfterOrder).toHaveBeenCalledWith(USER, 3);
    expect(result.issued_coupons).toEqual([
      {
        id: 'new-coupon',
        code: 'REWARD1234',
        expires_at: new Date('2024-02-01T00:00:00Z'),
        configuration_name: '',
      },
    ]);
    // No coupon path => no usage row written.
    expect(sqlIssued(client, 'INSERT INTO coupon_usage')).toBe(false);
  });

  describe('coupon validation', () => {
    it('rejects an unknown coupon code', async () => {
      runWith({ couponRow: null });

      await expect(placeOrder(USER, { coupon_code: 'NOPE' })).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('rejects a coupon assigned to a different user', async () => {
      runWith({ couponRow: makeCouponRow({ assigned_user_id: 'someone-else' }) });

      await expect(placeOrder(USER, { coupon_code: 'SAVE20CODE' })).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('rejects a non-active coupon', async () => {
      runWith({ couponRow: makeCouponRow({ status: CouponStatus.USED }) });

      await expect(placeOrder(USER, { coupon_code: 'SAVE20CODE' })).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('rejects an expired coupon', async () => {
      runWith({ couponRow: makeCouponRow({ expires_at: new Date(Date.now() - 1000) }) });

      await expect(placeOrder(USER, { coupon_code: 'SAVE20CODE' })).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('rejects when the subtotal is below the coupon minimum', async () => {
      runWith({
        itemRows: [makeItem({ quantity: 1, price: 50 })], // subtotal 50
        couponRow: makeCouponRow({ min_order_amount: 100 }),
      });

      await expect(placeOrder(USER, { coupon_code: 'SAVE20CODE' })).rejects.toMatchObject({
        statusCode: 400,
      });
    });
  });

  it('applies a flat discount and records coupon usage', async () => {
    const client = runWith({
      itemRows: [makeItem({ quantity: 2, price: 50 })], // subtotal 100
      couponRow: makeCouponRow({ discount_type: CouponDiscountType.FLAT, discount_value: 20 }),
    });

    const result = await placeOrder(USER, { coupon_code: 'SAVE20CODE' });

    expect(result.order.subtotal).toBe(100);
    expect(result.order.total).toBe(80);
    expect(result.order.applied_coupon).toEqual({
      coupon_id: 'coupon-1',
      code: 'SAVE20CODE',
      discount_amount: 20,
    });
    expect(sqlIssued(client, 'INSERT INTO coupon_usage')).toBe(true);
    expect(sqlIssued(client, "UPDATE coupons SET status = 'used'")).toBe(true);
  });

  it('caps a percentage discount at max_discount_amount', async () => {
    runWith({
      itemRows: [makeItem({ quantity: 2, price: 50 })], // subtotal 100
      couponRow: makeCouponRow({
        discount_type: CouponDiscountType.PERCENTAGE,
        discount_value: 50, // 50% of 100 = 50
        max_discount_amount: 30, // capped to 30
      }),
    });

    const result = await placeOrder(USER, { coupon_code: 'SAVE20CODE' });

    expect(result.order.total).toBe(70);
    expect(result.order.applied_coupon?.discount_amount).toBe(30);
  });

  it('still returns the order when post-order coupon issuance fails', async () => {
    runWith({ itemRows: [makeItem({ quantity: 1, price: 50 })] });
    issueCouponsForUserAfterOrder.mockRejectedValue(new Error('engine down'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await placeOrder(USER, {});

    expect(result.order.total).toBe(50);
    expect(result.issued_coupons).toEqual([]);
  });
});

describe('listMyOrders', () => {
  it('delegates to the repository', async () => {
    const orders: OrderSummary[] = [
      {
        id: 'order-1',
        subtotal: 100,
        total: 80,
        status: 'confirmed',
        item_count: 2,
        created_at: new Date('2024-01-01T00:00:00Z'),
      },
    ];
    findOrdersForUser.mockResolvedValue(orders);

    await expect(listMyOrders(USER)).resolves.toBe(orders);
    expect(findOrdersForUser).toHaveBeenCalledWith(USER);
  });
});
