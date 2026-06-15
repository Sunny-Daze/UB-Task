import { Router } from 'express';
import authRouter from './modules/auth/auth.routes.js';
import healthRouter from './modules/health/health.routes.js';

const appRouter = Router();

appRouter.use('/health', healthRouter);
appRouter.use('/auth', authRouter);

export default appRouter;
