import { describe, expect, it } from '@jest/globals';
import { CouponDiscountType, CouponTriggerType } from '../../constants/index.js';
import { createConfigSchema } from './coupons.validation.js';

const baseFlat = {
  name: 'Flat 50 off',
  trigger_type: CouponTriggerType.FIRST_TIME,
  discount_type: CouponDiscountType.FLAT,
  discount_value: 50,
};

describe('createConfigSchema', () => {
  it('accepts a valid flat first-time config and defaults active to true', () => {
    const result = createConfigSchema.safeParse(baseFlat);
    expect(result.success).toBe(true);
    expect(result.data?.active).toBe(true);
  });

  it('accepts a valid nth_order percentage config', () => {
    const result = createConfigSchema.safeParse({
      name: '10% every 3rd order',
      trigger_type: CouponTriggerType.NTH_ORDER,
      trigger_value: 3,
      discount_type: CouponDiscountType.PERCENTAGE,
      discount_value: 10,
      max_discount_amount: 100,
      min_order_amount: 20,
      coupon_validity_days: 14,
      active: false,
    });
    expect(result.success).toBe(true);
    expect(result.data?.active).toBe(false);
  });

  it('rejects nth_order without a trigger_value', () => {
    const result = createConfigSchema.safeParse({
      name: 'Missing trigger value',
      trigger_type: CouponTriggerType.NTH_ORDER,
      discount_type: CouponDiscountType.FLAT,
      discount_value: 10,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.path.includes('trigger_value'))).toBe(true);
  });

  it('rejects a percentage discount above 100', () => {
    const result = createConfigSchema.safeParse({
      ...baseFlat,
      discount_type: CouponDiscountType.PERCENTAGE,
      discount_value: 150,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.path.includes('discount_value'))).toBe(true);
  });

  it('allows a percentage discount of exactly 100', () => {
    const result = createConfigSchema.safeParse({
      ...baseFlat,
      discount_type: CouponDiscountType.PERCENTAGE,
      discount_value: 100,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-positive discount_value', () => {
    expect(createConfigSchema.safeParse({ ...baseFlat, discount_value: 0 }).success).toBe(false);
    expect(createConfigSchema.safeParse({ ...baseFlat, discount_value: -5 }).success).toBe(false);
  });

  it('rejects an empty name', () => {
    expect(createConfigSchema.safeParse({ ...baseFlat, name: '' }).success).toBe(false);
  });

  it('rejects an unknown trigger type', () => {
    expect(createConfigSchema.safeParse({ ...baseFlat, trigger_type: 'birthday' }).success).toBe(
      false
    );
  });
});
