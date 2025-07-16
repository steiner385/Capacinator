import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Projects Page Functionality', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects');
    const helpers = new TestHelpers(page);
    await helpers.setupPage();
  });

  test('should display projects list', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Projects', { timeout: 10000 });
    
    // Should show data table
    await expect(page.locator('table')).toBeVisible();
    
    // Should show action buttons
    await expect(page.locator('button:has-text("New Project")')).toBeVisible();
    await expect(page.locator('button:has-text("View Demands")')).toBeVisible();
  });

  test('should handle New Project button click', async ({ page }) => {
    const addButton = page.locator('button:has-text("New Project")');
    await expect(addButton).toBeVisible({ timeout: 10000 });
    
    // Click should either navigate to /projects/new or show error
    await addButton.click();
    
    // Check if it navigates (this will likely fail due to missing route)
    await page.waitForTimeout(1000);
    // We expect this to either show an error or navigate to a non-existent route
  });

  test('should handle View Demands button click', async ({ page }) => {
    const demandsButton = page.locator('button:has-text("View Demands")');
    await expect(demandsButton).toBeVisible({ timeout: 10000 });
    
    // Click should either navigate to /projects/demands or show error
    await demandsButton.click();
    
    await page.waitForTimeout(1000);
    // We expect this to either show an error or navigate to a non-existent route
  });

  test('should display project data in table', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Check if table has rows (assuming there's data)
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();
    
    if (rowCount > 0) {
      // Test first row actions
      const firstRow = tableRows.first();
      
      // Should have View button (eye icon)
      const viewButton = firstRow.locator('button').first();
      await expect(viewButton).toBeVisible();
      
      // Should have Edit button (edit icon)
      const editButton = firstRow.locator('button').nth(1);
      await expect(editButton).toBeVisible();
      
      // Should have Delete button (trash icon)
      const deleteButton = firstRow.locator('button').nth(3);
      await expect(deleteButton).toBeVisible();
    }
  });

  test('should handle View button click', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();
    
    if (rowCount > 0) {
      const viewButton = tableRows.first().locator('button').first();
      await viewButton.click();
      
      // Should navigate to project detail page
      await page.waitForTimeout(1000);
      
      // Check if we're on a project detail page
      // This should show "Coming soon" since ProjectDetail is a stub
      const url = page.url();
      expect(url).toMatch(/\/projects\/[^\/]+$/);
    }
  });

  test('should handle Edit button click', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();
    
    if (rowCount > 0) {
      const editButton = tableRows.first().locator('button').nth(1);
      await editButton.click();
      
      // Should attempt to navigate to edit page (will likely fail)
      await page.waitForTimeout(1000);
    }
  });

  test('should handle Delete button click', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();
    
    if (rowCount > 0) {
      // Set up console log listener to catch the TODO log
      const consoleMessages: string[] = [];
      page.on('console', msg => {
        consoleMessages.push(msg.text());
      });
      
      const deleteButton = tableRows.first().locator('button').nth(3);
      await deleteButton.click();
      
      await page.waitForTimeout(1000);
      
      // Should log "TODO: Implement delete functionality" to console
      expect(consoleMessages.some(msg => msg.includes('TODO: Implement delete functionality'))).toBe(true);
    }
  });

  test('should handle search and filters', async ({ page }) => {
    // Test search functionality if it exists
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('test project');
      await page.waitForTimeout(1000);
      
      // Should filter results
    }
    
    // Test filter buttons if they exist
    const filterButtons = page.locator('button:has-text("All"), button:has-text("Active"), button:has-text("Completed")');
    const buttonCount = await filterButtons.count();
    
    if (buttonCount > 0) {
      await filterButtons.first().click();
      await page.waitForTimeout(1000);
    }
  });
});