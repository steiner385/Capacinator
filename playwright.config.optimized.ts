import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Optimized Playwright Configuration
 * Enhanced for parallel execution and performance
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* Fail fast on CI */
  forbidOnly: !!process.env.CI,
  
  /* Smart retry strategy */
  retries: process.env.CI ? 2 : 0,
  
  /* Optimized worker count for parallel execution */
  workers: process.env.CI ? 6 : 8,
  
  /* Fully parallel execution */
  fullyParallel: true,
  
  /* Reporter configuration with performance tracking */
  reporter: process.env.CI 
    ? [
        ['html'],
        ['github'],
        ['json', { outputFile: 'test-results/results.json' }],
        ['junit', { outputFile: 'test-results/junit.xml' }]
      ]
    : [
        ['list'],
        ['html', { open: 'never' }],
        ['json', { outputFile: 'test-results/results.json' }]
      ],
  
  /* Optimized timeouts */
  timeout: 45000, // Reduced from 60s
  
  /* Faster expect timeout */
  expect: {
    timeout: 5000 // Reduced from 10s
  },

  /* Global setup and teardown */
  globalSetup: './tests/e2e/helpers/e2e-global-setup.ts',
  globalTeardown: './tests/e2e/helpers/global-teardown.ts',
  
  /* Shared settings for all projects */
  use: {
    /* Base URL */
    baseURL: process.env.BASE_URL || 'http://localhost:3120',
    
    /* Trace only on failure to save resources */
    trace: 'retain-on-failure',
    
    /* Screenshots only on failure */
    screenshot: 'only-on-failure',
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
    
    /* Optimized timeouts */
    actionTimeout: 15000, // Reduced from 30s
    navigationTimeout: 20000, // Reduced from 30s
    
    /* Video only on failure */
    video: 'retain-on-failure',
    
    /* Standard viewport */
    viewport: { width: 1280, height: 720 },
    
    /* Locale and timezone */
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },

  /* Optimized test projects */
  projects: [
    // Quick smoke tests - Priority 1
    {
      name: 'smoke',
      testMatch: /.*smoke.*\.spec\.ts$/,
      use: { 
        ...devices['Desktop Chrome'],
        // Fastest settings for smoke tests
        navigationTimeout: 10000,
        actionTimeout: 10000,
        video: 'off',
      },
    },

    // API tests - No browser needed - Priority 2
    {
      name: 'api',
      testMatch: [
        /.*api.*\.spec\.ts$/,
        /suites\/api\/.*\.spec\.ts$/
      ],
      use: {
        // Minimal browser context for API tests
        browserName: 'chromium',
        headless: true,
        viewport: null,
        video: 'off',
        screenshot: 'off',
      },
    },

    // CRUD tests - Priority 3
    {
      name: 'crud',
      testMatch: /suites\/crud\/.*\.spec\.ts$/,
      use: { 
        ...devices['Desktop Chrome'],
        // Standard settings
      },
    },

    // Core functionality - Priority 4
    {
      name: 'core',
      testMatch: /suites\/core\/.*\.spec\.ts$/,
      use: { 
        ...devices['Desktop Chrome'],
      },
    },

    // Feature tests - Priority 5
    {
      name: 'features',
      testMatch: /suites\/features\/.*\.spec\.ts$/,
      use: { 
        ...devices['Desktop Chrome'],
      },
    },

    // Reports tests - Separate due to size
    {
      name: 'reports',
      testMatch: /suites\/reports\/.*\.spec\.ts$/,
      use: { 
        ...devices['Desktop Chrome'],
        // Reports may need more time
        timeout: 60000,
      },
    },

    // Scenario tests - Complex flows
    {
      name: 'scenarios',
      testMatch: /suites\/scenarios\/.*\.spec\.ts$/,
      timeout: 90000, // Longer timeout for complex scenarios
      use: { 
        ...devices['Desktop Chrome'],
        video: 'on', // Always record scenarios
      },
    },

    // Security tests
    {
      name: 'security',
      testMatch: /suites\/security\/.*\.spec\.ts$/,
      use: { 
        ...devices['Desktop Chrome'],
      },
    },

    // Integration tests
    {
      name: 'integration',
      testMatch: /suites\/integration\/.*\.spec\.ts$/,
      use: { 
        ...devices['Desktop Chrome'],
      },
    },

    // Performance tests - Run separately
    {
      name: 'performance',
      testMatch: /suites\/performance\/.*\.spec\.ts$/,
      workers: 2, // Limit workers for performance tests
      timeout: 120000,
      use: { 
        ...devices['Desktop Chrome'],
        video: 'on',
      },
    },

    // Cross-browser tests (optional)
    {
      name: 'firefox',
      testMatch: /.*@cross-browser.*\.spec\.ts$/,
      use: { ...devices['Desktop Firefox'] },
    },

    // Mobile tests (optional)
    {
      name: 'mobile',
      testMatch: /.*@mobile.*\.spec\.ts$/,
      use: { ...devices['iPhone 13'] },
    },
  ],

  /* Test artifacts */
  outputDir: 'test-results/',

  /* Configure web server */
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3120/api/health',
    timeout: 120 * 1000,
    reuseExistingServer: true,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});