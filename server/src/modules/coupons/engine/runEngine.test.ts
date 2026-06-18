import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CouponDiscountType, CouponStatus, CouponTriggerType } from '../../../constants/index.js';
import type { Coupon, CouponConfiguration } from '../coupons.types.js';

const findActiveTriggerableConfigurations = jest.fn<() => Promise<CouponConfiguration[]>>();
const issueCouponForConfig =
  jest.fn<(config: CouponConfiguration, userId: string) => Promise<Coupon>>();

jest.unstable_mockModule('../coupons.repository.js', () => ({
  findActiveTriggerableConfigurations,
}));
jest.unstable_mockModule('./issueCoupon.js', () => ({ issueCouponForConfig }));

const { runCouponEngine } = await import('./runEngine.js');

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

beforeEach(() => {
  jest.clearAllMocks();
  issueCouponForConfig.mockImplementation(async (config) => ({
    id: `coupon-for-${config.id}`,
    coupon_configuration_id: config.id,
    assigned_user_id: 'user-1',
    code: 'GENERATED1',
    status: CouponStatus.ACTIVE,
    expires_at: new Date('2024-02-01T00:00:00Z'),
    created_at: new Date('2024-01-01T00:00:00Z'),
  }));
});

describe('runCouponEngine', () => {
  it('returns an empty array when no configuration matches', async () => {
    findActiveTriggerableConfigurations.mockResolvedValue([
      makeConfig({ id: 'cfg-1', trigger_value: 5 }), // 4 % 5 !== 0
    ]);

    const result = await runCouponEngine({ userId: 'user-1', newSuccessfulOrderCount: 4 });

    expect(result).toEqual([]);
    expect(issueCouponForConfig).not.toHaveBeenCalled();
  });

  it('issues a coupon for the single matching configuration', async () => {
    findActiveTriggerableConfigurations.mockResolvedValue([
      makeConfig({ id: 'cfg-1', trigger_value: 3 }),
    ]);

    const result = await runCouponEngine({ userId: 'user-1', newSuccessfulOrderCount: 3 });

    expect(issueCouponForConfig).toHaveBeenCalledTimes(1);
    expect(issueCouponForConfig).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cfg-1' }),
      'user-1'
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.coupon_configuration_id).toBe('cfg-1');
  });

  it('picks the matching configuration with the highest discount_value', async () => {
    findActiveTriggerableConfigurations.mockResolvedValue([
      makeConfig({ id: 'low', trigger_value: 3, discount_value: 10 }),
      makeConfig({ id: 'high', trigger_value: 3, discount_value: 40 }),
      makeConfig({ id: 'mid', trigger_value: 3, discount_value: 25 }),
    ]);

    const result = await runCouponEngine({ userId: 'user-1', newSuccessfulOrderCount: 6 });

    expect(issueCouponForConfig).toHaveBeenCalledTimes(1);
    expect(result[0]?.coupon_configuration_id).toBe('high');
  });

  it('breaks a discount tie by choosing the most recently created configuration', async () => {
    findActiveTriggerableConfigurations.mockResolvedValue([
      makeConfig({
        id: 'older',
        trigger_value: 3,
        discount_value: 20,
        created_at: new Date('2024-01-01T00:00:00Z'),
      }),
      makeConfig({
        id: 'newer',
        trigger_value: 3,
        discount_value: 20,
        created_at: new Date('2024-06-01T00:00:00Z'),
      }),
    ]);

    const result = await runCouponEngine({ userId: 'user-1', newSuccessfulOrderCount: 3 });

    expect(result[0]?.coupon_configuration_id).toBe('newer');
  });

  it('only considers configurations whose evaluator matches the context', async () => {
    findActiveTriggerableConfigurations.mockResolvedValue([
      makeConfig({ id: 'nth', trigger_type: CouponTriggerType.NTH_ORDER, trigger_value: 3 }),
      makeConfig({
        id: 'first-time',
        trigger_type: CouponTriggerType.FIRST_TIME,
        discount_value: 99,
      }),
    ]);

    const result = await runCouponEngine({ userId: 'user-1', newSuccessfulOrderCount: 3 });

    expect(result[0]?.coupon_configuration_id).toBe('nth');
  });
});
