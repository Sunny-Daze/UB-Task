import type { CouponTriggerType } from '../../../constants/index.js';
import type { TriggerEvaluator } from './engine.types.js';
import { firstTimeEvaluator } from './evaluators/firstTime.evaluator.js';
import { nthOrderEvaluator } from './evaluators/nthOrder.evaluator.js';

const evaluators: TriggerEvaluator[] = [nthOrderEvaluator, firstTimeEvaluator];

export const EVALUATOR_REGISTRY: ReadonlyMap<CouponTriggerType, TriggerEvaluator> = new Map(
  evaluators.map((e) => [e.type, e])
);
