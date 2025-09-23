/**
 * Scenario Basic Operations Tests
 * Tests for CRUD operations, view modes, and basic scenario functionality
 * Uses dynamic test data for proper isolation
 */
import { test, expect, tags } from '../../fixtures';
import { TestDataContext } from '../../utils/test-data-helpers';
test.describe('Scenario Basic Operations', () => {
  let testContext: TestDataContext;
  let testScenarios: any[];
  test.beforeEach(async ({ testDataHelpers, testHelpers, apiContext }) => {
    // Create isolated test context
    testContext = testDataHelpers.createTestContext('scnbasic');
    // Create test scenarios
    testScenarios = [];
    const scenarioTypes = ['what-if', 'baseline', 'forecast'];
    const statuses = ['draft', 'active', 'archived'];
    for (let i = 0; i < 3; i++) {
      const scenarioData = {
        name: `${testContext.prefix}-Scenario-${i + 1}`,
        description: `Test scenario ${i + 1} for basic operations`,
        type: scenarioTypes[i],
        status: statuses[i]
      };
      const response = await apiContext.post('/api/scenarios', { data: scenarioData });
      const scenario = await response.json();
      if (scenario.id) {
        testScenarios.push(scenario);
        testContext.createdIds.scenarios = testContext.createdIds.scenarios || [];
        testContext.createdIds.scenarios.push(scenario.id);
      }
    }
    await testHelpers.navigateTo('/scenarios');
    await testHelpers.waitForPageLoad();
  });
  test.afterEach(async ({ testDataHelpers }) => {
    // Clean up all test data
    await testDataHelpers.cleanupTestContext(testContext);
  });
  test.describe('View Modes', () => {
    test(`${tags.smoke} should display all view mode options`, async ({ authenticatedPage }) => {
      // Check view mode toggle buttons exist
      await expect(authenticatedPage.getByRole('button', { name: 'Cards' })).toBeVisible();
      await expect(authenticatedPage.getByRole('button', { name: 'List' })).toBeVisible();
      await expect(authenticatedPage.getByRole('button', { name: 'Graphical' })).toBeVisible();
      // Cards should be active by default
      const cardsButton = authenticatedPage.getByRole('button', { name: 'Cards' });
      await expect(cardsButton).toHaveClass(/btn-primary|active|selected/);
    });
    test('should switch between view modes', async ({ authenticatedPage }) => {
      // Switch to List view
      const listButton = authenticatedPage.getByRole('button', { name: 'List' });
      await listButton.click();
      await authenticatedPage.waitForTimeout(500);
      await expect(listButton).toHaveClass(/btn-primary|active|selected/);
      // Switch to Graphical view
      const graphicalButton = authenticatedPage.getByRole('button', { name: 'Graphical' });
      await graphicalButton.click();
      await authenticatedPage.waitForTimeout(500);
      await expect(graphicalButton).toHaveClass(/btn-primary|active|selected/);
      // Switch back to Cards view
      const cardsButton = authenticatedPage.getByRole('button', { name: 'Cards' });
      await cardsButton.click();
      await authenticatedPage.waitForTimeout(500);
      await expect(cardsButton).toHaveClass(/btn-primary|active|selected/);
    });
    test('should persist view mode selection across navigation', async ({ 
      authenticatedPage,
      testHelpers 
    }) => {
      // Switch to List view
      await authenticatedPage.getByRole('button', { name: 'List' }).click();
      // Navigate away and back
      await testHelpers.navigateTo('/projects');
      await testHelpers.navigateTo('/scenarios');
      // List view should still be active
      const listButton = authenticatedPage.getByRole('button', { name: 'List' });
      await expect(listButton).toHaveClass(/btn-primary|active|selected/);
    });
  });
  test.describe('CRUD Operations', () => {
    test(`${tags.crud} should create a new scenario`, async ({ 
      authenticatedPage,
      apiContext 
    }) => {
      // Click create button
      await authenticatedPage.click('button:has-text("New Scenario"), button:has-text("Create Scenario")');
      // Fill form
      const modal = authenticatedPage.locator('[role="dialog"], .modal');
      const newScenarioName = `${testContext.prefix}-New-Test-Scenario`;
      await modal.locator('input[name="name"], input[name="scenario_name"]').fill(newScenarioName);
      await modal.locator('textarea[name="description"]').fill('A new scenario for testing');
      const typeSelect = modal.locator('select[name="type"], select[name="scenario_type"]');
      if (await typeSelect.isVisible()) {
        await typeSelect.selectOption('what-if');
      }
      // Listen for API response
      const responsePromise = authenticatedPage.waitForResponse(response => 
        response.url().includes('/api/scenarios') && response.request().method() === 'POST'
      );
      // Submit
      await modal.locator('button:has-text("Create"), button:has-text("Save")').click();
      const response = await responsePromise;
      expect(response.status()).toBe(201);
      const newScenario = await response.json();
      if (newScenario.id) {
        testContext.createdIds.scenarios.push(newScenario.id);
      }
      // Verify scenario appears
      await expect(authenticatedPage.locator(`.scenario-card:has-text("${newScenarioName}")`)).toBeVisible();
    });
    test('should view scenario details', async ({ 
      authenticatedPage,
      testDataHelpers 
    }) => {
      // Use first test scenario
      const testScenario = testScenarios[0];
      const scenarioCard = await testDataHelpers.findByTestData(
        '.scenario-card',
        testScenario.name
      );
      await scenarioCard.click();
      // Verify details page
      await expect(authenticatedPage).toHaveURL(/\/scenarios\/[^/]+$/);
      await expect(authenticatedPage.locator('h1')).toContainText(testScenario.name);
    });
    test('should edit scenario properties', async ({ 
      authenticatedPage,
      testDataHelpers 
    }) => {
      // Use second test scenario
      const testScenario = testScenarios[1];
      const scenarioCard = await testDataHelpers.findByTestData(
        '.scenario-card',
        testScenario.name
      );
      // Navigate to scenario details
      await scenarioCard.click();
      // Click edit button
      await authenticatedPage.click('button:has-text("Edit"), button[aria-label="Edit"]');
      // Update fields
      const modal = authenticatedPage.locator('[role="dialog"], .modal');
      const updatedName = `${testContext.prefix}-Updated-Scenario`;
      await modal.locator('input[name="name"], input[name="scenario_name"]').clear();
      await modal.locator('input[name="name"], input[name="scenario_name"]').fill(updatedName);
      await modal.locator('textarea[name="description"]').clear();
      await modal.locator('textarea[name="description"]').fill('Updated description for testing');
      // Listen for API response
      const responsePromise = authenticatedPage.waitForResponse(response => 
        response.url().includes(`/api/scenarios/${testScenario.id}`) && 
        (response.request().method() === 'PUT' || response.request().method() === 'PATCH')
      );
      // Save changes
      await modal.locator('button:has-text("Save"), button:has-text("Update")').click();
      const response = await responsePromise;
      expect(response.status()).toBe(200);
      // Verify updates
      await expect(authenticatedPage.locator('h1')).toContainText(updatedName);
    });
    test('should delete a scenario', async ({ 
      authenticatedPage,
      testDataHelpers,
      apiContext 
    }) => {
      // Create a scenario specifically for deletion
      const deleteScenarioData = {
        name: `${testContext.prefix}-Delete-Me`,
        description: 'Scenario to be deleted',
        type: 'what-if',
        status: 'draft'
      };
      const createResponse = await apiContext.post('/api/scenarios', { data: deleteScenarioData });
      const scenarioToDelete = await createResponse.json();
      testContext.createdIds.scenarios.push(scenarioToDelete.id);
      // Reload page to see new scenario
      await authenticatedPage.reload();
      // Find and delete it
      const scenarioCard = await testDataHelpers.findByTestData(
        '.scenario-card',
        scenarioToDelete.name
      );
      const deleteButton = scenarioCard.locator('button[aria-label="Delete"], button[title*="Delete"]');
      await deleteButton.click();
      // Listen for API response
      const deletePromise = authenticatedPage.waitForResponse(response => 
        response.url().includes(`/api/scenarios/${scenarioToDelete.id}`) && 
        response.request().method() === 'DELETE'
      );
      // Confirm deletion
      const confirmButton = authenticatedPage.locator('button:has-text("Delete"), button:has-text("Confirm")').last();
      await confirmButton.click();
      const deleteResponse = await deletePromise;
      expect(deleteResponse.status()).toBe(200);
      // Verify removed
      await expect(scenarioCard).not.toBeVisible();
    });
  });
  test.describe('Scenario Types', () => {
    test('should display different scenario types correctly', async ({ 
      authenticatedPage,
      testDataHelpers 
    }) => {
      // Verify each test scenario type is displayed correctly
      for (let i = 0; i < testScenarios.length; i++) {
        const scenario = testScenarios[i];
        const scenarioCard = await testDataHelpers.findByTestData(
          '.scenario-card',
          scenario.name
        );
        const typeElement = scenarioCard.locator('.scenario-type, .type-badge');
        await expect(typeElement).toBeVisible();
        // Map type values to display labels
        const typeLabels: { [key: string]: string } = {
          'what-if': 'What-If',
          'baseline': 'Baseline',
          'forecast': 'Forecast'
        };
        const expectedLabel = typeLabels[scenario.type] || scenario.type;
        await expect(typeElement).toContainText(expectedLabel);
      }
    });
    test('should create scenarios of different types', async ({ 
      authenticatedPage,
      apiContext 
    }) => {
      const scenarioTypes = [
        { type: 'what-if', label: 'What-If Analysis' },
        { type: 'baseline', label: 'Baseline' },
        { type: 'forecast', label: 'Forecast' }
      ];
      for (const scenarioType of scenarioTypes) {
        // Create scenario of specific type
        await authenticatedPage.click('button:has-text("New Scenario")');
        const modal = authenticatedPage.locator('[role="dialog"]');
        const scenarioName = `${testContext.prefix}-${scenarioType.label}-Test`;
        await modal.locator('input[name="name"]').fill(scenarioName);
        await modal.locator('select[name="type"]').selectOption(scenarioType.type);
        const responsePromise = authenticatedPage.waitForResponse(response => 
          response.url().includes('/api/scenarios') && response.request().method() === 'POST'
        );
        await modal.locator('button:has-text("Create")').click();
        const response = await responsePromise;
        const newScenario = await response.json();
        if (newScenario.id) {
          testContext.createdIds.scenarios.push(newScenario.id);
        }
        // Verify type is displayed
        const card = authenticatedPage.locator(`.scenario-card:has-text("${scenarioName}")`);
        await expect(card.locator('.scenario-type')).toContainText(scenarioType.label);
      }
    });
  });
  test.describe('Filtering and Search', () => {
    test('should filter scenarios by type', async ({ authenticatedPage }) => {
      // Apply filter for what-if type (we know we have one from test data)
      const filterSelect = authenticatedPage.locator('select[name="type_filter"], select[name="filter_type"]');
      await filterSelect.selectOption('what-if');
      // Wait for filter to apply
      await authenticatedPage.waitForTimeout(500);
      // Verify only what-if scenarios shown
      const visibleCards = authenticatedPage.locator('.scenario-card:visible');
      const cardCount = await visibleCards.count();
      expect(cardCount).toBeGreaterThan(0);
      for (let i = 0; i < cardCount; i++) {
        await expect(visibleCards.nth(i).locator('.scenario-type')).toContainText('What-If');
      }
    });
    test('should search scenarios by name', async ({ 
      authenticatedPage,
      testDataHelpers 
    }) => {
      // Search for our test prefix
      const searchInput = authenticatedPage.locator('input[placeholder*="Search"]');
      await searchInput.fill(testContext.prefix);
      // Wait for search to apply
      await authenticatedPage.waitForTimeout(500);
      // Verify filtered results
      const visibleCards = authenticatedPage.locator('.scenario-card:visible');
      const cardCount = await visibleCards.count();
      // Should show all our test scenarios
      expect(cardCount).toBeGreaterThanOrEqual(testScenarios.length);
      for (let i = 0; i < cardCount; i++) {
        const cardText = await visibleCards.nth(i).textContent();
        expect(cardText).toContain(testContext.prefix);
      }
    });
  });
  test.describe('Scenario States', () => {
    test('should show scenario status indicators', async ({ 
      authenticatedPage,
      testDataHelpers 
    }) => {
      // Check each test scenario has correct status
      for (const scenario of testScenarios) {
        const scenarioCard = await testDataHelpers.findByTestData(
          '.scenario-card',
          scenario.name
        );
        const statusBadge = scenarioCard.locator('.status-badge, .scenario-status');
        await expect(statusBadge).toBeVisible();
        // Status display mapping
        const statusLabels: { [key: string]: string } = {
          'draft': 'Draft',
          'active': 'Active',
          'archived': 'Archived'
        };
        const expectedStatus = statusLabels[scenario.status] || scenario.status;
        await expect(statusBadge).toContainText(expectedStatus);
      }
    });
    test('should activate a draft scenario', async ({ 
      authenticatedPage,
      testDataHelpers 
    }) => {
      // Find our draft scenario (first one in test data)
      const draftScenario = testScenarios.find(s => s.status === 'draft');
      if (!draftScenario) {
        test.skip();
        return;
      }
      const scenarioCard = await testDataHelpers.findByTestData(
        '.scenario-card',
        draftScenario.name
      );
      // Activate it
      const activateButton = scenarioCard.locator('button[aria-label="Activate"], button:has-text("Activate")');
      const responsePromise = authenticatedPage.waitForResponse(response => 
        response.url().includes(`/api/scenarios/${draftScenario.id}`) && 
        (response.request().method() === 'PUT' || response.request().method() === 'PATCH')
      );
      await activateButton.click();
      await responsePromise;
      // Verify status changes
      await expect(scenarioCard.locator('.status-badge')).toContainText('Active');
    });
  });
  test.describe('Bulk Operations', () => {
    test('should support bulk scenario selection', async ({ 
      authenticatedPage,
      testDataHelpers 
    }) => {
      // Enable selection mode
      await authenticatedPage.click('button:has-text("Select"), button:has-text("Bulk Select")');
      // Select our test scenarios
      for (let i = 0; i < Math.min(testScenarios.length, 2); i++) {
        const scenarioCard = await testDataHelpers.findByTestData(
          '.scenario-card',
          testScenarios[i].name
        );
        const checkbox = scenarioCard.locator('input[type="checkbox"]');
        await checkbox.check();
      }
      // Verify bulk action toolbar appears
      const bulkToolbar = authenticatedPage.locator('.bulk-actions-toolbar, .bulk-actions');
      await expect(bulkToolbar).toBeVisible();
      await expect(bulkToolbar).toContainText('2 selected');
    });
    test('should perform bulk delete', async ({ 
      authenticatedPage,
      testDataHelpers,
      apiContext 
    }) => {
      // Create scenarios specifically for bulk delete
      const bulkDeleteScenarios = [];
      for (let i = 1; i <= 2; i++) {
        const scenarioData = {
          name: `${testContext.prefix}-Bulk-Delete-${i}`,
          description: 'To be bulk deleted',
          type: 'what-if',
          status: 'draft'
        };
        const response = await apiContext.post('/api/scenarios', { data: scenarioData });
        const scenario = await response.json();
        bulkDeleteScenarios.push(scenario);
        testContext.createdIds.scenarios.push(scenario.id);
      }
      // Reload page to see new scenarios
      await authenticatedPage.reload();
      // Enable selection and select them
      await authenticatedPage.click('button:has-text("Select")');
      for (const scenario of bulkDeleteScenarios) {
        const scenarioCard = await testDataHelpers.findByTestData(
          '.scenario-card',
          scenario.name
        );
        const checkbox = scenarioCard.locator('input[type="checkbox"]');
        await checkbox.check();
      }
      // Bulk delete
      await authenticatedPage.click('.bulk-actions-toolbar button:has-text("Delete")');
      // Confirm deletion
      const confirmButton = authenticatedPage.locator('button:has-text("Delete"), button:has-text("Confirm")').last();
      await confirmButton.click();
      // Wait for deletions to complete
      await authenticatedPage.waitForTimeout(1000);
      // Verify removed
      for (const scenario of bulkDeleteScenarios) {
        const scenarioCard = authenticatedPage.locator(`.scenario-card:has-text("${scenario.name}")`);
        await expect(scenarioCard).not.toBeVisible();
      }
    });
  });
});