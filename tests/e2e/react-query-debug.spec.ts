import { test, expect } from '@playwright/test';

test('Debug React Query behavior with console monitoring', async ({ page }) => {
  // Enable comprehensive console logging
  const consoleMessages: string[] = [];
  page.on('console', (message) => {
    const text = message.text();
    consoleMessages.push(`[${message.type()}] ${text}`);
    console.log(`Console [${message.type()}]: ${text}`);
  });

  // Enable error logging
  page.on('pageerror', (error) => {
    console.error(`Page error: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
  });

  // Monitor network requests
  const networkRequests: Array<{url: string, status: number, timing: number}> = [];
  page.on('response', (response) => {
    if (response.url().includes('/api/')) {
      networkRequests.push({
        url: response.url(),
        status: response.status(),
        timing: Date.now()
      });
      console.log(`API Response: ${response.status()} ${response.url()}`);
    }
  });

  console.log('🚀 Starting React Query debug test...');
  
  // Navigate to reports page
  await page.goto('https://localhost:3121/reports');
  
  // Wait longer to observe behavior
  console.log('⏳ Waiting 10 seconds to observe React Query behavior...');
  await page.waitForTimeout(10000);
  
  // Check current state
  const currentState = await page.evaluate(() => {
    return {
      url: window.location.href,
      title: document.title,
      bodyText: document.body.textContent?.substring(0, 200),
      hasSelect: !!document.querySelector('select'),
      hasButton: !!document.querySelector('button'),
      hasLoadingText: document.body.textContent?.includes('Loading'),
      hasErrorText: document.body.textContent?.includes('Error'),
      reactQueryDevtools: !!window.document.querySelector('[data-testid="react-query-devtools"]'),
      localStorageUser: localStorage.getItem('capacinator_current_user')
    };
  });

  console.log('📊 Current page state:', JSON.stringify(currentState, null, 2));
  console.log('🌐 Network requests made:', networkRequests.length);
  networkRequests.forEach(req => {
    console.log(`  ${req.status} ${req.url}`);
  });
  
  console.log('📝 Console messages count:', consoleMessages.length);
  
  // Look for specific React Query or network related messages
  const reactQueryMessages = consoleMessages.filter(msg => 
    msg.toLowerCase().includes('query') || 
    msg.toLowerCase().includes('react') ||
    msg.toLowerCase().includes('axios') ||
    msg.toLowerCase().includes('api')
  );
  
  if (reactQueryMessages.length > 0) {
    console.log('🔍 React Query related messages:');
    reactQueryMessages.forEach(msg => console.log(`  ${msg}`));
  }

  // Take screenshot
  await page.screenshot({ path: '/tmp/react-query-debug.png', fullPage: true });

  // Basic assertion
  expect(currentState.url).toContain('/reports');
});