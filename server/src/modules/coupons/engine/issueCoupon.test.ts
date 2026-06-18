import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CouponDiscountType, CouponStatus, CouponTriggerType } from '../../../constants/index.js';
import { AppError } from '../../../shared/httpError.js';
import { CouponCodeCollisionError } from '../coupons.errors.js';
import type { Coupon, CouponConfiguration } from '../coupons.types.js';

interface InsertCouponArgs {
  configId: string;
  userId: string;
  code: string;
  expiresAt: Date;
}

const insertCoupon = jest.fn<(args: InsertCouponArgs) => Promise<Coupon>>();

jest.unstable_mockModule('../coupons.repository.js', () => ({ insertCoupon }));

const { issueCouponForConfig } = await import('./issueCoupon.js');

const CODE_BANK_PATTERN = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZ]{10}$/;

const makeConfig = (overrides: Partial<CouponConfiguration> = {}): CouponConfiguration => ({
  id: 'cfg-1',
  name: 'Test config',
  trigger_type: CouponTriggerType.NTH_ORDER,
  trigger_value: 3,
  discount_type: CouponDiscountType.PERCENTAGE,
  discount_value: 10,
  max_discount_amount: null,
  min_order_amount: null,
  coupon_validity_days: null,
  active: true,
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

const insertedCoupon = (args: InsertCouponArgs): Coupon => ({
  id: 'coupon-1',
  coupon_configuration_id: args.configId,
  assigned_user_id: args.userId,
  code: args.code,
  status: CouponStatus.ACTIVE,
  expires_at: args.expiresAt,
  created_at: new Date('2024-01-01T00:00:00Z'),
});

const daysFromNow = (date: Date): number => Math.round((date.getTime() - Date.now()) / 86_400_000);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('issueCouponForConfig', () => {
  it('persists and returns a coupon with a valid 10-char code on the first attempt', async () => {
    insertCoupon.mockImplementation(async (args) => insertedCoupon(args));

    const result = await issueCouponForConfig(makeConfig({ id: 'cfg-9' }), 'user-1');

    expect(insertCoupon).toHaveBeenCalledTimes(1);
    const args = insertCoupon.mock.calls[0]![0];
    expect(args.configId).toBe('cfg-9');
    expect(args.userId).toBe('user-1');
    expect(args.code).toMatch(CODE_BANK_PATTERN);
    expect(result.code).toBe(args.code);
  });

  it('retries on a code collision and then succeeds', async () => {
    insertCoupon
      .mockRejectedValueOnce(new CouponCodeCollisionError('DUPLICATE1'))
      .mockImplementationOnce(async (args) => insertedCoupon(args));

    const result = await issueCouponForConfig(makeConfig(), 'user-1');

    expect(insertCoupon).toHaveBeenCalledTimes(2);

    expect(insertCoupon.mock.calls[0]![0].code).toMatch(CODE_BANK_PATTERN);
    expect(result.code).toMatch(CODE_BANK_PATTERN);
  });

  it('throws a 500 AppError after exhausting all retries on repeated collisions', async () => {
    insertCoupon.mockRejectedValue(new CouponCodeCollisionError('DUPLICATE1'));

    await expect(issueCouponForConfig(makeConfig(), 'user-1')).rejects.toBeInstanceOf(AppError);
    await expect(issueCouponForConfig(makeConfig(), 'user-1')).rejects.toMatchObject({
      statusCode: 500,
    });

    expect(insertCoupon).toHaveBeenCalledTimes(10);
  });

  it('propagates non-collision errors immediately without retrying', async () => {
    insertCoupon.mockRejectedValue(new Error('connection lost'));

    await expect(issueCouponForConfig(makeConfig(), 'user-1')).rejects.toThrow('connection lost');
    expect(insertCoupon).toHaveBeenCalledTimes(1);
  });

  it('defaults expiry to 30 days when coupon_validity_days is null', async () => {
    insertCoupon.mockImplementation(async (args) => insertedCoupon(args));

    await issueCouponForConfig(makeConfig({ coupon_validity_days: null }), 'user-1');

    expect(daysFromNow(insertCoupon.mock.calls[0]![0].expiresAt)).toBe(30);
  });

  it('honours a custom coupon_validity_days', async () => {
    insertCoupon.mockImplementation(async (args) => insertedCoupon(args));

    await issueCouponForConfig(makeConfig({ coupon_validity_days: 7 }), 'user-1');

    expect(daysFromNow(insertCoupon.mock.calls[0]![0].expiresAt)).toBe(7);
  });
});
