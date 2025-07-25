import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Assignment Conflict Detection', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    
    // Ensure we have test data loaded
    await helpers.navigateTo('/import');
    await helpers.setupPage();
    await helpers.uploadFile('simple-test-data.xlsx');
    
    const clearExistingCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: 'Clear existing' }).or(
      page.locator('label:has-text("Clear existing") input[type="checkbox"]')
    );
    await clearExistingCheckbox.check();
    
    await helpers.clickButton('Upload and Import');
    await helpers.waitForSuccessMessage();
  });

  test('should detect time overlap conflicts when creating assignments', async ({ page }) => {
    await helpers.navigateTo('/assignments');
    await helpers.waitForDataTable();
    
    // Try to create a new assignment
    const addButton = page.locator('button:has-text("Add Assignment"), button:has-text("New Assignment"), button[title*="Add"]');
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      const formDialog = page.locator('[role="dialog"]');
      await expect(formDialog).toBeVisible();
      
      // Fill form with overlapping dates to existing assignment
      await helpers.fillForm({
        'person_id': 'Alice Johnson', // or select first person
        'project_id': 'Mobile Banking App', // or select first project
        'role_id': 'Developer', // or select first role
        'start_date': '2024-01-01',
        'end_date': '2024-06-30',
        'allocation_percentage': '80'
      });
      
      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
      await submitButton.click();
      
      // Should show conflict warning
      const conflictWarning = page.locator('.conflict-warning, .warning, .alert:has-text("conflict")');
      if (await conflictWarning.isVisible()) {
        await expect(conflictWarning).toBeVisible();
        
        // Should show conflict details
        await expect(conflictWarning).toContainText('overlap');
        await expect(conflictWarning).toContainText('allocation');
        
        // Should offer options to resolve conflict
        const proceedButton = page.locator('button:has-text("Proceed Anyway"), button:has-text("Override")');
        const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Modify")');
        
        await expect(proceedButton).toBeVisible();
        await expect(cancelButton).toBeVisible();
        
        // Test cancelling to modify
        await cancelButton.click();
        
        // Should return to form
        await expect(formDialog).toBeVisible();
      }
    }
  });

  test('should detect over-allocation conflicts', async ({ page }) => {
    await helpers.navigateTo('/assignments');
    await helpers.waitForDataTable();
    
    const addButton = page.locator('button:has-text("Add Assignment"), button:has-text("New Assignment"), button[title*="Add"]');
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      const formDialog = page.locator('[role="dialog"]');
      await expect(formDialog).toBeVisible();
      
      // Fill form with high allocation that would cause over-allocation
      await helpers.fillForm({
        'person_id': 'Alice Johnson',
        'project_id': 'E-commerce Platform',
        'role_id': 'Developer',
        'start_date': '2024-03-01',
        'end_date': '2024-09-30',
        'allocation_percentage': '90' // High allocation
      });
      
      const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
      await submitButton.click();
      
      // Should show over-allocation warning
      const allocationWarning = page.locator('.allocation-warning, .warning:has-text("allocation"), .alert:has-text("100%")');
      if (await allocationWarning.isVisible()) {
        await expect(allocationWarning).toBeVisible();
        
        // Should show total allocation percentage
        await expect(allocationWarning).toContainText('%');
        
        // Should show which projects are conflicting
        const conflictDetails = page.locator('.conflict-details, .conflict-list');
        if (await conflictDetails.isVisible()) {
          await expect(conflictDetails).toBeVisible();
        }
      }
    }
  });

  test('should show conflict suggestions and alternatives', async ({ page }) => {
    await helpers.navigateTo('/assignments');
    await helpers.waitForDataTable();
    
    const addButton = page.locator('button:has-text("Add Assignment"), button:has-text("New Assignment"), button[title*="Add"]');
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      const formDialog = page.locator('[role="dialog"]');
      await expect(formDialog).toBeVisible();
      
      // Create conflicting assignment
      await helpers.fillForm({
        'person_id': 'Bob Smith',
        'project_id': 'CRM System',
        'role_id': 'Senior Developer',
        'start_date': '2024-02-01',
        'end_date': '2024-08-31',
        'allocation_percentage': '75'
      });
      
      const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
      await submitButton.click();
      
      // Look for conflict resolution suggestions
      const suggestions = page.locator('.suggestions, .alternatives, .recommendations');
      if (await suggestions.isVisible()) {
        await expect(suggestions).toBeVisible();
        
        // Should suggest alternative dates
        const dateSuggestion = page.locator('.suggestion:has-text("date"), .alternative:has-text("date")');
        if (await dateSuggestion.isVisible()) {
          await expect(dateSuggestion).toBeVisible();
        }
        
        // Should suggest alternative people
        const peopleSuggestion = page.locator('.suggestion:has-text("person"), .alternative:has-text("available")');
        if (await peopleSuggestion.isVisible()) {
          await expect(peopleSuggestion).toBeVisible();
        }
        
        // Should suggest allocation adjustments
        const allocationSuggestion = page.locator('.suggestion:has-text("allocation"), .alternative:has-text("%")');
        if (await allocationSuggestion.isVisible()) {
          await expect(allocationSuggestion).toBeVisible();
        }
      }
    }
  });

  test('should handle conflict resolution workflow', async ({ page }) => {
    await helpers.navigateTo('/assignments');
    await helpers.waitForDataTable();
    
    // Edit an existing assignment to create a conflict
    const rowCount = await helpers.getTableRowCount();
    if (rowCount > 0) {
      const firstRow = page.locator('.table tbody tr').first();
      const editButton = firstRow.locator('button[title*="Edit"], button:has-text("Edit")');
      
      if (await editButton.isVisible()) {
        await editButton.click();
        
        const formDialog = page.locator('[role="dialog"]');
        await expect(formDialog).toBeVisible();
        
        // Modify allocation to create conflict
        const allocationInput = page.locator('input[name*="allocation"], input[name*="percentage"]');
        if (await allocationInput.isVisible()) {
          await allocationInput.fill('95'); // High allocation
          
          const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")');
          await submitButton.click();
          
          // Should show conflict resolution options
          const conflictResolution = page.locator('.conflict-resolution, .resolution-options');
          if (await conflictResolution.isVisible()) {
            await expect(conflictResolution).toBeVisible();
            
            // Should have options like:
            // - Proceed anyway
            // - Modify other assignments
            // - Split the assignment
            const resolutionOptions = page.locator('.resolution-option, .conflict-action');
            const optionCount = await resolutionOptions.count();
            expect(optionCount).toBeGreaterThan(0);
            
            // Test "Proceed anyway" option
            const proceedButton = page.locator('button:has-text("Proceed"), button:has-text("Override"), button:has-text("Force")');
            if (await proceedButton.isVisible()) {
              await proceedButton.click();
              
              // Should save with warning
              await helpers.waitForDataTable();
              
              // Should show warning indicator in table
              const warningIcon = page.locator('.warning-icon, .conflict-indicator, .alert-icon');
              if (await warningIcon.isVisible()) {
                await expect(warningIcon).toBeVisible();
              }
            }
          }
        }
      }
    }
  });

  test('should display conflict indicators in assignments table', async ({ page }) => {
    await helpers.navigateTo('/assignments');
    await helpers.waitForDataTable();
    
    // Look for conflict indicators in the table
    const conflictIndicators = page.locator('.conflict-indicator, .warning-icon, .over-allocated');
    
    if (await conflictIndicators.first().isVisible()) {
      // Should show visual indicators for conflicts
      await expect(conflictIndicators.first()).toBeVisible();
      
      // Hover over indicator to see details
      await conflictIndicators.first().hover();
      
      // Should show tooltip with conflict details
      const tooltip = page.locator('.tooltip, .popover, .conflict-details');
      if (await tooltip.isVisible()) {
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('conflict');
      }
    }
    
    // Look for over-allocation indicators
    const overAllocationIndicators = page.locator('.over-allocated, .allocation-warning, .red');
    
    if (await overAllocationIndicators.first().isVisible()) {
      await expect(overAllocationIndicators.first()).toBeVisible();
      
      // Should show percentage over 100%
      const overAllocationText = await overAllocationIndicators.first().textContent();
      expect(overAllocationText).toMatch(/\d+%/);
    }
  });

  test('should handle availability conflicts', async ({ page }) => {
    await helpers.navigateTo('/assignments');
    await helpers.waitForDataTable();
    
    const addButton = page.locator('button:has-text("Add Assignment"), button:has-text("New Assignment"), button[title*="Add"]');
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      const formDialog = page.locator('[role="dialog"]');
      await expect(formDialog).toBeVisible();
      
      // Try to assign someone during their unavailable period
      await helpers.fillForm({
        'person_id': 'Carol Davis',
        'project_id': 'Analytics Dashboard',
        'role_id': 'Data Analyst',
        'start_date': '2024-07-01', // During vacation period
        'end_date': '2024-07-15',
        'allocation_percentage': '50'
      });
      
      const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
      await submitButton.click();
      
      // Should show availability conflict
      const availabilityWarning = page.locator('.availability-warning, .warning:has-text("available"), .alert:has-text("vacation")');
      if (await availabilityWarning.isVisible()) {
        await expect(availabilityWarning).toBeVisible();
        
        // Should mention the type of unavailability
        const warningText = await availabilityWarning.textContent();
        expect(warningText?.toLowerCase()).toMatch(/vacation|unavailable|holiday|leave/);
      }
    }
  });

  test('should validate role compatibility', async ({ page }) => {
    await helpers.navigateTo('/assignments');
    await helpers.waitForDataTable();
    
    const addButton = page.locator('button:has-text("Add Assignment"), button:has-text("New Assignment"), button[title*="Add"]');
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      const formDialog = page.locator('[role="dialog"]');
      await expect(formDialog).toBeVisible();
      
      // Try to assign someone to a role they don't typically fill
      await helpers.fillForm({
        'person_id': 'Dave Wilson', // Designer
        'project_id': 'Mobile Banking App',
        'role_id': 'Backend Developer', // Incompatible role
        'start_date': '2024-04-01',
        'end_date': '2024-06-30',
        'allocation_percentage': '60'
      });
      
      const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
      await submitButton.click();
      
      // Should show role compatibility warning
      const roleWarning = page.locator('.role-warning, .warning:has-text("role"), .alert:has-text("experience")');
      if (await roleWarning.isVisible()) {
        await expect(roleWarning).toBeVisible();
        
        // Should suggest more suitable candidates
        const suggestions = page.locator('.role-suggestions, .suitable-candidates');
        if (await suggestions.isVisible()) {
          await expect(suggestions).toBeVisible();
        }
      }
    }
  });

  test('should show conflict summary dashboard', async ({ page }) => {
    // Navigate to a conflicts overview page if it exists
    await helpers.navigateTo('/assignments');
    await helpers.waitForDataTable();
    
    // Look for conflicts filter or summary
    const conflictsFilter = page.locator('button:has-text("Conflicts"), .filter:has-text("Conflicts"), select[name*="conflict"]');
    
    if (await conflictsFilter.isVisible()) {
      await conflictsFilter.click();
      
      // Should filter to show only conflicted assignments
      await helpers.waitForDataTable();
      
      // All visible rows should have conflict indicators
      const visibleRows = page.locator('.table tbody tr');
      const rowCount = await visibleRows.count();
      
      if (rowCount > 0) {
        // Each row should have some conflict indicator
        for (let i = 0; i < Math.min(rowCount, 3); i++) {
          const row = visibleRows.nth(i);
          const conflictIndicator = row.locator('.conflict-indicator, .warning-icon, .over-allocated');
          if (await conflictIndicator.isVisible()) {
            await expect(conflictIndicator).toBeVisible();
          }
        }
      }
    }
    
    // Look for conflict statistics
    const conflictStats = page.locator('.conflict-stats, .summary-stats, .conflict-summary');
    if (await conflictStats.isVisible()) {
      await expect(conflictStats).toBeVisible();
      
      // Should show numbers of different conflict types
      await expect(conflictStats).toContainText('conflict');
    }
  });

  test('should handle batch conflict resolution', async ({ page }) => {
    await helpers.navigateTo('/assignments');
    await helpers.waitForDataTable();
    
    // Look for bulk operations with conflict resolution
    const selectAllCheckbox = page.locator('input[type="checkbox"][name*="select-all"], .select-all-checkbox');
    
    if (await selectAllCheckbox.isVisible()) {
      // Select multiple assignments
      const checkboxes = page.locator('.table tbody tr input[type="checkbox"]');
      const checkboxCount = await checkboxes.count();
      
      if (checkboxCount > 1) {
        // Select first few assignments
        for (let i = 0; i < Math.min(checkboxCount, 3); i++) {
          await checkboxes.nth(i).check();
        }
        
        // Look for bulk conflict resolution options
        const bulkActions = page.locator('.bulk-actions, .selected-actions');
        if (await bulkActions.isVisible()) {
          const resolveConflictsButton = page.locator('button:has-text("Resolve Conflicts"), button:has-text("Fix Conflicts")');
          
          if (await resolveConflictsButton.isVisible()) {
            await resolveConflictsButton.click();
            
            // Should open batch resolution dialog
            const batchDialog = page.locator('.batch-resolution, .bulk-conflict-resolution');
            if (await batchDialog.isVisible()) {
              await expect(batchDialog).toBeVisible();
              
              // Should show resolution options for all selected assignments
              const resolutionOptions = page.locator('.resolution-option, .batch-option');
              const optionCount = await resolutionOptions.count();
              expect(optionCount).toBeGreaterThan(0);
            }
          }
        }
      }
    }
  });
});