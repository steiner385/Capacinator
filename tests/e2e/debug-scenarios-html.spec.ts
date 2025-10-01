import { test, expect } from '@playwright/test';

test.describe('Debug Scenarios HTML', () => {
  test('debug scenarios page HTML structure', async ({ page }) => {
    await page.goto('/scenarios');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Get the HTML of the scenarios content area
    const contentHTML = await page.locator('.scenarios-content').innerHTML();
    console.log('Scenarios content HTML:', contentHTML.substring(0, 1000));
    
    // Check for specific elements in the hierarchy
    const hierarchyExists = await page.locator('.scenarios-hierarchy').count();
    console.log('Hierarchy elements found:', hierarchyExists);
    
    // Look for rows with different selectors
    const rowSelectors = [
      '.hierarchy-row',
      '.hierarchy-content',
      'div:has-text("Current State Baseline")',
      '[class*="hierarchy"]',
      'div[class*="row"]'
    ];
    
    for (const selector of rowSelectors) {
      const count = await page.locator(selector).count();
      console.log(`Elements matching "${selector}": ${count}`);
    }
  });
});