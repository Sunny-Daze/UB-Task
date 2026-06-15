import 'express';
import { UserRole } from '../constants/index.js';

declare module 'express' {
  interface Request {
    user?: {
      id: string;
      role: UserRole;
      username: string;
    };
  }
}
