import { test, expect } from '@playwright/test';

test.describe('Basic Navigation Test', () => {
  test('should load main application pages', async ({ page }) => {
    // Test 1: Load main dashboard
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Dashboard');
    await page.waitForLoadState('networkidle');
    
    // Test 2: Load people page
    await page.goto('/people');
    await expect(page.locator('h1')).toContainText('People');
    await page.waitForLoadState('networkidle');
    
    // Test 3: Load projects page
    await page.goto('/projects');
    await expect(page.locator('h1')).toContainText('Projects');
    await page.waitForLoadState('networkidle');
    
    // Test 4: Load assignments page
    await page.goto('/assignments');
    await expect(page.locator('h1')).toContainText('Assignments');
    await page.waitForLoadState('networkidle');
    
    // Test 5: Load reports page
    await page.goto('/reports');
    await expect(page.locator('h1')).toContainText('Reports');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Basic navigation test completed successfully');
  });
  
  test('should verify pages load without errors', async ({ page }) => {
    // Just verify pages load without checking specific elements
    const pages = [
      { path: '/', name: 'Dashboard' },
      { path: '/people', name: 'People' },
      { path: '/projects', name: 'Projects' },
      { path: '/assignments', name: 'Assignments' },
      { path: '/reports', name: 'Reports' }
    ];
    
    for (const testPage of pages) {
      await page.goto(testPage.path);
      await page.waitForLoadState('networkidle');
      
      // Just check that the page title is present
      await expect(page.locator('h1')).toContainText(testPage.name);
      
      // Check for no error messages
      const errorMessages = page.locator('.error, .alert-error');
      await expect(errorMessages).toHaveCount(0);
      
      console.log(`✅ ${testPage.name} page loaded successfully`);
    }
    
    console.log('✅ All pages loaded successfully');
  });
});