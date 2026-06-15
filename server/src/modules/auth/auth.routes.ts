import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.middleware.js';
import { login, me, signup } from './auth.controller.js';

const authRouter = Router();

authRouter.post('/signup', signup);
authRouter.post('/login', login);
authRouter.get('/me', requireAuth, me);

export default authRouter;
