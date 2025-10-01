import { test, expect } from '@playwright/test';

test.describe('Debug Scenarios Page', () => {
  test('debug scenarios page loading', async ({ page }) => {
    // Navigate to root first
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Try to navigate to scenarios
    await page.goto('/scenarios');
    
    // Wait a bit for React to render
    await page.waitForTimeout(3000);
    
    // Take a screenshot
    await page.screenshot({ path: 'test-results/scenarios-page.png' });
    
    // Check what's on the page
    const bodyText = await page.locator('body').innerText();
    console.log('Page text:', bodyText.substring(0, 500));
    
    // Try different selectors
    const selectors = [
      '.scenarios-page',
      'h1:has-text("Scenario Planning")',
      '.page-header',
      '.scenarios-hierarchy',
      'button:has-text("New Scenario")',
      '.scenario-card',
      '.hierarchy-row'
    ];
    
    for (const selector of selectors) {
      const isVisible = await page.locator(selector).isVisible().catch(() => false);
      console.log(`Selector "${selector}": ${isVisible ? 'FOUND' : 'NOT FOUND'}`);
    }
  });
});