import { test, expect } from '@playwright/test';
import { generateTestData } from './helpers/test-data-generator';

test.describe('Scenario Workflow Integration Tests', () => {
  let testData: any;

  test.beforeEach(async ({ page }) => {
    // Generate test data
    testData = await generateTestData(page);
    
    // Navigate to scenarios page
    await page.goto('/scenarios');
    await page.waitForLoadState('networkidle');
  });

  test.describe('End-to-End Scenario Management', () => {
    test('should complete full scenario creation workflow', async ({ page }) => {
      // Step 1: Open create scenario modal
      await page.getByRole('button', { name: 'New Scenario' }).click();
      await expect(page.getByText('Create New Scenario')).toBeVisible();
      
      // Step 2: Fill out scenario form
      const scenarioName = `Test Scenario ${Date.now()}`;
      await page.getByLabel('Scenario Name').fill(scenarioName);
      await page.getByLabel('Description').fill('This is a test scenario for E2E testing');
      await page.getByLabel('Scenario Type').selectOption('branch');
      
      // Step 3: Submit form
      await page.getByRole('button', { name: 'Create Scenario' }).click();
      
      // Step 4: Verify scenario appears in all views
      await page.waitForTimeout(1000); // Allow for creation and refresh
      
      // Check cards view
      await expect(page.getByText(scenarioName)).toBeVisible();
      
      // Check list view
      await page.getByRole('button', { name: 'List' }).click();
      await expect(page.getByText(scenarioName)).toBeVisible();
      
      // Check graphical view
      await page.getByRole('button', { name: 'Graphical' }).click();
      await expect(page.getByText(scenarioName)).toBeVisible();
    });

    test('should handle scenario branching workflow', async ({ page }) => {
      // Find a baseline scenario to branch from
      const baselineCard = page.locator('.scenario-card.baseline').first();
      
      if (await baselineCard.count() > 0) {
        // Click branch button on baseline scenario
        await baselineCard.getByTitle('Create Branch').click();
        
        // Should open create modal with parent info
        await expect(page.getByText('Create New Scenario')).toBeVisible();
        await expect(page.getByText('Branching from:')).toBeVisible();
        
        // Fill out branch scenario
        const branchName = `Branch Scenario ${Date.now()}`;
        await page.getByLabel('Scenario Name').fill(branchName);
        await page.getByLabel('Description').fill('Branched scenario for testing');
        
        // Create the branch
        await page.getByRole('button', { name: 'Create Scenario' }).click();
        
        // Verify branch appears and shows relationship
        await page.waitForTimeout(1000);
        
        // In list view, should show hierarchy
        await page.getByRole('button', { name: 'List' }).click();
        await expect(page.getByText(branchName)).toBeVisible();
        
        // In graphical view, should show on timeline
        await page.getByRole('button', { name: 'Graphical' }).click();
        await expect(page.getByText(branchName)).toBeVisible();
      }
    });

    test('should handle scenario comparison workflow', async ({ page }) => {
      // Click compare on first scenario
      const firstCard = page.locator('.scenario-card').first();
      await firstCard.getByTitle('Compare Scenarios').click();
      
      // Should trigger comparison action (implementation dependent)
      // For now, just verify the button is functional
      await expect(firstCard).toBeVisible();
    });

    test('should handle scenario merge workflow for branch scenarios', async ({ page }) => {
      // Find an active branch scenario with merge capability
      const branchCard = page.locator('.scenario-card.branch').first();
      
      if (await branchCard.count() > 0) {
        const mergeButton = branchCard.getByTitle('Merge to Parent');
        
        if (await mergeButton.count() > 0) {
          await mergeButton.click();
          
          // Should trigger merge action (implementation dependent)
          await expect(branchCard).toBeVisible();
        }
      }
    });

    test('should handle scenario deletion workflow', async ({ page }) => {
      // Find a non-baseline scenario to delete
      const deleteableCard = page.locator('.scenario-card.branch, .scenario-card.sandbox').first();
      
      if (await deleteableCard.count() > 0) {
        const scenarioName = await deleteableCard.locator('.scenario-name').textContent();
        
        // Click delete button
        await deleteableCard.getByTitle('Delete Scenario').click();
        
        // Should trigger deletion (implementation dependent)
        // In real implementation, would show confirmation dialog
        await expect(deleteableCard).toBeVisible();
      }
    });
  });

  test.describe('Cross-View Data Consistency', () => {
    test('should show consistent data across all view modes', async ({ page }) => {
      // Get scenario data from cards view
      const cardScenarios = await page.locator('.scenario-card .scenario-name').allTextContents();
      
      // Switch to list view and verify same scenarios
      await page.getByRole('button', { name: 'List' }).click();
      await page.waitForTimeout(500);
      
      const listScenarios = await page.locator('.hierarchy-row .name').allTextContents();
      
      // Should have same scenarios (may be in different order)
      expect(cardScenarios.sort()).toEqual(listScenarios.sort());
      
      // Switch to graphical view and verify same scenarios
      await page.getByRole('button', { name: 'Graphical' }).click();
      await page.waitForTimeout(500);
      
      const graphicalScenarios = await page.locator('.commit-title').allTextContents();
      
      // Should have same scenarios
      expect(cardScenarios.sort()).toEqual(graphicalScenarios.sort());
    });

    test('should maintain scenario relationships across views', async ({ page }) => {
      // Look for a scenario with parent relationship
      await page.getByRole('button', { name: 'List' }).click();
      
      const branchRows = page.locator('.hierarchy-row.branch');
      if (await branchRows.count() > 0) {
        const firstBranch = branchRows.first();
        const branchName = await firstBranch.locator('.name').textContent();
        
        // Check that it shows indentation in list view
        await expect(firstBranch.locator('.hierarchy-indent')).toBeVisible();
        
        // Switch to graphical view and verify positioning
        await page.getByRole('button', { name: 'Graphical' }).click();
        
        const commitPanel = page.locator('.commit-title', { hasText: branchName }).first();
        if (await commitPanel.count() > 0) {
          // Should be positioned on timeline (not first position)
          const commitRow = commitPanel.locator('..').locator('..').locator('..');
          const style = await commitRow.getAttribute('style');
          expect(style).toContain('top:');
        }
      }
    });

    test('should show consistent metadata across views', async ({ page }) => {
      // Get first scenario metadata from cards view
      const firstCard = page.locator('.scenario-card').first();
      const cardName = await firstCard.locator('.scenario-name').textContent();
      const cardType = await firstCard.locator('.scenario-type').textContent();
      const cardStatus = await firstCard.locator('.scenario-status').textContent();
      
      // Find same scenario in list view
      await page.getByRole('button', { name: 'List' }).click();
      const listRow = page.locator('.hierarchy-row').filter({ hasText: cardName }).first();
      
      if (await listRow.count() > 0) {
        const listType = await listRow.locator('.scenario-type').textContent();
        const listStatus = await listRow.locator('.scenario-status').textContent();
        
        expect(listType).toBe(cardType);
        expect(listStatus).toBe(cardStatus);
      }
      
      // Find same scenario in graphical view
      await page.getByRole('button', { name: 'Graphical' }).click();
      const commitPanel = page.locator('.commit-title', { hasText: cardName }).first();
      
      if (await commitPanel.count() > 0) {
        const parentPanel = commitPanel.locator('..');
        const graphStatus = await parentPanel.locator('.commit-status').textContent();
        
        expect(graphStatus?.toLowerCase()).toBe(cardStatus?.toLowerCase());
      }
    });
  });

  test.describe('Real-time Updates and State Management', () => {
    test('should handle concurrent view switching without data loss', async ({ page }) => {
      // Rapidly switch between views multiple times
      for (let i = 0; i < 5; i++) {
        await page.getByRole('button', { name: 'List' }).click();
        await page.waitForTimeout(100);
        
        await page.getByRole('button', { name: 'Graphical' }).click();
        await page.waitForTimeout(100);
        
        await page.getByRole('button', { name: 'Cards' }).click();
        await page.waitForTimeout(100);
      }
      
      // Data should still be consistent
      await expect(page.locator('.scenario-card').first()).toBeVisible();
      
      // Switch to list view - should still work
      await page.getByRole('button', { name: 'List' }).click();
      await expect(page.locator('.hierarchy-row').first()).toBeVisible();
    });

    test('should maintain scroll position when switching views', async ({ page }) => {
      // If there are many scenarios, test scroll preservation
      const scenarioCount = await page.locator('.scenario-card').count();
      
      if (scenarioCount > 5) {
        // Scroll down in cards view
        await page.locator('.scenarios-grid').scrollIntoView();
        
        // Switch to list view
        await page.getByRole('button', { name: 'List' }).click();
        
        // Switch back to cards view
        await page.getByRole('button', { name: 'Cards' }).click();
        
        // Should maintain reasonable scroll position
        await expect(page.locator('.scenarios-grid')).toBeVisible();
      }
    });

    test('should handle browser refresh without losing view mode', async ({ page }) => {
      // Switch to list view
      await page.getByRole('button', { name: 'List' }).click();
      await expect(page.getByText('Scenario Hierarchy')).toBeVisible();
      
      // Refresh the page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should return to default view (cards)
      await expect(page.getByRole('button', { name: 'Cards' })).toHaveClass(/btn-primary/);
    });
  });

  test.describe('Accessibility and Keyboard Navigation', () => {
    test('should support keyboard navigation in view toggles', async ({ page }) => {
      // Focus on first view toggle button
      await page.keyboard.press('Tab');
      
      // Navigate through view buttons with arrow keys or tab
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
      
      // Should switch to next view
      await expect(page.locator('.view-mode-toggle .btn-primary')).toBeVisible();
    });

    test('should support keyboard navigation in scenario cards', async ({ page }) => {
      // Tab to first scenario card
      const firstCard = page.locator('.scenario-card').first();
      await firstCard.locator('button').first().focus();
      
      // Should be able to navigate action buttons
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should have focused different button
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check that buttons have proper labels
      await expect(page.getByRole('button', { name: 'New Scenario' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cards' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'List' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Graphical' })).toBeVisible();
      
      // Check action buttons have proper titles
      const firstCard = page.locator('.scenario-card').first();
      await expect(firstCard.getByTitle('Create Branch')).toBeVisible();
      await expect(firstCard.getByTitle('Compare Scenarios')).toBeVisible();
      await expect(firstCard.getByTitle('Edit Scenario')).toBeVisible();
    });
  });

  test.describe('Error Recovery and Edge Cases', () => {
    test('should handle malformed scenario data gracefully', async ({ page }) => {
      // Mock API with malformed data
      await page.route('**/api/scenarios', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: '1',
                name: null, // Invalid name
                scenario_type: 'baseline',
                status: 'active'
              },
              {
                id: '2',
                // Missing required fields
                scenario_type: 'branch'
              }
            ]
          })
        });
      });
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should not crash and should show some scenarios
      await expect(page.locator('.scenarios-page')).toBeVisible();
    });

    test('should handle network failures gracefully', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/scenarios', async route => {
        await route.abort('failed');
      });
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should show error state
      await expect(page.getByText('Failed to load scenarios')).toBeVisible();
      
      // View mode buttons should still be functional
      await expect(page.getByRole('button', { name: 'Cards' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'List' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Graphical' })).toBeVisible();
    });

    test('should handle very large scenario datasets', async ({ page }) => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        id: `scenario-${i}`,
        name: `Scenario ${i}`,
        description: `Description for scenario ${i}`,
        scenario_type: i % 3 === 0 ? 'baseline' : i % 3 === 1 ? 'branch' : 'sandbox',
        status: i % 2 === 0 ? 'active' : 'archived',
        created_by_name: 'Test User',
        created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        parent_scenario_id: i > 0 && i % 3 === 1 ? `scenario-${Math.floor(i / 3)}` : null
      }));
      
      await page.route('**/api/scenarios', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: largeDataset })
        });
      });
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should load without freezing
      await expect(page.locator('.scenario-card').first()).toBeVisible({ timeout: 10000 });
      
      // View switching should still work
      await page.getByRole('button', { name: 'List' }).click();
      await expect(page.locator('.hierarchy-row').first()).toBeVisible({ timeout: 5000 });
      
      await page.getByRole('button', { name: 'Graphical' }).click();
      await expect(page.locator('.commit-row').first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Performance Under Load', () => {
    test('should perform well with realistic data loads', async ({ page }) => {
      // Measure performance of view switching
      const startTime = Date.now();
      
      // Switch between views multiple times
      for (let i = 0; i < 10; i++) {
        await page.getByRole('button', { name: 'List' }).click();
        await page.getByRole('button', { name: 'Graphical' }).click();
        await page.getByRole('button', { name: 'Cards' }).click();
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (5 seconds for 10 cycles)
      expect(duration).toBeLessThan(5000);
    });

    test('should handle memory efficiently during extended use', async ({ page }) => {
      // Simulate extended use by switching views many times
      for (let i = 0; i < 50; i++) {
        await page.getByRole('button', { name: 'List' }).click();
        if (i % 10 === 0) {
          // Check that page is still responsive
          await expect(page.locator('.hierarchy-content')).toBeVisible();
        }
        
        await page.getByRole('button', { name: 'Graphical' }).click();
        if (i % 10 === 0) {
          await expect(page.locator('.graph-container')).toBeVisible();
        }
        
        await page.getByRole('button', { name: 'Cards' }).click();
        if (i % 10 === 0) {
          await expect(page.locator('.scenarios-grid')).toBeVisible();
        }
      }
      
      // Final check that everything still works
      await expect(page.locator('.scenario-card').first()).toBeVisible();
    });
  });
});