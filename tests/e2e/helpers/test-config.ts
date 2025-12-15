/**
 * Test configuration helpers for E2E tests
 * Provides environment-specific settings and utilities
 */

export const testConfig = {
  // Timeouts
  timeouts: {
    navigation: 30000,
    apiCall: 10000,
    elementVisible: 5000,
    modalAnimation: 500,
  },

  // Selectors
  selectors: {
    // Page layout
    mainContent: '.main-content, main, [role="main"]',
    sidebar: '.sidebar, nav',
    loading: '.loading, .spinner, [data-loading="true"]',
    
    // Modals
    modalOverlay: '.modal-overlay',
    modalDialog: '[role="dialog"]',
    
    // Forms
    submitButton: 'button[type="submit"]',
    cancelButton: 'button:has-text("Cancel")',
    
    // Tables
    dataTable: 'table tbody tr',
    emptyState: '.empty-state, [data-empty="true"]',
  },

  // API endpoints
  api: {
    health: '/api/health',
    projects: '/api/projects',
    phases: '/api/project-phases',
    people: '/api/people',
  },

  // Test data
  testData: {
    defaultTimeout: 10000,
    animationDelay: 300,
  }
};

/**
 * Wait for initial page load to complete
 */
export async function waitForPageReady(page: any) {
  // Wait for basic page structure
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for any loading indicators to disappear
  try {
    await page.waitForSelector(testConfig.selectors.loading, { 
      state: 'hidden', 
      timeout: testConfig.timeouts.elementVisible 
    });
  } catch {
    // No loading indicators or already hidden
  }
  
  // Wait for React to render by checking for any content
  await page.waitForLoadState('domcontentloaded', { timeout: testConfig.testData.animationDelay * 10 }).catch(() => {});
}

/**
 * Wait for API call to complete
 */
export async function waitForApiCall(page: any, urlPattern: string | RegExp) {
  return page.waitForResponse(
    (response: any) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern) && response.status() === 200;
      }
      return urlPattern.test(url) && response.status() === 200;
    },
    { timeout: testConfig.timeouts.apiCall }
  );
}

/**
 * Check if element exists without throwing
 */
export async function elementExists(page: any, selector: string): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { 
      state: 'visible', 
      timeout: 1000 
    });
    return true;
  } catch {
    return false;
  }
}