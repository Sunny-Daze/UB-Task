import type { NextFunction, Request, Response } from 'express';
import { success } from '../../shared/httpSuccess.js';
import * as productsService from './products.service.js';

export const getProducts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await productsService.getAllProducts();

    res.status(200).json(success(products));
  } catch (err) {
    next(err);
  }
};
