module.exports = {
  // Use Node environment for server tests
  testEnvironment: 'node',
  
  // Test file patterns - exclude E2E tests  
  testMatch: [
    '**/__tests__/**/*.(test|spec).[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
    '!**/tests/e2e/**',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**'
  ],
  
  // Ignore E2E test directories
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/', 
    '/build/',
    '/tests/e2e/',
    '\\.spec\\.ts$'
  ],
  
  // Module name mapper
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  
  // Transform TypeScript files
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        allowJs: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'react',
        lib: ['ES2022', 'DOM'],
        module: 'commonjs',
        target: 'ES2022',
        moduleResolution: 'node',
        strict: false
      }
    }]
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Globals
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  }
};