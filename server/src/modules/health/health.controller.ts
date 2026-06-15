import type { Request, Response } from 'express';
import db from '../../db/postgres.db.js';

export const healthCheck = async (_req: Request, res: Response) => {
  try {
    await db.query('SELECT 1');

    res.status(200).json({ server: 'up', db: 'up' });
  } catch {
    res.status(503).json({ server: 'up', db: 'down' });
  }
};
