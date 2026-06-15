import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.middleware.js';
import { getProducts } from './products.controller.js';

const productsRouter = Router();

productsRouter.get('/', requireAuth, getProducts);

export default productsRouter;
