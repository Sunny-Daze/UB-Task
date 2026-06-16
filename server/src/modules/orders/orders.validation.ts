import { z } from 'zod';

export const placeOrderSchema = z.object({
  coupon_code: z.string().min(1).max(50).optional(),
  payment_method: z.string().min(1).max(50).optional(),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
