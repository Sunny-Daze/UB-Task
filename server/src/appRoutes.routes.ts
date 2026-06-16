import { Router } from 'express';
import authRouter from './modules/auth/auth.routes.js';
import cartRouter from './modules/cart/cart.routes.js';
import couponsRouter from './modules/coupons/coupons.routes.js';
import healthRouter from './modules/health/health.routes.js';
import ordersRouter from './modules/orders/orders.routes.js';
import productsRouter from './modules/products/products.routes.js';

const appRouter = Router();

appRouter.use('/health', healthRouter);
appRouter.use('/auth', authRouter);
appRouter.use('/products', productsRouter);
appRouter.use('/cart', cartRouter);
appRouter.use('/coupons', couponsRouter);
appRouter.use('/orders', ordersRouter);

export default appRouter;
