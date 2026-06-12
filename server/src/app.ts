import express from 'express';
import './db/postgres.db.js';

const app = express();

app.use(express.json());

export default app;