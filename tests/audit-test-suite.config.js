module.exports = {
  displayName: 'Audit Test Suite',
  testMatch: [
    // Unit tests
    '**/tests/unit/**/audit*.test.ts',
    '**/tests/unit/**/*audit*.test.ts',
    '**/tests/unit/**/enhancedAudit*.test.ts',
    
    // Integration tests
    '**/tests/integration/**/audit*.test.ts',
    '**/tests/integration/**/*audit*.test.ts',
    '**/tests/integration/**/enhancedAudit*.test.ts',
    '**/tests/integration/**/enhancedControllerAudit*.test.ts',
    
    // E2E tests
    '**/tests/e2e/**/audit*.spec.ts',
    '**/tests/e2e/**/*audit*.spec.ts',
    '**/tests/e2e/suites/audit/*.spec.ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.old$/',
    '/dist/'
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'ESNext',
        target: 'ES2022',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true
      }
    }]
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/server/services/audit/**/*.ts',
    'src/server/middleware/*audit*.ts',
    'src/server/middleware/enhancedAudit*.ts',
    'src/server/api/controllers/Enhanced*.ts',
    'src/server/config/auditConfig.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};