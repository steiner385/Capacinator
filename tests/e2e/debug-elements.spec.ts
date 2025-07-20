import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Debug Page Elements', () => {
  let helpers: TestHelpers;

  test('should inspect page elements after profile selection', async ({ page }) => {
    test.setTimeout(90000);
    
    helpers = new TestHelpers(page);
    await helpers.gotoWithRetry('/reports');
    await helpers.setupPage(); // Handle profile selection
    
    // Wait for any content
    await page.waitForTimeout(5000);
    
    // Take a screenshot to see what we actually have
    await page.screenshot({ path: 'test-results/debug-page-content.png', fullPage: true });
    
    // Log the full HTML content to understand what's on the page
    const bodyContent = await page.content();
    console.log('========== PAGE HTML CONTENT ==========');
    console.log(bodyContent.substring(0, 2000) + '...');
    console.log('========================================');
    
    // Check URL
    console.log(`Current URL: ${page.url()}`);
    
    // Check page title
    console.log(`Page title: ${await page.title()}`);
    
    // Look for any div elements
    const divs = await page.locator('div').count();
    console.log(`Found ${divs} div elements`);
    
    // Look for any specific React elements
    const reactElements = await page.locator('[data-reactroot], #root, .App').count();
    console.log(`Found ${reactElements} React elements`);
    
    // Look for any text content
    const bodyText = await page.locator('body').textContent();
    console.log(`Body text: ${bodyText?.substring(0, 500)}...`);
    
    // Look for buttons
    const buttons = await page.locator('button').count();
    console.log(`Found ${buttons} buttons`);
    
    // Look for any links
    const links = await page.locator('a').count();
    console.log(`Found ${links} links`);
    
    // Look for nav elements
    const nav = await page.locator('nav, .nav, .navigation, .sidebar').count();
    console.log(`Found ${nav} navigation elements`);
    
    // Check if we're actually on the reports page
    expect(page.url()).toContain('/reports');
  });
});