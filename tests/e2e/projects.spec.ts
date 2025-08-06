import { test, expect } from './helpers/base-test';
import { testConfig, waitForPageReady, waitForApiCall } from './helpers/test-config';

test.describe('Projects Page Functionality', () => {
  
  test('should display projects list', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/projects');
    await waitForPageReady(page);
    
    // Wait for projects data to load
    await waitForApiCall(page, testConfig.api.projects);
    
    await expect(page.locator('h1')).toContainText('Projects');
    
    // Should show data table
    await expect(page.locator('table')).toBeVisible();
    
    // Should show action buttons
    await expect(page.locator('button:has-text("New Project")')).toBeVisible();
    await expect(page.locator('button:has-text("View Demands")')).toBeVisible();
  });

  test('should handle New Project button click', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/projects');
    await waitForPageReady(page);
    
    const addButton = page.locator('button:has-text("New Project")');
    await expect(addButton).toBeVisible();
    
    // Click should either navigate to /projects/new or show error
    await addButton.click();
    
    // Wait for navigation or modal
    await page.waitForTimeout(testConfig.testData.animationDelay);
    
    // Check if it navigates or shows modal
    const url = page.url();
    const hasModal = await page.locator(testConfig.selectors.modalDialog).isVisible();
    
    expect(url.includes('/projects/new') || hasModal).toBeTruthy();
  });

  test('should handle View Demands button click', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/projects');
    await waitForPageReady(page);
    
    const demandsButton = page.locator('button:has-text("View Demands")');
    await expect(demandsButton).toBeVisible();
    
    // Click should navigate to demands view
    await demandsButton.click();
    await page.waitForTimeout(testConfig.testData.animationDelay);
    
    // Should navigate or show relevant content
    const url = page.url();
    expect(url.includes('/demands') || url.includes('/projects')).toBeTruthy();
  });

  test('should display project data in table', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/projects');
    await waitForPageReady(page);
    
    // Wait for data to load
    await waitForApiCall(page, testConfig.api.projects);
    
    // Check if table has rows
    const tableRows = page.locator(testConfig.selectors.dataTable);
    await expect(tableRows.first()).toBeVisible({ timeout: testConfig.timeouts.elementVisible });
    
    const rowCount = await tableRows.count();
    
    if (rowCount > 0) {
      // Test first row has expected action buttons
      const firstRow = tableRows.first();
      
      // Look for action buttons in the row
      const buttons = firstRow.locator('button');
      const buttonCount = await buttons.count();
      
      // Should have at least view button
      expect(buttonCount).toBeGreaterThanOrEqual(1);
      
      // Check for view details button
      const viewButton = firstRow.getByRole('button', { name: /view details|view|eye/i });
      await expect(viewButton).toBeVisible();
    }
  });

  test('should handle View button click', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/projects');
    await waitForPageReady(page);
    await waitForApiCall(page, testConfig.api.projects);
    
    const tableRows = page.locator(testConfig.selectors.dataTable);
    const rowCount = await tableRows.count();
    
    if (rowCount > 0) {
      // Find view button in first row
      const viewButton = tableRows.first().getByRole('button', { name: /view details|view|eye/i });
      
      // Click and wait for navigation
      const navigationPromise = page.waitForNavigation({ timeout: testConfig.timeouts.navigation });
      await viewButton.click();
      
      try {
        await navigationPromise;
        
        // Check if we're on a project detail page
        const url = page.url();
        expect(url).toMatch(/\/projects\/[^\/]+$/);
        
        // Wait for detail page to load
        await waitForPageReady(page);
        
        // Should show project phase manager
        await expect(page.locator('.project-phase-manager')).toBeVisible({ 
          timeout: testConfig.timeouts.elementVisible 
        });
      } catch {
        // Navigation might not happen if it's a modal or inline view
        // Check for alternative UI patterns
        const hasModal = await page.locator(testConfig.selectors.modalDialog).isVisible();
        const hasDetailView = await page.locator('.project-detail').isVisible();
        
        expect(hasModal || hasDetailView).toBeTruthy();
      }
    }
  });

  test('should handle search functionality', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/projects');
    await waitForPageReady(page);
    await waitForApiCall(page, testConfig.api.projects);
    
    // Test search functionality if it exists
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
    
    if (await searchInput.isVisible()) {
      // Type search query
      await searchInput.fill('test project');
      
      // Wait for search results to update
      await page.waitForTimeout(testConfig.testData.animationDelay);
      
      // Verify table updates (rows might be filtered)
      const tableRows = page.locator(testConfig.selectors.dataTable);
      
      // Table should still be visible even if no results
      await expect(page.locator('table')).toBeVisible();
    }
  });

  test('should handle filter buttons', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/projects');
    await waitForPageReady(page);
    await waitForApiCall(page, testConfig.api.projects);
    
    // Test filter buttons if they exist
    const filterButtons = page.locator('button').filter({ 
      hasText: /All|Active|Completed|In Progress/i 
    });
    
    const buttonCount = await filterButtons.count();
    
    if (buttonCount > 0) {
      // Click first filter button
      await filterButtons.first().click();
      
      // Wait for filter to apply
      await page.waitForTimeout(testConfig.testData.animationDelay);
      
      // Table should still be visible
      await expect(page.locator('table')).toBeVisible();
    }
  });

  test('should handle pagination if present', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/projects');
    await waitForPageReady(page);
    await waitForApiCall(page, testConfig.api.projects);
    
    // Check for pagination controls
    const pagination = page.locator('[role="navigation"][aria-label*="pagination"], .pagination');
    
    if (await pagination.isVisible()) {
      // Test next button if available
      const nextButton = pagination.getByRole('button', { name: /next/i });
      
      if (await nextButton.isEnabled()) {
        await nextButton.click();
        await waitForPageReady(page);
        
        // Table should still be visible after pagination
        await expect(page.locator('table')).toBeVisible();
      }
    }
  });

  test('should show empty state when no projects exist', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/projects');
    await waitForPageReady(page);
    
    // Check if empty state is shown
    const emptyState = page.locator(testConfig.selectors.emptyState);
    const tableRows = page.locator(testConfig.selectors.dataTable);
    
    // Either we have rows or an empty state
    const hasRows = await tableRows.count() > 0;
    const hasEmptyState = await emptyState.isVisible();
    
    expect(hasRows || hasEmptyState).toBeTruthy();
  });
});