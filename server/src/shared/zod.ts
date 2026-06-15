import type { ZodError } from 'zod';

export const formatZodError = (err: ZodError): string => {
  return err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
};
