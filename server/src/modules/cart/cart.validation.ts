import { z } from 'zod';

export const addItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

export const updateItemSchema = z.object({
  quantity: z.number().int().min(1),
});

export const productIdParamSchema = z.object({
  productId: z.string().uuid(),
});

export type AddItemInput = z.infer<typeof addItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
