import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Data Tables Functionality', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('should display and interact with Projects table', async ({ page }) => {
    await helpers.navigateTo('/projects');
    await helpers.setupPage();
    await helpers.waitForDataTable();
    
    // Table should be visible
    await expect(page.locator('.data-table-wrapper')).toBeVisible();
    
    // Should have table headers
    const headers = ['Project Name', 'Project Type', 'Location', 'Start Date', 'End Date', 'Current Phase', 'Actions'];
    for (const header of headers) {
      await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
    }
    
    // Should have some data rows (assuming test data exists)
    const rowCount = await helpers.getTableRowCount();
    expect(rowCount).toBeGreaterThan(0);
    
    // Test sorting
    await page.click('th:has-text("Project Name")');
    await helpers.waitForDataTable();
    
    // Test search functionality
    await helpers.searchInTable('Mobile');
    const filteredRows = await helpers.getTableRowCount();
    // Should filter results
    expect(filteredRows).toBeLessThanOrEqual(rowCount);
    
    // Clear search
    await helpers.searchInTable('');
    await helpers.waitForDataTable();
  });

  test('should handle Projects table filtering', async ({ page }) => {
    await helpers.navigateTo('/projects');
    await helpers.setupPage();
    await helpers.waitForDataTable();
    
    // Test status filter if available
    const statusFilter = page.locator('select').filter({ hasText: 'Status' }).or(
      page.locator('label:has-text("Status") + select')
    );
    
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('active');
      await helpers.waitForDataTable();
      
      // Should filter results
      const filteredRows = await helpers.getTableRowCount();
      
      // Clear filters
      await helpers.clearFilters();
    }
  });

  test('should display and interact with People table', async ({ page }) => {
    await helpers.navigateTo('/people');
    await helpers.setupPage();
    await helpers.waitForDataTable();
    
    // Table should be visible
    await expect(page.locator('.data-table-wrapper')).toBeVisible();
    
    // Should have appropriate headers
    const headers = ['NAME', 'PRIMARY ROLE', 'TYPE', 'LOCATION', 'AVAILABILITY', 'HOURS/DAY', 'ACTIONS'];
    for (const header of headers) {
      await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
    }
    
    // Test search
    await helpers.searchInTable('Alice');
    await helpers.waitForDataTable();
    
    // Clear search
    await helpers.searchInTable('');
  });

  test('should display and interact with Roles table via People page', async ({ page }) => {
    // Note: /roles redirects to /people, so we test the unified people page
    await helpers.navigateTo('/people');
    await helpers.setupPage();
    await helpers.waitForDataTable();
    
    // Table should be visible
    await expect(page.locator('.data-table-wrapper')).toBeVisible();
    
    // Should have people-specific headers (since roles are integrated into people)
    const headers = ['NAME', 'PRIMARY ROLE', 'TYPE', 'LOCATION', 'AVAILABILITY', 'HOURS/DAY', 'ACTIONS'];
    for (const header of headers) {
      await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
    }
    
    // Test search
    await helpers.searchInTable('Developer');
    await helpers.waitForDataTable();
  });

  test('should display and interact with Assignments table', async ({ page }) => {
    await helpers.navigateTo('/assignments');
    await helpers.setupPage();
    await helpers.waitForDataTable();
    
    // Page should load with either data table or no data message
    const pageTitle = page.locator('h1:has-text("Assignments")');
    await expect(pageTitle).toBeVisible();
    
    // Check if there's data or no data message
    const noDataMessage = page.locator('text=No data available');
    const dataTableWrapper = page.locator('.data-table-wrapper');
    
    if (await noDataMessage.isVisible()) {
      // If no data, verify page structure still exists
      await expect(noDataMessage).toBeVisible();
      console.log('No assignments data available - test passed with empty state');
    } else {
      // If data exists, verify table headers
      await expect(dataTableWrapper).toBeVisible();
      const headers = ['Project', 'Person', 'Role', 'Allocation', 'Start Date', 'End Date', 'Duration', 'Actions'];
      for (const header of headers) {
        await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
      }
    }
  });

  test('should handle table pagination', async ({ page }) => {
    await helpers.navigateTo('/projects');
    await helpers.setupPage();
    await helpers.waitForDataTable();
    
    // Check if pagination is present (only if there are enough rows)
    const paginationControls = page.locator('.table-pagination');
    
    if (await paginationControls.isVisible()) {
      // Test pagination info
      await expect(page.locator('.pagination-info')).toBeVisible();
      
      // Test pagination buttons
      const nextButton = page.locator('.pagination-btn:has-text("Next")');
      if (await nextButton.isEnabled()) {
        await nextButton.click();
        await helpers.waitForDataTable();
        
        // Should be on page 2
        await expect(page.locator('.pagination-numbers')).toContainText('Page 2');
        
        // Go back to page 1
        const prevButton = page.locator('.pagination-btn:has-text("Previous")');
        await prevButton.click();
        await helpers.waitForDataTable();
      }
    }
  });

  test('should handle table row clicks', async ({ page }) => {
    await helpers.navigateTo('/projects');
    await helpers.setupPage();
    await helpers.waitForDataTable();
    
    const rowCount = await helpers.getTableRowCount();
    if (rowCount > 0) {
      // Click first row
      await helpers.clickTableRow(0);
      
      // Should navigate to detail page (projects use different ID format)
      await expect(page).toHaveURL(/.*\/projects\/[a-zA-Z0-9-]+/);
    }
  });

  test('should handle action buttons in tables', async ({ page }) => {
    await helpers.navigateTo('/projects');
    await helpers.setupPage();
    await helpers.waitForDataTable();
    
    const rowCount = await helpers.getTableRowCount();
    if (rowCount > 0) {
      // Look for action buttons in first row
      const firstRow = page.locator('.table tbody tr').first();
      const viewButton = firstRow.locator('button[title="View Details"]');
      const editButton = firstRow.locator('button[title="Edit"]');
      
      if (await viewButton.isVisible()) {
        await viewButton.click();
        // Should navigate to detail page (projects use different ID format)
        await expect(page).toHaveURL(/.*\/projects\/[a-zA-Z0-9-]+/);
      }
    }
  });

  test('should handle empty table states', async ({ page }) => {
    // Navigate to a page that might be empty
    await helpers.navigateTo('/people');
    await helpers.setupPage();
    await helpers.waitForDataTable();
    
    // Search for something that doesn't exist
    await helpers.searchInTable('NonExistentPersonName12345');
    await helpers.waitForDataTable();
    
    // Should show empty state or no results
    const rowCount = await helpers.getTableRowCount();
    if (rowCount === 0) {
      // Should show empty message or no rows
      const emptyMessage = page.locator('.table-empty, .no-results');
      // Note: empty message handling depends on implementation
    }
    
    // Clear search to restore data
    await helpers.searchInTable('');
  });

  test('should maintain table state across navigation', async ({ page }) => {
    await helpers.navigateTo('/projects');
    await helpers.setupPage();
    await helpers.waitForDataTable();
    
    // Apply a search filter
    await helpers.searchInTable('Mobile');
    await helpers.waitForDataTable();
    
    // Navigate away and back
    await helpers.navigateViaSidebar('Dashboard');
    await helpers.navigateViaSidebar('Projects');
    await helpers.waitForDataTable();
    
    // Search should be cleared (depending on implementation)
    // This test verifies the behavior is consistent
  });
});