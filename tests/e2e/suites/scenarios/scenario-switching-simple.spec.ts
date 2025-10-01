/**
 * Simple Scenario Switching Test
 * Verifies that the scenario dropdown works and data refreshes
 */
import { test, expect } from '../../fixtures';

test.describe('Scenario Switching', () => {
  test('should switch scenarios and refresh data', async ({ authenticatedPage, testHelpers }) => {
    // Navigate to dashboard
    await testHelpers.navigateTo('/dashboard');
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Wait for initial data to load
    await authenticatedPage.waitForSelector('.stat-card, [data-testid="dashboard-loaded"]');
    
    // Get the current scenario name
    const initialScenario = await authenticatedPage.locator('.scenario-name, .scenario-selector-trigger .scenario-details').textContent();
    console.log('Initial scenario:', initialScenario);
    
    // Click on scenario selector
    await authenticatedPage.click('.scenario-selector-trigger');
    await authenticatedPage.waitForSelector('.scenario-selector-dropdown', { state: 'visible' });
    
    // Get available scenarios
    const scenarioOptions = await authenticatedPage.locator('.scenario-option').count();
    console.log('Available scenarios:', scenarioOptions);
    
    // If there are multiple scenarios, switch to a different one
    if (scenarioOptions > 1) {
      // Click on a different scenario (not the currently selected one)
      await authenticatedPage.click('.scenario-option:not(.selected)').first();
      
      // Wait for the dropdown to close
      await authenticatedPage.waitForSelector('.scenario-selector-dropdown', { state: 'hidden' });
      
      // Wait for data to refresh
      await authenticatedPage.waitForLoadState('networkidle');
      
      // Verify scenario has changed
      const newScenario = await authenticatedPage.locator('.scenario-name, .scenario-selector-trigger .scenario-details').textContent();
      console.log('New scenario:', newScenario);
      
      expect(newScenario).not.toBe(initialScenario);
    } else {
      console.log('Only one scenario available, skipping switch test');
    }
  });
  
  test('should persist scenario across navigation', async ({ authenticatedPage, testHelpers }) => {
    // Navigate to projects page
    await testHelpers.navigateTo('/projects');
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Get current scenario
    const projectsScenario = await authenticatedPage.locator('.scenario-name, .scenario-selector-trigger .scenario-details').textContent();
    
    // Navigate to assignments
    await testHelpers.navigateTo('/assignments');
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Get scenario on assignments page
    const assignmentsScenario = await authenticatedPage.locator('.scenario-name, .scenario-selector-trigger .scenario-details').textContent();
    
    // Should be the same scenario
    expect(assignmentsScenario).toBe(projectsScenario);
  });
});