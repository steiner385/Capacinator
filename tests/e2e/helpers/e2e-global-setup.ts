import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E global setup...');
  
  try {
    // Check if E2E server is already running
    const baseURL = config.projects[0].use.baseURL || 'https://localhost:3121';
    console.log(`🔍 Checking if E2E server is already running at ${baseURL}...`);
    
    const browser = await chromium.launch();
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    
    // Wait for the E2E application to be ready
    console.log('⏳ Waiting for E2E application to be ready...');
    
    // Try to connect with retries
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds
    
    while (attempts < maxAttempts) {
      try {
        await page.goto(baseURL, { timeout: 5000 });
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        
        // Check if the application is responding
        const title = await page.title();
        if (title && title.length > 0) {
          console.log(`✅ E2E application is ready (title: ${title})`);
          break;
        }
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error(`E2E application failed to start after ${maxAttempts} attempts: ${error}`);
        }
        console.log(`⏳ Attempt ${attempts}/${maxAttempts} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Verify E2E test data is available
    console.log('🔍 Verifying E2E test data...');
    await verifyE2ETestData(page);
    
    // Save authentication state if needed
    console.log('💾 Saving E2E authentication state...');
    await saveE2EAuthState(page, context);
    
    console.log('✅ E2E global setup complete');
    
    await context.close();
    await browser.close();
    
  } catch (error) {
    console.error('❌ E2E global setup failed:', error);
    throw error;
  }
}

async function verifyE2ETestData(page: any) {
  try {
    // Check if basic test data is available
    const apiBaseURL = 'http://localhost:3111/api';
    
    // Test API connectivity
    const response = await page.request.get(`${apiBaseURL}/health`);
    if (!response.ok()) {
      throw new Error(`API health check failed: ${response.status()}`);
    }
    
    // Verify test data exists
    const rolesResponse = await page.request.get(`${apiBaseURL}/roles`);
    if (!rolesResponse.ok()) {
      throw new Error(`Roles API failed: ${rolesResponse.status()}`);
    }
    
    const roles = await rolesResponse.json();
    if (!roles || roles.length === 0) {
      throw new Error('No test roles found in E2E database');
    }
    
    console.log(`✅ Found ${roles.length} test roles in E2E database`);
    
  } catch (error) {
    console.error('❌ E2E test data verification failed:', error);
    throw error;
  }
}

async function saveE2EAuthState(page: any, context: any) {
  try {
    // For now, just save an empty auth state
    // In the future, this could handle authentication if needed
    await context.storageState({ path: 'test-results/e2e-auth.json' });
    console.log('💾 E2E authentication state saved');
  } catch (error) {
    console.warn('⚠️ Failed to save E2E authentication state:', error);
    // Don't fail the setup for this
  }
}

export default globalSetup;