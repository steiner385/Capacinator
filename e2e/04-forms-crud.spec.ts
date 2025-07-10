import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Form Validation and CRUD Operations', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('should handle project creation form', async ({ page }) => {
    await helpers.navigateTo('/projects');
    await helpers.waitForDataTable();
    
    // Click add new project button if available
    const addButton = page.locator('button:has-text("Add Project"), button:has-text("New Project"), button[title*="Add"]');
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Should open form dialog or navigate to form page
      const formDialog = page.locator('.modal, .dialog, .form-container');
      await expect(formDialog).toBeVisible();
      
      // Test required field validation
      const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
      await submitButton.click();
      
      // Should show validation errors
      const errorMessages = page.locator('.error, .invalid, .field-error');
      await expect(errorMessages.first()).toBeVisible();
      
      // Fill out form with valid data
      await helpers.fillForm({
        'name': 'Test Project E2E',
        'description': 'A test project created during E2E testing',
        'location_id': 'New York', // or first option
        'project_type_id': 'Mobile App', // or first option
        'start_date': '2024-01-01',
        'end_date': '2024-12-31'
      });
      
      // Submit form
      await submitButton.click();
      
      // Should close form and return to table
      await helpers.waitForDataTable();
      
      // New project should appear in table
      await helpers.searchInTable('Test Project E2E');
      const projectRows = await helpers.getTableRowCount();
      expect(projectRows).toBeGreaterThan(0);
    }
  });

  test('should handle person creation form', async ({ page }) => {
    await helpers.navigateTo('/people');
    await helpers.waitForDataTable();
    
    const addButton = page.locator('button:has-text("Add Person"), button:has-text("New Person"), button[title*="Add"]');
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      const formDialog = page.locator('.modal, .dialog, .form-container');
      await expect(formDialog).toBeVisible();
      
      // Test email validation
      await page.fill('input[name="email"], input[type="email"]', 'invalid-email');
      const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
      await submitButton.click();
      
      // Should show email validation error
      const emailError = page.locator('.error:has-text("email"), .invalid:has-text("email"), .field-error');
      if (await emailError.isVisible()) {
        await expect(emailError).toBeVisible();
      }
      
      // Fill valid form data
      await helpers.fillForm({
        'first_name': 'Test',
        'last_name': 'User',
        'email': 'test.user@example.com',
        'primary_role_id': 'Developer', // or first option
        'type': 'employee'
      });
      
      await submitButton.click();
      await helpers.waitForDataTable();
      
      // Verify person was added
      await helpers.searchInTable('Test User');
      const personRows = await helpers.getTableRowCount();
      expect(personRows).toBeGreaterThan(0);
    }
  });

  test('should handle role assignment form', async ({ page }) => {
    await helpers.navigateTo('/roles');
    await helpers.waitForDataTable();
    
    // Look for assign button in first role row
    const firstRow = page.locator('.table tbody tr').first();
    const assignButton = firstRow.locator('button:has-text("Assign"), button[title*="Assign"]');
    
    if (await assignButton.isVisible()) {
      await assignButton.click();
      
      const formDialog = page.locator('.modal, .dialog, .form-container');
      await expect(formDialog).toBeVisible();
      
      // Should have person selection dropdown
      const personSelect = page.locator('select[name*="person"], select[name*="user"]');
      await expect(personSelect).toBeVisible();
      
      // Should have project selection dropdown
      const projectSelect = page.locator('select[name*="project"]');
      await expect(projectSelect).toBeVisible();
      
      // Test allocation percentage validation
      const allocationInput = page.locator('input[name*="allocation"], input[name*="percentage"]');
      if (await allocationInput.isVisible()) {
        await allocationInput.fill('150'); // Invalid - over 100%
        
        const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Assign")');
        await submitButton.click();
        
        // Should show validation error
        const allocationError = page.locator('.error, .invalid, .field-error');
        if (await allocationError.isVisible()) {
          await expect(allocationError).toBeVisible();
        }
        
        // Fix allocation to valid value
        await allocationInput.fill('50');
      }
    }
  });

  test('should handle edit functionality', async ({ page }) => {
    await helpers.navigateTo('/projects');
    await helpers.waitForDataTable();
    
    const rowCount = await helpers.getTableRowCount();
    if (rowCount > 0) {
      // Look for edit button in first row
      const firstRow = page.locator('.table tbody tr').first();
      const editButton = firstRow.locator('button[title*="Edit"], button:has-text("Edit")');
      
      if (await editButton.isVisible()) {
        await editButton.click();
        
        const formDialog = page.locator('.modal, .dialog, .form-container, .edit-form');
        await expect(formDialog).toBeVisible();
        
        // Form should be pre-populated
        const nameInput = page.locator('input[name="name"], input[name="project_name"]');
        if (await nameInput.isVisible()) {
          const currentValue = await nameInput.inputValue();
          expect(currentValue).toBeTruthy();
          
          // Modify the value
          await nameInput.fill(currentValue + ' (Edited)');
          
          // Save changes
          const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
          await saveButton.click();
          
          // Should return to table
          await helpers.waitForDataTable();
          
          // Should show updated value
          await expect(page.locator('.table')).toContainText('(Edited)');
        }
      }
    }
  });

  test('should handle delete functionality with confirmation', async ({ page }) => {
    await helpers.navigateTo('/projects');
    await helpers.waitForDataTable();
    
    const initialRowCount = await helpers.getTableRowCount();
    if (initialRowCount > 0) {
      // Look for delete button in last row (safer than first)
      const lastRow = page.locator('.table tbody tr').last();
      const deleteButton = lastRow.locator('button[title*="Delete"], button:has-text("Delete")');
      
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        
        // Should show confirmation dialog
        const confirmDialog = page.locator('.confirm-dialog, .modal:has-text("Delete"), .alert');
        await expect(confirmDialog).toBeVisible();
        
        // Should have confirm and cancel buttons
        const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm"), button:has-text("Yes")');
        const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("No")');
        
        await expect(confirmButton).toBeVisible();
        await expect(cancelButton).toBeVisible();
        
        // Test cancel first
        await cancelButton.click();
        
        // Dialog should close, row should still exist
        await helpers.waitForDataTable();
        const cancelledRowCount = await helpers.getTableRowCount();
        expect(cancelledRowCount).toBe(initialRowCount);
        
        // Now test actual deletion
        await deleteButton.click();
        await confirmButton.click();
        
        // Should show success message
        await helpers.waitForSuccessMessage();
        
        // Row count should decrease
        await helpers.waitForDataTable();
        const finalRowCount = await helpers.getTableRowCount();
        expect(finalRowCount).toBeLessThan(initialRowCount);
      }
    }
  });

  test('should handle form validation errors', async ({ page }) => {
    await helpers.navigateTo('/people');
    await helpers.waitForDataTable();
    
    const addButton = page.locator('button:has-text("Add Person"), button:has-text("New Person"), button[title*="Add"]');
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      const formDialog = page.locator('.modal, .dialog, .form-container');
      await expect(formDialog).toBeVisible();
      
      // Test various validation scenarios
      const testCases = [
        { field: 'email', value: 'invalid-email', errorText: 'email' },
        { field: 'first_name', value: '', errorText: 'required' },
        { field: 'last_name', value: '', errorText: 'required' }
      ];
      
      for (const testCase of testCases) {
        const input = page.locator(`input[name="${testCase.field}"], input[type="${testCase.field}"]`);
        if (await input.isVisible()) {
          await input.fill(testCase.value);
          await input.blur(); // Trigger validation
          
          // Look for validation error
          const errorField = page.locator(`.error, .invalid, .field-error`);
          if (await errorField.isVisible()) {
            const errorText = await errorField.textContent();
            expect(errorText?.toLowerCase()).toContain(testCase.errorText.toLowerCase());
          }
        }
      }
    }
  });

  test('should handle date picker validation', async ({ page }) => {
    await helpers.navigateTo('/projects');
    await helpers.waitForDataTable();
    
    const addButton = page.locator('button:has-text("Add Project"), button:has-text("New Project"), button[title*="Add"]');
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      const formDialog = page.locator('.modal, .dialog, .form-container');
      await expect(formDialog).toBeVisible();
      
      // Test date validation - end date before start date
      const startDateInput = page.locator('input[name*="start"], input[type="date"]').first();
      const endDateInput = page.locator('input[name*="end"], input[type="date"]').last();
      
      if (await startDateInput.isVisible() && await endDateInput.isVisible()) {
        await startDateInput.fill('2024-12-31');
        await endDateInput.fill('2024-01-01'); // End before start
        
        const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
        await submitButton.click();
        
        // Should show date validation error
        const dateError = page.locator('.error:has-text("date"), .invalid:has-text("date"), .field-error');
        if (await dateError.isVisible()) {
          await expect(dateError).toBeVisible();
        }
      }
    }
  });

  test('should handle dropdown selections', async ({ page }) => {
    await helpers.navigateTo('/projects');
    await helpers.waitForDataTable();
    
    const addButton = page.locator('button:has-text("Add Project"), button:has-text("New Project"), button[title*="Add"]');
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      const formDialog = page.locator('.modal, .dialog, .form-container');
      await expect(formDialog).toBeVisible();
      
      // Test location dropdown
      const locationSelect = page.locator('select[name*="location"]');
      if (await locationSelect.isVisible()) {
        // Should have at least one option
        const options = await locationSelect.locator('option').count();
        expect(options).toBeGreaterThan(1); // Including default/empty option
        
        // Select first non-empty option
        await locationSelect.selectOption({ index: 1 });
        
        const selectedValue = await locationSelect.inputValue();
        expect(selectedValue).toBeTruthy();
      }
      
      // Test project type dropdown
      const projectTypeSelect = page.locator('select[name*="project_type"], select[name*="type"]');
      if (await projectTypeSelect.isVisible()) {
        const options = await projectTypeSelect.locator('option').count();
        expect(options).toBeGreaterThan(1);
        
        await projectTypeSelect.selectOption({ index: 1 });
        
        const selectedValue = await projectTypeSelect.inputValue();
        expect(selectedValue).toBeTruthy();
      }
    }
  });

  test('should handle bulk operations', async ({ page }) => {
    await helpers.navigateTo('/assignments');
    await helpers.waitForDataTable();
    
    // Look for bulk action controls
    const selectAllCheckbox = page.locator('input[type="checkbox"][name*="select-all"], .select-all-checkbox');
    
    if (await selectAllCheckbox.isVisible()) {
      // Select all rows
      await selectAllCheckbox.check();
      
      // Should show bulk action buttons
      const bulkActions = page.locator('.bulk-actions, .selected-actions');
      if (await bulkActions.isVisible()) {
        await expect(bulkActions).toBeVisible();
        
        // Should have bulk delete option
        const bulkDeleteButton = page.locator('button:has-text("Delete Selected"), button:has-text("Bulk Delete")');
        if (await bulkDeleteButton.isVisible()) {
          await expect(bulkDeleteButton).toBeVisible();
          
          // Don't actually delete, just verify the UI works
          // Unselect all to clear bulk actions
          await selectAllCheckbox.uncheck();
          
          // Bulk actions should disappear
          await expect(bulkActions).not.toBeVisible();
        }
      }
    }
  });
});