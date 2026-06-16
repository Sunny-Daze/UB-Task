import { findActiveTriggerableConfigurations } from '../coupons.repository.js';
import type { Coupon } from '../coupons.types.js';
import type { TriggerContext } from './engine.types.js';
import { issueCouponForConfig } from './issueCoupon.js';
import { EVALUATOR_REGISTRY } from './registry.js';

export const runCouponEngine = async (ctx: TriggerContext): Promise<Coupon[]> => {
  const configs = await findActiveTriggerableConfigurations();
  const issued: Coupon[] = [];

  for (const config of configs) {
    const evaluator = EVALUATOR_REGISTRY.get(config.trigger_type);
    if (!evaluator) continue;
    if (evaluator.shouldIssue(config, ctx)) {
      issued.push(await issueCouponForConfig(config, ctx.userId));
    }
  }

  return issued;
};
