import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Reports Simple Test', () => {
  let helpers: TestHelpers;

  test('should successfully navigate to reports page and find content', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes
    
    helpers = new TestHelpers(page);
    
    console.log('🚀 Starting reports navigation test...');
    
    // Navigate to reports
    await helpers.gotoWithRetry('/reports');
    
    // Handle profile selection and setup
    await helpers.setupPage();
    
    // Take screenshot after setup
    await page.screenshot({ path: 'test-results/after-setup.png', fullPage: true });
    
    // Wait additional time for any content to load
    await page.waitForTimeout(5000);
    
    // Check what we have on the page
    const url = page.url();
    const title = await page.title();
    
    console.log(`📍 Current URL: ${url}`);
    console.log(`📄 Page title: ${title}`);
    
    // Check for various content types
    const elementCounts = await page.evaluate(() => {
      return {
        buttons: document.querySelectorAll('button').length,
        links: document.querySelectorAll('a').length,
        divs: document.querySelectorAll('div').length,
        tables: document.querySelectorAll('table').length,
        hasProfileModal: document.body.textContent?.includes('Select Your Profile') || false,
        hasReportTabs: document.querySelector('.tab, button.tab, .report-tabs') !== null,
        hasSummaryCards: document.querySelector('.summary-card') !== null,
        hasCharts: document.querySelector('.chart-container, .recharts-wrapper') !== null,
        bodyTextLength: document.body.textContent?.length || 0,
        bodyPreview: document.body.textContent?.substring(0, 200) || ''
      };
    });
    
    console.log('📊 Element counts:', elementCounts);
    
    // Check if profile selection was successful
    if (elementCounts.hasProfileModal) {
      console.log('⚠️ Profile modal still present - this may be expected for some test scenarios');
      await page.screenshot({ path: 'test-results/profile-modal-present.png', fullPage: true });
    } else {
      console.log('✅ Successfully navigated past profile selection');
      
      // Check for reports content
      if (elementCounts.hasReportTabs) {
        console.log('✅ Found report tabs');
      }
      
      if (elementCounts.hasSummaryCards) {
        console.log('✅ Found summary cards');
      }
      
      if (elementCounts.hasCharts) {
        console.log('✅ Found charts');
      }
      
      if (elementCounts.buttons > 0) {
        console.log(`✅ Found ${elementCounts.buttons} buttons`);
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/final-state.png', fullPage: true });
    
    // Basic assertion - we should be on the reports page
    expect(url).toContain('/reports');
    expect(title).toBe('Capacinator');
    
    // We should have moved past the profile selection
    expect(elementCounts.hasProfileModal).toBe(false);
    
    console.log('🎉 Test completed successfully');
  });
});