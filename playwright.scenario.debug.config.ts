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
    actionTimeout: 30000,
    navigationTimeout: 30000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'scenario-chrome',
      use: { ...devices['Desktop Chrome'] },
    }
  ],

  timeout: 60000,
  expect: {
    timeout: 30000
  },
});