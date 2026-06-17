// if no fallback is provided, throw error
export function getEnv(name: string, fallback: string): string;
export function getEnv(name: string): string;
export function getEnv(name: string, fallback?: string): string {
  const value = process.env[name];

  if (value !== undefined && value !== '') {
    return value;
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error(`Missing required env variable: ${name}`);
}
