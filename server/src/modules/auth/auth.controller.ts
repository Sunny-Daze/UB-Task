import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { formatZodError } from '../../shared/zod.js';
import { httpError } from '../../shared/httpError.js';
import { success } from '../../shared/httpSuccess.js';
import { loginSchema, signupSchema } from './auth.validation.js';
import * as authService from './auth.service.js';

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = signupSchema.parse(req.body);
    const result = await authService.signup(input);

    res.status(201).json(success(result));
  } catch (err) {
    if (err instanceof ZodError) {
      httpError(400, formatZodError(err));
    }
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);

    res.status(200).json(success(result));
  } catch (err) {
    if (err instanceof ZodError) {
      httpError(400, formatZodError(err));
    }
    next(err);
  }
};

export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getMe(req.user!.id);

    res.status(200).json(success(user));
  } catch (err) {
    next(err);
  }
};
