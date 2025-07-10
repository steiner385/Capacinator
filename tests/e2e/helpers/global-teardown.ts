import { chromium, FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for e2e tests...');
  
  // Create a browser instance for teardown
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to the application
    await page.goto(config.projects[0].use.baseURL || 'http://localhost:5175');
    
    // Clean up any persistent test data
    await cleanupGlobalTestData(page);
    
    console.log('✅ Global teardown complete');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't fail the entire teardown process
  } finally {
    await context.close();
    await browser.close();
  }
}

async function cleanupGlobalTestData(page: any) {
  console.log('🗑️ Cleaning up global test data...');
  
  try {
    // Clean up any test data that might persist between test runs
    // This is a placeholder for actual cleanup logic
    
    // Example: Remove test projects
    await page.goto('/projects');
    const testProjects = await page.locator('.project-card:has-text("Test_"), .project-card:has-text("EMERGENCY")').count();
    if (testProjects > 0) {
      console.log(`🗑️ Found ${testProjects} test projects to clean up`);
      // Add cleanup logic here if needed
    }
    
    // Example: Remove test people
    await page.goto('/people');
    const testPeople = await page.locator('.person-card:has-text("Test_")').count();
    if (testPeople > 0) {
      console.log(`🗑️ Found ${testPeople} test people to clean up`);
      // Add cleanup logic here if needed
    }
    
    // Example: Remove test assignments
    await page.goto('/assignments');
    const testAssignments = await page.locator('.assignment-row:has-text("Test_")').count();
    if (testAssignments > 0) {
      console.log(`🗑️ Found ${testAssignments} test assignments to clean up`);
      // Add cleanup logic here if needed
    }
    
    console.log('✅ Global test data cleanup complete');
  } catch (error) {
    console.warn('⚠️ Global test data cleanup encountered issues:', error);
    // Don't fail the entire teardown if cleanup has issues
  }
}

export default globalTeardown;