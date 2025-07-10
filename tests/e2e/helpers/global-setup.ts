import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for e2e tests...');
  
  // Create a browser instance for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Wait for the application to be ready
    console.log('⏳ Waiting for application to be ready...');
    await page.goto(config.projects[0].use.baseURL || 'http://localhost:5175');
    
    // Wait for the application to fully load
    await page.waitForLoadState('networkidle');
    
    // Verify the application is responding
    await page.waitForSelector('h1', { timeout: 30000 });
    
    console.log('✅ Application is ready for testing');
    
    // Set up any global test data if needed
    await setupGlobalTestData(page);
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function setupGlobalTestData(page: any) {
  // Add any global test data setup here
  console.log('🔧 Setting up global test data...');
  
  // Example: Ensure basic reference data exists
  try {
    // Check if we have locations
    await page.goto('/locations');
    const locationCount = await page.locator('.location-card').count();
    console.log(`📍 Found ${locationCount} locations`);
    
    // Check if we have roles
    await page.goto('/roles');
    const roleCount = await page.locator('.role-item').count();
    console.log(`👤 Found ${roleCount} roles`);
    
    // Check if we have project types
    await page.goto('/project-types');
    const projectTypeCount = await page.locator('.project-type-item').count();
    console.log(`📋 Found ${projectTypeCount} project types`);
    
    console.log('✅ Global test data setup complete');
  } catch (error) {
    console.warn('⚠️ Global test data setup encountered issues:', error);
    // Don't fail the entire setup if reference data is missing
  }
}

export default globalSetup;