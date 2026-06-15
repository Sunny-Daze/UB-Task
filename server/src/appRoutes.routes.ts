import { Router } from 'express';
import authRouter from './modules/auth/auth.routes.js';
import healthRouter from './modules/health/health.routes.js';
import productsRouter from './modules/products/products.routes.js';

const appRouter = Router();

appRouter.use('/health', healthRouter);
appRouter.use('/auth', authRouter);
appRouter.use('/products', productsRouter);

export default appRouter;
