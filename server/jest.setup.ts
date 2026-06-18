/**
 * Runs before any module is imported in a test file.
 *
 * `src/config/app.config.ts` reads DATABASE_URL and JWT_SECRET via getEnv() with no
 * fallback and throws at import time if they're missing. Several units under test pull
 * that config in transitively (anything touching shared/jwt.ts), so we seed dummy
 * values here. These are never used to open a real connection — the repository layer
 * is mocked in every test that would otherwise hit the database.
 */
process.env.JWT_SECRET ??= 'test-secret';
process.env.JWT_EXPIRES_IN ??= '7d';
process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';
