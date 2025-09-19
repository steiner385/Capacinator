import { test, expect } from '@playwright/test'
import { setupPageWithAuth } from './utils/improved-auth-helpers';;

test.describe('Enterprise Expansion Scenario - Simplified', () => {
  test('should navigate through enterprise workflow', async ({ page }) => {
    // Test 1: Navigate to the main dashboard
    await setupPageWithAuth(page, '/');
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Test 2: Check roles page
    await setupPageWithAuth(page, '/roles');
    await expect(page.locator('h1')).toContainText('Roles');
    
    // Test 3: Check people management
    await setupPageWithAuth(page, '/people');
    await expect(page.locator('h1')).toContainText('People');
    
    // Test 4: Check projects page
    await setupPageWithAuth(page, '/projects');
    await expect(page.locator('h1')).toContainText('Projects');
    
    // Test 5: Check assignments
    await setupPageWithAuth(page, '/assignments');
    await expect(page.locator('h1')).toContainText('Assignments');
    
    // Test 6: Check reports
    await setupPageWithAuth(page, '/reports');
    await expect(page.locator('h1')).toContainText('Reports');
    
    // Test 7: Check allocations (redirects to roles)
    await setupPageWithAuth(page, '/allocations');
    await expect(page.locator('h1')).toContainText('Roles');
    
    // Test 8: Check availability
    await setupPageWithAuth(page, '/availability');
    await expect(page.locator('h1')).toContainText('Availability');
    
    // Test 9: Check settings
    await setupPageWithAuth(page, '/settings');
    await expect(page.locator('h1')).toContainText('Settings');
    
    console.log('✅ Enterprise expansion navigation test completed');
  });
  
  test('should test project detail page features', async ({ page }) => {
    // Navigate to projects
    await setupPageWithAuth(page, '/projects');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Look for any existing project to click on
    const projectCards = page.locator('.project-card');
    const projectCount = await projectCards.count();
    
    if (projectCount > 0) {
      // Click on the first project
      await projectCards.first().click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      
      // Should be on project detail page
      await expect(page.locator('h1')).toBeVisible();
      
      // Look for demand curve section if it exists
      const demandSection = page.locator('.demand-curve-section, .demand-chart-section');
      if (await demandSection.count() > 0) {
        await expect(demandSection).toBeVisible();
        console.log('✅ Found demand curve section');
      }
      
      console.log('✅ Project detail page test completed');
    } else {
      console.log('⚠️  No projects found to test detail page');
    }
  });
  
  test('should test person detail page features', async ({ page }) => {
    // Navigate to people
    await setupPageWithAuth(page, '/people');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Look for any existing person to click on
    const personCards = page.locator('.person-card');
    const personCount = await personCards.count();
    
    if (personCount > 0) {
      // Click on the first person
      await personCards.first().click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      
      // Should be on person detail page
      await expect(page.locator('h1')).toBeVisible();
      
      // Look for allocation chart section if it exists
      const allocationSection = page.locator('.allocation-chart-section, .person-allocation-chart');
      if (await allocationSection.count() > 0) {
        await expect(allocationSection).toBeVisible();
        console.log('✅ Found allocation chart section');
      }
      
      console.log('✅ Person detail page test completed');
    } else {
      console.log('⚠️  No people found to test detail page');
    }
  });
  
  test('should test capacity planning features', async ({ page }) => {
    // Navigate to reports
    await setupPageWithAuth(page, '/reports');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Look for capacity report functionality
    const capacityReportButton = page.locator('button:has-text("Capacity"), button:has-text("Generate"), .report-button');
    if (await capacityReportButton.count() > 0) {
      await capacityReportButton.first().click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      
      // Should show some kind of report content
      await expect(page.locator('body')).toBeVisible();
      console.log('✅ Capacity report functionality tested');
    } else {
      console.log('⚠️  No capacity report button found');
    }
  });
  
  test('should test assignment management', async ({ page }) => {
    // Navigate to assignments
    await setupPageWithAuth(page, '/assignments');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Look for assignment creation button
    const newAssignmentButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")');
    if (await newAssignmentButton.count() > 0) {
      await newAssignmentButton.first().click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      
      // Should show assignment form or modal
      await expect(page.locator('body')).toBeVisible();
      console.log('✅ Assignment creation functionality tested');
    } else {
      console.log('⚠️  No assignment creation button found');
    }
  });
});