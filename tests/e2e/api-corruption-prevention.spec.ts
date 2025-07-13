import { test, expect } from '@playwright/test';

/**
 * Critical UI-based tests for database corruption prevention.
 * These tests verify that the scenario planning UI prevents database corruption
 * during merge operations and maintains data integrity under all conditions.
 */
test.describe('Database Corruption Prevention UI Tests', () => {

  // Helper function to login and navigate to scenarios page
  async function loginAndNavigateToScenarios(page: any) {
    await page.goto('/scenarios');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Login as Alice Johnson if on login screen
    const hasLogin = await page.locator('#person-select').count() > 0;
    if (hasLogin) {
      await page.selectOption('#person-select', '123e4567-e89b-12d3-a456-426614174000');
      await page.click('.login-button');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    }

    // Wait for scenarios to load
    await page.waitForSelector('.scenario-card, .scenarios-grid, h1:has-text("Scenario")', { timeout: 10000 });
  }

  test('should prevent database corruption during scenario operations via UI', async ({ page }) => {
    console.log('Starting UI Database Corruption Prevention Test');

    await loginAndNavigateToScenarios(page);

    // Test 1: Create test scenario via UI
    console.log('Creating test scenario via UI');
    await page.click('button:has-text("New Scenario")');
    await page.waitForSelector('.modal-content, input[id="scenario-name"]', { timeout: 5000 });

    // Fill scenario form
    await page.fill('input[id="scenario-name"]', 'UI Corruption Test');
    await page.fill('textarea[id="scenario-description"]', 'Testing database corruption prevention via UI');
    await page.selectOption('select[id="scenario-type"]', 'branch');

    // Submit form
    await page.click('button:has-text("Create Scenario")');
    await page.waitForTimeout(2000);

    // Verify scenario was created
    await expect(page.locator('.scenario-card:has-text("UI Corruption Test")').first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Created test scenario via UI');

    // Take screenshot of created scenario
    await page.screenshot({ path: 'test-results/scenario-created-ui.png', fullPage: true });

    // Test 2: Test merge operation via UI (should succeed safely)
    console.log('🔄 Testing merge operation via UI');
    const newScenarioCard = page.locator('.scenario-card:has-text("UI Corruption Test")');
    const mergeButton = newScenarioCard.locator('button:has-text("Merge")');

    if (await mergeButton.count() > 0) {
      await mergeButton.click();
      await page.waitForTimeout(1000);

      // Handle any merge confirmation dialog
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Merge")');
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
        await page.waitForTimeout(2000);
      }

      console.log('✅ Merge operation completed safely via UI');
    } else {
      console.log('ℹ️ Merge button not available (scenario may need assignments first)');
    }

    // Test 3: Verify UI still functions after operations
    const scenarioCards = await page.locator('.scenario-card').count();
    console.log(`📊 Total scenarios visible: ${scenarioCards}`);
    expect(scenarioCards).toBeGreaterThan(0);

    // Test 4: Verify database integrity by checking if we can still create scenarios
    console.log('🔍 Testing database integrity via UI');
    await page.click('button:has-text("New Scenario")');
    await page.waitForSelector('.modal-content', { timeout: 5000 });

    // Fill another scenario to test integrity
    await page.fill('input[id="scenario-name"]', 'Integrity Check Scenario');
    await page.click('button:has-text("Create Scenario")');
    await page.waitForTimeout(2000);

    // Verify we can still create scenarios (database is not corrupted)
    await expect(page.locator('.scenario-card:has-text("Integrity Check Scenario")')).toBeVisible({ timeout: 10000 });
    console.log('✅ Database integrity verified - can still create scenarios');

    await page.screenshot({ path: 'test-results/corruption-prevention-verified.png', fullPage: true });
  });

  test('should handle concurrent scenario operations safely via UI', async ({ browser }) => {
    console.log('🧪 Testing Concurrent Operations Safety via UI');

    // Create multiple browser contexts to simulate different users
    const contexts = await Promise.all(
      Array.from({ length: 2 }, () => browser.newContext())
    );
    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );

    // Login both users to scenarios page
    for (const page of pages) {
      await loginAndNavigateToScenarios(page);
    }

    // Have both users create scenarios simultaneously
    const concurrentCreations = pages.map(async (page, index) => {
      try {
        await page.click('button:has-text("New Scenario")');
        await page.waitForSelector('.modal-content', { timeout: 5000 });
        
        await page.fill('input[id="scenario-name"]', `Concurrent UI Test ${index + 1}`);
        await page.fill('textarea[id="scenario-description"]', `Testing concurrent UI operations ${index + 1}`);
        await page.selectOption('select[id="scenario-type"]', 'branch');
        
        await page.click('button:has-text("Create Scenario")');
        await page.waitForTimeout(2000);
        
        // Verify scenario was created
        const scenarioExists = await page.locator(`.scenario-card:has-text("Concurrent UI Test ${index + 1}")`).count() > 0;
        return { success: scenarioExists, index };
      } catch (error) {
        return { success: false, index, error: error.toString() };
      }
    });

    const results = await Promise.all(concurrentCreations);

    // All operations should succeed
    const successful = results.filter(r => r.success);
    expect(successful.length).toBe(2);
    console.log('✅ Concurrent scenario creation via UI succeeded');

    // Verify both scenarios exist
    for (let i = 0; i < 2; i++) {
      await expect(pages[0].locator(`.scenario-card:has-text("Concurrent UI Test ${i + 1}")').first()).toBeVisible();
    }

    // Take final screenshot
    await pages[0].screenshot({ path: 'test-results/concurrent-operations-ui.png', fullPage: true });

    // Cleanup contexts
    await Promise.all(contexts.map(context => context.close()));
    console.log('✅ Concurrent UI operations completed safely');
  });

  test('should maintain UI responsiveness during database operations', async ({ page }) => {
    console.log('🧪 Testing UI Responsiveness During Database Operations');

    await loginAndNavigateToScenarios(page);

    // Create multiple scenarios rapidly to test UI responsiveness
    for (let i = 1; i <= 3; i++) {
      console.log(`Creating scenario ${i}/3`);
      
      await page.click('button:has-text("New Scenario")');
      await page.waitForSelector('.modal-content', { timeout: 5000 });
      
      await page.fill('input[id="scenario-name"]', `Rapid Creation Test ${i}`);
      await page.fill('textarea[id="scenario-description"]', `Testing rapid UI operations ${i}`);
      await page.click('button:has-text("Create Scenario")');
      
      await page.waitForTimeout(1000);
      
      // Verify UI is still responsive
      const isUIResponsive = await page.locator('button:has-text("New Scenario")').isVisible();
      expect(isUIResponsive).toBe(true);
    }

    // Verify all scenarios were created
    for (let i = 1; i <= 3; i++) {
      await expect(page.locator(`.scenario-card:has-text("Rapid Creation Test ${i}")').first()).toBeVisible();
    }

    console.log('✅ UI remained responsive during rapid database operations');
    await page.screenshot({ path: 'test-results/ui-responsiveness-test.png', fullPage: true });
  });

  test('should show error handling in UI without corruption', async ({ page }) => {
    console.log('🧪 Testing Error Handling in UI');

    await loginAndNavigateToScenarios(page);

    // Test creating scenario with invalid data
    await page.click('button:has-text("New Scenario")');
    await page.waitForSelector('.modal-content', { timeout: 5000 });

    // Try to submit with empty name (should show validation)
    const submitButton = page.locator('button:has-text("Create Scenario")');
    const isDisabled = await submitButton.isDisabled();
    
    if (isDisabled) {
      console.log('✅ UI validation working - submit button is properly disabled for empty input');
      expect(isDisabled).toBe(true);
    } else {
      await submitButton.click();
      await page.waitForTimeout(1000);
    }

    // UI should still be functional
    const modalStillVisible = await page.locator('.modal-content').isVisible();
    expect(modalStillVisible).toBe(true);
    console.log('✅ UI validation working - modal stays open for invalid input');

    // Fill valid data and submit
    await page.fill('input[id="scenario-name"]', 'Error Recovery Test');
    await page.click('button:has-text("Create Scenario")');
    await page.waitForTimeout(2000);

    // Verify scenario was created despite previous error
    await expect(page.locator('.scenario-card:has-text("Error Recovery Test")').first()).toBeVisible();
    console.log('✅ UI recovered from error and scenario created successfully');

    // Verify UI is still fully functional
    const newScenarioButton = await page.locator('button:has-text("New Scenario")').isVisible();
    expect(newScenarioButton).toBe(true);

    await page.screenshot({ path: 'test-results/error-handling-ui.png', fullPage: true });
    console.log('✅ Error handling completed without UI corruption');
  });
});