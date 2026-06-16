import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { httpError } from '../../shared/httpError.js';
import { success } from '../../shared/httpSuccess.js';
import { formatZodError } from '../../shared/zod.js';
import * as couponsService from './coupons.service.js';
import { createConfigSchema } from './coupons.validation.js';

export const createConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createConfigSchema.parse(req.body);
    const config = await couponsService.createConfiguration(input);

    res.status(201).json(success(config));
  } catch (err) {
    if (err instanceof ZodError) {
      throw httpError(400, formatZodError(err));
    }
    next(err);
  }
};

export const listIssuedCoupons = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const coupons = await couponsService.listIssuedCoupons();

    res.status(200).json(success(coupons));
  } catch (err) {
    next(err);
  }
};

export const listMyCoupons = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupons = await couponsService.listMyCoupons(req.user!.id);

    res.status(200).json(success(coupons));
  } catch (err) {
    next(err);
  }
};

export const getStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await couponsService.getStats();

    res.status(200).json(success(stats));
  } catch (err) {
    next(err);
  }
};
