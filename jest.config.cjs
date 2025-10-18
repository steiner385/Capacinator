module.exports = {
  // Root configuration
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Separate projects for server and client
  projects: [
    {
      displayName: 'server-unit',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/server/**/__tests__/**/*.test.ts',
        '<rootDir>/tests/unit/server/**/*.test.ts'
      ],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
      },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            resolveJsonModule: true,
            moduleResolution: 'node',
            target: 'ES2020',
            module: 'commonjs',
            isolatedModules: true
          }
        }]
      },
      setupFilesAfterEnv: ['<rootDir>/tests/unit/server/setup.ts']
    },
    {
      displayName: 'server-integration',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/tests/integration/**/*.test.ts'
      ],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
      },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            resolveJsonModule: true,
            moduleResolution: 'node',
            target: 'ES2020',
            module: 'commonjs',
            isolatedModules: true
          }
        }]
      },
      setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts']
    },
    {
      displayName: 'client',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/tests/unit/client/**/*.test.tsx',
        '<rootDir>/tests/unit/client/**/*.test.ts',
        '<rootDir>/client/src/**/__tests__/**/*.test.tsx',
        '<rootDir>/client/src/**/__tests__/**/*.test.ts'
      ],
      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '^@/(.*)$': '<rootDir>/client/src/$1',
        '^@client/(.*)$': '<rootDir>/client/src/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1'
      },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            jsx: 'react',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            resolveJsonModule: true,
            moduleResolution: 'node',
            target: 'ES2020',
            module: 'commonjs',
            isolatedModules: true
          }
        }]
      },
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup.client.js',
        '<rootDir>/tests/unit/client/setup/setup.ts'
      ]
    }
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/tests/e2e/',
    '\\.spec\\.ts$'
  ],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
};