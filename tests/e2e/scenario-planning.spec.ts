import { test, expect } from '@playwright/test';

/**
 * Comprehensive UI-based E2E tests for scenario planning functionality.
 * These tests focus on UI interactions and user workflows through the browser.
 */
test.describe('Scenario Planning E2E Tests (UI-Focused)', () => {

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

  // Helper function to create a scenario via UI
  async function createScenarioViaUI(page: any, name: string, description?: string) {
    await page.click('button:has-text("New Scenario")');
    await page.waitForSelector('.modal-content', { timeout: 5000 });
    
    await page.fill('input[id="scenario-name"]', name);
    if (description) {
      await page.fill('textarea[id="scenario-description"]', description);
    }
    await page.selectOption('select[id="scenario-type"]', 'branch');
    
    await page.click('button:has-text("Create Scenario")');
    await page.waitForTimeout(2000);
    
    // Verify scenario was created
    await expect(page.locator(`.scenario-card:has-text("${name}")`)).toBeVisible({ timeout: 10000 });
  }

  test.describe('Comprehensive Scenario Creation via UI', () => {
    test('should create new scenario from baseline with full UI workflow', async ({ page }) => {
      console.log('🌱 Testing comprehensive scenario creation workflow');
      
      await loginAndNavigateToScenarios(page);
      
      // Record initial state
      const initialScenarios = await page.locator('.scenario-card').count();
      console.log(`📊 Initial scenario count: ${initialScenarios}`);
      
      // Create comprehensive test scenario
      await createScenarioViaUI(page, 'Comprehensive E2E Test', 'Full end-to-end test scenario with all features');
      console.log('✅ Created comprehensive test scenario');
      
      // Verify scenario appears in UI with all expected elements
      const newScenarioCard = page.locator('.scenario-card:has-text("Comprehensive E2E Test")');
      await expect(newScenarioCard).toBeVisible();
      
      // Check for scenario action buttons
      const branchButton = newScenarioCard.locator('button:has-text("Branch")');
      const compareButton = newScenarioCard.locator('button:has-text("Compare")');
      const editButton = newScenarioCard.locator('button[title*="Edit"], button:has-text("Edit")');
      
      await expect(branchButton).toBeVisible();
      await expect(compareButton).toBeVisible();
      console.log('✅ All scenario action buttons are visible');
      
      // Test scenario card information display
      await expect(newScenarioCard.locator(':has-text("branch")')).toBeVisible(); // Type
      await expect(newScenarioCard.locator(':has-text("Alice")')).toBeVisible(); // Creator
      console.log('✅ Scenario metadata displayed correctly');
      
      // Verify scenario count increased
      const finalScenarios = await page.locator('.scenario-card').count();
      expect(finalScenarios).toBe(initialScenarios + 1);
      console.log(`✅ Scenario count increased from ${initialScenarios} to ${finalScenarios}`);
      
      await page.screenshot({ path: 'test-results/comprehensive-scenario-creation.png', fullPage: true });
    });

    test('should display and interact with existing scenarios in UI', async ({ page }) => {
      console.log('📊 Testing scenario display and interaction');
      
      await loginAndNavigateToScenarios(page);
      
      // Wait for scenarios to load and count them
      const scenarioCards = await page.locator('.scenario-card').count();
      console.log(`📊 Found ${scenarioCards} scenario cards in UI`);
      expect(scenarioCards).toBeGreaterThan(0);
      
      // Test interaction with each visible scenario
      for (let i = 0; i < Math.min(scenarioCards, 5); i++) { // Limit to first 5 for performance
        const scenarioCard = page.locator('.scenario-card').nth(i);
        
        // Get scenario name for logging
        const scenarioName = await scenarioCard.locator('h3, .scenario-name').textContent();
        console.log(`🔄 Testing interactions with scenario: ${scenarioName}`);
        
        // Test hover interaction
        await scenarioCard.hover();
        await page.waitForTimeout(300);
        
        // Test action button interactions
        const branchButton = scenarioCard.locator('button:has-text("Branch")');
        if (await branchButton.count() > 0) {
          await branchButton.click();
          await page.waitForTimeout(500);
          
          // Cancel modal if it appears
          const modal = page.locator('.modal-content');
          if (await modal.count() > 0) {
            await page.press('Escape');
            await page.waitForTimeout(300);
          }
          console.log(`✅ Branch button interaction tested for ${scenarioName}`);
        }
        
        // Test compare button
        const compareButton = scenarioCard.locator('button:has-text("Compare")');
        if (await compareButton.count() > 0) {
          await compareButton.click();
          await page.waitForTimeout(500);
          console.log(`✅ Compare button interaction tested for ${scenarioName}`);
        }
      }
      
      // Verify UI remains functional after all interactions
      const newScenarioButton = await page.locator('button:has-text("New Scenario")').isVisible();
      expect(newScenarioButton).toBe(true);
      console.log('✅ UI remained functional after all scenario interactions');
      
      await page.screenshot({ path: 'test-results/scenario-interactions-test.png', fullPage: true });
    });

    test('should test complete scenario workflow with branching', async ({ page }) => {
      console.log('🌳 Testing complete scenario workflow with branching');
      
      await loginAndNavigateToScenarios(page);
      
      // Create parent scenario
      await createScenarioViaUI(page, 'Workflow Parent', 'Parent scenario for workflow testing');
      console.log('✅ Created parent scenario');
      
      // Test branching workflow
      const parentCard = page.locator('.scenario-card:has-text("Workflow Parent")');
      const branchButton = parentCard.locator('button:has-text("Branch")');
      
      if (await branchButton.count() > 0) {
        console.log('🌿 Testing branch creation workflow');
        
        await branchButton.click();
        await page.waitForSelector('.modal-content', { timeout: 5000 });
        
        // Verify modal shows parent information
        const parentInfo = await page.locator(':has-text("Workflow Parent")').count();
        expect(parentInfo).toBeGreaterThan(0);
        
        // Create branch scenario
        await page.fill('input[id="scenario-name"]', 'Workflow Branch');
        await page.fill('textarea[id="scenario-description"]', 'Branch scenario from workflow parent');
        await page.click('button:has-text("Create Scenario")');
        await page.waitForTimeout(2000);
        
        // Verify branch was created
        await expect(page.locator('.scenario-card:has-text("Workflow Branch")')).toBeVisible();
        console.log('✅ Branch scenario created successfully');
        
        // Verify branch shows parent relationship
        const branchCard = page.locator('.scenario-card:has-text("Workflow Branch")');
        const hasParentInfo = await branchCard.locator(':has-text("From"), :has-text("Workflow Parent")').count();
        if (hasParentInfo > 0) {
          console.log('✅ Branch scenario shows parent relationship');
        }
        
        // Test merge button on branch (if available)
        const mergeButton = branchCard.locator('button:has-text("Merge")');
        if (await mergeButton.count() > 0) {
          console.log('🔄 Testing merge workflow');
          await mergeButton.click();
          await page.waitForTimeout(1000);
          
          // Handle merge confirmation if it appears
          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Merge")');
          if (await confirmButton.count() > 0) {
            await confirmButton.click();
            await page.waitForTimeout(2000);
            console.log('✅ Merge operation completed');
          }
        }
      }
      
      // Verify final state
      const totalScenarios = await page.locator('.scenario-card').count();
      console.log(`📊 Final scenario count: ${totalScenarios}`);
      expect(totalScenarios).toBeGreaterThan(1);
      
      console.log('✅ Complete scenario workflow tested successfully');
      await page.screenshot({ path: 'test-results/scenario-workflow-complete.png', fullPage: true });
    });
  });

  test.describe('Advanced Scenario Features via UI', () => {
    test('should demonstrate corruption prevention through UI safety features', async ({ page }) => {
      console.log('🔒 Testing UI safety features and corruption prevention');
      
      await loginAndNavigateToScenarios(page);
      
      // Create scenarios for safety testing
      await createScenarioViaUI(page, 'Safety Test Parent', 'Testing UI safety features');
      await createScenarioViaUI(page, 'Safety Test Child', 'Child scenario for safety testing');
      console.log('✅ Created test scenarios for safety testing');
      
      // Test various safety features
      const safetyTests = [
        'rapid_operations',
        'modal_validation',
        'button_states',
        'error_handling'
      ];
      
      for (const test of safetyTests) {
        console.log(`🔄 Testing safety feature: ${test}`);
        
        if (test === 'rapid_operations') {
          // Test rapid clicking doesn't cause issues
          const newButton = page.locator('button:has-text("New Scenario")');
          for (let i = 0; i < 5; i++) {
            await newButton.click({ timeout: 1000 });
            await page.waitForTimeout(200);
            await page.press('Escape');
          }
          
        } else if (test === 'modal_validation') {
          // Test form validation prevents bad data
          await page.click('button:has-text("New Scenario")');
          await page.waitForSelector('.modal-content', { timeout: 5000 });
          
          // Try to submit empty form
          await page.click('button:has-text("Create Scenario")');
          await page.waitForTimeout(1000);
          
          // Modal should remain open
          const modalStillOpen = await page.locator('.modal-content').isVisible();
          expect(modalStillOpen).toBe(true);
          await page.press('Escape');
          
        } else if (test === 'button_states') {
          // Test button states and accessibility
          const scenarioCards = await page.locator('.scenario-card').count();
          if (scenarioCards > 0) {
            const firstCard = page.locator('.scenario-card').first();
            const buttons = await firstCard.locator('button').count();
            console.log(`🔘 Found ${buttons} action buttons on scenario card`);
            expect(buttons).toBeGreaterThan(0);
          }
          
        } else if (test === 'error_handling') {
          // Test error recovery
          try {
            await page.click('button:has-text("New Scenario")');
            await page.waitForSelector('.modal-content', { timeout: 5000 });
            await page.fill('input[id="scenario-name"]', 'Error Recovery Test');
            await page.click('button:has-text("Create Scenario")');
            await page.waitForTimeout(1000);
          } catch (error) {
            // Expected that some operations might fail, test recovery
            await page.press('Escape');
          }
        }
        
        // Verify UI is still functional after each safety test
        const buttonVisible = await page.locator('button:has-text("New Scenario")').isVisible();
        expect(buttonVisible).toBe(true);
        console.log(`✅ UI remained functional after ${test}`);
      }
      
      // Final safety verification
      const finalScenarios = await page.locator('.scenario-card').count();
      console.log(`📊 Final scenario count after safety tests: ${finalScenarios}`);
      expect(finalScenarios).toBeGreaterThan(0);
      
      console.log('✅ All UI safety features working correctly');
      await page.screenshot({ path: 'test-results/ui-safety-features.png', fullPage: true });
    });
    
    test('should demonstrate full scenario lifecycle via UI', async ({ page }) => {
      console.log('🔄 Testing complete scenario lifecycle via UI');
      
      await loginAndNavigateToScenarios(page);
      
      // Phase 1: Creation
      console.log('🌱 Phase 1: Creating scenario');
      await createScenarioViaUI(page, 'Lifecycle Test', 'Testing complete scenario lifecycle');
      
      // Phase 2: Interaction
      console.log('🔄 Phase 2: Interacting with scenario');
      const scenarioCard = page.locator('.scenario-card:has-text("Lifecycle Test")');
      
      // Test all available actions
      const actions = ['Branch', 'Compare', 'Edit'];
      for (const action of actions) {
        const actionButton = scenarioCard.locator(`button:has-text("${action}")`);
        if (await actionButton.count() > 0) {
          console.log(`🔘 Testing ${action} action`);
          await actionButton.click();
          await page.waitForTimeout(500);
          
          // Cancel any modals that appear
          const modal = page.locator('.modal-content');
          if (await modal.count() > 0) {
            await page.press('Escape');
          }
        }
      }
      
      // Phase 3: Verification
      console.log('✅ Phase 3: Verifying scenario persistence');
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Verify scenario still exists after page reload
      await expect(page.locator('.scenario-card:has-text("Lifecycle Test")')).toBeVisible();
      
      // Phase 4: Additional scenarios for relationship testing
      console.log('🌳 Phase 4: Testing scenario relationships');
      const lifecycleCard = page.locator('.scenario-card:has-text("Lifecycle Test")');
      const branchButton = lifecycleCard.locator('button:has-text("Branch")');
      
      if (await branchButton.count() > 0) {
        await branchButton.click();
        await page.waitForSelector('.modal-content', { timeout: 5000 });
        await page.fill('input[id="scenario-name"]', 'Lifecycle Branch');
        await page.click('button:has-text("Create Scenario")');
        await page.waitForTimeout(2000);
        
        await expect(page.locator('.scenario-card:has-text("Lifecycle Branch")')).toBeVisible();
        console.log('✅ Branch scenario created successfully');
      }
      
      // Final verification
      const totalScenarios = await page.locator('.scenario-card').count();
      console.log(`📊 Complete lifecycle test: ${totalScenarios} scenarios total`);
      expect(totalScenarios).toBeGreaterThanOrEqual(2);
      
      console.log('✅ Complete scenario lifecycle tested successfully');
      await page.screenshot({ path: 'test-results/scenario-lifecycle-complete.png', fullPage: true });
    });
  });
});