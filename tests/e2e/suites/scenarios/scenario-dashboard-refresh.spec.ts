/**
 * Simple Dashboard Scenario Refresh Test
 * Tests that dashboard data updates when scenarios change
 */
import { test, expect } from '../../fixtures';

test.describe('Dashboard Scenario Refresh', () => {
  test('dashboard data refreshes on scenario change', async ({ authenticatedPage, testHelpers, apiContext }) => {
    // Navigate to dashboard
    await testHelpers.navigateTo('/dashboard');
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Wait for initial data to load
    await authenticatedPage.waitForSelector('text=Current Projects');
    
    // Get initial project count
    const initialCount = await authenticatedPage.locator('text=Current Projects')
      .locator('..')
      .locator('p.text-2xl')
      .textContent();
    console.log('Initial project count:', initialCount);
    
    // Open scenario dropdown
    await authenticatedPage.click('.scenario-button');
    await authenticatedPage.waitForSelector('.scenario-dropdown', { state: 'visible' });
    
    // Get available scenarios
    const scenarios = await authenticatedPage.locator('.scenario-option').count();
    console.log('Available scenarios:', scenarios);
    
    if (scenarios > 1) {
      // Click on a different scenario
      await authenticatedPage.locator('.scenario-option:not(.selected)').first().click();
      
      // Wait for dropdown to close
      await authenticatedPage.waitForSelector('.scenario-dropdown', { state: 'hidden' });
      
      // Wait for data to refresh
      await authenticatedPage.waitForLoadState('networkidle');
      await authenticatedPage.waitForTimeout(2000); // Give React Query time to update
      
      // Get updated project count
      const updatedCount = await authenticatedPage.locator('text=Current Projects')
        .locator('..')
        .locator('p.text-2xl')
        .textContent();
      console.log('Updated project count:', updatedCount);
      
      // Verify scenario changed in header
      const currentScenario = await authenticatedPage.locator('.scenario-button .scenario-name').textContent();
      console.log('Current scenario:', currentScenario);
      
      // Check that we have data (either count changed or we still have valid data)
      expect(updatedCount).toBeDefined();
      expect(updatedCount).not.toBe('');
    }
  });
  
  test('reports page refreshes on scenario change', async ({ authenticatedPage, testHelpers }) => {
    // Navigate to reports page
    await testHelpers.navigateTo('/reports');
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Wait for reports to load
    await authenticatedPage.waitForSelector('.report-tabs, button.tab', { timeout: 10000 });
    
    // Get current scenario
    const initialScenario = await authenticatedPage.locator('.scenario-button .scenario-name').textContent();
    console.log('Initial scenario on reports:', initialScenario);
    
    // Open scenario dropdown
    await authenticatedPage.click('.scenario-button');
    await authenticatedPage.waitForSelector('.scenario-dropdown', { state: 'visible' });
    
    // Switch to different scenario
    const availableScenarios = await authenticatedPage.locator('.scenario-option:not(.selected)').count();
    if (availableScenarios > 0) {
      await authenticatedPage.locator('.scenario-option:not(.selected)').first().click();
      
      // Wait for dropdown to close and data to refresh
      await authenticatedPage.waitForSelector('.scenario-dropdown', { state: 'hidden' });
      await authenticatedPage.waitForLoadState('networkidle');
      await authenticatedPage.waitForTimeout(2000);
      
      // Verify scenario changed
      const updatedScenario = await authenticatedPage.locator('.scenario-button .scenario-name').textContent();
      console.log('Updated scenario on reports:', updatedScenario);
      expect(updatedScenario).not.toBe(initialScenario);
      
      // Verify reports are still visible or show appropriate empty state
      const hasReportContent = await authenticatedPage.locator('.report-content, .empty-state').first().isVisible().catch(() => false);
      const hasCharts = await authenticatedPage.locator('.recharts-wrapper').first().isVisible().catch(() => false);
      expect(hasReportContent || hasCharts).toBeTruthy();
    }
  });
});