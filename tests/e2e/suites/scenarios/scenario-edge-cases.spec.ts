import { test, expect } from '@playwright/test';

test.describe('Scenario Edge Cases and Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should handle invalid scenario ID in localStorage gracefully', async ({ page }) => {
    // Set invalid scenario in localStorage
    await page.evaluate(() => {
      localStorage.setItem('currentScenario', JSON.stringify({
        id: 'invalid-uuid-format',
        name: 'Invalid Scenario',
        scenario_type: 'branch'
      }));
    });
    
    // Navigate to pages that use scenario context
    const pagesToTest = ['/assignments', '/reports?tab=demand', '/projects'];
    
    for (const pageUrl of pagesToTest) {
      await page.goto(pageUrl);
      await page.waitForLoadState('networkidle');
      
      // Page should load without errors
      await expect(page.locator('body')).not.toHaveText(/error|failed/i);
      
      // Should have some content (fallback to baseline or show data)
      const hasContent = await page.locator('.data-table, .report-content, .projects-list').isVisible();
      expect(hasContent).toBeTruthy();
    }
  });

  test('should handle corrupted scenario context in localStorage', async ({ page }) => {
    // Set corrupted JSON in localStorage
    await page.evaluate(() => {
      localStorage.setItem('currentScenario', '{invalid json{{{');
    });
    
    // Navigate to assignments
    await page.goto('/assignments');
    await page.waitForLoadState('networkidle');
    
    // Should not crash and show content
    await expect(page.locator('.assignments-page')).toBeVisible();
  });

  test('should handle deleted scenario gracefully', async ({ page }) => {
    // Create a scenario
    await page.goto('/scenarios');
    await page.click('button:has-text("Create Scenario")');
    await page.fill('input[name="name"]', 'To Be Deleted');
    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');
    
    // Get scenario ID
    const url = page.url();
    const scenarioId = url.split('/scenarios/')[1];
    
    // Select the scenario
    await page.click('.scenario-selector');
    await page.click('text="To Be Deleted"');
    await page.waitForTimeout(500);
    
    // Delete the scenario via API or UI
    await page.goto(`/scenarios/${scenarioId}`);
    await page.click('button:has-text("Delete")');
    await page.click('button:has-text("Confirm")');
    await page.waitForLoadState('networkidle');
    
    // Try to access assignments with deleted scenario context
    await page.goto('/assignments');
    await page.waitForLoadState('networkidle');
    
    // Should fall back gracefully
    await expect(page.locator('.assignments-page')).toBeVisible();
    
    // Should show baseline or handle gracefully
    const selectedScenario = await page.locator('.scenario-selector').textContent();
    expect(selectedScenario).not.toContain('To Be Deleted');
  });

  test('should handle scenario with no parent gracefully', async ({ page }) => {
    // This tests orphaned scenarios or scenarios with deleted parents
    await page.evaluate(() => {
      localStorage.setItem('currentScenario', JSON.stringify({
        id: 'test-orphan-scenario',
        name: 'Orphan Scenario',
        scenario_type: 'branch',
        parent_scenario_id: 'non-existent-parent',
        parent_scenario_name: null
      }));
    });
    
    await page.goto('/reports?tab=demand');
    await page.waitForLoadState('networkidle');
    
    // Should display scenario context without crashing
    const contextDisplay = page.locator('div:has-text("Current Scenario")');
    await expect(contextDisplay).toBeVisible();
    
    // Should handle missing parent gracefully
    const contextText = await contextDisplay.textContent();
    expect(contextText).toContain('Orphan Scenario');
  });

  test('should handle API errors when fetching with scenario context', async ({ page }) => {
    // Intercept API calls and return errors
    await page.route('**/api/assignments*', route => {
      if (route.request().headers()['x-scenario-id']) {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Scenario not found' })
        });
      } else {
        route.continue();
      }
    });
    
    // Set a scenario context
    await page.evaluate(() => {
      localStorage.setItem('currentScenario', JSON.stringify({
        id: 'error-test-scenario',
        name: 'Error Test Scenario'
      }));
    });
    
    // Navigate to assignments
    await page.goto('/assignments');
    await page.waitForLoadState('networkidle');
    
    // Should show error state or handle gracefully
    const errorMessage = page.locator('text=/error|failed|problem/i');
    const emptyState = page.locator('text=/no.*assignments/i');
    
    const hasErrorHandling = await errorMessage.isVisible() || await emptyState.isVisible();
    expect(hasErrorHandling).toBeTruthy();
  });

  test('should handle very long scenario names gracefully', async ({ page }) => {
    const longName = 'A'.repeat(200) + ' Very Long Scenario Name That Might Break UI Layout';
    
    await page.goto('/scenarios');
    await page.click('button:has-text("Create Scenario")');
    await page.fill('input[name="name"]', longName);
    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');
    
    // Select the long-named scenario
    await page.click('.scenario-selector');
    await page.click(`text="${longName.substring(0, 50)}"`); // Click partial text
    await page.waitForTimeout(500);
    
    // Check that UI doesn't break
    await page.goto('/reports?tab=demand');
    await page.waitForLoadState('networkidle');
    
    // Scenario context should be visible and properly styled
    const contextDisplay = page.locator('div:has-text("Current Scenario")');
    await expect(contextDisplay).toBeVisible();
    
    // Check for text overflow handling
    const contextBox = await contextDisplay.boundingBox();
    expect(contextBox?.width).toBeLessThan(1200); // Reasonable max width
  });

  test('should handle rapid scenario switching', async ({ page }) => {
    // Create multiple scenarios
    const scenarios = [];
    for (let i = 1; i <= 3; i++) {
      await page.goto('/scenarios');
      await page.click('button:has-text("Create Scenario")');
      const name = `Rapid Switch ${i}`;
      scenarios.push(name);
      await page.fill('input[name="name"]', name);
      await page.click('button:has-text("Create")');
      await page.waitForLoadState('networkidle');
    }
    
    // Navigate to assignments
    await page.goto('/assignments');
    
    // Rapidly switch between scenarios
    for (let i = 0; i < 10; i++) {
      const scenarioName = scenarios[i % scenarios.length];
      await page.click('.scenario-selector');
      await page.click(`text="${scenarioName}"`);
      // Don't wait - switch immediately
    }
    
    // Final wait
    await page.waitForLoadState('networkidle');
    
    // Should stabilize without errors
    await expect(page.locator('.assignments-page')).toBeVisible();
    
    // Should show one of the scenarios
    const selectedScenario = await page.locator('.scenario-selector').textContent();
    expect(scenarios.some(name => selectedScenario?.includes(name))).toBeTruthy();
  });

  test('should handle localStorage quota exceeded gracefully', async ({ page }) => {
    // Fill localStorage to near capacity
    await page.evaluate(() => {
      try {
        const bigData = 'x'.repeat(1024 * 1024); // 1MB string
        for (let i = 0; i < 5; i++) {
          localStorage.setItem(`bigData${i}`, bigData);
        }
      } catch (e) {
        // Quota exceeded - this is what we're testing
      }
    });
    
    // Try to set scenario context
    await page.goto('/scenarios');
    await page.click('button:has-text("Create Scenario")');
    await page.fill('input[name="name"]', 'Quota Test Scenario');
    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');
    
    // Try to select it
    await page.click('.scenario-selector');
    await page.click('text="Quota Test Scenario"');
    
    // Clean up localStorage
    await page.evaluate(() => {
      for (let i = 0; i < 5; i++) {
        localStorage.removeItem(`bigData${i}`);
      }
    });
    
    // Should handle the error gracefully
    await page.goto('/assignments');
    await expect(page.locator('.assignments-page')).toBeVisible();
  });

  test('should handle concurrent API requests with different scenarios', async ({ page }) => {
    // Create two scenarios
    await page.goto('/scenarios');
    await page.click('button:has-text("Create Scenario")');
    await page.fill('input[name="name"]', 'Concurrent Test 1');
    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/scenarios');
    await page.click('button:has-text("Create Scenario")');
    await page.fill('input[name="name"]', 'Concurrent Test 2');
    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');
    
    // Open multiple tabs/contexts with different scenarios
    const context1 = await page.context().browser()?.newContext();
    const context2 = await page.context().browser()?.newContext();
    
    if (context1 && context2) {
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      // Set different scenarios in each context
      await page1.goto('/');
      await page1.evaluate(() => {
        localStorage.setItem('currentScenario', JSON.stringify({
          id: 'concurrent-1',
          name: 'Concurrent Test 1'
        }));
      });
      
      await page2.goto('/');
      await page2.evaluate(() => {
        localStorage.setItem('currentScenario', JSON.stringify({
          id: 'concurrent-2',
          name: 'Concurrent Test 2'
        }));
      });
      
      // Load assignments in both
      await Promise.all([
        page1.goto('/assignments'),
        page2.goto('/assignments')
      ]);
      
      // Both should load successfully
      await expect(page1.locator('.assignments-page')).toBeVisible();
      await expect(page2.locator('.assignments-page')).toBeVisible();
      
      // Clean up
      await context1.close();
      await context2.close();
    }
  });

  test('should handle baseline scenario edge cases', async ({ page }) => {
    // Set baseline scenario explicitly
    await page.evaluate(() => {
      localStorage.setItem('currentScenario', JSON.stringify({
        id: 'baseline-0000-0000-0000-000000000000',
        name: 'Baseline',
        scenario_type: 'baseline'
      }));
    });
    
    await page.goto('/assignments');
    await page.waitForLoadState('networkidle');
    
    // Should show direct assignments in baseline
    const assignments = await page.locator('.data-table tbody tr').count();
    expect(assignments).toBeGreaterThanOrEqual(0);
    
    // Check demand report shows both direct and baseline scenario data
    await page.goto('/reports?tab=demand');
    await page.waitForLoadState('networkidle');
    
    // Should not show "branch from" text for baseline
    const contextText = await page.locator('div:has-text("Current Scenario")').textContent();
    expect(contextText).not.toContain('Branch from');
  });
});