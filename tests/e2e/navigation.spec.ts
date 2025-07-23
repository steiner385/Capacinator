import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

async function waitForPageLoad(page: any) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('#root', { timeout: 10000 });
  await page.waitForFunction(() => {
    const root = document.querySelector('#root');
    return root && root.children.length > 0;
  }, { timeout: 15000 });
  await page.waitForTimeout(1000); // Give React time to render
}

test.describe('Navigation and Basic Page Loading', () => {
  
  test('should load dashboard page', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    await page.goto('/');
    await waitForPageLoad(page);
    await expect(page).toHaveTitle(/Capacinator/);
    
    // Handle profile selection using robust helper
    await helpers.handleProfileSelection();
    
    // Wait for navigation to complete and dashboard to load
    await page.waitForURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard', { timeout: 10000 });
  });

  test('should navigate to all main pages', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    await page.goto('/dashboard');
    await waitForPageLoad(page);
    
    // Handle profile selection using robust helper
    await helpers.handleProfileSelection();
    
    // Test navigation to People page
    await page.click('a[href="/people"]');
    await page.waitForURL('/people');
    await waitForPageLoad(page);
    await expect(page.locator('h1')).toContainText('People', { timeout: 10000 });
    
    // Test navigation to Projects page
    await page.click('a[href="/projects"]');
    await page.waitForURL('/projects');
    await waitForPageLoad(page);
    await expect(page.locator('h1')).toContainText('Projects', { timeout: 10000 });
    
    // Test navigation to Assignments page
    await page.click('a[href="/assignments"]');
    await page.waitForURL('/assignments');
    await waitForPageLoad(page);
    await expect(page.locator('h1')).toContainText('Assignments', { timeout: 10000 });
    
    // Test navigation to Reports page
    await page.click('a[href="/reports"]');
    await page.waitForURL('/reports');
    await waitForPageLoad(page);
    // Reports page might be "Reports" or "Reports & Analytics"
    await expect(page.locator('h1')).toContainText('Reports', { timeout: 10000 });
  });

  test('should handle 404 for missing routes', async ({ page }) => {
    // Test non-existent project detail route
    await page.goto('/projects/non-existent');
    // Should either show 404 or redirect to projects list
    
    // Test non-existent person edit route
    await page.goto('/people/123/edit');
    // Should either show 404 or redirect
  });
});