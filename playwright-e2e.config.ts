import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/html', open: 'never' }]
  ],
  use: {
    baseURL: 'https://localhost:3121',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
    ignoreHTTPSErrors: true, // For self-signed certs
  },
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  outputDir: 'test-results/artifacts',
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        actionTimeout: 10000,
        navigationTimeout: 30000,
      },
    },
  ],
  // No webServer - we'll use our existing E2E environment
});