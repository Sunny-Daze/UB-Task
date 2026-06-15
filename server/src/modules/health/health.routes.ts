import { Router } from 'express';
import { healthCheck } from './health.controller.js';

const healthRouter = Router();

healthRouter.get('/', healthCheck);

export default healthRouter;
