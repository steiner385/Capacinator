import { test, expect } from '@playwright/test'
import { setupPageWithAuth } from './utils/improved-auth-helpers';;

test('Debug API calls in browser', async ({ page }) => {
  // Enable console logging
  page.on('console', (message) => {
    console.log(`Console: ${message.text()}`);
  });

  // Enable error logging
  page.on('pageerror', (error) => {
    console.error(`Page error: ${error.message}`);
  });

  // Navigate to debug page
  await page.goto('https://localhost:3121/debug-api-test.html');
  
  // Wait for the API tests to complete
  await page.waitForTimeout(5000);
  
  // Get the results
  const results = await page.textContent('#results');
  console.log('API Test Results:', results);
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/api-debug-results.png' });
});