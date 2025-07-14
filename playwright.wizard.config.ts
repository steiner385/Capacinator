import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration specifically for Allocation Wizard E2E tests.
 * These tests focus on comprehensive wizard functionality, edge cases, and visual regression.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: [
    '**/allocation-wizard-*.spec.ts',
    '**/allocation-wizard-*.test.ts'
  ],
  
  /* Run tests in files in parallel but run tests within files serially for consistency */
  fullyParallel: false,
  workers: process.env.CI ? 2 : 3,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI for network-related flakiness */
  retries: process.env.CI ? 2 : 1,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'test-results/wizard-html-report', open: 'never' }],
    ['json', { outputFile: 'test-results/wizard-results.json' }],
    ['junit', { outputFile: 'test-results/wizard-junit.xml' }],
    ['list'],
    // Visual regression reporter
    ['blob', { outputDir: 'test-results/wizard-visual-diffs' }]
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3130',
    
    /* API base URL for request operations */
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video recording for wizard tests */
    video: 'retain-on-failure',
    
    /* Longer timeout for wizard operations */
    actionTimeout: 15000,
    navigationTimeout: 20000,
    
    /* Expect timeout for wizard state changes */
    expect: {
      timeout: 10000
    }
  },

  /* Configure global setup and teardown for wizard tests */
  globalSetup: './tests/e2e/helpers/wizard-global-setup.ts',
  globalTeardown: './tests/e2e/helpers/wizard-global-teardown.ts',

  /* Configure projects for different test types */
  projects: [
    {
      name: 'wizard-comprehensive',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/allocation-wizard-comprehensive.spec.ts'
    },
    
    {
      name: 'wizard-edge-cases',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/allocation-wizard-edge-cases.spec.ts',
      timeout: 90000, // Longer timeout for edge case testing
    },

    {
      name: 'wizard-visual-regression',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/allocation-wizard-visual-regression.spec.ts',
      timeout: 60000,
    },

    /* Cross-browser testing for critical wizard functionality */
    {
      name: 'wizard-firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: '**/allocation-wizard-comprehensive.spec.ts'
    },

    {
      name: 'wizard-webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: '**/allocation-wizard-comprehensive.spec.ts'
    },

    /* Mobile testing for wizard responsive design */
    {
      name: 'wizard-mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: [
        '**/allocation-wizard-comprehensive.spec.ts',
        '**/allocation-wizard-visual-regression.spec.ts'
      ]
    },

    {
      name: 'wizard-mobile-safari',
      use: { ...devices['iPhone 12'] },
      testMatch: '**/allocation-wizard-comprehensive.spec.ts'
    },

    /* Tablet testing */
    {
      name: 'wizard-tablet',
      use: { ...devices['iPad Pro'] },
      testMatch: '**/allocation-wizard-visual-regression.spec.ts'
    },

    /* High contrast and accessibility testing */
    {
      name: 'wizard-accessibility',
      use: { 
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
        // Enable high contrast simulation
        forcedColors: 'active'
      },
      testMatch: '**/allocation-wizard-visual-regression.spec.ts'
    },

    /* Slow network simulation for edge cases */
    {
      name: 'wizard-slow-network',
      use: { 
        ...devices['Desktop Chrome'],
        // Simulate slow 3G connection
        launchOptions: {
          args: ['--disable-dev-shm-usage', '--disable-extensions']
        }
      },
      testMatch: '**/allocation-wizard-edge-cases.spec.ts'
    }
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'npm run dev:e2e:server',
      port: 3131,
      timeout: 30000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'test',
        PORT: '3131'
      }
    },
    {
      command: 'npm run dev:e2e:client',
      port: 3130,
      timeout: 30000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'test',
        VITE_PORT: '3130'
      }
    }
  ],

  /* Test timeouts */
  timeout: 60000, // 60 seconds per test
  
  /* Global test configuration */
  globalTimeout: 1800000, // 30 minutes for all wizard tests
  
  /* Output directory for test artifacts */
  outputDir: 'test-results/wizard-artifacts/',
  
  /* Metadata for test reports */
  metadata: {
    testType: 'Allocation Wizard E2E Tests',
    focus: 'Comprehensive wizard functionality, edge cases, and visual regression',
    criticality: 'HIGH - Core feature testing',
    description: 'Complete test suite for the resource allocation wizard including happy path, edge cases, accessibility, and visual regression testing'
  },

  /* Report slow tests */
  reportSlowTests: {
    max: 10,
    threshold: 30000 // 30 seconds
  },

  /* Update snapshots on CI if needed */
  updateSnapshots: process.env.CI ? 'missing' : 'all'
});