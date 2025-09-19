import { test, expect } from '@playwright/test';
import { TestHelpers , setupPageWithAuth} from './utils/test-helpers';

test.describe('Smoke Test - Basic Infrastructure', () => {
  
  test('should load application and authenticate', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // Navigate to home page
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Wait for React app to load
    await page.waitForSelector('#root', { timeout: 10000 });
    
    // Setup page (handles profile selection if needed)
    await helpers.setupPage();
    
    // Verify we're on dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    // Verify page title
    await expect(page).toHaveTitle(/Capacinator/);
    
    // Verify dashboard heading
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    
    const headingText = await heading.textContent();
    console.log('Dashboard heading:', headingText);
    
    // Verify navigation sidebar exists
    const sidebar = page.locator('.sidebar, nav').first();
    await expect(sidebar).toBeVisible();
    
    console.log('✅ Smoke test passed - application loads and authenticates successfully');
  });
  
  test('should navigate between main pages', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // Setup and go to dashboard
    await setupPageWithAuth(page, '/');
    await helpers.setupPage();
    
    // Navigate to Projects
    await page.click('a[href="/projects"]');
    await page.waitForURL('**/projects');
    await expect(page.locator('h1').first()).toContainText('Projects');
    
    // Navigate to People
    await page.click('a[href="/people"]');
    await page.waitForURL('**/people');
    await expect(page.locator('h1').first()).toContainText('People');
    
    // Navigate back to Dashboard
    await page.click('a[href="/dashboard"]');
    await page.waitForURL('**/dashboard');
    
    console.log('✅ Navigation test passed - can navigate between pages');
  });
});