import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🧙‍♂️ Setting up global environment for Allocation Wizard tests...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Verify the application is running
    await page.goto(config.projects[0].use?.baseURL || 'http://localhost:3130');
    // Wait for React app to fully load by checking for any rendered content
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      return root && (root.children.length > 0 || document.readyState === 'complete');
    }, { timeout: 30000 });
    
    console.log('✅ Application is accessible');

    // Set up test data if needed (skip if endpoint doesn't exist)
    try {
      const baseURL = config.projects[0].use?.baseURL || 'http://localhost:3130';
      const testSetupResponse = await page.request.get(`${baseURL}/api/test-setup`);
      if (testSetupResponse.ok()) {
        console.log('✅ Test data initialized');
      } else {
        console.log('⚠️  Test setup endpoint not available, continuing without setup');
      }
    } catch (error) {
      console.log('⚠️  Test setup endpoint not available, continuing without setup');
    }

    // Pre-warm the wizard route
    try {
      await page.goto('/wizard');
      await page.waitForSelector('.allocation-wizard', { timeout: 10000 });
      console.log('✅ Wizard route pre-warmed');
    } catch (error) {
      console.log('⚠️  Wizard route not accessible yet, continuing with tests');
    }

    // Verify API endpoints are responding  
    try {
      const baseURL = config.projects[0].use?.baseURL || 'http://localhost:3130';
      const healthResponse = await page.request.get(`${baseURL}/api/health`);
      if (healthResponse.ok()) {
        console.log('✅ API endpoints verified');
      } else {
        console.log('⚠️  API health check endpoint not available, continuing without verification');
      }
    } catch (error) {
      console.log('⚠️  API health check endpoint not available, continuing without verification');
    }

    // Set up any required authentication state
    // (This would be specific to your app's auth system)
    
    console.log('🎉 Global setup completed successfully');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;