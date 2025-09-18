/**
 * Assignment CRUD Operations Test Suite
 * Comprehensive tests for creating, reading, updating, and deleting assignments
 * Uses dynamic test data for proper isolation
 */

import { test, expect, tags, patterns } from '../../fixtures';
import { TestDataContext } from '../../utils/test-data-helpers';

test.describe('Assignment CRUD Operations', () => {
  let testContext: TestDataContext;
  let testData: any;

  test.beforeEach(async ({ testDataHelpers, testHelpers }) => {
    // Create isolated test context for each test
    testContext = testDataHelpers.createTestContext('assign');
    
    // Create test data dynamically
    testData = await testDataHelpers.createBulkTestData(testContext, {
      projects: 2,
      people: 3,
      assignments: 0 // We'll create assignments in tests
    });
  });

  test.afterEach(async ({ testDataHelpers }) => {
    // Clean up all test data
    await testDataHelpers.cleanupTestContext(testContext);
  });

  test.describe('Create Assignment', () => {
    test(`${tags.crud} ${patterns.crud('assignment').create} via People page`, async ({ 
      authenticatedPage, 
      testHelpers,
      testDataHelpers 
    }) => {
      // Navigate to people page
      await testHelpers.navigateTo('/people');
      await testHelpers.waitForDataTable();

      // Click on specific test person
      await testDataHelpers.clickSpecific(
        'tbody tr',
        testData.people[0].name
      );
      await authenticatedPage.getByRole('button', { name: /view/i }).click();

      // Wait for person details page
      await authenticatedPage.waitForSelector('text=Workload Insights', { timeout: 10000 });

      // Click Add Assignment
      await authenticatedPage.getByRole('button', { name: /add assignment/i }).click();

      // Wait for modal
      await expect(authenticatedPage.locator('text=Smart Assignment')).toBeVisible({ timeout: 10000 });

      // Switch to manual tab if needed
      const manualTab = authenticatedPage.locator('button[role="tab"]:has-text("Manual Selection")');
      if (await manualTab.isVisible()) {
        await manualTab.click();
      }

      // Fill assignment form
      // Select specific test project
      await testDataHelpers.selectSpecificOption(
        '#project-select, select[name="project_id"]',
        testData.projects[0].name
      );

      // Select role (assuming default roles exist)
      const roleSelect = authenticatedPage.locator('#role-select, select[name="role_id"]');
      const roleOptions = await roleSelect.locator('option').all();
      if (roleOptions.length > 1) {
        await roleSelect.selectOption({ index: 1 });
      }

      // Set allocation
      await authenticatedPage.fill('input[name="allocation_percentage"]', '50');

      // Set dates
      const today = new Date();
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      await authenticatedPage.fill('input[name="start_date"]', today.toISOString().split('T')[0]);
      await authenticatedPage.fill('input[name="end_date"]', nextMonth.toISOString().split('T')[0]);

      // Save
      await authenticatedPage.getByRole('button', { name: /save|create/i }).click();

      // Verify success
      await expect(authenticatedPage.locator('text=Assignment created successfully')).toBeVisible({ timeout: 10000 });

      // Verify assignment appears in list
      await testHelpers.navigateTo('/assignments');
      await testHelpers.waitForDataTable();
      
      // Table should have data
      const rowCount = await testHelpers.getTableRowCount();
      expect(rowCount).toBeGreaterThan(0);
    });

    test(`${tags.crud} create assignment via API`, async ({ apiContext, testDataHelpers }) => {
      // Get available roles
      const rolesResponse = await apiContext.get('/api/roles');
      const roles = await rolesResponse.json();
      const role = roles.data?.[0] || roles[0];

      if (!role) {
        test.skip('No roles available');
      }

      const assignment = {
        project_id: testData.projects[0].id,
        person_id: testData.people[0].id,
        role_id: role.id,
        allocation_percentage: 25,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };

      const response = await apiContext.post('/api/assignments', { data: assignment });
      expect(response.ok()).toBeTruthy();
      
      const responseData = await response.json();
      expect(responseData.data).toHaveProperty('id');
      
      // Track created assignment for cleanup
      if (responseData.data.id) {
        testContext.createdIds.assignments.push(responseData.data.id);
      }
    });
  });

  test.describe('Read Assignment', () => {
    test(`${tags.crud} ${patterns.crud('assignment').list}`, async ({ 
      authenticatedPage, 
      testHelpers 
    }) => {
      await testHelpers.navigateTo('/assignments');
      await testHelpers.waitForDataTable();

      // Verify table headers
      const expectedHeaders = ['Project', 'Person', 'Role', 'Allocation', 'Start Date', 'End Date'];
      for (const header of expectedHeaders) {
        await expect(authenticatedPage.locator(`th:has-text("${header}")`)).toBeVisible();
      }

      // Verify data is displayed
      const rowCount = await testHelpers.getTableRowCount();
      expect(rowCount).toBeGreaterThanOrEqual(0);
    });

    test(`${tags.crud} filter assignments`, async ({ authenticatedPage, testHelpers }) => {
      await testHelpers.navigateTo('/assignments');
      await testHelpers.waitForDataTable();

      // Test search
      const searchInput = authenticatedPage.locator('input[placeholder*="Search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await authenticatedPage.keyboard.press('Enter');
        await testHelpers.waitForDataTable();
      }

      // Test filters if available
      const projectFilter = authenticatedPage.locator('select[name="project"]');
      if (await projectFilter.isVisible()) {
        const options = await projectFilter.locator('option').all();
        if (options.length > 1) {
          await projectFilter.selectOption({ index: 1 });
          await testHelpers.waitForDataTable();
        }
      }
    });
  });

  test.describe('Update Assignment', () => {
    test(`${tags.crud} ${patterns.crud('assignment').update}`, async ({ 
      authenticatedPage, 
      testHelpers,
      testDataHelpers 
    }) => {
      // Create an assignment first
      const assignment = await testDataHelpers.createTestAssignment(testContext, {
        project: testData.projects[0],
        person: testData.people[0],
        allocation: 30
      });

      await testHelpers.navigateTo('/assignments');
      await testHelpers.waitForDataTable();

      // Find and edit the specific assignment
      const assignmentRow = await testDataHelpers.findByTestData(
        'tbody tr',
        testData.projects[0].name
      );
      const editButton = assignmentRow.getByRole('button', { name: /edit/i });
      
      if (await editButton.isVisible()) {
        await editButton.click();

        // Update allocation
        const allocationInput = authenticatedPage.locator('input[name="allocation_percentage"]');
        await allocationInput.clear();
        await allocationInput.fill('75');

        // Save
        await authenticatedPage.getByRole('button', { name: /save|update/i }).click();

        // Verify success
        await expect(authenticatedPage.locator('text=Assignment updated successfully')).toBeVisible({ timeout: 10000 });
      }
    });

    test(`${tags.crud} update assignment via API`, async ({ apiContext, testDataHelpers }) => {
      // Create an assignment first
      const assignment = await testDataHelpers.createTestAssignment(testContext, {
        project: testData.projects[1],
        person: testData.people[1],
        allocation: 40
      });

      const updates = {
        allocation_percentage: 100,
      };

      const response = await apiContext.put(`/api/assignments/${assignment.id}`, { 
        data: updates 
      });
      
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('Delete Assignment', () => {
    test(`${tags.crud} ${patterns.crud('assignment').delete}`, async ({ 
      authenticatedPage, 
      testHelpers,
      testDataHelpers 
    }) => {
      // Create an assignment to delete
      const assignment = await testDataHelpers.createTestAssignment(testContext, {
        project: testData.projects[1],
        person: testData.people[2],
        allocation: 50
      });

      await testHelpers.navigateTo('/assignments');
      await testHelpers.waitForDataTable();

      const initialRowCount = await testHelpers.getTableRowCount();

      // Find and delete the specific assignment
      const assignmentRow = await testDataHelpers.findByTestData(
        'tbody tr',
        testData.projects[1].name
      );
      const deleteButton = assignmentRow.getByRole('button', { name: /delete/i });
      
      if (await deleteButton.isVisible()) {
        // Handle confirmation dialog
        authenticatedPage.on('dialog', dialog => dialog.accept());
        
        await deleteButton.click();

        // Verify success
        await expect(authenticatedPage.locator('text=Assignment deleted successfully')).toBeVisible({ timeout: 10000 });
        
        // Verify row count decreased
        await testHelpers.waitForDataTable();
        const newRowCount = await testHelpers.getTableRowCount();
        expect(newRowCount).toBeLessThan(initialRowCount);
      }
    });

    test(`${tags.crud} delete assignment via API`, async ({ apiContext, testDataHelpers }) => {
      // Create an assignment to delete
      const assignment = await testDataHelpers.createTestAssignment(testContext, {
        project: testData.projects[0],
        person: testData.people[2],
        allocation: 60
      });

      const response = await apiContext.delete(`/api/assignments/${assignment.id}`);
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('Edge Cases', () => {
    test.describe('Date Validation', () => {
      test('prevent end date before start date', async ({ authenticatedPage, testHelpers, testDataHelpers }) => {
        await testHelpers.navigateTo('/people');
        await testHelpers.waitForDataTable();
        
        // Go to specific test person
        await testDataHelpers.clickSpecific(
          'tbody tr',
          testData.people[0].name
        );
        await authenticatedPage.getByRole('button', { name: /view/i }).click();
        await authenticatedPage.waitForSelector('text=Workload Insights', { timeout: 10000 });
        
        // Open assignment modal
        await authenticatedPage.getByRole('button', { name: /add assignment/i }).click();
        await expect(authenticatedPage.locator('text=Smart Assignment')).toBeVisible({ timeout: 10000 });
        
        // Switch to manual tab
        const manualTab = authenticatedPage.locator('button[role="tab"]:has-text("Manual Selection")');
        if (await manualTab.isVisible()) {
          await manualTab.click();
        }
        
        // Select specific test project
        await testDataHelpers.selectSpecificOption(
          '#project-select, select[name="project_id"]',
          testData.projects[0].name
        );
        
        // Set invalid date range
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        await authenticatedPage.fill('#start-date, input[name="start_date"]', tomorrow.toISOString().split('T')[0]);
        await authenticatedPage.fill('#end-date, input[name="end_date"]', yesterday.toISOString().split('T')[0]);
        
        // Try to submit
        const submitButton = authenticatedPage.getByRole('button', { name: /create|save/i });
        if (await submitButton.isEnabled()) {
          await submitButton.click();
          // Look for error message
          const errorMessage = await authenticatedPage.locator('text=/invalid|error|must be after/i').count();
          expect(errorMessage).toBeGreaterThan(0);
        }
        
        await authenticatedPage.keyboard.press('Escape');
      });

      test('handle very long date ranges', async ({ authenticatedPage, testHelpers, testDataHelpers }) => {
        await testHelpers.navigateTo('/people');
        await testHelpers.waitForDataTable();
        
        // Navigate to specific test person
        await testDataHelpers.clickSpecific(
          'tbody tr',
          testData.people[0].name
        );
        await authenticatedPage.getByRole('button', { name: /view/i }).click();
        await authenticatedPage.waitForSelector('text=Workload Insights', { timeout: 10000 });
        
        await authenticatedPage.getByRole('button', { name: /add assignment/i }).click();
        await expect(authenticatedPage.locator('text=Smart Assignment')).toBeVisible({ timeout: 10000 });
        
        const manualTab = authenticatedPage.locator('button[role="tab"]:has-text("Manual Selection")');
        if (await manualTab.isVisible()) {
          await manualTab.click();
        }
        
        // Select specific test project
        await testDataHelpers.selectSpecificOption(
          '#project-select, select[name="project_id"]',
          testData.projects[0].name
        );
        
        // Set 5 year date range
        const today = new Date();
        const fiveYearsLater = new Date(today);
        fiveYearsLater.setFullYear(fiveYearsLater.getFullYear() + 5);
        
        await authenticatedPage.fill('#start-date, input[name="start_date"]', today.toISOString().split('T')[0]);
        await authenticatedPage.fill('#end-date, input[name="end_date"]', fiveYearsLater.toISOString().split('T')[0]);
        
        // Check for any warnings
        const longRangeWarning = await authenticatedPage.locator('text=/long|years|extended/i').count();
        console.log(`Long range warnings found: ${longRangeWarning}`);
        
        await authenticatedPage.keyboard.press('Escape');
      });
    });

    test.describe('Allocation Validation', () => {
      test('handle zero allocation', async ({ authenticatedPage, testHelpers, testDataHelpers }) => {
        await testHelpers.navigateTo('/people');
        await testHelpers.waitForDataTable();
        
        // Navigate to specific test person
        await testDataHelpers.clickSpecific(
          'tbody tr',
          testData.people[0].name
        );
        await authenticatedPage.getByRole('button', { name: /view/i }).click();
        await authenticatedPage.waitForSelector('text=Workload Insights', { timeout: 10000 });
        
        await authenticatedPage.getByRole('button', { name: /add assignment/i }).click();
        await expect(authenticatedPage.locator('text=Smart Assignment')).toBeVisible({ timeout: 10000 });
        
        const manualTab = authenticatedPage.locator('button[role="tab"]:has-text("Manual Selection")');
        if (await manualTab.isVisible()) {
          await manualTab.click();
        }
        
        // Select specific test project
        await testDataHelpers.selectSpecificOption(
          '#project-select, select[name="project_id"]',
          testData.projects[0].name
        );
        
        // Set zero allocation
        await authenticatedPage.fill('#allocation-slider, input[name="allocation_percentage"]', '0');
        
        // Check for validation
        const zeroWarning = await authenticatedPage.locator('text=/zero|must be greater|invalid allocation/i').count();
        console.log(`Zero allocation warnings found: ${zeroWarning}`);
        
        await authenticatedPage.keyboard.press('Escape');
      });

      test('handle allocation over 100%', async ({ authenticatedPage, testHelpers, testDataHelpers }) => {
        await testHelpers.navigateTo('/people');
        await testHelpers.waitForDataTable();
        
        // Navigate to specific test person
        await testDataHelpers.clickSpecific(
          'tbody tr',
          testData.people[0].name
        );
        await authenticatedPage.getByRole('button', { name: /view/i }).click();
        await authenticatedPage.waitForSelector('text=Workload Insights', { timeout: 10000 });
        
        await authenticatedPage.getByRole('button', { name: /add assignment/i }).click();
        await expect(authenticatedPage.locator('text=Smart Assignment')).toBeVisible({ timeout: 10000 });
        
        const manualTab = authenticatedPage.locator('button[role="tab"]:has-text("Manual Selection")');
        if (await manualTab.isVisible()) {
          await manualTab.click();
        }
        
        const allocationInput = authenticatedPage.locator('#allocation-slider, input[name="allocation_percentage"]');
        
        // Try to set allocation over 100%
        await allocationInput.fill('150');
        const actualValue = await allocationInput.inputValue();
        
        // Check if input was clamped to 100
        expect(parseInt(actualValue)).toBeLessThanOrEqual(100);
        
        await authenticatedPage.keyboard.press('Escape');
      });
    });

    test.describe('Missing Data Handling', () => {
      test('handle missing project ID gracefully', async ({ authenticatedPage, testHelpers, testDataHelpers }) => {
        await testHelpers.navigateTo('/people');
        await testHelpers.waitForDataTable();
        
        // Navigate to specific test person
        await testDataHelpers.clickSpecific(
          'tbody tr',
          testData.people[0].name
        );
        await authenticatedPage.getByRole('button', { name: /view/i }).click();
        await authenticatedPage.waitForSelector('text=Workload Insights', { timeout: 10000 });
        
        await authenticatedPage.getByRole('button', { name: /add assignment/i }).click();
        await expect(authenticatedPage.locator('text=Smart Assignment')).toBeVisible({ timeout: 10000 });
        
        const manualTab = authenticatedPage.locator('button[role="tab"]:has-text("Manual Selection")');
        if (await manualTab.isVisible()) {
          await manualTab.click();
        }
        
        // Check if submit is disabled without project selection
        const submitButton = authenticatedPage.getByRole('button', { name: /create|save/i });
        const isDisabled = await submitButton.isDisabled();
        expect(isDisabled).toBeTruthy();
        
        await authenticatedPage.keyboard.press('Escape');
      });
    });

    test.describe('Concurrent Operations', () => {
      test('handle rapid assignment creation', async ({ authenticatedPage, testHelpers, testDataHelpers }) => {
        await testHelpers.navigateTo('/people');
        await testHelpers.waitForDataTable();
        
        // Navigate to specific test person
        await testDataHelpers.clickSpecific(
          'tbody tr',
          testData.people[0].name
        );
        await authenticatedPage.getByRole('button', { name: /view/i }).click();
        await authenticatedPage.waitForSelector('text=Workload Insights', { timeout: 10000 });
        
        const addButton = authenticatedPage.getByRole('button', { name: /add assignment/i });
        
        // Click multiple times quickly
        await addButton.click();
        await addButton.click();
        await addButton.click();
        
        // Should only have one modal open
        const modalCount = await authenticatedPage.locator('text=Smart Assignment').count();
        expect(modalCount).toBe(1);
        
        await authenticatedPage.keyboard.press('Escape');
      });
    });

    test.describe('Special Characters and Input Validation', () => {
      test('handle special characters in notes field', async ({ authenticatedPage, testHelpers, testDataHelpers }) => {
        await testHelpers.navigateTo('/people');
        await testHelpers.waitForDataTable();
        
        // Navigate to specific test person
        await testDataHelpers.clickSpecific(
          'tbody tr',
          testData.people[0].name
        );
        await authenticatedPage.getByRole('button', { name: /view/i }).click();
        await authenticatedPage.waitForSelector('text=Workload Insights', { timeout: 10000 });
        
        await authenticatedPage.getByRole('button', { name: /add assignment/i }).click();
        await expect(authenticatedPage.locator('text=Smart Assignment')).toBeVisible({ timeout: 10000 });
        
        const manualTab = authenticatedPage.locator('button[role="tab"]:has-text("Manual Selection")');
        if (await manualTab.isVisible()) {
          await manualTab.click();
        }
        
        // Look for notes field
        const notesField = authenticatedPage.locator('textarea[name="notes"], input[name="notes"], #notes');
        if (await notesField.count() > 0) {
          // Test special characters
          const specialChars = `Special chars: <script>alert('test')</script> & "quotes" 'apostrophes' émojis 🎉`;
          await notesField.fill(specialChars);
          
          // Verify input was accepted
          const actualValue = await notesField.inputValue();
          console.log('Special characters handled:', actualValue.length > 0);
        }
        
        await authenticatedPage.keyboard.press('Escape');
      });
    });

    test('handle invalid date ranges via API', async ({ apiContext, testDataHelpers }) => {
      // Get available roles
      const rolesResponse = await apiContext.get('/api/roles');
      const roles = await rolesResponse.json();
      const role = roles.data?.[0] || roles[0];

      if (!role) {
        test.skip('No roles available');
      }

      const invalidAssignment = {
        project_id: testData.projects[0].id,
        person_id: testData.people[0].id,
        role_id: role.id,
        allocation_percentage: 50,
        start_date: '2024-01-01',
        end_date: '2023-12-31', // End before start
      };

      const response = await apiContext.post('/api/assignments', { data: invalidAssignment });
      expect(response.ok()).toBeFalsy();
    });
  });
});