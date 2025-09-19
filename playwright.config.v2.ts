import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use consistent E2E ports
const E2E_PORTS = {
  server: parseInt(process.env.E2E_SERVER_PORT || '3111'),
  client: parseInt(process.env.E2E_CLIENT_PORT || '3121')
};

/**
 * Improved Playwright Configuration with Industry Best Practices
 */
export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: ['**/archived/**/*.spec.ts'],
  
  /* Fail the build on CI if test.only is committed */
  forbidOnly: !!process.env.CI,
  
  /* Retry configuration */
  retries: process.env.CI ? 2 : 1,
  
  /* Worker configuration - limit for stability */
  workers: process.env.CI ? 2 : 4,
  fullyParallel: true,
  
  /* Reporter configuration */
  reporter: process.env.CI 
    ? [['html'], ['github'], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['list', { printSteps: true }], ['html', { open: 'never' }]],
  
  /* Test timeout configuration */
  timeout: 60000,
  
  /* Expect assertion timeout */
  expect: {
    timeout: 10000,
    toHaveScreenshot: { maxDiffPixels: 100 }
  },

  /* Global setup and teardown - using v2 with better process management */
  globalSetup: './tests/e2e/helpers/e2e-global-setup-v2.ts',
  globalTeardown: './tests/e2e/helpers/e2e-global-teardown-v2.ts',
  
  /* Shared settings for all projects */
  use: {
    /* Base URL - using E2E client port */
    baseURL: process.env.BASE_URL || `http://localhost:${E2E_PORTS.client}`,
    
    /* API URL for direct API calls */
    extraHTTPHeaders: {
      'X-E2E-Test': 'true',
    },
    
    /* Storage state for authenticated tests */
    storageState: 'test-results/e2e-auth.json',
    
    /* Trace collection strategy */
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    
    /* Screenshot strategy */
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
    },
    
    /* Video recording */
    video: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    
    /* Network configuration */
    ignoreHTTPSErrors: true,
    offline: false,
    
    /* Timeout configuration */
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    /* Viewport */
    viewport: { width: 1280, height: 720 },
    
    /* Browser context options */
    contextOptions: {
      reducedMotion: 'reduce',
      strictSelectors: true,
    },
    
    /* Locale and timezone */
    locale: 'en-US',
    timezoneId: 'America/New_York',
    
    /* Permissions */
    permissions: [],
    
    /* Color scheme */
    colorScheme: 'light',
  },

  /* Test projects configuration */
  projects: [
    // Setup project - runs first to ensure auth state
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts$/,
      use: {
        storageState: undefined, // Don't use existing auth
      },
    },

    // Quick smoke tests
    {
      name: 'smoke',
      dependencies: ['setup'],
      testMatch: /.*smoke.*\.spec\.ts$/,
      use: { 
        ...devices['Desktop Chrome'],
        navigationTimeout: 15000,
      },
    },

    // Main test suite - Chrome
    {
      name: 'chromium',
      dependencies: ['setup'],
      testIgnore: [/.*smoke.*\.spec\.ts$/, /.*slow.*\.spec\.ts$/, /.*\.setup\.ts$/],
      use: { 
        ...devices['Desktop Chrome'],
        // Log browser console messages in non-CI environments
        launchOptions: process.env.CI ? {} : {
          args: ['--enable-logging'],
        },
      },
    },

    // Firefox cross-browser tests
    {
      name: 'firefox',
      dependencies: ['setup'],
      testMatch: /.*@cross-browser.*\.spec\.ts$/,
      use: { ...devices['Desktop Firefox'] },
    },

    // Safari/WebKit tests (macOS only)
    ...(process.platform === 'darwin' ? [{
      name: 'webkit',
      dependencies: ['setup'],
      testMatch: /.*@cross-browser.*\.spec\.ts$/,
      use: { ...devices['Desktop Safari'] },
    }] : []),

    // Mobile responsive tests
    {
      name: 'mobile',
      dependencies: ['setup'],
      testMatch: /.*mobile.*\.spec\.ts$/,
      use: { 
        ...devices['iPhone 13'],
        // Mobile-specific settings
        hasTouch: true,
        isMobile: true,
      },
    },

    // API tests (minimal browser, focus on API)
    {
      name: 'api',
      testMatch: /.*api.*\.spec\.ts$/,
      use: {
        // Minimal browser for API tests
        browserName: 'chromium',
        headless: true,
        viewport: null,
        // Direct API URL
        baseURL: `http://localhost:${E2E_PORTS.server}`,
      },
    },

    // Complex scenario tests
    {
      name: 'scenarios',
      dependencies: ['setup'],
      testMatch: /.*scenario.*\.spec\.ts$/,
      timeout: 120000, // 2 minutes for complex scenarios
      use: { 
        ...devices['Desktop Chrome'],
        video: 'on', // Always record scenarios
        trace: 'on', // Always trace scenarios
      },
    },

    // Performance tests
    {
      name: 'performance',
      testMatch: /.*performance.*\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-precise-memory-info'],
        },
      },
    },
  ],

  /* Output directory for test artifacts */
  outputDir: 'test-results/',

  /* Preserve output between test runs */
  preserveOutput: process.env.CI ? 'failures-only' : 'always',

  /* Configure web server - disabled as we use custom setup */
  webServer: undefined,

  /* Maximum time the whole test suite can run */
  globalTimeout: process.env.CI ? 30 * 60 * 1000 : undefined, // 30 min on CI

  /* Quiet mode */
  quiet: false,

  /* Update snapshots */
  updateSnapshots: process.env.UPDATE_SNAPSHOTS === 'true' ? 'all' : 'none',

  /* Snapshot configuration */
  snapshotDir: './tests/e2e/snapshots',
  snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{-snapshotSuffix}{ext}',
});