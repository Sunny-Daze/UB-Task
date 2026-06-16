import { z } from 'zod';
import { CouponDiscountType, CouponTriggerType } from '../../constants/index.js';

export const createConfigSchema = z
  .object({
    name: z.string().min(1).max(255),
    trigger_type: z.enum([
      CouponTriggerType.NTH_ORDER,
      CouponTriggerType.FIRST_TIME,
      CouponTriggerType.MANUAL,
    ]),
    trigger_value: z.number().int().positive().nullable().optional(),
    discount_type: z.enum([CouponDiscountType.PERCENTAGE, CouponDiscountType.FLAT]),
    discount_value: z.number().positive(),
    max_discount_amount: z.number().nonnegative().nullable().optional(),
    min_order_amount: z.number().nonnegative().nullable().optional(),
    coupon_validity_days: z.number().int().positive().nullable().optional(),
    active: z.boolean().optional().default(true),
  })
  .refine(
    (v) =>
      v.trigger_type !== CouponTriggerType.NTH_ORDER ||
      (v.trigger_value !== null && v.trigger_value !== undefined && v.trigger_value > 0),
    { message: 'trigger_value is required when trigger_type is nth_order', path: ['trigger_value'] }
  )
  .refine((v) => v.discount_type !== CouponDiscountType.PERCENTAGE || v.discount_value <= 100, {
    message: 'discount_value must be <= 100 for percentage discounts',
    path: ['discount_value'],
  });

export type CreateConfigInput = z.infer<typeof createConfigSchema>;
