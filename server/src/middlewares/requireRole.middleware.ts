import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../constants/index.js';
import { httpError } from '../shared/httpError.js';

export const requireRole = (role: UserRole) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      throw httpError(403, 'Forbidden');
    }
    next();
  };
};
