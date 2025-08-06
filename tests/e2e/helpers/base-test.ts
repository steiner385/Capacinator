/**
 * Base test configuration with common setup
 * Extends Playwright's base test with auth helpers
 */

import { test as base, Page } from '@playwright/test';
import { AuthHelper } from './auth-helper';

// Define fixtures
type TestFixtures = {
  authHelper: AuthHelper;
  authenticatedPage: Page;
};

// Extend base test with our fixtures
export const test = base.extend<TestFixtures>({
  // Auth helper fixture
  authHelper: async ({ page }, use) => {
    const helper = new AuthHelper(page);
    await use(helper);
  },

  // Pre-authenticated page fixture
  authenticatedPage: async ({ page }, use) => {
    const authHelper = new AuthHelper(page);
    await authHelper.quickLogin();
    await use(page);
  },
});

// Re-export expect for convenience
export { expect } from '@playwright/test';

// Helper to wait for page content to load
export async function waitForPageContent(page: Page) {
  console.log('Waiting for page content to load...');
  
  // Wait for common layout elements
  const layoutChecks = [
    page.locator('.layout-container, .app-container, #app').first(),
    page.locator('.sidebar, nav').first(),
    page.locator('.main-content, main, [role="main"]').first()
  ];

  for (const element of layoutChecks) {
    try {
      await element.waitFor({ state: 'visible', timeout: 5000 });
      console.log(`✅ Found element: ${await element.evaluate(el => el.tagName + '.' + el.className)}`);
    } catch {
      console.log(`⚠️ Element not found, continuing...`);
    }
  }

  // Wait for any initial loading states to complete
  try {
    await page.waitForSelector('.loading, .spinner, [data-loading="true"]', { 
      state: 'hidden', 
      timeout: 5000 
    });
  } catch {
    // No loading indicators found or they're already hidden
  }

  // Give a moment for content to render
  await page.waitForTimeout(500);
}