import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { httpError } from '../../shared/httpError.js';
import { success } from '../../shared/httpSuccess.js';
import { formatZodError } from '../../shared/zod.js';
import * as cartService from './cart.service.js';
import { addItemSchema, productIdParamSchema, updateItemSchema } from './cart.validation.js';

export const getCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cart = await cartService.getActiveCart(req.user!.id);

    res.status(200).json(success(cart));
  } catch (err) {
    next(err);
  }
};

export const addToCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = addItemSchema.parse(req.body);
    const cart = await cartService.addItem(req.user!.id, input);

    res.status(200).json(success(cart));
  } catch (err) {
    if (err instanceof ZodError) {
      throw httpError(400, formatZodError(err));
    }
    next(err);
  }
};

export const updateItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = productIdParamSchema.parse(req.params);
    const input = updateItemSchema.parse(req.body);
    const cart = await cartService.updateItem(req.user!.id, productId, input);

    res.status(200).json(success(cart));
  } catch (err) {
    if (err instanceof ZodError) {
      throw httpError(400, formatZodError(err));
    }
    next(err);
  }
};

export const removeFromCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = productIdParamSchema.parse(req.params);
    const cart = await cartService.removeItem(req.user!.id, productId);

    res.status(200).json(success(cart));
  } catch (err) {
    if (err instanceof ZodError) {
      throw httpError(400, formatZodError(err));
    }
    next(err);
  }
};

export const clearCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cart = await cartService.clearCart(req.user!.id);

    res.status(200).json(success(cart));
  } catch (err) {
    next(err);
  }
};
