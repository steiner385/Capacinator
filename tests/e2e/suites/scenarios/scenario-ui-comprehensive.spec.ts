import { test, expect } from '@playwright/test';

test.describe('Scenario UI Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Handle profile selection modal if it appears
    const profileModal = await page.locator('[role="dialog"]:has-text("Select Your Profile")').isVisible().catch(() => false);
    if (profileModal) {
      // Select is already filled from global setup, just click Continue
      await page.click('button:has-text("Continue")');
      await page.waitForTimeout(1000);
    }
  });

  test('should navigate to scenarios page and see list', async ({ page }) => {
    // Click on Scenarios in the navigation
    await page.click('a[href="/scenarios"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for React to render
    
    // Check we're on the scenarios page
    await expect(page.locator('h1:has-text("Scenario Planning")')).toBeVisible();
    
    // Should see the hierarchy structure
    await expect(page.locator('.scenarios-hierarchy')).toBeVisible();
    
    // Should see baseline scenario - look for text in the row
    await expect(page.locator('.hierarchy-row:has-text("Current State Baseline")')).toBeVisible();
  });

  test('should create a new scenario branch', async ({ page }) => {
    // Navigate to scenarios page
    await page.goto('/scenarios');
    await page.waitForLoadState('networkidle');
    
    // Click New Scenario button
    await page.click('button:has-text("New Scenario")');
    
    // Fill in the create scenario form
    await page.fill('input[name="name"]', 'Test Branch Scenario');
    await page.fill('textarea[name="description"]', 'This is a test branch scenario created by E2E tests');
    
    // Submit the form
    await page.click('button:has-text("Create Scenario")');
    
    // Wait for modal to close and list to update
    await page.waitForTimeout(1000);
    
    // Verify the new scenario appears in the list
    await expect(page.locator('.hierarchy-row:has-text("Test Branch Scenario")')).toBeVisible();
  });

  test('should switch scenarios using header dropdown', async ({ page }) => {
    // Get initial scenario from localStorage
    const initialScenario = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('currentScenario') || '{}');
    });
    
    // Click on scenario selector in header
    await page.click('.scenario-selector button');
    
    // Wait for dropdown to open
    await expect(page.locator('.scenario-dropdown')).toBeVisible();
    
    // Check that baseline scenario is in the list
    await expect(page.locator('.scenario-option:has-text("Current State Baseline")')).toBeVisible();
    
    // If there are other scenarios, try to select one
    const scenarioOptions = await page.locator('.scenario-option').count();
    if (scenarioOptions > 1) {
      // Click on a different scenario
      await page.locator('.scenario-option').nth(1).click();
      
      // Wait for dropdown to close
      await page.waitForTimeout(500);
      
      // Verify scenario changed in localStorage
      const newScenario = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('currentScenario') || '{}');
      });
      
      expect(newScenario.id).not.toBe(initialScenario.id);
    }
  });

  test('should show scenario actions in list view', async ({ page }) => {
    // Navigate to scenarios page
    await page.goto('/scenarios');
    await page.waitForLoadState('networkidle');
    
    // Find a scenario row
    const scenarioRow = page.locator('.hierarchy-row').first();
    
    // Check action buttons are present
    await expect(scenarioRow.locator('.action-button.branch')).toBeVisible();
    await expect(scenarioRow.locator('.action-button.compare')).toBeVisible();
    await expect(scenarioRow.locator('.action-button.edit')).toBeVisible();
    
    // Baseline scenario should not have delete button
    const baselineRow = page.locator('.hierarchy-row:has(.scenario-type.baseline)').first();
    const deleteButton = baselineRow.locator('.action-button.delete');
    await expect(deleteButton).not.toBeVisible();
  });

  test('should open edit modal when clicking edit', async ({ page }) => {
    // Navigate to scenarios page
    await page.goto('/scenarios');
    await page.waitForLoadState('networkidle');
    
    // Click edit on first scenario
    await page.locator('.action-button.edit').first().click();
    
    // Check edit modal is open
    await expect(page.locator('.modal-content:has-text("Edit Scenario")')).toBeVisible();
    
    // Close modal
    await page.click('.modal-close');
    await expect(page.locator('.modal-content')).not.toBeVisible();
  });

  test('should filter scenarios by search', async ({ page }) => {
    // Navigate to scenarios page
    await page.goto('/scenarios');
    await page.waitForLoadState('networkidle');
    
    // Type in search box
    await page.fill('input[placeholder="Search scenarios..."]', 'Baseline');
    
    // Should only show scenarios matching search
    const visibleScenarios = await page.locator('.hierarchy-row:visible').count();
    const baselineScenarios = await page.locator('.hierarchy-row:visible:has-text("Baseline")').count();
    
    expect(baselineScenarios).toBeGreaterThan(0);
    expect(baselineScenarios).toBe(visibleScenarios);
  });

  test('should show scenario type and status badges', async ({ page }) => {
    // Navigate to scenarios page
    await page.goto('/scenarios');
    await page.waitForLoadState('networkidle');
    
    // Check for type badges
    await expect(page.locator('.scenario-type.baseline').first()).toBeVisible();
    
    // Check for status badges
    await expect(page.locator('.scenario-status.active').first()).toBeVisible();
  });

  test('should open compare modal when clicking compare', async ({ page }) => {
    // Navigate to scenarios page
    await page.goto('/scenarios');
    await page.waitForLoadState('networkidle');
    
    // Click compare on first scenario
    await page.locator('.action-button.compare').first().click();
    
    // Check compare modal is open
    await expect(page.locator('.modal-content:has-text("Compare Scenarios")')).toBeVisible();
    
    // Should have a dropdown to select comparison target
    await expect(page.locator('select.scenario-select')).toBeVisible();
    
    // Close modal
    await page.click('.modal-close');
    await expect(page.locator('.modal-content')).not.toBeVisible();
  });

  test('should create branch from existing scenario', async ({ page }) => {
    // Navigate to scenarios page
    await page.goto('/scenarios');
    await page.waitForLoadState('networkidle');
    
    // Click branch on baseline scenario
    await page.locator('.hierarchy-row:has(.scenario-type.baseline) .action-button.branch').first().click();
    
    // Check create modal is open with parent scenario pre-selected
    await expect(page.locator('.modal-content:has-text("Create Scenario")')).toBeVisible();
    await expect(page.locator('.parent-scenario-info')).toBeVisible();
    
    // Fill in branch details
    await page.fill('input[name="name"]', 'Test Sub-Branch');
    await page.fill('textarea[name="description"]', 'Branch created from baseline');
    
    // Submit
    await page.click('button:has-text("Create Scenario")');
    
    // Wait for creation
    await page.waitForTimeout(1000);
    
    // Verify new branch appears
    await expect(page.locator('.hierarchy-row:has-text("Test Sub-Branch")')).toBeVisible();
  });

  test('should show hierarchical tree structure for scenarios', async ({ page }) => {
    // Navigate to scenarios page
    await page.goto('/scenarios');
    await page.waitForLoadState('networkidle');
    
    // Check for hierarchy elements
    await expect(page.locator('.hierarchy-header:has-text("Scenario Hierarchy")')).toBeVisible();
    await expect(page.locator('.hierarchy-legend')).toBeVisible();
    
    // Check column headers
    await expect(page.locator('.column-header.name-column')).toBeVisible();
    await expect(page.locator('.column-header.type-column')).toBeVisible();
    await expect(page.locator('.column-header.status-column')).toBeVisible();
    await expect(page.locator('.column-header.created-by-column')).toBeVisible();
  });
});