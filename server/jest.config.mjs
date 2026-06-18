/**
 * Jest configuration.
 *
 * The server is a native-ESM TypeScript project ("type": "module", nodenext,
 * verbatimModuleSyntax) whose source imports use explicit `.js` extensions. That
 * combination needs three things from Jest:
 *   1. ESM mode (run with NODE_OPTIONS=--experimental-vm-modules, see package.json).
 *   2. ts-jest transforming `.ts` with `useESM`.
 *   3. A moduleNameMapper that rewrites the `.js` extension on relative imports back
 *      to the TypeScript source so resolution succeeds.
 */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  // Strip the `.js` extension off relative imports so `./foo.js` resolves to `./foo.ts`.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }],
  },
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/*.test.ts'],
  // Reset mock state between tests so suites stay isolated.
  clearMocks: true,
};
