module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests/unit/client'],
  testMatch: [
    '**/__tests__/**/*.test.tsx',
    '**/?(*.)+(spec|test).tsx'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        module: 'CommonJS',
        target: 'ES2020',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        lib: ['dom', 'dom.iterable', 'es6'],
        skipLibCheck: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        strict: false
      }
    }]
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@client/(.*)$': '<rootDir>/client/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/unit/client/setup/setup.ts'],
  collectCoverageFrom: [
    'client/src/**/*.{ts,tsx}',
    '!client/src/**/*.d.ts',
    '!client/src/**/*.test.{ts,tsx}',
    '!client/src/**/__tests__/**'
  ],
  coverageDirectory: 'coverage/client',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons']
  },
  setupFiles: ['<rootDir>/tests/unit/client/setup/jest-setup.js'],
};