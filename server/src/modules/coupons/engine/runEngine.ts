import { findActiveTriggerableConfigurations } from '../coupons.repository.js';
import type { Coupon } from '../coupons.types.js';
import type { TriggerContext } from './engine.types.js';
import { issueCouponForConfig } from './issueCoupon.js';
import { EVALUATOR_REGISTRY } from './registry.js';

export const runCouponEngine = async (ctx: TriggerContext): Promise<Coupon[]> => {
  const configs = await findActiveTriggerableConfigurations();

  // find the matched configs for given trigger type
  const matching = configs.filter((config) => {
    const evaluator = EVALUATOR_REGISTRY.get(config.trigger_type);
    return evaluator?.shouldIssue(config, ctx) ?? false;
  });

  if (matching.length === 0) return [];

  // pick the config with best discount
  const best = matching.reduce((a, b) => {
    if (b.discount_value !== a.discount_value) return b.discount_value > a.discount_value ? b : a;
    return new Date(b.created_at).getTime() > new Date(a.created_at).getTime() ? b : a;
  });

  return [await issueCouponForConfig(best, ctx.userId)];
};
