import type { NextFunction, Request, Response } from 'express';
import { httpError } from '../shared/httpError.js';
import { verifyJwt } from '../shared/jwt.js';

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw httpError(401, 'Unauthorized');
    }

    const token = header.slice(7);
    const payload = verifyJwt(token);

    req.user = { id: payload.id, role: payload.role, username: payload.username };

    next();
  } catch {
    throw httpError(401, 'Unauthorized');
  }
};
