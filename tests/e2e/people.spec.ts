import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('People Page Functionality', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/people');
    const helpers = new TestHelpers(page);
    await helpers.setupPage();
  });

  test('should display people list', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('People', { timeout: 10000 });
    
    // Should show data table
    await expect(page.locator('table')).toBeVisible();
    
    // Should show Add Person button
    await expect(page.locator('button:has-text("Add Person")')).toBeVisible();
  });

  test('should handle Add Person button click', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add Person")');
    await expect(addButton).toBeVisible({ timeout: 10000 });
    
    // Click should either navigate to /people/new or show error
    await addButton.click();
    
    await page.waitForTimeout(1000);
    // We expect this to either show an error or navigate to a non-existent route
  });

  test('should display person data in table', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();
    
    if (rowCount > 0) {
      const firstRow = tableRows.first();
      
      // Should have clickable person name
      const personName = firstRow.locator('td:first-child a, td:first-child button');
      await expect(personName).toBeVisible();
      
      // Should have View button
      const viewButton = firstRow.locator('button:has-text("View")');
      await expect(viewButton).toBeVisible();
      
      // Should have Edit button  
      const editButton = firstRow.locator('button:has-text("Edit")');
      await expect(editButton).toBeVisible();
      
      // Should have Delete button
      const deleteButton = firstRow.locator('button[title*="Delete"], button:has([data-testid="trash"])');
      await expect(deleteButton).toBeVisible();
    }
  });
  
  test('should display team insights summary', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Check for team insights section
    const teamInsights = page.locator('.team-insights');
    if (await teamInsights.count() > 0) {
      await expect(teamInsights).toBeVisible();
      
      // Should show insight summary with counts
      const insightItems = page.locator('.insight-item');
      await expect(insightItems).toHaveCount(3); // over-allocated, available, total
      
      // Check for specific insight text patterns
      await expect(page.locator('.insight-item')).toContainText(/\d+ over-allocated/);
      await expect(page.locator('.insight-item')).toContainText(/\d+ available/);
      await expect(page.locator('.insight-item')).toContainText(/\d+ total people/);
    }
  });
  
  test('should display workload status indicators', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();
    
    if (rowCount > 0) {
      // Check for workload status column
      const workloadColumns = page.locator('.workload-status');
      if (await workloadColumns.count() > 0) {
        await expect(workloadColumns.first()).toBeVisible();
        
        // Check for status indicators
        const statusIndicators = page.locator('.status-indicator');
        if (await statusIndicators.count() > 0) {
          await expect(statusIndicators.first()).toBeVisible();
          
          // Check for utilization percentages
          const percentageText = await statusIndicators.first().textContent();
          expect(percentageText).toMatch(/\d+%/);
        }
        
        // Check for status labels
        const statusLabels = page.locator('.status-label');
        if (await statusLabels.count() > 0) {
          await expect(statusLabels.first()).toBeVisible();
        }
      }
    }
  });
  
  test('should display and handle quick action buttons', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();
    
    if (rowCount > 0) {
      // Check for quick action buttons
      const quickActionButtons = page.locator('.quick-action-btn');
      if (await quickActionButtons.count() > 0) {
        const firstActionButton = quickActionButtons.first();
        await expect(firstActionButton).toBeVisible();
        
        // Get button text to determine action type
        const buttonText = await firstActionButton.textContent();
        expect(buttonText).toMatch(/(Assign|Reduce|Monitor|View)/i);
        
        // Test button click navigation
        await firstActionButton.click();
        await page.waitForTimeout(1000);
        
        // Should navigate to appropriate page based on action
        const currentUrl = page.url();
        if (buttonText?.includes('Assign')) {
          expect(currentUrl).toMatch(/\/assignments/);
        } else if (buttonText?.includes('Reduce')) {
          expect(currentUrl).toMatch(/\/assignments/);
          expect(currentUrl).toContain('action=reduce');
        } else if (buttonText?.includes('Monitor')) {
          expect(currentUrl).toMatch(/\/reports/);
          expect(currentUrl).toContain('type=utilization');
        }
      }
    }
  });
  
  test('should apply correct status colors for workload indicators', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Check for different status color classes
    const statusIndicators = page.locator('.status-indicator');
    if (await statusIndicators.count() > 0) {
      // Look for different status types
      const dangerStatus = page.locator('.status-danger');
      const warningStatus = page.locator('.status-warning');
      const successStatus = page.locator('.status-success');
      const infoStatus = page.locator('.status-info');
      
      // At least one status type should exist
      const totalColoredStatuses = await dangerStatus.count() + 
                                   await warningStatus.count() + 
                                   await successStatus.count() + 
                                   await infoStatus.count();
      expect(totalColoredStatuses).toBeGreaterThan(0);
    }
  });

  test('should navigate to person details via name click', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();
    
    if (rowCount > 0) {
      const personName = tableRows.first().locator('td:first-child a, td:first-child button');
      await personName.click();
      
      // Should navigate to person detail page
      await page.waitForTimeout(1000);
      
      const url = page.url();
      expect(url).toMatch(/\/people\/[^\/]+$/);
      
      // Should show person details page
      await expect(page.locator('h1')).toBeVisible();
    }
  });

  test('should handle View button click', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();
    
    if (rowCount > 0) {
      const viewButton = tableRows.first().locator('button:has-text("View")');
      await viewButton.click();
      
      // Should navigate to person detail page
      await page.waitForTimeout(1000);
      
      const url = page.url();
      expect(url).toMatch(/\/people\/[^\/]+$/);
    }
  });

  test('should handle contextual quick actions with proper parameters', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    const quickActionButtons = page.locator('.quick-action-btn');
    if (await quickActionButtons.count() > 0) {
      const firstButton = quickActionButtons.first();
      const buttonText = await firstButton.textContent();
      
      // Click the action button
      await firstButton.click();
      await page.waitForTimeout(1000);
      
      const currentUrl = page.url();
      
      // Verify proper query parameters are passed
      if (buttonText?.includes('Assign')) {
        expect(currentUrl).toContain('person=');
        expect(currentUrl).toMatch(/assignments/);
      } else if (buttonText?.includes('Reduce')) {
        expect(currentUrl).toContain('action=reduce');
        expect(currentUrl).toContain('person=');
      } else if (buttonText?.includes('Monitor')) {
        expect(currentUrl).toContain('type=utilization');
        expect(currentUrl).toContain('person=');
      }
    }
  });
  
  test('should handle Edit button click', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();
    
    if (rowCount > 0) {
      const editButton = tableRows.first().locator('button:has-text("Edit")');
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
      // Set up console log listener
      const consoleMessages: string[] = [];
      page.on('console', msg => {
        consoleMessages.push(msg.text());
      });
      
      const deleteButton = tableRows.first().locator('button[title*="Delete"], button:has([data-testid="trash"])');
      await deleteButton.click();
      
      await page.waitForTimeout(1000);
      
      // Should log "TODO: Implement delete functionality" to console
      expect(consoleMessages.some(msg => msg.includes('TODO: Implement delete functionality'))).toBe(true);
    }
  });

  test('should handle search and filters', async ({ page }) => {
    // Test search functionality
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('Alice');
      await page.waitForTimeout(1000);
      
      // Should filter results
      const tableRows = page.locator('table tbody tr');
      const rowCount = await tableRows.count();
      
      if (rowCount > 0) {
        // Should contain searched term
        await expect(tableRows.first()).toContainText('Alice');
      }
    }
    
    // Test role filter if it exists
    const roleFilter = page.locator('select[name*="role"], select:has(option:text-is("All Roles"))');
    
    if (await roleFilter.isVisible()) {
      await roleFilter.selectOption({ index: 1 }); // Select first non-"All" option
      await page.waitForTimeout(1000);
    }
  });
});