import express from 'express';
import './db/postgres.db.js';
import appRouter from './appRoutes.routes.js';
import { requestLogger } from './middlewares/requestLogger.middleware.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';

const app = express();

app.use(requestLogger);
app.use(express.json());
app.use('/api/v1', appRouter);
app.use(errorHandler);

export default app;
