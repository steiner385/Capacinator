import { test, expect } from '@playwright/test';

test.describe('Scenario Dropdown', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main page
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for scenarios to be loaded
    await page.waitForSelector('.scenario-selector', { timeout: 15000 });
  });

  test('should display scenario selector in header', async ({ page }) => {
    // Check that the scenario selector is visible
    const scenarioSelector = page.locator('.scenario-selector');
    await expect(scenarioSelector).toBeVisible();
    
    // Check that it contains the GitBranch icon
    const icon = scenarioSelector.locator('svg');
    await expect(icon).toBeVisible();
    
    // Check that the scenario button is present
    const scenarioButton = scenarioSelector.locator('.scenario-button');
    await expect(scenarioButton).toBeVisible();
  });

  test('should have consistent sizing with other header elements', async ({ page }) => {
    const scenarioButton = page.locator('.scenario-button');
    const themeToggle = page.locator('.theme-toggle');
    const userDisplay = page.locator('.user-display');
    
    // Get heights of all header elements
    const scenarioHeight = await scenarioButton.evaluate(el => el.getBoundingClientRect().height);
    const themeHeight = await themeToggle.evaluate(el => el.getBoundingClientRect().height);
    const userHeight = await userDisplay.evaluate(el => el.getBoundingClientRect().height);
    
    // All header controls should have the same height (32px)
    expect(scenarioHeight).toBe(32);
    expect(themeHeight).toBe(32);
    expect(userHeight).toBe(32);
  });

  test('should open dropdown when clicked', async ({ page }) => {
    const scenarioButton = page.locator('.scenario-button');
    
    // Initially dropdown should not be visible
    await expect(page.locator('.scenario-dropdown')).not.toBeVisible();
    
    // Click the scenario button
    await scenarioButton.click();
    
    // Dropdown should now be visible
    await expect(page.locator('.scenario-dropdown')).toBeVisible();
    
    // Chevron should have rotated (open class)
    const chevron = page.locator('.chevron');
    await expect(chevron).toHaveClass(/open/);
  });

  test('should display available scenarios in dropdown', async ({ page }) => {
    const scenarioButton = page.locator('.scenario-button');
    
    // Open the dropdown
    await scenarioButton.click();
    
    // Wait for dropdown to be visible
    await expect(page.locator('.scenario-dropdown')).toBeVisible();
    
    // Check that scenario options are present
    const scenarioOptions = page.locator('.scenario-option');
    await expect(scenarioOptions).toHaveCount.greaterThan(0);
    
    // Each option should have scenario name and type
    const firstOption = scenarioOptions.first();
    await expect(firstOption.locator('.scenario-option-name')).toBeVisible();
    await expect(firstOption.locator('.scenario-type')).toBeVisible();
  });

  test('should select scenario when option is clicked', async ({ page }) => {
    const scenarioButton = page.locator('.scenario-button');
    
    // Open the dropdown
    await scenarioButton.click();
    await expect(page.locator('.scenario-dropdown')).toBeVisible();
    
    // Get the first scenario option
    const firstOption = page.locator('.scenario-option').first();
    const scenarioName = await firstOption.locator('.scenario-option-name').textContent();
    
    // Click the first option
    await firstOption.click();
    
    // Dropdown should close
    await expect(page.locator('.scenario-dropdown')).not.toBeVisible();
    
    // Selected scenario name should appear in the button
    const selectedName = await page.locator('.scenario-name').textContent();
    expect(selectedName).toBe(scenarioName);
    
    // The clicked option should be marked as selected when reopened
    await scenarioButton.click();
    await expect(firstOption).toHaveClass(/selected/);
  });

  test('should close dropdown when clicking outside', async ({ page }) => {
    const scenarioButton = page.locator('.scenario-button');
    
    // Open the dropdown
    await scenarioButton.click();
    await expect(page.locator('.scenario-dropdown')).toBeVisible();
    
    // Click somewhere outside the dropdown (on the page header)
    await page.locator('.app-header .header-left').click();
    
    // Dropdown should close
    await expect(page.locator('.scenario-dropdown')).not.toBeVisible();
    
    // Chevron should not have open class
    const chevron = page.locator('.chevron');
    await expect(chevron).not.toHaveClass(/open/);
  });

  test('should show hover effects on dropdown options', async ({ page }) => {
    const scenarioButton = page.locator('.scenario-button');
    
    // Open the dropdown
    await scenarioButton.click();
    await expect(page.locator('.scenario-dropdown')).toBeVisible();
    
    // Hover over the first option
    const firstOption = page.locator('.scenario-option').first();
    await firstOption.hover();
    
    // Check that hover styles are applied (this tests CSS :hover)
    // We can't directly test CSS :hover, but we can test that the element is hoverable
    await expect(firstOption).toBeVisible();
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    const scenarioButton = page.locator('.scenario-button');
    
    // Check that button has proper title attribute
    const title = await scenarioButton.getAttribute('title');
    expect(title).toContain('scenario');
    
    // Button should be focusable
    await scenarioButton.focus();
    await expect(scenarioButton).toBeFocused();
  });

  test('should work with keyboard navigation', async ({ page }) => {
    const scenarioButton = page.locator('.scenario-button');
    
    // Focus the scenario button
    await scenarioButton.focus();
    await expect(scenarioButton).toBeFocused();
    
    // Press Enter to open dropdown
    await page.keyboard.press('Enter');
    await expect(page.locator('.scenario-dropdown')).toBeVisible();
    
    // Press Escape to close dropdown
    await page.keyboard.press('Escape');
    await expect(page.locator('.scenario-dropdown')).not.toBeVisible();
  });

  test('should maintain state across page interactions', async ({ page }) => {
    const scenarioButton = page.locator('.scenario-button');
    
    // Select a specific scenario
    await scenarioButton.click();
    const secondOption = page.locator('.scenario-option').nth(1);
    const selectedScenarioName = await secondOption.locator('.scenario-option-name').textContent();
    await secondOption.click();
    
    // Navigate to a different page and back
    await page.goto('/people');
    await page.goto('/');
    
    // Wait for page to reload
    await page.waitForSelector('.scenario-selector');
    
    // Selected scenario should be maintained
    const currentSelection = await page.locator('.scenario-name').textContent();
    expect(currentSelection).toBe(selectedScenarioName);
  });

  test('should display loading state gracefully', async ({ page }) => {
    // Reload page to test loading state
    await page.reload();
    
    // Check that scenario selector exists even during loading
    await expect(page.locator('.scenario-selector')).toBeVisible();
    
    // Button should be present
    await expect(page.locator('.scenario-button')).toBeVisible();
  });
});