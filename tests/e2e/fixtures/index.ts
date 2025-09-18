/**
 * Unified E2E Test Fixtures
 * Provides consistent test setup across all e2e tests
 */

import { test as base, Page, APIRequestContext } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import { TestDataGenerator } from '../helpers/test-data-generator';
import { TestDataHelpers } from '../utils/test-data-helpers';
import fs from 'fs';
import path from 'path';

// Define fixture types
type TestFixtures = {
  testHelpers: TestHelpers;
  authenticatedPage: Page;
  apiContext: APIRequestContext;
  testData: TestDataGenerator;
  testDataHelpers: TestDataHelpers;
  seededDatabase: void;
};

// Extend base test with our fixtures
export const test = base.extend<TestFixtures>({
  // Test helpers fixture - provides common UI interactions
  testHelpers: async ({ page }, use) => {
    const helpers = new TestHelpers(page);
    await use(helpers);
  },

  // Pre-authenticated page fixture - handles profile selection automatically
  authenticatedPage: async ({ page, context }, use) => {
    const helpers = new TestHelpers(page);
    
    // Try to load saved auth state
    try {
      const authPath = path.resolve('test-results/e2e-auth.json');
      if (fs.existsSync(authPath)) {
        // Load saved storage state
        const storageState = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
        
        // Apply cookies and localStorage
        if (storageState.cookies && storageState.cookies.length > 0) {
          await context.addCookies(storageState.cookies);
        }
        if (storageState.origins && storageState.origins.length > 0) {
          for (const origin of storageState.origins) {
            if (origin.localStorage && origin.localStorage.length > 0) {
              await page.goto(origin.origin);
              await page.evaluate((items) => {
                for (const item of items) {
                  localStorage.setItem(item.name, item.value);
                }
              }, origin.localStorage);
            }
          }
        }
        console.log('✅ Loaded saved authentication state');
      }
    } catch (error) {
      console.log('⚠️ Could not load saved auth state:', error);
    }
    
    // Navigate to home
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Setup page (handles profile selection if needed)
    await helpers.setupPage();
    
    // Ensure we're authenticated and ready
    const currentUrl = page.url();
    if (!currentUrl.includes('/dashboard') && !currentUrl.includes('/projects') && !currentUrl.includes('/people')) {
      try {
        await page.waitForURL('**/dashboard', { timeout: 10000 });
      } catch {
        // If not redirected, navigate to dashboard
        await helpers.navigateTo('/dashboard');
      }
    }
    
    // Clear any notifications or modals
    await helpers.clearNotifications();
    
    await use(page);
  },

  // API context for direct API calls
  apiContext: async ({ playwright }, use) => {
    const apiContext = await playwright.request.newContext({
      baseURL: process.env.API_BASE_URL || 'http://localhost:3120',
      extraHTTPHeaders: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    await use(apiContext);
    await apiContext.dispose();
  },

  // Test data generator
  testData: async ({ apiContext }, use) => {
    const generator = new TestDataGenerator(apiContext);
    await use(generator);
  },

  // Test data helpers for isolated testing
  testDataHelpers: async ({ page, apiContext }, use) => {
    const helpers = new TestDataHelpers(page, apiContext);
    await use(helpers);
  },

  // Database seeding fixture - runs once per test
  seededDatabase: async ({ apiContext }, use) => {
    // TODO: Implement database seeding
    // For now, we'll assume the dev database has sufficient data
    await use();
    
    // Cleanup can go here if needed
  },
});

// Re-export expect and other utilities
export { expect } from '@playwright/test';
export { TestHelpers } from '../utils/test-helpers';
export { testConfig } from '../helpers/test-config';

// Test tags for categorization
export const tags = {
  smoke: '@smoke',
  crud: '@crud',
  reports: '@reports',
  critical: '@critical',
  slow: '@slow',
  flaky: '@flaky',
};

// Common test patterns
export const patterns = {
  /**
   * Standard CRUD test pattern
   */
  crud: (resourceName: string) => ({
    create: `should create a new ${resourceName}`,
    read: `should display ${resourceName} details`,
    update: `should update ${resourceName}`,
    delete: `should delete ${resourceName}`,
    list: `should list all ${resourceName}s`,
  }),
  
  /**
   * Standard navigation test pattern
   */
  navigation: (pageName: string) => ({
    load: `should load ${pageName} page`,
    navigate: `should navigate to ${pageName}`,
    breadcrumb: `should show correct breadcrumb for ${pageName}`,
  }),
};