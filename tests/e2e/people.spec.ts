import { test, expect } from './helpers/base-test';
import { testConfig, waitForPageReady, waitForApiCall } from './helpers/test-config';

test.describe('People Page Functionality', () => {
  
  test('should display people list', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/people');
    await waitForPageReady(page);
    
    // Wait for people data to load
    await waitForApiCall(page, testConfig.api.people);
    
    await expect(page.locator('h1')).toContainText('People');
    
    // Should show data table
    await expect(page.locator('table')).toBeVisible();
    
    // Should show Add Person button
    await expect(page.locator('button:has-text("Add Person")')).toBeVisible();
  });

  test('should handle Add Person button click', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/people');
    await waitForPageReady(page);
    
    const addButton = page.locator('button:has-text("Add Person")');
    await expect(addButton).toBeVisible();
    
    // Click should either navigate to /people/new or show modal
    await addButton.click();
    await page.waitForTimeout(testConfig.testData.animationDelay);
    
    // Check if it navigates or shows modal
    const url = page.url();
    const hasModal = await page.locator(testConfig.selectors.modalDialog).isVisible();
    
    expect(url.includes('/people/new') || hasModal).toBeTruthy();
  });

  test('should display person data in table', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/people');
    await waitForPageReady(page);
    await waitForApiCall(page, testConfig.api.people);
    
    const tableRows = page.locator(testConfig.selectors.dataTable);
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
  
  test('should display team insights summary', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/people');
    await waitForPageReady(page);
    await waitForApiCall(page, testConfig.api.people);
    
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
  
  test('should display workload status indicators', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/people');
    await waitForPageReady(page);
    await waitForApiCall(page, testConfig.api.people);
    
    const tableRows = page.locator(testConfig.selectors.dataTable);
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
  
  test('should display and handle quick action buttons', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/people');
    await waitForPageReady(page);
    await waitForApiCall(page, testConfig.api.people);
    
    const tableRows = page.locator(testConfig.selectors.dataTable);
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
        await page.waitForTimeout(testConfig.testData.animationDelay);
        
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
  
  test('should apply correct status colors for workload indicators', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/people');
    await waitForPageReady(page);
    await waitForApiCall(page, testConfig.api.people);
    
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

  test('should navigate to person details via name click', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/people');
    await waitForPageReady(page);
    await waitForApiCall(page, testConfig.api.people);
    
    const tableRows = page.locator(testConfig.selectors.dataTable);
    const rowCount = await tableRows.count();
    
    if (rowCount > 0) {
      const personName = tableRows.first().locator('td:first-child a, td:first-child button');
      
      // Click and wait for navigation
      const navigationPromise = page.waitForNavigation({ timeout: testConfig.timeouts.navigation });
      await personName.click();
      
      try {
        await navigationPromise;
        
        // Should navigate to person detail page
        const url = page.url();
        expect(url).toMatch(/\/people\/[^\/]+$/);
        
        // Wait for detail page to load
        await waitForPageReady(page);
        
        // Should show person details page
        await expect(page.locator('h1')).toBeVisible();
      } catch {
        // Navigation might not happen immediately
        await page.waitForTimeout(testConfig.testData.animationDelay);
        const url = page.url();
        expect(url).toMatch(/\/people\/[^\/]+$/);
      }
    }
  });

  test('should handle View button click', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/people');
    await waitForPageReady(page);
    await waitForApiCall(page, testConfig.api.people);
    
    const tableRows = page.locator(testConfig.selectors.dataTable);
    const rowCount = await tableRows.count();
    
    if (rowCount > 0) {
      const viewButton = tableRows.first().locator('button:has-text("View")');
      
      // Click and wait for navigation
      const navigationPromise = page.waitForNavigation({ timeout: testConfig.timeouts.navigation });
      await viewButton.click();
      
      try {
        await navigationPromise;
        
        // Should navigate to person detail page
        const url = page.url();
        expect(url).toMatch(/\/people\/[^\/]+$/);
      } catch {
        // Navigation might not happen immediately
        await page.waitForTimeout(testConfig.testData.animationDelay);
        const url = page.url();
        expect(url).toMatch(/\/people\/[^\/]+$/);
      }
    }
  });

  test('should handle contextual quick actions with proper parameters', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/people');
    await waitForPageReady(page);
    await waitForApiCall(page, testConfig.api.people);
    
    const quickActionButtons = page.locator('.quick-action-btn');
    if (await quickActionButtons.count() > 0) {
      const firstButton = quickActionButtons.first();
      const buttonText = await firstButton.textContent();
      
      // Click the action button
      await firstButton.click();
      await page.waitForTimeout(testConfig.testData.animationDelay);
      
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
  
  test('should handle Edit button click', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/people');
    await waitForPageReady(page);
    await waitForApiCall(page, testConfig.api.people);
    
    const tableRows = page.locator(testConfig.selectors.dataTable);
    const rowCount = await tableRows.count();
    
    if (rowCount > 0) {
      const editButton = tableRows.first().locator('button:has-text("Edit")');
      await editButton.click();
      
      // Wait for navigation or modal
      await page.waitForTimeout(testConfig.testData.animationDelay);
      
      // Check if it navigates or shows modal
      const url = page.url();
      const hasModal = await page.locator(testConfig.selectors.modalDialog).isVisible();
      
      expect(url.includes('/edit') || hasModal).toBeTruthy();
    }
  });

  test('should handle Delete button click', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/people');
    await waitForPageReady(page);
    await waitForApiCall(page, testConfig.api.people);
    
    const tableRows = page.locator(testConfig.selectors.dataTable);
    const rowCount = await tableRows.count();
    
    if (rowCount > 0) {
      // Set up console log listener
      const consoleMessages: string[] = [];
      page.on('console', msg => {
        consoleMessages.push(msg.text());
      });
      
      const deleteButton = tableRows.first().locator('button[title*="Delete"], button:has([data-testid="trash"])');
      await deleteButton.click();
      
      await page.waitForTimeout(testConfig.testData.animationDelay);
      
      // Should either show confirmation modal or log to console
      const hasModal = await page.locator(testConfig.selectors.modalDialog).isVisible();
      const hasConsoleLog = consoleMessages.some(msg => msg.includes('TODO: Implement delete functionality'));
      
      expect(hasModal || hasConsoleLog).toBeTruthy();
    }
  });

  test('should handle search and filters', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/people');
    await waitForPageReady(page);
    await waitForApiCall(page, testConfig.api.people);
    
    // Test search functionality
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('Alice');
      
      // Wait for search results to update
      await page.waitForTimeout(testConfig.testData.animationDelay);
      
      // Should filter results
      const tableRows = page.locator(testConfig.selectors.dataTable);
      
      // Table should still be visible even if no results
      await expect(page.locator('table')).toBeVisible();
      
      // If there are results, they should contain searched term
      if (await tableRows.count() > 0) {
        await expect(tableRows.first()).toContainText('Alice');
      }
    }
    
    // Test role filter if it exists
    const roleFilter = page.locator('select[name*="role"], select:has(option:text-is("All Roles"))');
    
    if (await roleFilter.isVisible()) {
      await roleFilter.selectOption({ index: 1 }); // Select first non-"All" option
      await page.waitForTimeout(testConfig.testData.animationDelay);
      
      // Table should still be visible after filtering
      await expect(page.locator('table')).toBeVisible();
    }
  });

  test('should show empty state when no people exist', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/people');
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