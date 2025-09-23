import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'path';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 6,
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results.json' }]
  ],
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000 // 10 seconds for expect
  },
  use: {
    baseURL: 'http://localhost:3120',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000
  },

  projects: [
    // Quick smoke tests - run first
    {
      name: 'smoke',
      testMatch: /\.(smoke|quick).*\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] }
    },
    // Critical path tests
    {
      name: 'critical',
      testMatch: /@critical/,
      use: { ...devices['Desktop Chrome'] }
    },
    // CRUD operations
    {
      name: 'crud',
      testMatch: /crud\/.*\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['smoke']
    },
    // All other tests
    {
      name: 'chromium',
      testIgnore: [
        /\.(smoke|quick).*\.spec\.ts$/,
        /crud\/.*\.spec\.ts$/,
        /@critical/
      ],
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['smoke']
    }
  ],

  globalSetup: resolve(__dirname, 'helpers/e2e-global-setup.ts'),
  globalTeardown: resolve(__dirname, 'helpers/e2e-global-teardown.ts'),
  
  webServer: {
    command: 'npm run dev',
    port: 3120,
    timeout: 120 * 1000,
    reuseExistingServer: true,
    env: {
      NODE_ENV: 'test',
      TEST_MODE: 'e2e',
      DATABASE_URL: process.env.E2E_DATABASE_URL || 'sqlite::memory:',
      PORT: '3120'
    }
  }
});