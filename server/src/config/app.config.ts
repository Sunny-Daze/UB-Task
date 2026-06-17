import 'dotenv/config';
import { getEnv } from '../shared/env.js';

const appConfig = {
  PORT: Number(getEnv('PORT', '8000')),
  DB_URL: getEnv('DATABASE_URL'),
  JWT_SECRET: getEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '7d'),
  FE_BASE_URL: getEnv('FE_BASE_URL', 'http://localhost:5173'),
};

export default appConfig;
