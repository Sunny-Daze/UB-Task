import { CouponTriggerType } from '../../../../constants/index.js';
import type { TriggerEvaluator } from '../engine.types.js';

export const firstTimeEvaluator: TriggerEvaluator = {
  type: CouponTriggerType.FIRST_TIME,
  shouldIssue(_config, ctx) {
    return ctx.isFirstSignup === true;
  },
};
