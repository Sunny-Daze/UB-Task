import { z } from 'zod';
import { UserRole } from '../../constants/index.js';

export const signupSchema = z.object({
  username: z.string().min(3).max(100),
  password: z.string().min(3).max(100),
  role: z.enum([UserRole.USER, UserRole.ADMIN]),
});

export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
