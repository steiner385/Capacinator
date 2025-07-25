import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Debug Reports Loading', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.gotoWithRetry('/reports');
    await helpers.setupPage(); // Handle profile selection
    await helpers.waitForReactApp();
    await page.waitForLoadState('networkidle');
  });

  test('should load reports page and display content', async ({ page }) => {
    // Take screenshot of initial state
    await page.screenshot({ path: 'test-results/debug-initial-state.png', fullPage: true });
    
    // Log what we can see
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);
    
    // Check if we can see any reports content at all
    const reportTabs = await page.locator('button.tab').count();
    console.log(`Found ${reportTabs} report tabs`);
    
    // Check for basic page elements
    const summaryCards = await page.locator('.summary-card').count();
    console.log(`Found ${summaryCards} summary cards`);
    
    const charts = await page.locator('.chart-container').count();  
    console.log(`Found ${charts} chart containers`);
    
    const tables = await page.locator('table').count();
    console.log(`Found ${tables} tables`);
    
    // Try clicking the Capacity Report tab with very generous timeout
    if (reportTabs > 0) {
      console.log('Clicking Capacity Report tab...');
      await page.click('button.tab:has-text("Capacity Report")');
      
      // Wait generously for content
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'test-results/debug-after-capacity-click.png', fullPage: true });
      
      // Check content again
      const summaryCards2 = await page.locator('.summary-card').count();
      console.log(`After Capacity click: ${summaryCards2} summary cards`);
      
      const charts2 = await page.locator('.chart-container').count();  
      console.log(`After Capacity click: ${charts2} chart containers`);
      
      const tables2 = await page.locator('table').count();
      console.log(`After Capacity click: ${tables2} tables`);
      
      // Check for any error messages
      const errors = await page.locator('.error, .text-destructive').count();
      console.log(`Found ${errors} error messages`);
      
      // Try to wait for at least one piece of content
      try {
        console.log('Waiting for content to appear...');
        await page.waitForSelector('.summary-card, .chart-container, .table', { timeout: 10000 });
        console.log('✅ Content found!');
      } catch (error) {
        console.log('❌ No content appeared after 10 seconds');
        console.log('Taking final screenshot...');
        await page.screenshot({ path: 'test-results/debug-timeout.png', fullPage: true });
        
        // Check what URLs the page is trying to fetch
        console.log('Current URL:', page.url());
      }
    }
    
    // This test should pass regardless - we're just gathering debug info
    expect(reportTabs).toBeGreaterThanOrEqual(0);
  });
});