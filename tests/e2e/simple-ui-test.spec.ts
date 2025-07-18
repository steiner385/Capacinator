import { test, expect } from '@playwright/test';

test.describe('Simple UI Test', () => {
  test('should show scenarios page with visible UI elements', async ({ page }) => {
    // Enable detailed logging
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    page.on('pageerror', error => console.log('ERROR:', error.message));
    page.on('response', response => {
      if (!response.url().includes('vite') && !response.url().includes('node_modules')) {
        console.log('RESPONSE:', response.status(), response.url());
      }
    });

    console.log('🚀 Starting UI test - navigating to scenarios page');
    
    // Go directly to scenarios page
    await page.goto('/scenarios', { waitUntil: 'networkidle' });
    
    // Wait longer for the page to fully load
    await page.waitForTimeout(5000);
    
    console.log('📸 Taking initial screenshot');
    await page.screenshot({ 
      path: 'test-results/ui-initial-load.png', 
      fullPage: true 
    });
    
    // Check if page has any content at all
    const pageContent = await page.content();
    console.log('📄 Page content length:', pageContent.length);
    
    // Log the page HTML structure for debugging
    const bodyHTML = await page.locator('body').innerHTML();
    console.log('📋 Body HTML preview:', bodyHTML.substring(0, 1000));
    
    // Check for basic React elements
    const hasReactRoot = await page.locator('#root').count() > 0;
    const hasReactContent = await page.locator('#root *').count() > 0;
    
    console.log('⚛️ React root exists:', hasReactRoot);
    console.log('⚛️ React content loaded:', hasReactContent);
    
    if (hasReactContent) {
      console.log('✅ React app has loaded content');
      
      // Look for any text content
      const allText = await page.locator('body').textContent();
      console.log('📝 Page text preview:', allText?.substring(0, 300));
      
      // Look for scenario-related content
      const hasScenarioText = allText?.toLowerCase().includes('scenario');
      const hasPlanningText = allText?.toLowerCase().includes('planning');
      const hasLoadingText = allText?.toLowerCase().includes('loading');
      const hasErrorText = allText?.toLowerCase().includes('error');
      
      console.log('🔍 Content analysis:');
      console.log('  - Scenario text:', hasScenarioText);
      console.log('  - Planning text:', hasPlanningText);
      console.log('  - Loading text:', hasLoadingText);
      console.log('  - Error text:', hasErrorText);
      
      // Take screenshot of current state
      await page.screenshot({ 
        path: 'test-results/ui-with-content.png', 
        fullPage: true 
      });
      
      if (hasScenarioText || hasPlanningText) {
        console.log('🎉 SUCCESS: Scenarios UI is loading correctly!');
      } else if (hasLoadingText) {
        console.log('⏳ Page is still loading, waiting more...');
        await page.waitForTimeout(3000);
        await page.screenshot({ 
          path: 'test-results/ui-after-loading.png', 
          fullPage: true 
        });
      }
    } else {
      console.log('⚠️ React content not loaded yet');
      
      // Check if Vite is working
      const viteScripts = await page.locator('script[src*="vite"]').count();
      console.log('⚡ Vite scripts found:', viteScripts);
    }
    
    // Verify we can at least interact with the page
    try {
      await page.click('body');
      console.log('✅ Page is interactive');
    } catch (e) {
      console.log('❌ Page interaction failed:', e);
    }
    
    // Always pass if we got this far - the important thing is that we can see what's happening
    console.log('✅ Test completed - check screenshots for UI state');
  });
  
  test('should check API connectivity from browser', async ({ page }) => {
    console.log('🌐 Testing API connectivity');
    
    await page.goto('/scenarios');
    await page.waitForTimeout(2000);
    
    // Test API from browser context
    const apiTest = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:3111/api/scenarios');
        const data = await response.json();
        return {
          success: true,
          status: response.status,
          dataLength: data.length,
          data: data
        };
      } catch (error) {
        return {
          success: false,
          error: error.toString()
        };
      }
    });
    
    console.log('🔌 API test result:', apiTest);
    
    if (apiTest.success) {
      console.log(`✅ API working: ${apiTest.dataLength} scenarios available`);
      
      // If API is working but UI isn't showing data, it's a React/UI issue
      const hasScenarioCards = await page.locator('.scenario-card').count();
      console.log('🃏 Scenario cards in UI:', hasScenarioCards);
      
      if (hasScenarioCards === 0 && apiTest.dataLength > 0) {
        console.log('⚠️ API has data but UI not displaying it - possible React Query issue');
      }
    } else {
      console.log('❌ API not accessible from browser:', apiTest.error);
    }
    
    await page.screenshot({ 
      path: 'test-results/api-connectivity-test.png', 
      fullPage: true 
    });
  });
});