/**
 * Forms CRUD Test Suite
 * Tests for form validation and CRUD operations
 * Uses dynamic test data for proper isolation
 */

import { test, expect, tags, patterns } from '../../fixtures';
import { TestDataContext } from '../../utils/test-data-helpers';
import { SHADCN_SELECTORS, waitForDialog, closeDialog } from '../../utils/shadcn-helpers';

test.describe('Form Validation and CRUD Operations', () => {
  let testContext: TestDataContext;
  let testData: any;

  test.beforeEach(async ({ testDataHelpers }) => {
    // Create isolated test context
    testContext = testDataHelpers.createTestContext('forms');
    
    // Create minimal test data - we'll create more in each test
    testData = await testDataHelpers.createBulkTestData(testContext, {
      projects: 1,
      people: 1,
      assignments: 0
    });
  });

  test.afterEach(async ({ testDataHelpers }) => {
    // Clean up all test data
    await testDataHelpers.cleanupTestContext(testContext);
  });

  test.describe('Project Forms', () => {
    test(`${tags.crud} should handle project creation form`, async ({ 
      authenticatedPage, 
      testHelpers,
      testDataHelpers 
    }) => {
      await testHelpers.navigateTo('/projects');
      await testHelpers.waitForDataTable();
      
      // Click add new project button if available
      const addButton = authenticatedPage.locator('button:has-text("Add Project"), button:has-text("New Project"), button[title*="Add"]');
      
      if (await addButton.isVisible()) {
        await addButton.click();
        
        // Should open form dialog
        await waitForDialog(authenticatedPage);
        const formDialog = authenticatedPage.locator(SHADCN_SELECTORS.dialog);
        await expect(formDialog).toBeVisible();
        
        // Test required field validation
        const submitButton = authenticatedPage.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
        await submitButton.click();
        
        // Should show validation errors
        const errorMessages = authenticatedPage.locator(SHADCN_SELECTORS.errorMessage);
        await expect(errorMessages.nth(0)).toBeVisible();
        
        // Fill out form with unique test data
        const projectName = `${testContext.prefix}-Form-Test-Project`;
        await testHelpers.fillForm({
          'name': projectName,
          'description': 'A test project created during E2E form testing',
          'location_id': 'New York',
          'project_type_id': 'Mobile App',
          'start_date': '2024-01-01',
          'end_date': '2024-12-31'
        });
        
        // Track created project for cleanup
        const responsePromise = authenticatedPage.waitForResponse(response =>
          response.url().includes('/api/projects') &&
          response.request().method() === 'POST'
        );
        
        // Submit form
        await submitButton.click();
        
        const response = await responsePromise;
        const responseData = await response.json();
        if (responseData.data?.id || responseData.id) {
          testContext.createdIds.projects.push(responseData.data?.id || responseData.id);
        }
        
        // Should close form and return to table
        await authenticatedPage.waitForSelector(SHADCN_SELECTORS.dialog, { state: 'hidden' });
        await testHelpers.waitForDataTable();
        
        // New project should appear in table
        const projectRow = await testDataHelpers.findByTestData('tbody tr', projectName);
        await expect(projectRow).toBeVisible();
      }
    });

    test('should validate project date ranges', async ({ 
      authenticatedPage, 
      testHelpers,
      testDataHelpers 
    }) => {
      await testHelpers.navigateTo('/projects');
      await testHelpers.waitForDataTable();
      
      const addButton = authenticatedPage.locator('button:has-text("Add Project"), button:has-text("New Project")');
      
      if (await addButton.isVisible()) {
        await addButton.click();
        await waitForDialog(authenticatedPage);
        
        // Fill form with invalid date range (end before start)
        const projectName = `${testContext.prefix}-Invalid-Dates-Project`;
        await testHelpers.fillForm({
          'name': projectName,
          'start_date': '2024-12-31',
          'end_date': '2024-01-01' // End before start
        });
        
        const submitButton = authenticatedPage.locator('button[type="submit"]');
        await submitButton.click();
        
        // Should show date validation error
        const dateError = authenticatedPage.locator(`${SHADCN_SELECTORS.errorMessage}:has-text("date")`);
        const anyError = authenticatedPage.locator(SHADCN_SELECTORS.errorMessage);
        
        const hasError = await dateError.isVisible() || await anyError.isVisible();
        expect(hasError).toBeTruthy();
        
        // Close dialog
        await closeDialog(authenticatedPage);
      }
    });
  });

  test.describe('Person Forms', () => {
    test(`${tags.crud} should handle person creation form`, async ({ 
      authenticatedPage, 
      testHelpers,
      testDataHelpers 
    }) => {
      await testHelpers.navigateTo('/people');
      await testHelpers.waitForDataTable();
      
      const addButton = authenticatedPage.locator('button:has-text("Add Person"), button:has-text("New Person")');
      
      if (await addButton.isVisible()) {
        await addButton.click();
        
        await waitForDialog(authenticatedPage);
        const formDialog = authenticatedPage.locator(SHADCN_SELECTORS.dialog);
        await expect(formDialog).toBeVisible();
        
        // Test email validation with invalid format
        await authenticatedPage.fill('input[name="email"], input[type="email"]', 'invalid-email');
        const submitButton = authenticatedPage.locator('button[type="submit"]');
        await submitButton.click();
        
        // Should show email validation error
        const emailError = authenticatedPage.locator(`${SHADCN_SELECTORS.errorMessage}:has-text("email")`);
        const anyError = authenticatedPage.locator(SHADCN_SELECTORS.errorMessage);
        
        const hasError = await emailError.isVisible() || await anyError.isVisible();
        expect(hasError).toBeTruthy();
        
        // Fill valid form data with unique values
        const personName = `${testContext.prefix}-Test-User`;
        const personEmail = `${testContext.prefix}@example.com`;
        
        await testHelpers.fillForm({
          'name': personName,
          'first_name': testContext.prefix,
          'last_name': 'User',
          'email': personEmail,
          'primary_role_id': 'Developer',
          'worker_type': 'FTE',
          'type': 'employee'
        });
        
        // Track created person for cleanup
        const responsePromise = authenticatedPage.waitForResponse(response =>
          response.url().includes('/api/people') &&
          response.request().method() === 'POST'
        );
        
        await submitButton.click();
        
        const response = await responsePromise;
        const responseData = await response.json();
        if (responseData.data?.id || responseData.id) {
          testContext.createdIds.people.push(responseData.data?.id || responseData.id);
        }
        
        await authenticatedPage.waitForSelector(SHADCN_SELECTORS.dialog, { state: 'hidden' });
        await testHelpers.waitForDataTable();
        
        // Verify person was added
        const personRow = await testDataHelpers.findByTestData('tbody tr', personName);
        await expect(personRow).toBeVisible();
      }
    });
  });

  test.describe('Assignment Forms', () => {
    test('should handle assignment form with validation', async ({ 
      authenticatedPage, 
      testHelpers,
      testDataHelpers 
    }) => {
      await testHelpers.navigateTo('/assignments');
      await testHelpers.waitForDataTable();
      
      const addButton = authenticatedPage.locator('button:has-text("Add Assignment"), button:has-text("New Assignment")');
      
      if (await addButton.isVisible()) {
        await addButton.click();
        
        await waitForDialog(authenticatedPage);
        const formDialog = authenticatedPage.locator(SHADCN_SELECTORS.dialog);
        await expect(formDialog).toBeVisible();
        
        // Test allocation percentage validation
        const allocationInput = authenticatedPage.locator('input[name*="allocation"], input[name*="percentage"]');
        if (await allocationInput.isVisible()) {
          await allocationInput.fill('150'); // Invalid - over 100%
          
          const submitButton = authenticatedPage.locator('button[type="submit"]');
          await submitButton.click();
          
          // Should show validation error
          const allocationError = authenticatedPage.locator(`${SHADCN_SELECTORS.errorMessage}:has-text("allocation"), ${SHADCN_SELECTORS.errorMessage}:has-text("100")`);
          const anyError = authenticatedPage.locator(SHADCN_SELECTORS.errorMessage);
          
          const hasError = await allocationError.isVisible() || await anyError.isVisible();
          expect(hasError).toBeTruthy();
          
          // Fix allocation to valid value
          await allocationInput.fill('50');
          
          // Fill other required fields with test data
          await testDataHelpers.selectSpecificOption(
            'select[name*="project"]',
            testData.projects[0].name
          );
          
          await testDataHelpers.selectSpecificOption(
            'select[name*="person"]',
            testData.people[0].name
          );
          
          // Set dates
          const today = new Date();
          const nextMonth = new Date(today);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          
          await authenticatedPage.fill('input[name*="start"]', today.toISOString().split('T')[0]);
          await authenticatedPage.fill('input[name*="end"]', nextMonth.toISOString().split('T')[0]);
          
          // Track created assignment
          const responsePromise = authenticatedPage.waitForResponse(response =>
            response.url().includes('/api/assignments') &&
            response.request().method() === 'POST'
          );
          
          await submitButton.click();
          
          const response = await responsePromise;
          const responseData = await response.json();
          if (responseData.data?.id || responseData.id) {
            testContext.createdIds.assignments.push(responseData.data?.id || responseData.id);
          }
        } else {
          // If no allocation field, just close the dialog
          await closeDialog(authenticatedPage);
        }
      }
    });
  });

  test.describe('Edit Forms', () => {
    test(`${tags.crud} should handle edit functionality`, async ({ 
      authenticatedPage, 
      testHelpers,
      testDataHelpers 
    }) => {
      // Create a project to edit
      const projectToEdit = await testDataHelpers.createTestProject(testContext, {
        name: `${testContext.prefix}-Project-To-Edit`
      });
      
      await testHelpers.navigateTo('/projects');
      await testHelpers.waitForDataTable();
      
      // Find the specific project row
      const projectRow = await testDataHelpers.findByTestData(
        'tbody tr',
        projectToEdit.name
      );
      
      // Click edit button
      const editButton = projectRow.locator('button:has-text("Edit"), button[title*="Edit"]');
      
      if (await editButton.isVisible()) {
        await editButton.click();
        
        // Wait for edit form
        const hasDialog = await waitForDialog(authenticatedPage).catch(() => false);
        const hasForm = await authenticatedPage.locator('form').isVisible();
        
        if (hasDialog || hasForm) {
          // Update project name
          const updatedName = `${testContext.prefix}-Updated-Project`;
          const nameInput = authenticatedPage.locator('input[name="name"], input[name="projectName"]');
          await nameInput.clear();
          await nameInput.fill(updatedName);
          
          // Submit
          const submitButton = authenticatedPage.locator('button[type="submit"], button:has-text("Save")');
          await submitButton.click();
          
          // Wait for update to complete
          await authenticatedPage.waitForTimeout(1000);
          
          // Close dialog if still open
          if (hasDialog) {
            await authenticatedPage.waitForSelector(SHADCN_SELECTORS.dialog, { state: 'hidden' });
          }
          
          await testHelpers.waitForDataTable();
          
          // Verify update
          const updatedRow = await testDataHelpers.findByTestData(
            'tbody tr',
            updatedName
          );
          await expect(updatedRow).toBeVisible();
        }
      }
    });
  });

  test.describe('Delete Forms', () => {
    test(`${tags.crud} should handle delete confirmation`, async ({ 
      authenticatedPage, 
      testHelpers,
      testDataHelpers 
    }) => {
      // Create a project to delete
      const projectToDelete = await testDataHelpers.createTestProject(testContext, {
        name: `${testContext.prefix}-Project-To-Delete`
      });
      
      await testHelpers.navigateTo('/projects');
      await testHelpers.waitForDataTable();
      
      const initialRowCount = await testHelpers.getTableRowCount();
      
      // Find the specific project row
      const projectRow = await testDataHelpers.findByTestData(
        'tbody tr',
        projectToDelete.name
      );
      
      // Click delete button
      const deleteButton = projectRow.locator('button:has-text("Delete"), button[title*="Delete"]');
      
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        
        // Should show confirmation dialog
        const confirmDialog = authenticatedPage.locator('[role="alertdialog"], .confirm-dialog, .delete-confirmation');
        await expect(confirmDialog).toBeVisible();
        
        // Confirm deletion
        const confirmButton = authenticatedPage.locator('button:has-text("Confirm"), button:has-text("Delete")').last();
        await confirmButton.click();
        
        // Wait for deletion
        await authenticatedPage.waitForTimeout(1000);
        await testHelpers.waitForDataTable();
        
        // Verify deletion
        const newRowCount = await testHelpers.getTableRowCount();
        expect(newRowCount).toBeLessThan(initialRowCount);
        
        // Project should no longer appear
        const deletedRow = authenticatedPage.locator(`tbody tr:has-text("${projectToDelete.name}")`);
        await expect(deletedRow).not.toBeVisible();
      }
    });
  });
});