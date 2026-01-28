import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Windows installer testing
 *
 * These tests install the full Electron application, launch it, and verify
 * that it starts without critical errors. They are slower than regular E2E tests
 * and should be run separately.
 */
export default defineConfig({
  testDir: './tests/installer/specs',

  // Long timeout for installer operations
  timeout: 300000, // 5 minutes per test

  expect: {
    timeout: 30000 // 30 seconds for assertions
  },

  // Run tests sequentially - installer tests can't run in parallel
  fullyParallel: false,

  // No retries for installer tests - they're too slow
  retries: 0,

  // Single worker
  workers: 1,

  // Reporter configuration
  reporter: [
    ['html', {
      outputFolder: 'playwright-report/installer',
      open: 'never'
    }],
    ['list'],
    ['json', {
      outputFile: 'playwright-report/installer-results.json'
    }]
  ],

  use: {
    // Always capture trace on failure
    trace: 'on-first-retry',

    // Always take screenshots on failure
    screenshot: 'only-on-failure',

    // Always record video on failure
    video: 'retain-on-failure',

    // Long action timeout
    actionTimeout: 30000,

    // Long navigation timeout
    navigationTimeout: 30000
  },

  projects: [
    {
      name: 'installer-tests',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
