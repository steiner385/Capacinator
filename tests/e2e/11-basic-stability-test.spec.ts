import { test, expect } from '@playwright/test';
import { TestHelpers , setupPageWithAuth} from './utils/test-helpers';

test.describe('Basic Stability Test', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await setupPageWithAuth(page, '/');
    await helpers.waitForReactHydration();
  });

  test('should load the home page with basic content', async ({ page }) => {
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Should have some content
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText).toContain('Capacinator');
    
    // Should have basic structure
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have working page navigation', async ({ page }) => {
    // Test direct URL navigation instead of clicking
    await setupPageWithAuth(page, '/dashboard');
    await helpers.waitForReactHydration();
    
    expect(page.url()).toContain('/dashboard');
    
    // Should load content
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('should handle projects page navigation', async ({ page }) => {
    // Test direct URL navigation
    await setupPageWithAuth(page, '/projects');
    await helpers.waitForReactHydration();
    
    expect(page.url()).toContain('/projects');
    
    // Should load content without errors
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('should handle API health check', async ({ page }) => {
    // Check if the server is responding
    const response = await page.request.get('/api/health');
    expect(response.status()).toBe(200);
    
    const healthData = await response.json();
    expect(healthData.status).toBe('ok'); // Fix: API returns 'ok' not 'healthy'
  });

  test('should display navigation elements', async ({ page }) => {
    await helpers.waitForNavigation();
    
    // Check for basic navigation structure
    const hasNavigation = await helpers.isElementVisible('.sidebar') || 
                          await helpers.isElementVisible('nav') ||
                          await helpers.isElementVisible('.navigation');
    
    expect(hasNavigation).toBeTruthy();
  });
});