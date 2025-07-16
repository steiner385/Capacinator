import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Quick Smoke Test - Dev Environment', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('should load application and verify all pages', async ({ page }) => {
    // Go to homepage
    await helpers.gotoWithRetry('/');
    await helpers.setupPage();
    
    // Check main navigation exists
    await expect(page.locator('.sidebar, nav')).toBeVisible();
    
    // Test each main page loads with data
    const pages = [
      { name: 'Dashboard', url: '/', selector: 'text=Total Projects' },
      { name: 'Projects', url: '/projects', selector: 'th:has-text("Name")' },
      { name: 'People', url: '/people', selector: 'th:has-text("Email")' },
      { name: 'Assignments', url: '/assignments', selector: 'th:has-text("Allocation")' },
      { name: 'Roles', url: '/roles', selector: 'text=/Developer|Manager|Engineer/i' },
      { name: 'Import', url: '/import', selector: 'text=/Upload|Import|Excel/i' }
    ];
    
    for (const pageInfo of pages) {
      console.log(`Testing ${pageInfo.name} page...`);
      
      // Navigate to page
      await helpers.clickAndNavigate(`nav a:has-text("${pageInfo.name}")`, pageInfo.url);
      
      // Wait for page to load
      await helpers.waitForReactApp();
      
      // Verify page loaded
      await expect(page.locator(pageInfo.selector)).toBeVisible({ timeout: 10000 });
      
      // Check for data (except Import page)
      if (pageInfo.name !== 'Import') {
        const dataElements = await page.locator('tbody tr, .card, .data-item').count();
        expect(dataElements).toBeGreaterThan(0);
      }
    }
  });

  test('should verify API connectivity', async ({ page }) => {
    // Direct API tests
    const endpoints = [
      '/api/health',
      '/api/projects',
      '/api/people',
      '/api/roles',
      '/api/assignments',
      '/api/reporting/dashboard'
    ];
    
    for (const endpoint of endpoints) {
      const response = await page.request.get(endpoint);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toBeTruthy();
    }
  });

  test('should verify data relationships work', async ({ page }) => {
    // Go to assignments
    await helpers.gotoWithRetry('/assignments');
    await helpers.setupPage();
    await helpers.waitForDataLoad();
    
    // Click on a project link
    const projectLink = page.locator('tbody tr td:nth-child(1) a').first();
    if (await projectLink.isVisible()) {
      const projectName = await projectLink.textContent();
      await projectLink.click();
      await helpers.waitForNavigation();
      
      // Should be on project page
      expect(page.url()).toMatch(/\/projects\/[a-f0-9-]+$/);
      await expect(page.locator(`text=${projectName}`)).toBeVisible();
      
      // Go back
      await page.goBack();
      await helpers.waitForDataLoad();
      
      // Click on a person link
      const personLink = page.locator('tbody tr td:nth-child(2) a').first();
      const personName = await personLink.textContent();
      await personLink.click();
      await helpers.waitForNavigation();
      
      // Should be on person page
      expect(page.url()).toMatch(/\/people\/[a-f0-9-]+$/);
      await expect(page.locator(`text=${personName}`)).toBeVisible();
    }
  });

  test('should verify forms work', async ({ page }) => {
    // Test project creation form
    await helpers.gotoWithRetry('/projects');
    await helpers.setupPage();
    await helpers.waitForDataLoad();
    
    // Look for add button
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Form should appear
      await expect(page.locator('input[name="name"], input[placeholder*="name"]')).toBeVisible();
      
      // Cancel or close
      const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Close")');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }
  });

  test('should verify dashboard metrics update', async ({ page }) => {
    await helpers.gotoWithRetry('/');
    await helpers.setupPage();
    
    // Get all metric values
    const metricElements = page.locator('.metric-value, .text-3xl, .stat-value');
    const count = await metricElements.count();
    expect(count).toBeGreaterThan(0);
    
    // Each metric should have a numeric value
    for (let i = 0; i < count; i++) {
      const text = await metricElements.nth(i).textContent();
      expect(text).toMatch(/\d+/);
    }
  });
});

// Performance test
test.describe('Performance', () => {
  test('should load pages within acceptable time', async ({ page }) => {
    const helpers = new TestHelpers(page);
    const startTime = Date.now();
    
    await page.goto('/');
    await helpers.setupPage();
    
    const loadTime = Date.now() - startTime;
    console.log(`Initial load time: ${loadTime}ms`);
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    
    // Test navigation speed
    const navStart = Date.now();
    await helpers.navigateViaSidebar('Projects');
    await page.waitForLoadState('networkidle');
    
    const navTime = Date.now() - navStart;
    console.log(`Navigation time: ${navTime}ms`);
    
    // Navigation should be fast (under 2 seconds)
    expect(navTime).toBeLessThan(2000);
  });
});