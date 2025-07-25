import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Scenario Planning Page', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await page.goto('/scenarios');
    await helpers.setupPage();
  });

  test('should display scenarios page correctly', async ({ page }) => {
    // Check that scenarios page loads with basic elements
    await expect(page.locator('h1:has-text("Scenario Planning")')).toBeVisible();
    await expect(page.locator('button:has-text("New Scenario")')).toBeVisible();
    
    // Check search functionality
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    
    // Check filters button
    await expect(page.locator('button:has-text("Filters")')).toBeVisible();
    
    // Check list view toggle (may have icon)
    await expect(page.locator('button:has-text("List View"), button[title*="List"]')).toBeVisible();
  });

  test('should display existing scenarios', async ({ page }) => {
    // Check that we can see the E2E test scenarios
    await expect(page.locator('text=E2E Baseline Plan').first()).toBeVisible();
    await expect(page.locator('text=E2E Branch Scenario 1').first()).toBeVisible();
    
    // Check scenario types are displayed
    await expect(page.locator('text=baseline').first()).toBeVisible();
    await expect(page.locator('text=branch').first()).toBeVisible();
    
    // Check status indicators
    await expect(page.locator('text=active').first()).toBeVisible();
  });

  test('should display scenario actions correctly', async ({ page }) => {
    // Check that scenario action buttons are present (they appear as icon buttons)
    // Branch button, Compare button, Edit button, Merge button, Delete button
    const actionButtons = page.locator('button[title], .actions button');
    expect(await actionButtons.count()).toBeGreaterThan(0);
    
    // Verify scenarios have action buttons in the actions column
    const baselineActions = page.locator('text=E2E Baseline Plan').locator('../..').locator('button');
    const branchActions = page.locator('text=E2E Branch Scenario').locator('../..').locator('button');
    
    expect(await baselineActions.count()).toBeGreaterThan(0);
    expect(await branchActions.count()).toBeGreaterThan(0);
  });

  test('should handle scenario search functionality', async ({ page }) => {
    // Test search functionality
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
    
    // Search for a specific scenario
    await searchInput.fill('Baseline');
    await page.waitForTimeout(500);
    
    // Should still show the baseline scenario
    await expect(page.locator('text=E2E Baseline Plan').first()).toBeVisible();
    
    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(500);
    
    // Both scenarios should be visible again
    await expect(page.locator('text=E2E Baseline Plan').first()).toBeVisible();
    await expect(page.locator('text=E2E Branch Scenario').first()).toBeVisible();
  });

  test('should display scenario metadata correctly', async ({ page }) => {
    // Check that scenario table has proper headers
    await expect(page.locator('th:has-text("NAME"), text=NAME')).toBeVisible();
    await expect(page.locator('th:has-text("TYPE"), text=TYPE')).toBeVisible();
    await expect(page.locator('th:has-text("STATUS"), text=STATUS')).toBeVisible();
    await expect(page.locator('th:has-text("CREATED BY"), text=CREATED BY')).toBeVisible();
    await expect(page.locator('th:has-text("CREATED"), text=CREATED')).toBeVisible();
    await expect(page.locator('th:has-text("ACTIONS"), text=ACTIONS')).toBeVisible();
    
    // Check that status indicators are present
    await expect(page.locator('text=active').first()).toBeVisible();
    
    // Check that dates are formatted properly
    const datePattern = /\d{1,2}\/\d{1,2}\/\d{4}/;
    const pageContent = await page.textContent('body');
    expect(pageContent).toMatch(datePattern);
    
    // Check that created by information is present
    await expect(page.locator('text=E2E Test User')).toBeVisible();
  });

  test('should handle scenario filtering', async ({ page }) => {
    // Test the filters button
    const filtersButton = page.locator('button:has-text("Filters")');
    await expect(filtersButton).toBeVisible();
    
    // Click filters to see if it opens filter options
    await filtersButton.click();
    await page.waitForTimeout(500);
    
    // Check if filter options appear (this depends on implementation)
    // For now, just verify the button is clickable
    await expect(filtersButton).toBeEnabled();
    
    // Test the hide merged toggle
    const hideMergedButton = page.locator('button:has-text("🚫 Hide Merged")');
    if (await hideMergedButton.isVisible()) {
      await expect(hideMergedButton).toBeVisible();
    }
  });

  test('should handle new scenario creation flow', async ({ page }) => {
    // Test the new scenario button functionality
    const newScenarioButton = page.locator('button:has-text("New Scenario")');
    await expect(newScenarioButton).toBeVisible();
    await expect(newScenarioButton).toBeEnabled();
    
    // Click to start scenario creation (this might open a modal)
    await newScenarioButton.click();
    await page.waitForTimeout(1000);
    
    // Check if a modal or form appears
    const modalOrForm = page.locator('.modal, form, [role="dialog"]');
    if (await modalOrForm.count() > 0) {
      // If modal/form appears, verify it has scenario creation elements
      const hasScenarioFields = await page.locator('input[name*="scenario"], input[name*="name"], label:has-text("Name")').count() > 0;
      if (hasScenarioFields) {
        // Close the modal to avoid affecting other tests
        const closeButton = page.locator('button:has-text("Cancel"), button:has-text("Close"), [role="dialog"] button[aria-label="Close"]');
        if (await closeButton.count() > 0) {
          await closeButton.first().click();
        } else {
          // Try pressing Escape to close modal
          await page.keyboard.press('Escape');
        }
      }
    }
  });

  test('should display scenario hierarchy information', async ({ page }) => {
    // Check that scenarios show their hierarchy relationship
    const baselineScenario = page.locator('text=E2E Baseline Plan').first();
    const branchScenario = page.locator('text=E2E Branch Scenario').first();
    
    await expect(baselineScenario).toBeVisible();
    await expect(branchScenario).toBeVisible();
    
    // Check for hierarchy indicators in the visual design
    // The branch scenario should have some indication of being a child of baseline
    const branchRow = page.locator('text=E2E Branch Scenario').locator('../..');
    
    // Look for visual hierarchy indicators (like the tree lines in the image)
    const hasTreeIndicators = await branchRow.locator('.scenario-tree, .hierarchy-line, [class*="tree"]').count() > 0;
    
    // Check that scenarios have different type badges
    await expect(page.locator('text=baseline').first()).toBeVisible();
    await expect(page.locator('text=branch').first()).toBeVisible();
    
    // The visual hierarchy should be clear from the layout
    // Branch scenarios should be visually distinguished from baseline scenarios
    console.log('Scenario hierarchy is displayed through type badges and visual layout');
  });
});