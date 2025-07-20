import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Reports Debug', () => {
  let helpers: TestHelpers;

  test('should debug API calls and error messages', async ({ page }) => {
    test.setTimeout(180000);
    
    // Listen for console logs and network requests
    const consoleLogs: any[] = [];
    const networkRequests: any[] = [];
    const networkResponses: any[] = [];
    
    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
    });
    
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        networkResponses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });
    
    helpers = new TestHelpers(page);
    console.log('🔍 Starting debug test for Reports page...');
    
    await helpers.gotoWithRetry('/reports');
    await helpers.setupPage();
    await helpers.waitForReactApp();
    await page.waitForLoadState('networkidle');
    
    // Wait for potential API calls
    await page.waitForTimeout(10000);
    
    console.log('📱 Console logs:');
    consoleLogs.forEach((log, i) => {
      console.log(`  ${i + 1}. [${log.type}] ${log.text}`);
    });
    
    console.log('🌐 Network requests made:');
    networkRequests.forEach((req, i) => {
      console.log(`  ${i + 1}. ${req.method} ${req.url}`);
    });
    
    console.log('📡 Network responses:');
    networkResponses.forEach((res, i) => {
      console.log(`  ${i + 1}. ${res.status} ${res.statusText} - ${res.url}`);
    });
    
    // Check DOM structure
    const domInfo = await page.evaluate(() => {
      const body = document.body;
      return {
        childCount: body.children.length,
        innerHTML: body.innerHTML.substring(0, 500),
        hasReactRoot: !!document.querySelector('#root'),
        reactRootContent: document.querySelector('#root')?.innerHTML.substring(0, 200)
      };
    });
    
    console.log('🏗️ DOM structure:');
    console.log(`  Body children: ${domInfo.childCount}`);
    console.log(`  Has React root: ${domInfo.hasReactRoot}`);
    console.log(`  React root content: "${domInfo.reactRootContent}"`);
    
    // Check for specific React Query or API client errors
    const reactQueryErrors = await page.evaluate(() => {
      return (window as any).__REACT_QUERY_STATE__ || 'No React Query state found';
    });
    
    console.log('⚛️ React Query state:', reactQueryErrors);
    
    // Take screenshot for visual debugging
    await page.screenshot({ 
      path: `test-results/reports-debug-${Date.now()}.png`, 
      fullPage: true 
    });
    
    // Test passes as long as we can navigate - this is purely diagnostic
    expect(page.url()).toContain('/reports');
  });
});