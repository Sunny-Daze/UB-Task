import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.middleware.js';
import { listMyOrders, placeOrder } from './orders.controller.js';

const ordersRouter = Router();

ordersRouter.use(requireAuth);

ordersRouter.post('/', placeOrder);
ordersRouter.get('/', listMyOrders);

export default ordersRouter;
