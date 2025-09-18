module.exports = {
  // Use jsdom environment for client tests
  testEnvironment: 'jsdom',
  
  // Test file patterns - only client tests
  testMatch: [
    '**/client/**/*.(test|spec).[jt]s?(x)',
    '**/tests/unit/client/**/*.(test|spec).[jt]s?(x)'
  ],
  
  // Module name mapper
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@client/(.*)$': '<rootDir>/client/src/$1',
    '^@/(.*)$': '<rootDir>/client/src/$1'
  },
  
  // Transform TypeScript/TSX files
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', {
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
  
  // Setup files
  setupFiles: ['<rootDir>/tests/setup.client.js'],
  setupFilesAfterEnv: ['@testing-library/jest-dom']
};