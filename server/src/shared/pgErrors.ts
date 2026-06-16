import { DatabaseError } from 'pg';

export const isUniqueViolation = (err: unknown): boolean =>
  err instanceof DatabaseError && err.code === '23505';
