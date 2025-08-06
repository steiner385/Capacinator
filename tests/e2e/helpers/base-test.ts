/**
 * Base test configuration with common setup
 * Uses the existing TestHelpers for consistency
 */

import { test as base, Page } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

// Define fixtures
type TestFixtures = {
  testHelpers: TestHelpers;
  authenticatedPage: Page;
};

// Extend base test with our fixtures
export const test = base.extend<TestFixtures>({
  // Test helpers fixture
  testHelpers: async ({ page }, use) => {
    const helpers = new TestHelpers(page);
    await use(helpers);
  },

  // Pre-authenticated page fixture
  authenticatedPage: async ({ page }, use) => {
    const helpers = new TestHelpers(page);
    
    // Navigate to home and setup page (handles authentication)
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await helpers.setupPage();
    
    // Ensure we're on dashboard after setup
    const currentUrl = page.url();
    if (!currentUrl.includes('/dashboard')) {
      try {
        await page.waitForURL('**/dashboard', { timeout: 10000 });
      } catch {
        // If not redirected to dashboard, navigate there manually
        await page.goto('/dashboard');
        await helpers.waitForPageContent();
      }
    }
    
    await use(page);
  },
});

// Re-export expect for convenience
export { expect } from '@playwright/test';

// Re-export useful functions from test-config
export { waitForPageReady, waitForApiCall, elementExists } from './test-config';