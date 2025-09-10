/** @type {import('jest').Config} */
export default {
  // Use jsdom for React component tests
  testEnvironment: 'jsdom',
  
  // Setup TypeScript support
  preset: 'ts-jest/presets/default-esm',
  
  // Test file patterns - only client tests
  testMatch: [
    '**/client/**/__tests__/**/*.(test|spec).[jt]s?(x)',
    '**/client/**/?(*.)+(spec|test).[jt]s?(x)',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**'
  ],
  
  // Module name mapper for static assets and styles
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/tests/__mocks__/fileMock.js',
    '^@/(.*)$': '<rootDir>/client/src/$1'
  },
  
  // Transform settings
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.test.json',
      useESM: true
    }]
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'mjs'],
  
  // ESM support
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.client.ts'
  ],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks between tests
  restoreMocks: true
};