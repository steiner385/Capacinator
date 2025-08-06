export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests/unit/client'],
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx)',
    '**/?(*.)+(spec|test).(ts|tsx)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json'
    }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@client/(.*)$': '<rootDir>/client/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^client/src/(.*)$': '<rootDir>/client/src/$1'
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
  moduleDirectories: ['node_modules', '<rootDir>'],
  modulePaths: ['<rootDir>']
};