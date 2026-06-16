import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { httpError } from '../../shared/httpError.js';
import { success } from '../../shared/httpSuccess.js';
import { formatZodError } from '../../shared/zod.js';
import * as ordersService from './orders.service.js';
import { placeOrderSchema } from './orders.validation.js';

export const placeOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = placeOrderSchema.parse(req.body ?? {});
    const result = await ordersService.placeOrder(req.user!.id, input);

    res.status(201).json(success(result));
  } catch (err) {
    if (err instanceof ZodError) {
      throw httpError(400, formatZodError(err));
    }
    next(err);
  }
};

export const listMyOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await ordersService.listMyOrders(req.user!.id);

    res.status(200).json(success(orders));
  } catch (err) {
    next(err);
  }
};
