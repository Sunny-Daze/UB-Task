import dotenv from 'dotenv/config';

const appConfig = {
  PORT: process.env.PORT || 8000,
  DB_URL: process.env.DATABASE_URL,
};

export default appConfig;
