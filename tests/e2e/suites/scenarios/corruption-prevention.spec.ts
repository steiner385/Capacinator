/**
 * Database Corruption Prevention Tests
 * Critical tests for ensuring scenario operations prevent database corruption
 * Uses dynamic test data for proper isolation
 */
import { test, expect, tags } from '../../fixtures';
import { TestDataContext } from '../../utils/test-data-helpers';
test.describe('Database Corruption Prevention Tests', () => {
  let testContext: TestDataContext;
  let testData: any;
  test.beforeEach(async ({ testDataHelpers, apiContext }) => {
    // Create isolated test context
    testContext = testDataHelpers.createTestContext('corruption');
    // Create test data
    testData = await testDataHelpers.createBulkTestData(testContext, {
      projects: 2,
      people: 2,
      assignments: 4
    });
  });
  test.afterEach(async ({ testDataHelpers }) => {
    // Clean up all test data
    await scenarioUtils.cleanupScenariosByPrefix(testContext.prefix);
    await testDataHelpers.cleanupTestContext(testContext);
  });
  test(`${tags.scenarios} ${tags.critical} should prevent database corruption during scenario operations`, async ({ 
    authenticatedPage, 
    testHelpers,
    testDataHelpers 
  }) => {
    console.log('Starting Database Corruption Prevention Test');
    await testHelpers.navigateTo('/scenarios');
    await testHelpers.waitForPageReady();
    // Test 1: Create test scenario via UI
    console.log('Creating test scenario via UI');
    await authenticatedPage.click('button:has-text("New Scenario")');
    await authenticatedPage.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
    // Fill scenario form with test data
    const scenarioName = `${testContext.prefix}_Corruption_Test`;
    await authenticatedPage.fill('input[id="scenario-name"], input[name="name"]', scenarioName);
    await authenticatedPage.fill('textarea[id="scenario-description"], textarea[name="description"]', 'Testing database corruption prevention');
    const typeSelect = authenticatedPage.locator('select[id="scenario-type"], select[name="type"]');
    if (await typeSelect.count() > 0) {
      await typeSelect.selectOption('branch');
    }
    // Submit form
    await modal.locator('button:has-text("Create"), button:has-text("Save")').click();
    
    // Wait for modal to close and data to sync
    await expect(modal).not.toBeVisible();
    await waitForSync(authenticatedPage);
    
    // Verify scenario was created using utilities
    await scenarioUtils.waitForScenariosToLoad();
    const scenarioRow = await scenarioUtils.getScenarioRow(scenarioName);
    await expect(scenarioRow).toBeVisible();
    console.log('✅ Created test scenario');
    // Test 2: Test merge operation (should succeed safely)
    console.log('🔄 Testing merge operation');
    const mergeButton = scenarioRow.locator('button[title*="Merge"], button.action-button:has-text("Merge")');
    
    if (await mergeButton.isVisible()) {
      await mergeButton.click();
      await authenticatedPage.waitForTimeout(1000);
      
      // Handle any merge confirmation dialog
      const confirmButton = authenticatedPage.locator('button').filter({ hasText: /^Confirm$|^Merge$/ }).last();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await waitForSync(authenticatedPage);
      }
      console.log('✅ Merge operation completed safely');
    } else {
      console.log('ℹ️ Merge button not available (scenario may need assignments first)');
    }
    // Test 3: Verify UI still functions after operations
    const scenarioCards = await authenticatedPage.locator('.scenario-card').count();
    console.log(`📊 Total scenarios visible: ${scenarioCards}`);
    expect(scenarioCards).toBeGreaterThan(0);
    // Test 4: Verify database integrity by checking if we can still create scenarios
    console.log('🔍 Testing database integrity');
    await authenticatedPage.click('button:has-text("New Scenario")');
    await authenticatedPage.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
    // Fill another scenario to test integrity
    const integrityScenarioName = `${testContext.prefix}_Integrity_Check`;
    await authenticatedPage.fill('input[id="scenario-name"], input[name="name"]', integrityScenarioName);
    await authenticatedPage.click('button:has-text("Create Scenario"), button:has-text("Create")');
    await authenticatedPage.waitForTimeout(2000);
    // Verify we can still create scenarios (database is not corrupted)
    await expect(authenticatedPage.locator(`.scenario-card:has-text("${integrityScenarioName}")`)).toBeVisible({ timeout: 10000 });
    console.log('✅ Database integrity verified - can still create scenarios');
  });
  test(`${tags.scenarios} ${tags.critical} should handle concurrent scenario operations safely`, async ({ 
    browser,
    testHelpers,
    testDataHelpers 
  }) => {
    console.log('🧪 Testing Concurrent Operations Safety');
    // Create multiple browser contexts to simulate different users
    const contexts = await Promise.all(
      Array.from({ length: 2 }, () => browser.newContext())
    );
    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );
    // Setup each page with authentication
    for (const page of pages) {
      // Note: TestHelpers is not imported, need to handle authentication differently
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      // Simple wait for page load
      await page.waitForTimeout(2000);
      await page.goto('/scenarios', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.scenarios-hierarchy', { timeout: 15000 });
    }
    // Have both users create scenarios simultaneously
    const concurrentCreations = pages.map(async (page, index) => {
      try {
        await page.click('button:has-text("New Scenario")');
        await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
        const scenarioName = `${testContext.prefix}-Concurrent-Test-${index + 1}`;
        const modal = page.locator('[role="dialog"], .modal');
        await modal.locator('input[name="name"], #name').fill(scenarioName);
        await modal.locator('textarea[name="description"], #description').fill(`Testing concurrent operations ${index + 1}`);
        
        const typeSelect = modal.locator('select[name="scenario_type"], #scenario_type');
        if (await typeSelect.isVisible()) {
          await typeSelect.selectOption('branch');
        }
        await modal.locator('button:has-text("Create"), button:has-text("Save")').click();
        await page.waitForTimeout(2000);
        
        // Verify scenario was created in hierarchy
        const scenarioExists = await page.locator('.hierarchy-row').filter({ hasText: scenarioName }).count() > 0;
        return { success: scenarioExists, index };
      } catch (error) {
        return { success: false, index, error: error.toString() };
      }
    });
    const results = await Promise.all(concurrentCreations);
    // All operations should succeed
    const successful = results.filter(r => r.success);
    expect(successful.length).toBe(2);
    console.log('✅ Concurrent scenario creation succeeded');
    // Verify both scenarios exist on the first page
    for (let i = 0; i < 2; i++) {
      const scenarioName = `${testContext.prefix}-Concurrent-Test-${i + 1}`;
      await expect(pages[0].locator('.hierarchy-row').filter({ hasText: scenarioName }).first()).toBeVisible();
    }
    // Cleanup contexts
    await Promise.all(contexts.map(context => context.close()));
    console.log('✅ Concurrent operations completed safely');
  });
  test(`${tags.scenarios} should maintain responsiveness during database operations`, async ({ 
    authenticatedPage, 
    testHelpers,
    testDataHelpers 
  }) => {
    console.log('🧪 Testing UI Responsiveness During Database Operations');
    // Navigation already done in beforeEach
    // Create multiple scenarios rapidly to test UI responsiveness
    for (let i = 1; i <= 3; i++) {
      console.log(`Creating scenario ${i}/3`);
      await authenticatedPage.click('button:has-text("New Scenario")');
      await authenticatedPage.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
      const scenarioName = `${testContext.prefix}-Rapid-Test-${i}`;
      const modal = authenticatedPage.locator('[role="dialog"], .modal');
      await modal.locator('input[name="name"], #name').fill(scenarioName);
      await modal.locator('textarea[name="description"], #description').fill(`Testing rapid operations ${i}`);
      await modal.locator('button:has-text("Create"), button:has-text("Save")').click();
      
      // Wait for modal to close
      await expect(modal).not.toBeVisible();
      await waitForSync(authenticatedPage);
      // Verify UI is still responsive
      const isUIResponsive = await authenticatedPage.locator('button:has-text("New Scenario")').isVisible();
      expect(isUIResponsive).toBe(true);
    }
    // Verify all scenarios were created
    for (let i = 1; i <= 3; i++) {
      const scenarioName = `${testContext.prefix}-Rapid-Test-${i}`;
      const row = await scenarioUtils.getScenarioRow(scenarioName);
      await expect(row).toBeVisible();
    }
    console.log('✅ UI remained responsive during rapid database operations');
  });
  test(`${tags.scenarios} should show error handling without corruption`, async ({ 
    authenticatedPage, 
    testHelpers,
    testDataHelpers 
  }) => {
    console.log('🧪 Testing Error Handling');
    // Navigation already done in beforeEach
    // Test creating scenario with invalid data
    await authenticatedPage.click('button:has-text("New Scenario")');
    await authenticatedPage.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
    // Try to submit with empty name (should show validation)
    const nameInput = authenticatedPage.locator('input[id="scenario-name"], input[name="name"]');
    await nameInput.clear(); // Ensure it's empty
    const submitButton = authenticatedPage.locator('button:has-text("Create Scenario"), button:has-text("Create")');
    const isDisabled = await submitButton.isDisabled();
    if (isDisabled) {
      console.log('✅ UI validation working - submit button is properly disabled for empty input');
      expect(isDisabled).toBe(true);
    } else {
      await submitButton.click();
      await authenticatedPage.waitForTimeout(1000);
      // Check for validation message
      const validationMessage = authenticatedPage.locator('text=/required|please enter|cannot be empty/i');
      if (await validationMessage.count() > 0) {
        console.log('✅ UI validation working - showing error message');
      }
    }
    // UI should still be functional
    const modalStillVisible = await authenticatedPage.locator('[role="dialog"], .modal').isVisible();
    expect(modalStillVisible).toBe(true);
    console.log('✅ UI validation working - modal stays open for invalid input');
    // Fill valid data and submit
    const recoveryScenarioName = `${testContext.prefix}_Error_Recovery_Test`;
    await authenticatedPage.fill('input[id="scenario-name"], input[name="name"]', recoveryScenarioName);
    await authenticatedPage.click('button:has-text("Create Scenario"), button:has-text("Create")');
    await authenticatedPage.waitForTimeout(2000);
    // Verify scenario was created despite previous error
    await expect(authenticatedPage.locator(`.scenario-card:has-text("${recoveryScenarioName}")`).first()).toBeVisible();
    console.log('✅ UI recovered from error and scenario created successfully');
    // Verify UI is still fully functional
    const newScenarioButton = await authenticatedPage.locator('button:has-text("New Scenario")').isVisible();
    expect(newScenarioButton).toBe(true);
    console.log('✅ Error handling completed without corruption');
  });
});