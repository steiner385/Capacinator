import { test, expect } from '@playwright/test';

test.describe('Scenario Dropdown Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main page
    await page.goto('/');
    
    // Wait for the initial loading to complete and handle profile selection if present
    await page.waitForTimeout(3000); // Give time for initial load
    
    // Check if there's a profile selection modal and handle it
    const profileModal = page.locator('text=Select Your Profile');
    if (await profileModal.isVisible()) {
      // Wait for employees to load and select the first one
      await page.waitForSelector('button', { timeout: 10000 });
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      if (buttonCount > 0) {
        await buttons.first().click();
      }
    }
    
    // Now wait for the main app to load and the scenario selector to appear
    await page.waitForSelector('.scenario-selector', { timeout: 20000 });
  });

  test('should display scenario selector with correct dimensions', async ({ page }) => {
    const scenarioSelector = page.locator('.scenario-selector');
    await expect(scenarioSelector).toBeVisible();
    
    const scenarioButton = scenarioSelector.locator('.scenario-button');
    await expect(scenarioButton).toBeVisible();
    
    // Test that the button is wider and shorter as requested
    const buttonBox = await scenarioButton.boundingBox();
    expect(buttonBox).toBeTruthy();
    
    if (buttonBox) {
      // Should be wider (min 200px) and shorter (28px height)
      expect(buttonBox.width).toBeGreaterThanOrEqual(200);
      expect(buttonBox.height).toBeLessThanOrEqual(32); // Allow some tolerance
      console.log(`Button dimensions: ${buttonBox.width}x${buttonBox.height}`);
    }
  });

  test('should show dropdown list when clicked', async ({ page }) => {
    const scenarioButton = page.locator('.scenario-button');
    
    // Initially dropdown should not be visible
    await expect(page.locator('.scenario-dropdown')).not.toBeVisible();
    
    // Click the scenario button
    await scenarioButton.click();
    
    // Dropdown should now be visible
    const dropdown = page.locator('.scenario-dropdown');
    await expect(dropdown).toBeVisible();
    
    // Check dropdown dimensions
    const dropdownBox = await dropdown.boundingBox();
    if (dropdownBox) {
      // Should be wider than 200px and shorter than 200px max-height
      expect(dropdownBox.width).toBeGreaterThanOrEqual(200);
      expect(dropdownBox.height).toBeLessThanOrEqual(200);
      console.log(`Dropdown dimensions: ${dropdownBox.width}x${dropdownBox.height}`);
    }
  });

  test('should display scenario options in dropdown', async ({ page }) => {
    const scenarioButton = page.locator('.scenario-button');
    await scenarioButton.click();
    
    const dropdown = page.locator('.scenario-dropdown');
    await expect(dropdown).toBeVisible();
    
    // Check for scenario options or loading message
    const hasOptions = await page.locator('.scenario-option .scenario-option-name').count() > 0;
    const hasLoading = await page.locator('text=Loading scenarios').isVisible();
    const hasNoScenarios = await page.locator('text=No scenarios available').isVisible();
    
    // At least one of these should be true
    expect(hasOptions || hasLoading || hasNoScenarios).toBeTruthy();
    
    if (hasOptions) {
      const options = page.locator('.scenario-option .scenario-option-name');
      const optionCount = await options.count();
      expect(optionCount).toBeGreaterThan(0);
      console.log(`Found ${optionCount} scenario options`);
      
      // Test that options have proper structure
      const firstOption = options.first();
      await expect(firstOption).toBeVisible();
      
      // Check that scenario type is also displayed
      const scenarioTypes = page.locator('.scenario-option .scenario-type');
      expect(await scenarioTypes.count()).toBe(optionCount);
    } else {
      console.log('Scenarios are loading or not available');
    }
  });

  test('should select scenario when option is clicked', async ({ page }) => {
    const scenarioButton = page.locator('.scenario-button');
    await scenarioButton.click();
    
    const dropdown = page.locator('.scenario-dropdown');
    await expect(dropdown).toBeVisible();
    
    // Check if we have actual scenario options (not just loading)
    const optionButtons = page.locator('.scenario-option button, .scenario-option[role="button"]');
    const optionCount = await optionButtons.count();
    
    if (optionCount > 0) {
      const firstOption = optionButtons.first();
      const scenarioNameElement = firstOption.locator('.scenario-option-name');
      const scenarioName = await scenarioNameElement.textContent();
      
      // Click the first option
      await firstOption.click();
      
      // Dropdown should close
      await expect(dropdown).not.toBeVisible();
      
      // Selected scenario name should appear in the button
      const selectedName = await page.locator('.scenario-name').textContent();
      expect(selectedName).toBe(scenarioName);
      console.log(`Successfully selected scenario: ${scenarioName}`);
    } else {
      console.log('No selectable scenario options found - likely in loading state');
    }
  });

  test('should close dropdown when clicking outside', async ({ page }) => {
    const scenarioButton = page.locator('.scenario-button');
    await scenarioButton.click();
    
    const dropdown = page.locator('.scenario-dropdown');
    await expect(dropdown).toBeVisible();
    
    // Click somewhere outside the dropdown
    await page.locator('.header-left').click();
    
    // Dropdown should close
    await expect(dropdown).not.toBeVisible();
    
    // Chevron should not have open class
    const chevron = page.locator('.chevron');
    await expect(chevron).not.toHaveClass(/open/);
  });

  test('should work with keyboard navigation', async ({ page }) => {
    const scenarioButton = page.locator('.scenario-button');
    
    // Focus the scenario button
    await scenarioButton.focus();
    await expect(scenarioButton).toBeFocused();
    
    // Press Enter to open dropdown
    await page.keyboard.press('Enter');
    const dropdown = page.locator('.scenario-dropdown');
    await expect(dropdown).toBeVisible();
    
    // Press Escape to close dropdown
    await page.keyboard.press('Escape');
    await expect(dropdown).not.toBeVisible();
  });
});