import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('Missing required environment variable: DATABASE_URL');
}
if (!process.env.JWT_SECRET) {
  throw new Error('Missing required environment variable: JWT_SECRET');
}

const appConfig = {
  PORT: process.env.PORT || 8000,
  DB_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
};

export default appConfig;
