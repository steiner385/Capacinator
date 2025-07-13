import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/scenario-planning.spec.ts'],
  
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  
  reporter: [['line']],
  
  use: {
    baseURL: 'http://localhost:8093',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },

  projects: [
    {
      name: 'scenario-chrome',
      use: { ...devices['Desktop Chrome'] },
    }
  ],

  timeout: 30000,
  expect: {
    timeout: 10000
  },
});