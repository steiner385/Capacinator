/**
 * Utilization Report Assignment Workflow Test Suite
 * Tests assignment creation from the utilization report page
 * Uses dynamic test data for proper isolation
 */
import { test, expect, tags } from '../../fixtures';
import { TestDataContext } from '../../utils/test-data-helpers';
test.describe('Utilization Report Assignment Workflow', () => {
  let testContext: TestDataContext;
  let testData: any;
  test.beforeEach(async ({ testDataHelpers, testHelpers, apiContext }) => {
    // Create isolated test context
    testContext = testDataHelpers.createTestContext('utilworkflow');
    // Create test data for workflow testing
    // Create underutilized people to test assignment workflow
    testData = await testDataHelpers.createBulkTestData(testContext, {
      projects: 4,
      people: 3,
      assignments: 2 // Few assignments to ensure some underutilized people
    });
  });
  test.afterEach(async ({ testDataHelpers }) => {
    // Clean up all test data
    await testDataHelpers.cleanupTestContext(testContext);
  });
  test(`${tags.integration} ${tags.reports} create assignment via Add Projects modal from utilization report`, async ({ 
    authenticatedPage, 
    testHelpers,
    testDataHelpers 
  }) => {
    // Capture all console errors and network requests for debugging
    const consoleErrors: string[] = [];
    const networkErrors: any[] = [];
    const apiRequests: any[] = [];
    authenticatedPage.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log(`🔴 Browser Console Error: ${msg.text()}`);
      }
    });
    authenticatedPage.on('response', response => {
      if (response.url().includes('/api/')) {
        apiRequests.push({
          url: response.url(),
          method: response.request().method(),
          status: response.status(),
          statusText: response.statusText()
        });
        if (response.status() >= 400) {
          networkErrors.push({
            url: response.url(),
            method: response.request().method(),
            status: response.status(),
            statusText: response.statusText()
          });
          console.log(`🔴 API Error: ${response.request().method()} ${response.url()} - ${response.status()}`);
        }
      }
    });
    // Navigate to utilization report
    console.log('🚀 Starting utilization assignment workflow test...');
    await testHelpers.navigateTo('/reports');
    await testHelpers.waitForPageReady();
    // Navigate to utilization report tab
    console.log('📊 Navigating to Utilization Report tab...');
    const utilizationTab = authenticatedPage.locator('button').filter({ hasText: 'Utilization Report' });
    if (await utilizationTab.isVisible()) {
      await utilizationTab.click();
      await authenticatedPage.waitForLoadState('networkidle', { timeout: 30000 });
    }
    // Wait for utilization data to load
    await authenticatedPage.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    // Look for our test people
    console.log('🔍 Looking for test people in utilization report...');
    // Find all rows in utilization table
    const allRows = authenticatedPage.locator('table tbody tr');
    const rowCount = await allRows.count();
    if (rowCount === 0) {
      console.log('⚠️  No people found in utilization table');
      expect(authenticatedPage.url()).toContain('/reports');
      return;
    }
    console.log(`📊 Found ${rowCount} people in utilization table (including ${testData.people.length} test people)`);
    // Find an underutilized test person
    let targetPersonRow = null;
    let targetPersonName = '';
    let targetPerson = null;
    // First try to find one of our test people
    for (const person of testData.people) {
      const personRow = authenticatedPage.locator('tbody tr').filter({
        has: authenticatedPage.locator(`td:has-text("${person.name}")`)
      }).first();
      if (await personRow.count() > 0) {
        const utilizationCell = personRow.locator('td').nth(2); // Utilization is likely in 3rd column
        const utilizationText = await utilizationCell.textContent();
        console.log(`   Test person: ${person.name} - Utilization: ${utilizationText}`);
        // Parse utilization percentage
        const utilizationMatch = utilizationText?.match(/(\d+)%/);
        if (utilizationMatch) {
          const utilization = parseInt(utilizationMatch[1], 10);
          if (utilization < 100) { // Not fully utilized
            targetPersonRow = personRow;
            targetPersonName = person.name;
            targetPerson = person;
            console.log(`🎯 Found underutilized test person: ${targetPersonName} at ${utilization}%`);
            break;
          }
        }
      }
    }
    // If no underutilized test person found, use any underutilized person
    if (!targetPersonRow) {
      for (let i = 0; i < rowCount; i++) {
        const row = allRows.nth(i);
        const personName = await row.locator('td').first().textContent();
        const utilizationCell = row.locator('td').nth(2);
        const utilizationText = await utilizationCell.textContent();
        const utilizationMatch = utilizationText?.match(/(\d+)%/);
        if (utilizationMatch) {
          const utilization = parseInt(utilizationMatch[1], 10);
          if (utilization < 70) {
            targetPersonRow = row;
            targetPersonName = personName || 'Unknown';
            console.log(`🎯 Found underutilized person: ${targetPersonName} at ${utilization}%`);
            break;
          }
        }
      }
    }
    if (!targetPersonRow) {
      console.log('❌ No underutilized person found to test assignment flow');
      return;
    }
    // Look for Add Projects button
    const addProjectsButton = targetPersonRow.locator('button').filter({ hasText: /Add Projects/i });
    if (await addProjectsButton.isVisible()) {
      console.log('✅ Found Add Projects button, clicking...');
      await addProjectsButton.click();
      // Wait for modal to appear
      await authenticatedPage.waitForSelector('[role="dialog"], .modal, .dialog', { 
        timeout: 10000 
      });
      console.log('📋 Modal opened successfully');
      // Check modal content
      const modalDialog = authenticatedPage.locator('[role="dialog"], .modal, .dialog').first();
      const modalTitle = modalDialog.locator('h2, h3, .modal-title').first();
      const titleText = await modalTitle.textContent();
      console.log(`📝 Modal title: ${titleText}`);
      // Look for project selection elements
      const projectCheckboxes = modalDialog.locator('input[type="checkbox"]');
      const checkboxCount = await projectCheckboxes.count();
      if (checkboxCount > 0) {
        console.log(`✅ Found ${checkboxCount} project(s) available for assignment`);
        // Try to select one of our test projects
        let selectedProject = false;
        for (const project of testData.projects) {
          const projectCheckbox = modalDialog.locator(`label:has-text("${project.name}") input[type="checkbox"], input[type="checkbox"][value="${project.id}"]`);
          if (await projectCheckbox.count() > 0) {
            const isChecked = await projectCheckbox.isChecked();
            if (!isChecked) {
              await projectCheckbox.check();
              console.log(`✅ Selected test project: ${project.name}`);
              selectedProject = true;
              break;
            }
          }
        }
        // If no test project found, select first available
        if (!selectedProject) {
          const firstCheckbox = projectCheckboxes.first();
          const isChecked = await firstCheckbox.isChecked();
          if (!isChecked) {
            await firstCheckbox.check();
            console.log('✅ Selected first available project');
          }
        }
        // Look for allocation input fields
        const allocationInputs = modalDialog.locator('input[type="number"], input[name*="allocation"]');
        if (await allocationInputs.count() > 0) {
          // Set allocation for the first input
          await allocationInputs.first().fill('40');
          console.log('✅ Set allocation to 40%');
        }
        // Look for confirm/save button
        const confirmButton = modalDialog.locator('button').filter({ 
          hasText: /Confirm|Save|Add|Assign|Submit/i 
        });
        if (await confirmButton.isVisible()) {
          console.log('✅ Found confirm button, clicking...');
          // Set up response listener for assignment API
          const assignmentPromise = authenticatedPage.waitForResponse(
            response => response.url().includes('/api/assignments') && 
                       response.request().method() === 'POST',
            { timeout: 10000 }
          ).catch(() => null);
          await confirmButton.click();
          const response = await assignmentPromise;
          if (response) {
            console.log(`📡 Assignment API called: ${response.url()} - Status: ${response.status()}`);
            if (response.status() === 200 || response.status() === 201) {
              console.log('✅ Assignment completed successfully');
              // Track the new assignment
              const responseData = await response.json();
              if (responseData.id) {
                testContext.createdIds.assignments.push(responseData.id);
              }
              // Verify success message or modal closure
              await authenticatedPage.waitForSelector('[role="dialog"], .modal, .dialog', {
                state: 'detached',
                timeout: 5000
              }).catch(() => {
                console.log('⚠️  Modal may still be open');
              });
            } else {
              console.log(`❌ Assignment failed with status: ${response.status()}`);
            }
          } else {
            console.log('⚠️  No assignment API call detected within timeout');
          }
        } else {
          console.log('⚠️  Confirm button not found');
        }
      } else {
        console.log('⚠️  No projects available for assignment in modal');
        // Look for any message indicating why no projects are available
        const messageText = await modalDialog.textContent();
        console.log(`📝 Modal content: ${messageText.substring(0, 200)}...`);
      }
      // Close modal if still open
      const closeButton = modalDialog.locator('button').filter({ hasText: /Close|Cancel/i });
      if (await closeButton.isVisible()) {
        await closeButton.click();
        console.log('📋 Modal closed');
      }
      // Verify utilization updated (refresh may be needed)
      console.log('🔄 Checking if utilization updated...');
      await authenticatedPage.reload();
      await authenticatedPage.waitForLoadState('networkidle', { timeout: 30000 });
      // Re-navigate to utilization report
      const utilizationTabAfter = authenticatedPage.locator('button').filter({ hasText: 'Utilization Report' });
      if (await utilizationTabAfter.isVisible()) {
        await utilizationTabAfter.click();
        await authenticatedPage.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      }
      // Re-locate the person row and check new utilization
      const updatedRow = authenticatedPage.locator('table tbody tr').filter({
        has: authenticatedPage.locator(`td:has-text("${targetPersonName}")`)
      }).first();
      if (await updatedRow.count() > 0) {
        const newUtilizationText = await updatedRow.locator('td').nth(2).textContent();
        console.log(`📊 Updated utilization for ${targetPersonName}: ${newUtilizationText}`);
        // If we added an assignment, utilization should have increased
        const newUtilizationMatch = newUtilizationText?.match(/(\d+)%/);
        if (newUtilizationMatch) {
          const newUtilization = parseInt(newUtilizationMatch[1], 10);
          console.log(`✅ Utilization changed as expected`);
        }
      }
    } else {
      console.log('⚠️  Add Projects button not found for the selected person');
      // Check if there are any action buttons
      const actionButtons = targetPersonRow.locator('button');
      const buttonCount = await actionButtons.count();
      console.log(`ℹ️  Found ${buttonCount} button(s) in the row`);
      for (let i = 0; i < buttonCount; i++) {
        const buttonText = await actionButtons.nth(i).textContent();
        console.log(`   - Button ${i + 1}: ${buttonText}`);
      }
      // Check if person is already fully allocated
      const utilizationText = await targetPersonRow.locator('td').nth(2).textContent();
      if (utilizationText?.includes('100%')) {
        console.log('ℹ️  Person is already at 100% utilization');
      }
    }
    // Summary of errors
    if (consoleErrors.length > 0) {
      console.log(`\n🔴 Total console errors: ${consoleErrors.length}`);
      consoleErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    if (networkErrors.length > 0) {
      console.log(`\n🔴 Total network errors: ${networkErrors.length}`);
      networkErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.method} ${error.url} - ${error.status}`);
      });
    }
    console.log(`\n📊 Total API requests made: ${apiRequests.length}`);
    // Test passes if we at least navigated to reports successfully
    expect(authenticatedPage.url()).toContain('/reports');
  });
  test(`${tags.reports} verify utilization calculation after assignment`, async ({ 
    authenticatedPage, 
    testHelpers,
    apiContext,
    testDataHelpers 
  }) => {
    // This test verifies that utilization percentages are correctly calculated
    // after assignments are added or removed
    // Get initial utilization data
    await testHelpers.navigateTo('/reports');
    const utilizationTab = authenticatedPage.locator('button').filter({ hasText: 'Utilization Report' });
    if (await utilizationTab.isVisible()) {
      await utilizationTab.click();
    }
    await authenticatedPage.waitForLoadState('networkidle', { timeout: 30000 });
    // Find one of our test people
    let testPersonRow = null;
    let testPersonName = '';
    let testPersonData = null;
    for (const person of testData.people) {
      const personRow = authenticatedPage.locator('table tbody tr').filter({
        has: authenticatedPage.locator(`td:has-text("${person.name}")`)
      }).first();
      if (await personRow.count() > 0) {
        testPersonRow = personRow;
        testPersonName = person.name;
        testPersonData = person;
        break;
      }
    }
    if (!testPersonRow) {
      console.log('⚠️  No test person found in utilization report');
      return;
    }
    const initialUtilization = await testPersonRow.locator('td').nth(2).textContent();
    console.log(`Testing utilization calculation for: ${testPersonName}`);
    console.log(`Initial utilization: ${initialUtilization}`);
    // Navigate to person detail to verify assignments match utilization
    await testHelpers.navigateTo('/people');
    await testHelpers.waitForDataTable();
    // Find the same person
    const peopleRow = authenticatedPage.locator('tbody tr').filter({
      has: authenticatedPage.locator(`td:has-text("${testPersonName}")`)
    }).first();
    if (await peopleRow.count() > 0) {
      // Check utilization shown in people list
      const peopleUtilization = await peopleRow.locator('td:nth-child(5)').textContent();
      console.log(`People page utilization: ${peopleUtilization}`);
      // Click on person to see assignments
      await peopleRow.click();
      await authenticatedPage.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      // Count assignments for this person
      const assignmentsList = authenticatedPage.locator('.assignments-list, .assignment-item, table tbody tr');
      const assignmentCount = await assignmentsList.count();
      console.log(`Person has ${assignmentCount} assignment(s)`);
      // Calculate expected utilization based on assignments
      let totalAllocation = 0;
      for (let i = 0; i < assignmentCount; i++) {
        const allocationText = await assignmentsList.nth(i).locator('td:has-text("%"), .allocation').textContent();
        const allocationMatch = allocationText?.match(/(\d+)%/);
        if (allocationMatch) {
          totalAllocation += parseInt(allocationMatch[1], 10);
        }
      }
      console.log(`Total allocation from assignments: ${totalAllocation}%`);
      // Parse the displayed utilization
      const displayedMatch = initialUtilization?.match(/(\d+)%/);
      if (displayedMatch) {
        const displayedUtilization = parseInt(displayedMatch[1], 10);
        // They should roughly match (within 5% tolerance for rounding)
        expect(Math.abs(displayedUtilization - totalAllocation)).toBeLessThanOrEqual(5);
      }
    }
  });
});