/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/__tests__/**/*.test.ts'],
  clearMocks: true,
  // Ownership-scoping and auth-identity tests hit a real (in-memory)
  // Mongo instance and can take a few seconds to spin up on first run.
  testTimeout: 30000,
  collectCoverageFrom: [
    'middleware/checkJwt.ts',
    'controller/noteController.ts',
    'controller/userController.ts',
    'routes/notes.ts',
    'routes/userSettings.ts',
  ],
};