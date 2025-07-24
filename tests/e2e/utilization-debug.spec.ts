import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test('Debug utilization report page structure', async ({ page }) => {
  const testHelpers = new TestHelpers(page);
  await page.goto('/');
  await testHelpers.handleProfileSelection();
  
  // Navigate to reports page first
  await page.goto('/reports');
  await page.waitForLoadState('networkidle');
  
  // Navigate to utilization report
  console.log('Looking for Utilization Report button...');
  const utilizationButton = page.locator('button:has-text("Utilization Report")');
  const buttonCount = await utilizationButton.count();
  console.log(`Found ${buttonCount} Utilization Report buttons`);
  
  if (buttonCount > 0) {
    await utilizationButton.click();
    console.log('Clicked Utilization Report button');
    
    await page.waitForTimeout(5000);
    
    // Debug page content
    console.log('=== PAGE CONTENT DEBUG ===');
    
    // Check for headings
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    console.log('Headings found:', headings);
    
    // Check for tables
    const tables = await page.locator('table').count();
    console.log(`Tables found: ${tables}`);
    
    if (tables > 0) {
      const tableHeaders = await page.locator('th').allTextContents();
      console.log('Table headers:', tableHeaders);
    }
    
    // Check for buttons
    const buttons = await page.locator('button').allTextContents();
    console.log('Buttons found:', buttons.slice(0, 10)); // First 10 buttons
    
    // Check for any utilization text
    const pageText = await page.textContent('body');
    const hasUtilization = pageText?.includes('utilization') || pageText?.includes('Utilization');
    console.log(`Page contains utilization text: ${hasUtilization}`);
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/utilization-debug.png', fullPage: true });
    console.log('Screenshot saved to /tmp/utilization-debug.png');
    
    // Check URL
    console.log('Current URL:', page.url());
    
  } else {
    console.log('No Utilization Report button found');
    
    // Debug what buttons are available
    const allButtons = await page.locator('button').allTextContents();
    console.log('Available buttons:', allButtons);
    
    await page.screenshot({ path: '/tmp/no-utilization-button.png', fullPage: true });
  }
});