import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CouponDiscountType, CouponStatus, CouponTriggerType } from '../../constants/index.js';
import type { CouponConfiguration, CouponWithConfig } from './coupons.types.js';

const mockRepo = {
  expireOutdatedCouponsForUser: jest.fn<() => Promise<void>>(),
  findActiveCouponsForUser: jest.fn<() => Promise<CouponWithConfig[]>>(),
  findAllIssuedCoupons: jest.fn(),
  findCouponByCodeForUser: jest.fn<() => Promise<CouponWithConfig | null>>(),
  findDiscountCodesUsage: jest.fn(),
  findStatsOverview: jest.fn(),
  insertCouponConfiguration: jest.fn(),
  findActiveTriggerableConfigurations: jest.fn(),
  insertCoupon: jest.fn(),
};

jest.unstable_mockModule('./coupons.repository.js', () => mockRepo);

const { calculateDiscount, validateCoupon, listMyCoupons, getStats } =
  await import('./coupons.service.js');

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

const makeCoupon = (overrides: Partial<CouponWithConfig> = {}): CouponWithConfig => ({
  id: 'coupon-1',
  coupon_configuration_id: 'cfg-1',
  assigned_user_id: 'user-1',
  code: 'ABCDE12345',
  status: CouponStatus.ACTIVE,
  expires_at: new Date(Date.now() + 86_400_000), // tomorrow
  created_at: new Date('2024-01-01T00:00:00Z'),
  config: makeConfig(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('calculateDiscount', () => {
  it('applies a flat discount', () => {
    const config = makeConfig({ discount_type: CouponDiscountType.FLAT, discount_value: 20 });
    expect(calculateDiscount(config, 100)).toEqual({
      original_amount: 100,
      discount_amount: 20,
      final_amount: 80,
    });
  });

  it('caps a flat discount at the order amount so the total never goes negative', () => {
    const config = makeConfig({ discount_type: CouponDiscountType.FLAT, discount_value: 200 });
    expect(calculateDiscount(config, 50)).toEqual({
      original_amount: 50,
      discount_amount: 50,
      final_amount: 0,
    });
  });

  it('applies a percentage discount when no cap is set', () => {
    const config = makeConfig({
      discount_type: CouponDiscountType.PERCENTAGE,
      discount_value: 10,
      max_discount_amount: null,
    });
    expect(calculateDiscount(config, 250)).toEqual({
      original_amount: 250,
      discount_amount: 25,
      final_amount: 225,
    });
  });

  it('caps a percentage discount at max_discount_amount', () => {
    const config = makeConfig({
      discount_type: CouponDiscountType.PERCENTAGE,
      discount_value: 50,
      max_discount_amount: 30,
    });
    // 50% of 100 = 50, capped to 30.
    expect(calculateDiscount(config, 100)).toEqual({
      original_amount: 100,
      discount_amount: 30,
      final_amount: 70,
    });
  });

  it('rounds amounts to two decimal places', () => {
    const config = makeConfig({
      discount_type: CouponDiscountType.PERCENTAGE,
      discount_value: 10,
      max_discount_amount: null,
    });
    // 10% of 99.99 = 9.999 -> 10.00; final 89.99(1) -> 89.99
    expect(calculateDiscount(config, 99.99)).toEqual({
      original_amount: 99.99,
      discount_amount: 10,
      final_amount: 89.99,
    });
  });
});

describe('validateCoupon', () => {
  it('fails with not_found when the coupon does not exist', async () => {
    mockRepo.findCouponByCodeForUser.mockResolvedValue(null);
    await expect(validateCoupon('user-1', 'NOPE', 100)).resolves.toEqual({
      valid: false,
      reason: 'not_found',
    });
  });

  it('fails with not_assigned_to_user when the coupon belongs to someone else', async () => {
    mockRepo.findCouponByCodeForUser.mockResolvedValue(makeCoupon({ assigned_user_id: 'other' }));
    await expect(validateCoupon('user-1', 'ABCDE12345', 100)).resolves.toEqual({
      valid: false,
      reason: 'not_assigned_to_user',
    });
  });

  it('fails with inactive when the coupon is not active', async () => {
    mockRepo.findCouponByCodeForUser.mockResolvedValue(makeCoupon({ status: CouponStatus.USED }));
    await expect(validateCoupon('user-1', 'ABCDE12345', 100)).resolves.toEqual({
      valid: false,
      reason: 'inactive',
    });
  });

  it('fails with expired when the coupon is past its expiry', async () => {
    mockRepo.findCouponByCodeForUser.mockResolvedValue(
      makeCoupon({ expires_at: new Date(Date.now() - 1000) })
    );
    await expect(validateCoupon('user-1', 'ABCDE12345', 100)).resolves.toEqual({
      valid: false,
      reason: 'expired',
    });
  });

  it('fails with order_too_small when below min_order_amount', async () => {
    mockRepo.findCouponByCodeForUser.mockResolvedValue(
      makeCoupon({ config: makeConfig({ min_order_amount: 100 }) })
    );
    await expect(validateCoupon('user-1', 'ABCDE12345', 50)).resolves.toEqual({
      valid: false,
      reason: 'order_too_small',
    });
  });

  it('succeeds and returns the computed discount for a valid coupon', async () => {
    mockRepo.findCouponByCodeForUser.mockResolvedValue(
      makeCoupon({
        id: 'coupon-9',
        config: makeConfig({
          discount_type: CouponDiscountType.FLAT,
          discount_value: 20,
          min_order_amount: 50,
        }),
      })
    );

    await expect(validateCoupon('user-1', 'ABCDE12345', 100)).resolves.toEqual({
      valid: true,
      coupon_id: 'coupon-9',
      discount: { original_amount: 100, discount_amount: 20, final_amount: 80 },
    });
  });

  it('treats an unassigned (null) coupon as usable by any user', async () => {
    mockRepo.findCouponByCodeForUser.mockResolvedValue(
      makeCoupon({ assigned_user_id: null, config: makeConfig({ min_order_amount: null }) })
    );
    const result = await validateCoupon('user-1', 'ABCDE12345', 100);
    expect(result.valid).toBe(true);
  });
});

describe('listMyCoupons', () => {
  it('expires outdated coupons before returning the active list', async () => {
    const active = [makeCoupon()];
    mockRepo.expireOutdatedCouponsForUser.mockResolvedValue(undefined);
    mockRepo.findActiveCouponsForUser.mockResolvedValue(active);

    const result = await listMyCoupons('user-1');

    expect(result).toBe(active);
    expect(mockRepo.expireOutdatedCouponsForUser).toHaveBeenCalledWith('user-1');
    expect(mockRepo.findActiveCouponsForUser).toHaveBeenCalledWith('user-1');
    // Ordering matters: expiry must run first so freshly-expired coupons are excluded.
    expect(mockRepo.expireOutdatedCouponsForUser.mock.invocationCallOrder[0]).toBeLessThan(
      mockRepo.findActiveCouponsForUser.mock.invocationCallOrder[0]!
    );
  });
});

describe('getStats', () => {
  it('combines the overview and per-code usage into one payload', async () => {
    const overview = {
      total_orders: 5,
      items_purchased: 12,
      revenue: 1000,
      total_discount: 120,
      coupons_used: 3,
    };
    const discountCodes = [
      {
        coupon_id: 'c1',
        code: 'ABCDE12345',
        configuration_name: 'Test',
        times_used: 2,
        total_discount: 80,
      },
    ];
    mockRepo.findStatsOverview.mockResolvedValue(overview);
    mockRepo.findDiscountCodesUsage.mockResolvedValue(discountCodes);

    await expect(getStats()).resolves.toEqual({
      overview,
      discount_codes: discountCodes,
    });
  });
});
