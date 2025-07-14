import { test, expect, Page } from '@playwright/test';
import { generateTestData } from './helpers/test-data-generator';

test.describe('Scenario View Modes', () => {
  let testData: any;

  test.beforeEach(async ({ page }) => {
    // Generate test data including scenarios with relationships
    testData = await generateTestData(page);
    
    // Navigate to scenarios page
    await page.goto('/scenarios');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Structure and Navigation', () => {
    test('should display main page elements', async ({ page }) => {
      // Check page header
      await expect(page.getByRole('heading', { name: 'Scenario Planning' })).toBeVisible();
      await expect(page.getByText('Create and manage resource planning scenarios')).toBeVisible();
      
      // Check New Scenario button
      await expect(page.getByRole('button', { name: 'New Scenario' })).toBeVisible();
      
      // Check view mode toggle buttons
      await expect(page.getByRole('button', { name: 'Cards' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'List' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Graphical' })).toBeVisible();
    });

    test('should load scenarios data', async ({ page }) => {
      // Wait for scenarios to load
      await expect(page.locator('.scenario-card, .hierarchy-row, .commit-row').first()).toBeVisible({ timeout: 10000 });
      
      // Should have at least one scenario
      const scenarioCount = await page.locator('.scenario-card, .hierarchy-row, .commit-row').count();
      expect(scenarioCount).toBeGreaterThan(0);
    });
  });

  test.describe('Cards View', () => {
    test('should display cards view by default', async ({ page }) => {
      // Cards button should be active
      await expect(page.getByRole('button', { name: 'Cards' })).toHaveClass(/btn-primary/);
      await expect(page.getByRole('button', { name: 'List' })).toHaveClass(/btn-secondary/);
      await expect(page.getByRole('button', { name: 'Graphical' })).toHaveClass(/btn-secondary/);
      
      // Should show scenario cards
      await expect(page.locator('.scenario-card').first()).toBeVisible();
    });

    test('should display scenario information correctly', async ({ page }) => {
      const firstCard = page.locator('.scenario-card').first();
      
      // Check card contains essential information
      await expect(firstCard.locator('.scenario-name')).toBeVisible();
      await expect(firstCard.locator('.scenario-type')).toBeVisible();
      await expect(firstCard.locator('.scenario-status')).toBeVisible();
      
      // Check action buttons are present
      await expect(firstCard.getByTitle('Create Branch')).toBeVisible();
      await expect(firstCard.getByTitle('Compare Scenarios')).toBeVisible();
      await expect(firstCard.getByTitle('Edit Scenario')).toBeVisible();
    });

    test('should show appropriate actions for different scenario types', async ({ page }) => {
      // Find baseline scenario (if exists)
      const baselineCard = page.locator('.scenario-card.baseline').first();
      if (await baselineCard.count() > 0) {
        // Baseline scenarios should not have delete button
        await expect(baselineCard.getByTitle('Delete Scenario')).not.toBeVisible();
      }
      
      // Find branch scenario (if exists)
      const branchCard = page.locator('.scenario-card.branch').first();
      if (await branchCard.count() > 0) {
        // Branch scenarios should have delete button
        await expect(branchCard.getByTitle('Delete Scenario')).toBeVisible();
        
        // Active branch scenarios should have merge button
        const isActive = await branchCard.locator('.scenario-status.active').count() > 0;
        if (isActive) {
          await expect(branchCard.getByTitle('Merge to Parent')).toBeVisible();
        }
      }
    });

    test('should handle card interactions', async ({ page }) => {
      const firstCard = page.locator('.scenario-card').first();
      
      // Test branch button
      await firstCard.getByTitle('Create Branch').click();
      // Should trigger some action (currently console.log, but button should be clickable)
      
      // Test compare button
      await firstCard.getByTitle('Compare Scenarios').click();
      // Should trigger some action
      
      // Test edit button
      await firstCard.getByTitle('Edit Scenario').click();
      // Should trigger some action
    });
  });

  test.describe('List View (Hierarchical)', () => {
    test('should switch to list view', async ({ page }) => {
      await page.getByRole('button', { name: 'List' }).click();
      
      // List button should become active
      await expect(page.getByRole('button', { name: 'List' })).toHaveClass(/btn-primary/);
      await expect(page.getByRole('button', { name: 'Cards' })).toHaveClass(/btn-secondary/);
      
      // Should show hierarchy structure
      await expect(page.getByText('Scenario Hierarchy')).toBeVisible();
      await expect(page.locator('.hierarchy-content')).toBeVisible();
    });

    test('should display hierarchical structure with visual connections', async ({ page }) => {
      await page.getByRole('button', { name: 'List' }).click();
      
      // Check for hierarchy visual elements
      await expect(page.locator('.hierarchy-lines')).toBeVisible();
      await expect(page.locator('.connector-dot')).toBeVisible();
      
      // Should have legend
      await expect(page.getByText('Baseline')).toBeVisible();
      await expect(page.getByText('Branch')).toBeVisible();
      await expect(page.getByText('Sandbox')).toBeVisible();
    });

    test('should show scenarios with proper indentation', async ({ page }) => {
      await page.getByRole('button', { name: 'List' }).click();
      
      const hierarchyRows = page.locator('.hierarchy-row');
      await expect(hierarchyRows.first()).toBeVisible();
      
      // Check that rows have hierarchy indent
      const firstRow = hierarchyRows.first();
      await expect(firstRow.locator('.hierarchy-indent')).toBeVisible();
    });

    test('should display scenario metadata in list view', async ({ page }) => {
      await page.getByRole('button', { name: 'List' }).click();
      
      const firstRow = page.locator('.hierarchy-row').first();
      
      // Check metadata elements
      await expect(firstRow.locator('.scenario-type')).toBeVisible();
      await expect(firstRow.locator('.scenario-status')).toBeVisible();
      await expect(firstRow.locator('.created-by')).toBeVisible();
      await expect(firstRow.locator('.created-date')).toBeVisible();
    });

    test('should show action buttons in list view', async ({ page }) => {
      await page.getByRole('button', { name: 'List' }).click();
      
      const firstRow = page.locator('.hierarchy-row').first();
      const actions = firstRow.locator('.hierarchy-actions');
      
      await expect(actions.getByTitle('Create Branch')).toBeVisible();
      await expect(actions.getByTitle('Compare Scenarios')).toBeVisible();
      await expect(actions.getByTitle('Edit Scenario')).toBeVisible();
    });
  });

  test.describe('Graphical View (Commit Graph)', () => {
    test('should switch to graphical view', async ({ page }) => {
      await page.getByRole('button', { name: 'Graphical' }).click();
      
      // Graphical button should become active
      await expect(page.getByRole('button', { name: 'Graphical' })).toHaveClass(/btn-primary/);
      await expect(page.getByRole('button', { name: 'Cards' })).toHaveClass(/btn-secondary/);
      
      // Should show commit graph structure
      await expect(page.getByText('Scenario Commit Graph')).toBeVisible();
      await expect(page.locator('.graph-container')).toBeVisible();
    });

    test('should display git-style commit graph elements', async ({ page }) => {
      await page.getByRole('button', { name: 'Graphical' }).click();
      
      // Check for graph visual elements
      await expect(page.locator('.graph-lanes')).toBeVisible();
      await expect(page.locator('.branch-line')).toBeVisible();
      await expect(page.locator('.commit-dot')).toBeVisible();
      await expect(page.locator('.commit-info-panel')).toBeVisible();
    });

    test('should position commits chronologically', async ({ page }) => {
      await page.getByRole('button', { name: 'Graphical' }).click();
      
      const commitRows = page.locator('.commit-row');
      const count = await commitRows.count();
      
      if (count > 1) {
        // Check that commits are positioned with increasing top values
        for (let i = 0; i < Math.min(count, 3); i++) {
          const row = commitRows.nth(i);
          const style = await row.getAttribute('style');
          expect(style).toContain(`top: ${i * 60}px`);
        }
      }
    });

    test('should display commit information panels', async ({ page }) => {
      await page.getByRole('button', { name: 'Graphical' }).click();
      
      const firstInfoPanel = page.locator('.commit-info-panel').first();
      
      // Check commit info elements
      await expect(firstInfoPanel.locator('.commit-title')).toBeVisible();
      await expect(firstInfoPanel.locator('.commit-author')).toBeVisible();
      await expect(firstInfoPanel.locator('.commit-date')).toBeVisible();
      await expect(firstInfoPanel.locator('.commit-status')).toBeVisible();
    });

    test('should show action buttons in commit panels', async ({ page }) => {
      await page.getByRole('button', { name: 'Graphical' }).click();
      
      const firstInfoPanel = page.locator('.commit-info-panel').first();
      const actions = firstInfoPanel.locator('.commit-actions');
      
      await expect(actions.getByTitle('Create Branch')).toBeVisible();
      await expect(actions.getByTitle('Compare')).toBeVisible();
    });

    test('should have interactive commit dots', async ({ page }) => {
      await page.getByRole('button', { name: 'Graphical' }).click();
      
      const firstCommitDot = page.locator('.commit-dot').first();
      
      // Commit dot should be clickable
      await expect(firstCommitDot).toBeVisible();
      await firstCommitDot.click();
      // Should trigger edit action (currently console.log)
    });

    test('should display branch connections for child scenarios', async ({ page }) => {
      await page.getByRole('button', { name: 'Graphical' }).click();
      
      // Look for branch connection elements
      const branchConnections = page.locator('.branch-connection');
      if (await branchConnections.count() > 0) {
        await expect(branchConnections.first()).toBeVisible();
      }
    });
  });

  test.describe('View Mode Persistence and Switching', () => {
    test('should maintain view mode state when switching between modes', async ({ page }) => {
      // Start in cards view
      await expect(page.getByRole('button', { name: 'Cards' })).toHaveClass(/btn-primary/);
      
      // Switch to list view
      await page.getByRole('button', { name: 'List' }).click();
      await expect(page.getByRole('button', { name: 'List' })).toHaveClass(/btn-primary/);
      await expect(page.getByText('Scenario Hierarchy')).toBeVisible();
      
      // Switch to graphical view
      await page.getByRole('button', { name: 'Graphical' }).click();
      await expect(page.getByRole('button', { name: 'Graphical' })).toHaveClass(/btn-primary/);
      await expect(page.getByText('Scenario Commit Graph')).toBeVisible();
      
      // Switch back to cards view
      await page.getByRole('button', { name: 'Cards' }).click();
      await expect(page.getByRole('button', { name: 'Cards' })).toHaveClass(/btn-primary/);
      await expect(page.locator('.scenario-card').first()).toBeVisible();
    });

    test('should switch views quickly without errors', async ({ page }) => {
      // Rapid view switching test
      for (let i = 0; i < 3; i++) {
        await page.getByRole('button', { name: 'List' }).click();
        await page.waitForTimeout(100);
        
        await page.getByRole('button', { name: 'Graphical' }).click();
        await page.waitForTimeout(100);
        
        await page.getByRole('button', { name: 'Cards' }).click();
        await page.waitForTimeout(100);
      }
      
      // Should end up in cards view without errors
      await expect(page.getByRole('button', { name: 'Cards' })).toHaveClass(/btn-primary/);
    });
  });

  test.describe('Create New Scenario Modal', () => {
    test('should open create scenario modal', async ({ page }) => {
      await page.getByRole('button', { name: 'New Scenario' }).click();
      
      // Modal should be visible
      await expect(page.getByText('Create New Scenario')).toBeVisible();
      await expect(page.getByLabel('Scenario Name')).toBeVisible();
      await expect(page.getByLabel('Description')).toBeVisible();
      await expect(page.getByLabel('Scenario Type')).toBeVisible();
    });

    test('should close modal with cancel button', async ({ page }) => {
      await page.getByRole('button', { name: 'New Scenario' }).click();
      await expect(page.getByText('Create New Scenario')).toBeVisible();
      
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByText('Create New Scenario')).not.toBeVisible();
    });

    test('should close modal with X button', async ({ page }) => {
      await page.getByRole('button', { name: 'New Scenario' }).click();
      await expect(page.getByText('Create New Scenario')).toBeVisible();
      
      await page.locator('.modal-close').click();
      await expect(page.getByText('Create New Scenario')).not.toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // All view modes should still work
      await page.getByRole('button', { name: 'List' }).click();
      await expect(page.getByText('Scenario Hierarchy')).toBeVisible();
      
      await page.getByRole('button', { name: 'Graphical' }).click();
      await expect(page.getByText('Scenario Commit Graph')).toBeVisible();
      
      await page.getByRole('button', { name: 'Cards' }).click();
      await expect(page.locator('.scenario-card').first()).toBeVisible();
    });

    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // View mode buttons should still be accessible
      await expect(page.getByRole('button', { name: 'Cards' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'List' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Graphical' })).toBeVisible();
      
      // Content should be visible
      await expect(page.locator('.scenario-card').first()).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle empty scenarios gracefully', async ({ page }) => {
      // Mock empty response or navigate to a state with no scenarios
      await page.route('**/api/scenarios', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] })
        });
      });
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should show "no scenarios" message in all views
      await expect(page.getByText('No scenarios found').first()).toBeVisible();
      
      await page.getByRole('button', { name: 'List' }).click();
      await expect(page.getByText('No scenarios found')).toBeVisible();
      
      await page.getByRole('button', { name: 'Graphical' }).click();
      await expect(page.getByText('No scenarios found')).toBeVisible();
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/scenarios', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should show error message
      await expect(page.getByText('Failed to load scenarios')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load scenarios within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/scenarios');
      await page.waitForSelector('.scenario-card, .no-scenarios', { timeout: 10000 });
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    test('should switch views efficiently', async ({ page }) => {
      await page.goto('/scenarios');
      await page.waitForLoadState('networkidle');
      
      // Time view switches
      const startTime = Date.now();
      
      await page.getByRole('button', { name: 'List' }).click();
      await page.waitForSelector('.hierarchy-content');
      
      await page.getByRole('button', { name: 'Graphical' }).click();
      await page.waitForSelector('.graph-container');
      
      await page.getByRole('button', { name: 'Cards' }).click();
      await page.waitForSelector('.scenario-card');
      
      const switchTime = Date.now() - startTime;
      expect(switchTime).toBeLessThan(2000); // View switches should be fast
    });
  });
});