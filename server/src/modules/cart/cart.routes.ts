import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.middleware.js';
import { addToCart, clearCart, getCart, removeFromCart, updateItem } from './cart.controller.js';

const cartRouter = Router();

cartRouter.use(requireAuth);

cartRouter.get('/', getCart);
cartRouter.post('/items', addToCart);
cartRouter.patch('/items/:productId', updateItem);
cartRouter.delete('/items', clearCart);
cartRouter.delete('/items/:productId', removeFromCart);

export default cartRouter;
