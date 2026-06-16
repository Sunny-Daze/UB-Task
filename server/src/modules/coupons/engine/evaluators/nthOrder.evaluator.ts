import { CouponTriggerType } from '../../../../constants/index.js';
import type { TriggerEvaluator } from '../engine.types.js';

export const nthOrderEvaluator: TriggerEvaluator = {
  type: CouponTriggerType.NTH_ORDER,
  shouldIssue(config, ctx) {
    if (ctx.newSuccessfulOrderCount === undefined) return false;
    if (!config.trigger_value || config.trigger_value <= 0) return false;
    return ctx.newSuccessfulOrderCount % config.trigger_value === 0;
  },
};
