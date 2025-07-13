export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*scenario*.test.ts',
    '**/__tests__/**/*conflict*.test.ts',
    '**/__tests__/**/*merge*.test.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 30000, // Longer timeout for database operations
  maxWorkers: 1, // Run tests serially to avoid database conflicts
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: [
    'src/server/api/controllers/ScenariosController.ts',
    'src/server/database/migrations/019_create_scenario_planning.ts',
    '!src/**/*.d.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage/scenarios',
  reporters: ['default']
};