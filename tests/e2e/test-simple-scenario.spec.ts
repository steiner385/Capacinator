import { test, expect } from '@playwright/test';

test.describe('Simple Scenario Test', () => {
  test('should show scenarios page after navigation', async ({ page }) => {
    // Start by going to the main page
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot to see what's displayed
    await page.screenshot({ path: 'debug-homepage.png' });
    
    // Try to navigate to scenarios
    await page.goto('/scenarios');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot to see what's displayed
    await page.screenshot({ path: 'debug-scenarios.png' });
    
    // Check if we can see any content
    const pageContent = await page.content();
    console.log('Page content length:', pageContent.length);
    
    // Check if the scenarios page header is visible
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    
    const heading = await page.locator('h1').textContent();
    console.log('Page heading:', heading);
  });
});