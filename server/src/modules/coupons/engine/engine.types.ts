import type { CouponTriggerType } from '../../../constants/index.js';
import type { CouponConfiguration } from '../coupons.types.js';

export interface TriggerContext {
  userId: string;
  newSuccessfulOrderCount?: number | undefined;
  isFirstSignup?: boolean | undefined;
}

export interface TriggerEvaluator {
  type: CouponTriggerType;
  shouldIssue(config: CouponConfiguration, ctx: TriggerContext): boolean;
}
