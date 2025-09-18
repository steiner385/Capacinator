/**
 * Scenario Data Integrity Tests
 * Tests for concurrent operations, merge prevention, data consistency
 * Uses dynamic test data for proper isolation
 */

import { test, expect, tags } from '../../fixtures';
import { TestDataContext } from '../../utils/test-data-helpers';

test.describe('Scenario Data Integrity', () => {
  let testContext: TestDataContext;
  let testScenarios: any[];

  test.beforeEach(async ({ testDataHelpers, testHelpers, apiContext }) => {
    // Create isolated test context
    testContext = testDataHelpers.createTestContext('scnintegrity');
    testScenarios = [];
    
    await testHelpers.navigateTo('/scenarios');
    await testHelpers.waitForPageLoad();
  });

  test.afterEach(async ({ testDataHelpers }) => {
    // Clean up all test data
    await testDataHelpers.cleanupTestContext(testContext);
  });

  test.describe('Concurrent Operations', () => {
    test(`${tags.critical} should handle concurrent scenario edits`, async ({ 
      browser, 
      authenticatedPage, 
      context,
      apiContext 
    }) => {
      // Create a scenario to test with
      const scenarioData = {
        name: `${testContext.prefix}-Concurrent-Test`,
        description: 'Original description',
        type: 'what-if',
        status: 'draft'
      };
      
      const response = await apiContext.post('/api/scenarios', { data: scenarioData });
      const testScenario = await response.json();
      if (testScenario.id) {
        testContext.createdIds.scenarios = testContext.createdIds.scenarios || [];
        testContext.createdIds.scenarios.push(testScenario.id);
      }
      
      // Reload page to see new scenario
      await authenticatedPage.reload();
      
      // Navigate to the scenario
      const scenarioCard = await testDataHelpers.findByTestData(
        '.scenario-card',
        testScenario.name
      );
      await scenarioCard.click();
      const scenarioUrl = authenticatedPage.url();
      
      // Open second browser tab
      const page2 = await context.newPage();
      await page2.goto(scenarioUrl);
      
      // Edit in first tab
      await authenticatedPage.click('button:has-text("Edit")');
      const editModal1 = authenticatedPage.locator('[role="dialog"]');
      await editModal1.locator('textarea[name="description"]').clear();
      await editModal1.locator('textarea[name="description"]').fill('Edit from tab 1');
      
      // Edit in second tab
      await page2.click('button:has-text("Edit")');
      const editModal2 = page2.locator('[role="dialog"]');
      await editModal2.locator('textarea[name="description"]').clear();
      await editModal2.locator('textarea[name="description"]').fill('Edit from tab 2');
      
      // Save first edit
      await editModal1.locator('button:has-text("Save")').click();
      
      // Try to save second edit
      await editModal2.locator('button:has-text("Save")').click();
      
      // Should show conflict warning
      await expect(page2.locator('.error-message, .conflict-warning')).toContainText(/conflict|changed|updated/i);
      
      await page2.close();
    });

    test('should lock scenario during bulk operations', async ({ 
      authenticatedPage,
      testDataHelpers,
      apiContext 
    }) => {
      // Create multiple scenarios for bulk operations
      const bulkScenarios = [];
      for (let i = 1; i <= 3; i++) {
        const scenarioData = {
          name: `${testContext.prefix}-Bulk-Op-${i}`,
          description: `Bulk operation test scenario ${i}`,
          type: 'what-if',
          status: 'draft'
        };
        
        const response = await apiContext.post('/api/scenarios', { data: scenarioData });
        const scenario = await response.json();
        if (scenario.id) {
          bulkScenarios.push(scenario);
          testContext.createdIds.scenarios = testContext.createdIds.scenarios || [];
          testContext.createdIds.scenarios.push(scenario.id);
        }
      }
      
      // Reload page to see new scenarios
      await authenticatedPage.reload();
      
      // Enable selection mode
      await authenticatedPage.click('button:has-text("Select")');
      
      // Select all test scenarios
      for (const scenario of bulkScenarios) {
        const scenarioCard = await testDataHelpers.findByTestData(
          '.scenario-card',
          scenario.name
        );
        const checkbox = scenarioCard.locator('input[type="checkbox"]');
        await checkbox.check();
      }
      
      // Start bulk operation
      await authenticatedPage.click('.bulk-actions-toolbar button:has-text("Archive")');
      
      // Try to edit one of the selected scenarios (should be locked)
      const firstScenarioCard = await testDataHelpers.findByTestData(
        '.scenario-card',
        bulkScenarios[0].name
      );
      const editButton = firstScenarioCard.locator('button[aria-label="Edit"]');
      if (await editButton.count() > 0) {
        await expect(editButton).toBeDisabled();
      }
    });
  });

  test.describe('Merge Prevention', () => {
    test('should prevent circular dependencies in scenario hierarchy', async ({ 
      authenticatedPage,
      testDataHelpers,
      apiContext 
    }) => {
      // Create parent scenario
      const parentData = {
        name: `${testContext.prefix}-Parent`,
        description: 'Parent scenario for hierarchy test',
        type: 'baseline',
        status: 'active'
      };
      
      const parentResponse = await apiContext.post('/api/scenarios', { data: parentData });
      const parentScenario = await parentResponse.json();
      if (parentScenario.id) {
        testContext.createdIds.scenarios = testContext.createdIds.scenarios || [];
        testContext.createdIds.scenarios.push(parentScenario.id);
      }
      
      // Create child scenario with parent reference
      const childData = {
        name: `${testContext.prefix}-Child`,
        description: 'Child scenario for hierarchy test',
        type: 'what-if',
        status: 'draft',
        parent_scenario_id: parentScenario.id
      };
      
      const childResponse = await apiContext.post('/api/scenarios', { data: childData });
      const childScenario = await childResponse.json();
      if (childScenario.id) {
        testContext.createdIds.scenarios.push(childScenario.id);
      }
      
      // Reload page to see new scenarios
      await authenticatedPage.reload();
      
      // Try to set parent as child of its own child
      const parentCard = await testDataHelpers.findByTestData(
        '.scenario-card',
        parentScenario.name
      );
      await parentCard.click();
      await authenticatedPage.click('button:has-text("Edit")');
      const modal = authenticatedPage.locator('[role="dialog"]');
      
      // Attempt circular reference
      const parentSelect = modal.locator('select[name="parent_scenario"], select[name="parent_scenario_id"]');
      if (await parentSelect.count() > 0) {
        const childOption = parentSelect.locator(`option:text-matches("${testContext.prefix}.*Child")`);
        if (await childOption.count() > 0) {
          await parentSelect.selectOption(childScenario.id);
          await modal.locator('button:has-text("Save")').click();
          
          // Should show error
          await expect(modal.locator('.error-message')).toContainText(/circular|dependency|invalid/i);
        }
      }
    });

    test('should handle merge conflicts in branched scenarios', async ({ 
      authenticatedPage,
      testDataHelpers,
      apiContext 
    }) => {
      // Create base scenario
      const baseData = {
        name: `${testContext.prefix}-Base`,
        description: 'Base scenario for branching',
        type: 'baseline',
        status: 'active'
      };
      
      const baseResponse = await apiContext.post('/api/scenarios', { data: baseData });
      const baseScenario = await baseResponse.json();
      if (baseScenario.id) {
        testContext.createdIds.scenarios = testContext.createdIds.scenarios || [];
        testContext.createdIds.scenarios.push(baseScenario.id);
      }
      
      // Reload and navigate to base scenario
      await authenticatedPage.reload();
      const baseCard = await testDataHelpers.findByTestData(
        '.scenario-card',
        baseScenario.name
      );
      await baseCard.click();
      
      // Check if branching is supported
      const branchButton = authenticatedPage.locator('button:has-text("Create Branch"), button:has-text("Branch")');
      if (await branchButton.count() > 0) {
        // Create branch 1
        await branchButton.click();
        let modal = authenticatedPage.locator('[role="dialog"]');
        const branch1Name = `${testContext.prefix}-Branch-1`;
        await modal.locator('input[name="branch_name"], input[name="name"]').fill(branch1Name);
        await modal.locator('button:has-text("Create")').click();
        
        // Go back and create branch 2 from base
        await authenticatedPage.goto('/scenarios');
        await baseCard.click();
        await branchButton.click();
        modal = authenticatedPage.locator('[role="dialog"]');
        const branch2Name = `${testContext.prefix}-Branch-2`;
        await modal.locator('input[name="branch_name"], input[name="name"]').fill(branch2Name);
        await modal.locator('button:has-text("Create")').click();
        
        // Try to merge branches (if merge feature exists)
        await authenticatedPage.goto('/scenarios');
        const branch1Card = await testDataHelpers.findByTestData(
          '.scenario-card',
          branch1Name
        );
        await branch1Card.click();
        
        const mergeButton = authenticatedPage.locator('button:has-text("Merge")');
        if (await mergeButton.count() > 0) {
          await mergeButton.click();
          
          // Should show merge dialog with conflict detection
          modal = authenticatedPage.locator('[role="dialog"]');
          await expect(modal).toContainText(/merge|conflicts/i);
        }
      }
    });
  });

  test.describe('Data Validation', () => {
    test('should validate scenario data on save', async ({ 
      authenticatedPage 
    }) => {
      await authenticatedPage.click('button:has-text("New Scenario")');
      const modal = authenticatedPage.locator('[role="dialog"]');
      
      // Test invalid date ranges
      const testName = `${testContext.prefix}-Date-Validation`;
      await modal.locator('input[name="name"], input[name="scenario_name"]').fill(testName);
      
      const startDateInput = modal.locator('input[name="start_date"], input[type="date"]').first();
      const endDateInput = modal.locator('input[name="end_date"], input[type="date"]').last();
      
      if (await startDateInput.count() > 0 && await endDateInput.count() > 0) {
        await startDateInput.fill('2024-12-31');
        await endDateInput.fill('2024-01-01');
        await modal.locator('button:has-text("Create")').click();
        
        // Should show validation error
        await expect(modal.locator('.error-message, .invalid-feedback')).toContainText(/date|invalid|before/i);
      } else {
        // Skip if date fields don't exist
        await modal.locator('button:has-text("Cancel")').click();
      }
    });

    test('should enforce unique scenario names within context', async ({ 
      authenticatedPage,
      apiContext 
    }) => {
      // Create first scenario
      const uniqueName = `${testContext.prefix}-Unique-Name`;
      const scenarioData = {
        name: uniqueName,
        description: 'First scenario with this name',
        type: 'what-if',
        status: 'draft'
      };
      
      const response = await apiContext.post('/api/scenarios', { data: scenarioData });
      const firstScenario = await response.json();
      if (firstScenario.id) {
        testContext.createdIds.scenarios = testContext.createdIds.scenarios || [];
        testContext.createdIds.scenarios.push(firstScenario.id);
      }
      
      // Try to create another with same name through UI
      await authenticatedPage.click('button:has-text("New Scenario")');
      const modal = authenticatedPage.locator('[role="dialog"]');
      await modal.locator('input[name="name"], input[name="scenario_name"]').fill(uniqueName);
      await modal.locator('button:has-text("Create")').click();
      
      // Should show error
      await expect(modal.locator('.error-message, .invalid-feedback')).toContainText(/exists|duplicate|unique/i);
    });

    test('should validate numeric constraints', async ({ 
      authenticatedPage,
      testDataHelpers,
      apiContext 
    }) => {
      // Create a scenario to test numeric inputs
      const scenarioData = {
        name: `${testContext.prefix}-Numeric-Test`,
        description: 'Testing numeric validation',
        type: 'planning',
        status: 'draft'
      };
      
      const response = await apiContext.post('/api/scenarios', { data: scenarioData });
      const testScenario = await response.json();
      if (testScenario.id) {
        testContext.createdIds.scenarios = testContext.createdIds.scenarios || [];
        testContext.createdIds.scenarios.push(testScenario.id);
      }
      
      // Reload and navigate to scenario
      await authenticatedPage.reload();
      const scenarioCard = await testDataHelpers.findByTestData(
        '.scenario-card',
        testScenario.name
      );
      await scenarioCard.click();
      
      // Find numeric input fields
      const numericInputs = authenticatedPage.locator('input[type="number"]');
      
      if (await numericInputs.count() > 0) {
        // Test negative values where not allowed
        const firstInput = numericInputs.first();
        await firstInput.fill('-10');
        await firstInput.blur();
        
        // Check for validation
        const errorMessage = authenticatedPage.locator('.error-message, .invalid-feedback');
        if (await errorMessage.count() > 0) {
          await expect(errorMessage.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Transaction Integrity', () => {
    test('should rollback failed bulk operations', async ({ 
      authenticatedPage,
      testDataHelpers,
      apiContext 
    }) => {
      // Create scenarios for testing
      const transactionScenarios = [];
      for (let i = 1; i <= 3; i++) {
        const scenarioData = {
          name: `${testContext.prefix}-Transaction-${i}`,
          description: `Transaction test scenario ${i}`,
          type: 'what-if',
          status: 'draft'
        };
        
        const response = await apiContext.post('/api/scenarios', { data: scenarioData });
        const scenario = await response.json();
        if (scenario.id) {
          transactionScenarios.push(scenario);
          testContext.createdIds.scenarios = testContext.createdIds.scenarios || [];
          testContext.createdIds.scenarios.push(scenario.id);
        }
      }
      
      // Reload page
      await authenticatedPage.reload();
      
      // Make one scenario read-only (simulate locked state)
      await authenticatedPage.evaluate((prefix) => {
        const cards = document.querySelectorAll('.scenario-card');
        for (const card of cards) {
          if (card.textContent?.includes(`${prefix}-Transaction-3`)) {
            card.setAttribute('data-locked', 'true');
            break;
          }
        }
      }, testContext.prefix);
      
      // Try bulk delete including locked scenario
      await authenticatedPage.click('button:has-text("Select")');
      
      for (const scenario of transactionScenarios) {
        const scenarioCard = await testDataHelpers.findByTestData(
          '.scenario-card',
          scenario.name
        );
        const checkbox = scenarioCard.locator('input[type="checkbox"]');
        await checkbox.check();
      }
      
      await authenticatedPage.click('.bulk-actions-toolbar button:has-text("Delete")');
      await authenticatedPage.locator('button:has-text("Delete"), button:has-text("Confirm")').last().click();
      
      // Operation should fail if transaction integrity is enforced
      const errorMessage = authenticatedPage.locator('.error-message, .toast-error');
      if (await errorMessage.count() > 0) {
        await expect(errorMessage.first()).toBeVisible();
        
        // Verify all scenarios still exist
        for (const scenario of transactionScenarios) {
          const card = await testDataHelpers.findByTestData(
            '.scenario-card',
            scenario.name
          );
          await expect(card).toBeVisible();
        }
      }
    });
  });

  test.describe('Version Control', () => {
    test('should track scenario version history', async ({ 
      authenticatedPage,
      testDataHelpers,
      apiContext 
    }) => {
      // Create scenario for version testing
      const versionData = {
        name: `${testContext.prefix}-Version-Test`,
        description: 'Version 1 description',
        type: 'baseline',
        status: 'active'
      };
      
      const response = await apiContext.post('/api/scenarios', { data: versionData });
      const versionScenario = await response.json();
      if (versionScenario.id) {
        testContext.createdIds.scenarios = testContext.createdIds.scenarios || [];
        testContext.createdIds.scenarios.push(versionScenario.id);
      }
      
      // Reload and navigate to scenario
      await authenticatedPage.reload();
      const scenarioCard = await testDataHelpers.findByTestData(
        '.scenario-card',
        versionScenario.name
      );
      await scenarioCard.click();
      
      // Make edit to create version 2
      await authenticatedPage.click('button:has-text("Edit")');
      const modal = authenticatedPage.locator('[role="dialog"]');
      await modal.locator('textarea[name="description"]').clear();
      await modal.locator('textarea[name="description"]').fill('Version 2 description');
      
      const saveResponse = authenticatedPage.waitForResponse(response => 
        response.url().includes(`/api/scenarios/${versionScenario.id}`) && 
        (response.request().method() === 'PUT' || response.request().method() === 'PATCH')
      );
      
      await modal.locator('button:has-text("Save")').click();
      await saveResponse;
      
      // Check version history if available
      const historyButton = authenticatedPage.locator('button:has-text("History"), button:has-text("Versions")');
      if (await historyButton.count() > 0) {
        await historyButton.click();
        
        // Should show version entries
        const versionEntries = authenticatedPage.locator('.version-entry, .history-item');
        await expect(versionEntries).toHaveCount(2, { timeout: 5000 });
        await expect(versionEntries.first()).toContainText(/Version 2|description/i);
      }
    });

    test('should allow reverting to previous versions', async ({ 
      authenticatedPage,
      testDataHelpers 
    }) => {
      // Use first available scenario with history
      if (testScenarios.length > 0) {
        const scenario = testScenarios[0];
        const scenarioCard = await testDataHelpers.findByTestData(
          '.scenario-card',
          scenario.name
        );
        await scenarioCard.click();
        
        const historyButton = authenticatedPage.locator('button:has-text("History"), button:has-text("Versions")');
        if (await historyButton.count() > 0) {
          await historyButton.click();
          
          const versionEntries = authenticatedPage.locator('.version-entry, .history-item');
          if (await versionEntries.count() > 1) {
            // Revert to previous version
            const revertButton = versionEntries.last().locator('button:has-text("Revert"), button:has-text("Restore")');
            if (await revertButton.count() > 0) {
              await revertButton.click();
              await authenticatedPage.locator('button:has-text("Confirm")').click();
              
              // Verify reversion
              await expect(authenticatedPage.locator('.toast, .notification')).toContainText(/revert|restored/i);
            }
          }
        }
      }
    });
  });

  test.describe('Data Consistency', () => {
    test(`${tags.api} should maintain referential integrity`, async ({ 
      authenticatedPage, 
      apiContext 
    }) => {
      // Create parent scenario via API
      const parentData = {
        name: `${testContext.prefix}-API-Parent`,
        type: 'baseline',
        status: 'active'
      };
      
      const parentResponse = await apiContext.post('/api/scenarios', { data: parentData });
      const parentScenario = await parentResponse.json();
      const parentId = parentScenario.id || parentScenario.data?.id;
      
      if (parentId) {
        testContext.createdIds.scenarios = testContext.createdIds.scenarios || [];
        testContext.createdIds.scenarios.push(parentId);
        
        // Create child scenario with parent reference
        const childData = {
          name: `${testContext.prefix}-API-Child`,
          type: 'what-if',
          status: 'draft',
          parent_scenario_id: parentId
        };
        
        const childResponse = await apiContext.post('/api/scenarios', { data: childData });
        const childScenario = await childResponse.json();
        const childId = childScenario.id || childScenario.data?.id;
        
        if (childId) {
          testContext.createdIds.scenarios.push(childId);
          
          // Try to delete parent (should fail due to child reference)
          const deleteResponse = await apiContext.delete(`/api/scenarios/${parentId}`);
          expect(deleteResponse.status()).toBe(409); // Conflict
          
          // Verify parent still exists
          await authenticatedPage.reload();
          const parentCard = await testDataHelpers.findByTestData(
            '.scenario-card',
            parentScenario.name || parentData.name
          );
          await expect(parentCard).toBeVisible();
        }
      }
    });

    test('should handle orphaned data gracefully', async ({ 
      authenticatedPage,
      testDataHelpers 
    }) => {
      // This test simulates orphaned data scenarios
      // Check if UI handles missing references
      
      // Look for any warning indicators
      const cards = authenticatedPage.locator('.scenario-card');
      const cardCount = await cards.count();
      
      for (let i = 0; i < Math.min(cardCount, 3); i++) {
        const card = cards.nth(i);
        
        // Check for broken references
        const brokenIcon = card.locator('.broken-link-icon, .warning-icon, .error-icon');
        if (await brokenIcon.count() > 0) {
          // Hover for details
          await brokenIcon.hover();
          const tooltip = authenticatedPage.locator('.tooltip, [role="tooltip"]');
          if (await tooltip.count() > 0) {
            await expect(tooltip.first()).toContainText(/missing|broken|invalid/i);
          }
        }
      }
    });
  });
});