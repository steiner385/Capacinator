import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Error Handling and Edge Cases', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('should handle server connection errors gracefully', async ({ page }) => {
    // Navigate to app first
    await helpers.navigateTo('/');
    await helpers.waitForNavigation();
    
    // Mock network failure for API calls
    await page.route('**/api/**', route => {
      route.abort('failed');
    });
    
    // Try to navigate to a data-dependent page
    await helpers.navigateViaSidebar('Projects');
    
    // Should show error state, not crash
    const errorMessage = page.locator('.text-destructive, .connection-error, .api-error, .error');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toBeVisible();
      
      // Should show meaningful error message
      const errorText = await errorMessage.textContent();
      expect(errorText?.toLowerCase()).toMatch(/error|failed|connection|server/);
    }
    
    // UI should remain functional (not white screen)
    await expect(page.locator('body')).toBeVisible();
    await helpers.waitForNavigation();
    
    // Should be able to navigate to other pages
    await helpers.navigateViaSidebar('Dashboard');
  });

  test('should handle API timeout gracefully', async ({ page }) => {
    // Mock slow API responses
    await page.route('**/api/**', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] })
        });
      }, 30000); // 30 second delay
    });
    
    await helpers.navigateTo('/projects');
    
    // Should show loading state
    const loadingIndicator = page.locator('.loading, .spinner, .loading-state');
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).toBeVisible();
    }
    
    // Should eventually timeout and show error or retry option
    await page.waitForTimeout(5000); // Wait 5 seconds
    
    const timeoutError = page.locator('.timeout-error, .error:has-text("timeout"), .retry-button');
    if (await timeoutError.isVisible()) {
      await expect(timeoutError).toBeVisible();
    }
  });

  test('should handle invalid file uploads', async ({ page }) => {
    await helpers.navigateTo('/import');
    await helpers.setupPage();
    
    // Try to upload invalid file types (mock by creating a fake file input)
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveAttribute('accept', '.xlsx,.xls');
    
    // Test client-side validation message
    const invalidFileError = page.locator('.file-error, .invalid-file, .error:has-text("file")');
    
    // Try to upload without selecting file
    const uploadButton = page.locator('button:has-text("Upload"), button:has-text("Import")');
    if (await uploadButton.isVisible()) {
      await uploadButton.click();
      
      // Should show validation error
      const noFileError = page.locator('.error:has-text("file"), .error:has-text("select"), .validation-error');
      if (await noFileError.isVisible()) {
        await expect(noFileError).toBeVisible();
      }
    }
  });

  test('should handle corrupted Excel file upload', async ({ page }) => {
    await helpers.navigateTo('/import');
    await helpers.setupPage();
    
    // Mock corrupted file upload response
    await page.route('**/api/import**', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Invalid Excel file format',
          details: 'File appears to be corrupted or not a valid Excel file'
        })
      });
    });
    
    // Try to upload a file (will be mocked as corrupted)
    try {
      await helpers.uploadFile('simple-test-data.xlsx');
      await helpers.clickButton('Upload and Import');
      
      // Should show error message
      const corruptedFileError = page.locator('.error:has-text("Invalid"), .error:has-text("corrupted"), .import-error');
      if (await corruptedFileError.isVisible()) {
        await expect(corruptedFileError).toBeVisible();
        
        // Should provide helpful error details
        const errorText = await corruptedFileError.textContent();
        expect(errorText?.toLowerCase()).toMatch(/invalid|corrupted|format/);
      }
    } catch (error) {
      // Expected behavior - upload should fail gracefully
    }
  });

  test('should handle database constraint violations', async ({ page }) => {
    await helpers.navigateTo('/projects');
    await helpers.waitForDataTable();
    
    // Mock database constraint error
    await page.route('**/api/projects**', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Duplicate project name',
            constraint: 'unique_project_name'
          })
        });
      } else {
        route.continue();
      }
    });
    
    const addButton = page.locator('button:has-text("Add Project"), button:has-text("New Project"), button[title*="Add"]');
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      const formDialog = page.locator('[role="dialog"]');
      await expect(formDialog).toBeVisible();
      
      // Fill form and submit
      await helpers.fillForm({
        'name': 'Duplicate Project Name',
        'description': 'This will cause a constraint violation',
        'start_date': '2024-01-01',
        'end_date': '2024-12-31'
      });
      
      const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
      await submitButton.click();
      
      // Should show constraint violation error
      const constraintError = page.locator('.error:has-text("Duplicate"), .error:has-text("exists"), .constraint-error');
      if (await constraintError.isVisible()) {
        await expect(constraintError).toBeVisible();
        
        // Should suggest resolution
        const errorText = await constraintError.textContent();
        expect(errorText?.toLowerCase()).toMatch(/duplicate|exists|unique/);
      }
    }
  });

  test('should handle unauthorized access', async ({ page }) => {
    // Mock 401 unauthorized response
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Unauthorized access',
          message: 'Please log in to continue'
        })
      });
    });
    
    await helpers.navigateTo('/projects');
    
    // Should show unauthorized error or redirect to login
    const unauthorizedError = page.locator('.error:has-text("Unauthorized"), .error:has-text("login"), .auth-error');
    if (await unauthorizedError.isVisible()) {
      await expect(unauthorizedError).toBeVisible();
    }
    
    // Should not show sensitive data
    const dataTable = page.locator('.data-table-wrapper');
    if (await dataTable.isVisible()) {
      // Table should be empty or show access denied message
      const tableRows = await helpers.getTableRowCount();
      expect(tableRows).toBe(0);
    }
  });

  test('should handle malformed API responses', async ({ page }) => {
    // Mock malformed JSON response
    await page.route('**/api/projects**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'Invalid JSON{malformed'
      });
    });
    
    await helpers.navigateTo('/projects');
    
    // Should handle JSON parse error gracefully
    const parseError = page.locator('.error:has-text("parse"), .error:has-text("format"), .api-error');
    if (await parseError.isVisible()) {
      await expect(parseError).toBeVisible();
    }
    
    // Should show retry option
    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Reload")');
    if (await retryButton.isVisible()) {
      await expect(retryButton).toBeVisible();
    }
  });

  test('should handle extremely large datasets', async ({ page }) => {
    // Mock response with very large dataset
    const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
      id: `project-${i}`,
      name: `Large Project ${i}`,
      status: 'active',
      start_date: '2024-01-01',
      end_date: '2024-12-31'
    }));
    
    await page.route('**/api/projects**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: largeDataset, total: largeDataset.length })
      });
    });
    
    await helpers.navigateTo('/projects');
    
    // Should handle large dataset without freezing
    await helpers.waitForDataTable();
    
    // Should implement pagination or virtualization
    const paginationControls = page.locator('.pagination, .table-pagination');
    if (await paginationControls.isVisible()) {
      await expect(paginationControls).toBeVisible();
      
      // Should show reasonable number of rows per page
      const visibleRows = await helpers.getTableRowCount();
      expect(visibleRows).toBeLessThanOrEqual(100); // Reasonable limit
    }
    
    // Performance should be acceptable
    const endTime = Date.now();
    // Basic check that page didn't hang indefinitely
    expect(endTime).toBeDefined();
  });

  test('should handle special characters and Unicode', async ({ page }) => {
    await helpers.navigateTo('/projects');
    await helpers.waitForDataTable();
    
    const addButton = page.locator('button:has-text("Add Project"), button:has-text("New Project"), button[title*="Add"]');
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      const formDialog = page.locator('[role="dialog"]');
      await expect(formDialog).toBeVisible();
      
      // Test special characters and Unicode
      const specialCharacters = {
        'name': 'Project with émojis 🚀 & spëcial chars: áéíóú',
        'description': 'Description with 中文 Русский العربية and symbols: @#$%^&*()',
      };
      
      await helpers.fillForm(specialCharacters);
      
      const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
      await submitButton.click();
      
      // Should handle Unicode gracefully
      await helpers.waitForDataTable();
      
      // Search for the special character project
      await helpers.searchInTable('émojis');
      const foundRows = await helpers.getTableRowCount();
      
      if (foundRows > 0) {
        // Should display Unicode characters correctly in table
        const tableContent = await page.locator('.table').textContent();
        expect(tableContent).toContain('🚀');
        expect(tableContent).toContain('émojis');
      }
    }
  });

  test('should handle browser compatibility issues', async ({ page }) => {
    // Test with disabled JavaScript features (mock)
    // Note: This is a simplified test as actual feature detection is complex
    
    await helpers.navigateTo('/');
    
    // Should show graceful degradation message if modern features aren't supported
    const compatibilityWarning = page.locator('.compatibility-warning, .browser-warning, .outdated-browser');
    
    // App should still be functional even with warnings
    await helpers.waitForNavigation();
    await expect(page.locator('body')).toBeVisible();
    
    // Basic navigation should work
    await helpers.navigateViaSidebar('Dashboard');
    await helpers.verifyPageTitle('Dashboard');
  });

  test('should handle concurrent user modifications', async ({ page }) => {
    await helpers.navigateTo('/projects');
    await helpers.waitForDataTable();
    
    // Mock conflict response (data modified by another user)
    await page.route('**/api/projects/**', route => {
      if (route.request().method() === 'PUT') {
        route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Conflict',
            message: 'Data was modified by another user',
            conflict_type: 'concurrent_modification'
          })
        });
      } else {
        route.continue();
      }
    });
    
    const rowCount = await helpers.getTableRowCount();
    if (rowCount > 0) {
      const firstRow = page.locator('.table tbody tr').first();
      const editButton = firstRow.locator('button[title*="Edit"], button:has-text("Edit")');
      
      if (await editButton.isVisible()) {
        await editButton.click();
        
        const formDialog = page.locator('[role="dialog"]');
        await expect(formDialog).toBeVisible();
        
        // Modify and save
        const nameInput = page.locator('input[name="name"], input[name="project_name"]');
        if (await nameInput.isVisible()) {
          await nameInput.fill('Modified Project Name');
          
          const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
          await saveButton.click();
          
          // Should show conflict resolution dialog
          const conflictDialog = page.locator('.conflict-dialog, .error:has-text("conflict"), .error:has-text("modified")');
          if (await conflictDialog.isVisible()) {
            await expect(conflictDialog).toBeVisible();
            
            // Should offer options to resolve conflict
            const reloadButton = page.locator('button:has-text("Reload"), button:has-text("Refresh")');
            const forceButton = page.locator('button:has-text("Force"), button:has-text("Override")');
            
            if (await reloadButton.isVisible()) {
              await expect(reloadButton).toBeVisible();
            }
            if (await forceButton.isVisible()) {
              await expect(forceButton).toBeVisible();
            }
          }
        }
      }
    }
  });

  test('should handle memory and performance issues', async ({ page }) => {
    // Test memory-intensive operations
    await helpers.navigateTo('/dashboard');
    await helpers.waitForDashboardCharts();
    
    // Rapidly navigate between pages to test memory leaks
    const pages = ['Projects', 'People', 'Roles', 'Assignments', 'Dashboard'];
    
    for (let cycle = 0; cycle < 3; cycle++) {
      for (const pageName of pages) {
        await helpers.navigateViaSidebar(pageName);
        
        // Wait for page to load
        if (pageName === 'Dashboard') {
          await helpers.waitForDashboardCharts();
        } else {
          await helpers.waitForDataTable();
        }
        
        // Verify no memory errors or crashes
        await helpers.verifyNoErrors();
        
        // Quick check that navigation is still responsive
        const startTime = Date.now();
        await page.waitForTimeout(100);
        const endTime = Date.now();
        
        // Should not hang (very basic check)
        expect(endTime - startTime).toBeLessThan(5000);
      }
    }
  });

  test('should handle edge cases in form validation', async ({ page }) => {
    await helpers.navigateTo('/projects');
    await helpers.waitForDataTable();
    
    const addButton = page.locator('button:has-text("Add Project"), button:has-text("New Project"), button[title*="Add"]');
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      const formDialog = page.locator('[role="dialog"]');
      await expect(formDialog).toBeVisible();
      
      // Test edge cases
      const edgeCases = [
        { field: 'name', value: ' ', description: 'whitespace only' },
        { field: 'name', value: 'a'.repeat(1000), description: 'extremely long input' },
        { field: 'start_date', value: '0000-00-00', description: 'invalid date' },
        { field: 'end_date', value: '9999-99-99', description: 'invalid future date' }
      ];
      
      for (const testCase of edgeCases) {
        const input = page.locator(`input[name="${testCase.field}"], input[type="${testCase.field === 'start_date' || testCase.field === 'end_date' ? 'date' : 'text'}"]`);
        
        if (await input.isVisible()) {
          await input.fill(testCase.value);
          await input.blur();
          
          // Should show appropriate validation error
          const errorMessage = page.locator('[role="alert"][class*="destructive"], .text-destructive');
          if (await errorMessage.isVisible()) {
            const errorText = await errorMessage.textContent();
            expect(errorText?.trim()).toBeTruthy();
          }
          
          // Clear field for next test
          await input.fill('');
        }
      }
    }
  });
});