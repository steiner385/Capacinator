import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { navigateToPage } from '../../helpers/navigation';

test.describe('Scenario Comparison', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToPage(page, 'Scenarios');
  });

  test('should show updated modal title when comparing scenarios', async ({ page }) => {
    // Wait for scenarios to load
    await page.waitForSelector('.scenario-card', { timeout: 10000 });
    
    // Get first two scenario names
    const scenario1Name = await page.locator('.scenario-card').first().locator('h3').textContent();
    const scenario2Name = await page.locator('.scenario-card').nth(1).locator('h3').textContent();
    
    // Click compare on first scenario
    await page.locator('.scenario-card').first().locator('button:has-text("Compare")').click();
    
    // Wait for modal to open
    await page.waitForSelector('.scenario-comparison-modal', { state: 'visible' });
    
    // Check initial modal title
    const initialTitle = await page.locator('.scenario-comparison-modal h2').textContent();
    expect(initialTitle).toBe('Compare Scenarios');
    
    // Select target scenario
    await page.locator('.scenario-comparison-modal select').selectOption({ index: 1 });
    
    // Click compare button
    await page.locator('.scenario-comparison-modal button:has-text("Compare Scenarios")').click();
    
    // Wait for comparison to complete
    await page.waitForSelector('.scenario-comparison-modal [role="tablist"]', { timeout: 10000 });
    
    // Check updated modal title
    const updatedTitle = await page.locator('.scenario-comparison-modal h2').textContent();
    expect(updatedTitle).toContain('Comparing:');
    expect(updatedTitle).toContain(scenario1Name);
    expect(updatedTitle).toContain(scenario2Name);
  });

  test('should show differences between scenarios', async ({ page }) => {
    // Click compare on "Current State Baseline"
    await page.locator('.scenario-card:has-text("Current State Baseline")').locator('button:has-text("Compare")').click();
    
    // Wait for modal
    await page.waitForSelector('.scenario-comparison-modal', { state: 'visible' });
    
    // Select "High Velocity Branch" as target
    await page.locator('.scenario-comparison-modal select').selectOption({ label: /High Velocity Branch/ });
    
    // Run comparison
    await page.locator('.scenario-comparison-modal button:has-text("Compare Scenarios")').click();
    
    // Wait for results
    await page.waitForSelector('.scenario-comparison-modal [role="tablist"]', { timeout: 10000 });
    
    // Check assignments tab is active by default
    await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveText(/Assignments/);
    
    // Check for assignment differences
    const addedCount = await page.locator('.scenario-comparison-modal').locator('text=/Added Assignments/').textContent();
    expect(addedCount).toContain('15'); // Should show 15 added assignments
    
    // Check for actual assignment cards
    await expect(page.locator('.scenario-comparison-modal .card').filter({ hasText: 'Added' })).toHaveCount(15);
    
    // Click on Impact Analysis tab
    await page.locator('[role="tab"]:has-text("Impact Analysis")').click();
    
    // Check metrics are shown
    await expect(page.locator('text=/Total Allocation Change/')).toBeVisible();
    await expect(page.locator('text=/Assignments Added/')).toBeVisible();
    await expect(page.locator('text=/15/')).toBeVisible(); // Should show 15 assignments added
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/scenarios/*/compare*', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Failed to compare scenarios' })
      });
    });
    
    // Click compare
    await page.locator('.scenario-card').first().locator('button:has-text("Compare")').click();
    
    // Select target and run comparison
    await page.locator('.scenario-comparison-modal select').selectOption({ index: 1 });
    await page.locator('.scenario-comparison-modal button:has-text("Compare Scenarios")').click();
    
    // Check error is displayed
    await expect(page.locator('.scenario-comparison-modal .alert-destructive')).toBeVisible();
  });

  test('should close modal and reset state', async ({ page }) => {
    // Open comparison modal
    await page.locator('.scenario-card').first().locator('button:has-text("Compare")').click();
    
    // Close modal
    await page.locator('.scenario-comparison-modal button[aria-label="Close"]').click();
    
    // Check modal is closed
    await expect(page.locator('.scenario-comparison-modal')).not.toBeVisible();
    
    // Open again and verify state is reset
    await page.locator('.scenario-card').first().locator('button:has-text("Compare")').click();
    await expect(page.locator('.scenario-comparison-modal h2')).toHaveText('Compare Scenarios');
  });

  test('should allow switching to new comparison after results', async ({ page }) => {
    // Run initial comparison
    await page.locator('.scenario-card').first().locator('button:has-text("Compare")').click();
    await page.locator('.scenario-comparison-modal select').selectOption({ index: 1 });
    await page.locator('.scenario-comparison-modal button:has-text("Compare Scenarios")').click();
    
    // Wait for results
    await page.waitForSelector('.scenario-comparison-modal [role="tablist"]');
    
    // Click "New Comparison"
    await page.locator('.scenario-comparison-modal button:has-text("New Comparison")').click();
    
    // Should go back to selection view
    await expect(page.locator('.scenario-comparison-modal select')).toBeVisible();
    await expect(page.locator('.scenario-comparison-modal h2')).toHaveText('Compare Scenarios');
  });
});