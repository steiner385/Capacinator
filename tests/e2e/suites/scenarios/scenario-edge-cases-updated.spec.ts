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
      
      // Page should load without errors - look for page-specific content
      if (pageUrl.includes('assignments')) {
        await expect(page.locator('.assignments-page')).toBeVisible();
      } else if (pageUrl.includes('reports')) {
        // The reports page uses .reports-page or has report-specific content
        const reportContent = page.locator('.reports-page, .report-content, .demand-report, .metrics-cards, [data-testid="reports-content"]').first();
        await expect(reportContent).toBeVisible();
      } else if (pageUrl.includes('projects')) {
        await expect(page.locator('.projects-page, .projects-list, .page-header')).toBeVisible();
      }
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
        name: 'Error Test Scenario',
        scenario_type: 'branch'
      }));
    });
    
    // Navigate to assignments
    await page.goto('/assignments');
    await page.waitForLoadState('networkidle');
    
    // Should handle the error gracefully - page should still render
    await expect(page.locator('.assignments-page')).toBeVisible();
  });

  test('should maintain scenario context across page refreshes', async ({ page }) => {
    // First, get current scenario from localStorage
    const initialScenario = await page.evaluate(() => {
      return localStorage.getItem('currentScenario');
    });
    
    expect(initialScenario).toBeTruthy();
    const parsedInitial = JSON.parse(initialScenario!);
    
    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check scenario is still in localStorage
    const afterRefresh = await page.evaluate(() => {
      return localStorage.getItem('currentScenario');
    });
    
    expect(afterRefresh).toBeTruthy();
    const parsedAfter = JSON.parse(afterRefresh!);
    
    // Should maintain the same scenario
    expect(parsedAfter.id).toBe(parsedInitial.id);
  });

  test('should handle empty scenario list gracefully', async ({ page }) => {
    // Mock API to return empty scenarios list
    await page.route('**/api/scenarios', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([])
      });
    });
    
    // Clear localStorage and reload
    await page.evaluate(() => {
      localStorage.removeItem('currentScenario');
      localStorage.removeItem('capacinator-current-scenario');
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // App should still function without scenarios
    await page.goto('/assignments');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('.assignments-page')).toBeVisible();
  });
});