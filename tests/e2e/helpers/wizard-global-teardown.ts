import { chromium, FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up after Allocation Wizard tests...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Clean up test data
    await page.goto(config.projects[0].use?.baseURL || 'http://localhost:3130');
    
    // Reset any test data (skip if endpoint doesn't exist)
    try {
      const baseURL = config.projects[0].use?.baseURL || 'http://localhost:3130';
      const cleanupResponse = await page.request.post(`${baseURL}/api/test-cleanup`);
      if (cleanupResponse.ok()) {
        console.log('✅ Test data cleaned up');
      } else {
        console.log('⚠️  Test cleanup endpoint not available, skipping cleanup');
      }
    } catch (error) {
      console.log('⚠️  Test cleanup endpoint not available, skipping cleanup');
    }

    // Clear any cached data
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    console.log('✅ Browser storage cleared');

    console.log('🎉 Global teardown completed successfully');

  } catch (error) {
    console.error('❌ Global teardown encountered issues:', error);
    // Don't throw error in teardown to avoid masking test failures
  } finally {
    await browser.close();
  }
}

export default globalTeardown;