import { test, expect } from '@playwright/test';

test.describe('Debug Scenario Tests', () => {
  test('debug page structure', async ({ page }) => {
    // First go to the root to ensure app loads
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Now navigate to assignments
    await page.goto('/assignments');
    
    // Wait for React to mount and render
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/assignments-page.png' });
    
    // Log the page HTML structure
    const bodyHTML = await page.locator('body').innerHTML();
    console.log('Page HTML snippet:', bodyHTML.substring(0, 500));
    
    // Try different selectors
    const selectors = [
      '.assignments-page',
      '.page',
      '[data-testid="assignments"]',
      'div:has(h1:text("Assignments"))',
      'main',
      '#root > div'
    ];
    
    for (const selector of selectors) {
      const isVisible = await page.locator(selector).isVisible().catch(() => false);
      console.log(`Selector "${selector}": ${isVisible ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    // Check if we're on a loading or error page
    const hasLoading = await page.locator('text=/loading|spinner/i').isVisible().catch(() => false);
    const hasError = await page.locator('text=/error|failed/i').isVisible().catch(() => false);
    
    console.log('Has loading indicator:', hasLoading);
    console.log('Has error message:', hasError);
    
    // Try to find any visible content
    const visibleDivs = await page.locator('div:visible').count();
    console.log('Number of visible divs:', visibleDivs);
  });
});