import { describe, expect, it } from '@jest/globals';
import { CouponDiscountType, CouponTriggerType } from '../../../constants/index.js';
import type { CouponConfiguration } from '../coupons.types.js';
import type { TriggerContext } from './engine.types.js';
import { firstTimeEvaluator } from './evaluators/firstTime.evaluator.js';
import { nthOrderEvaluator } from './evaluators/nthOrder.evaluator.js';
import { EVALUATOR_REGISTRY } from './registry.js';

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

describe('nthOrderEvaluator', () => {
  const config = makeConfig({ trigger_value: 3 });

  it('does not issue when the order count is absent', () => {
    expect(nthOrderEvaluator.shouldIssue(config, {} as TriggerContext)).toBe(false);
  });

  it('does not issue when trigger_value is missing or non-positive', () => {
    const ctx: TriggerContext = { userId: 'u1', newSuccessfulOrderCount: 3 };
    expect(nthOrderEvaluator.shouldIssue(makeConfig({ trigger_value: null }), ctx)).toBe(false);
    expect(nthOrderEvaluator.shouldIssue(makeConfig({ trigger_value: 0 }), ctx)).toBe(false);
    expect(nthOrderEvaluator.shouldIssue(makeConfig({ trigger_value: -2 }), ctx)).toBe(false);
  });

  it('issues only on exact multiples of trigger_value', () => {
    for (const count of [3, 6, 9, 12]) {
      expect(
        nthOrderEvaluator.shouldIssue(config, { userId: 'u1', newSuccessfulOrderCount: count })
      ).toBe(true);
    }
    for (const count of [1, 2, 4, 5, 7, 8]) {
      expect(
        nthOrderEvaluator.shouldIssue(config, { userId: 'u1', newSuccessfulOrderCount: count })
      ).toBe(false);
    }
  });
});

describe('firstTimeEvaluator', () => {
  const config = makeConfig({ trigger_type: CouponTriggerType.FIRST_TIME });

  it('issues only when isFirstSignup is explicitly true', () => {
    expect(firstTimeEvaluator.shouldIssue(config, { userId: 'u1', isFirstSignup: true })).toBe(
      true
    );
    expect(firstTimeEvaluator.shouldIssue(config, { userId: 'u1', isFirstSignup: false })).toBe(
      false
    );
    expect(firstTimeEvaluator.shouldIssue(config, { userId: 'u1' })).toBe(false);
  });
});

describe('EVALUATOR_REGISTRY', () => {
  it('maps each trigger type to the matching evaluator', () => {
    expect(EVALUATOR_REGISTRY.get(CouponTriggerType.NTH_ORDER)).toBe(nthOrderEvaluator);
    expect(EVALUATOR_REGISTRY.get(CouponTriggerType.FIRST_TIME)).toBe(firstTimeEvaluator);
  });

  it('has no evaluator for the manual trigger type', () => {
    expect(EVALUATOR_REGISTRY.get(CouponTriggerType.MANUAL)).toBeUndefined();
  });
});
