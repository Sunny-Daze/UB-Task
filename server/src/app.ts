import express from 'express';
import cors from 'cors';
import './db/postgres.db.js';
import appConfig from './config/app.config.js';
import appRouter from './appRoutes.routes.js';
import { requestLogger } from './middlewares/requestLogger.middleware.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';

const app = express();

app.use(
  cors({
    origin: appConfig.FE_BASE_URL,
    credentials: true,
  })
);

app.use(requestLogger);
app.use(express.json());
app.use('/api/v1', appRouter);
app.use(errorHandler);

export default app;
