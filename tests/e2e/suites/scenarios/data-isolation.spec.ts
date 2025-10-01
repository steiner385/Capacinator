import { test, expect } from '@playwright/test';

test.describe('Scenario Data Isolation', () => {
  let baselineScenarioId: string;
  let testScenario1Id: string;
  let testScenario2Id: string;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get baseline scenario ID
    const scenarioContext = await page.evaluate(() => localStorage.getItem('currentScenario'));
    if (scenarioContext) {
      const parsed = JSON.parse(scenarioContext);
      baselineScenarioId = parsed.id;
    }
  });

  test('should isolate assignments between scenarios', async ({ page }) => {
    // Create first test scenario
    await page.goto('/scenarios');
    await page.click('button:has-text("Create Scenario")');
    await page.fill('input[name="name"]', 'Isolation Test 1');
    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');
    
    // Get scenario ID from URL
    const url1 = page.url();
    testScenario1Id = url1.split('/scenarios/')[1] || '';
    
    // Switch to the new scenario
    await page.click('.scenario-selector');
    await page.click('text="Isolation Test 1"');
    await page.waitForTimeout(500);
    
    // Create an assignment in scenario 1
    await page.goto('/assignments');
    await page.click('button:has-text("New Assignment")');
    await page.waitForSelector('.modal-content');
    
    // Fill assignment form
    await page.selectOption('select[name="project_id"]', { index: 1 });
    await page.selectOption('select[name="person_id"]', { index: 1 });
    await page.selectOption('select[name="role_id"]', { index: 1 });
    await page.fill('input[name="allocation_percentage"]', '50');
    await page.click('button:has-text("Save")');
    await page.waitForLoadState('networkidle');
    
    // Count assignments in scenario 1
    const scenario1Assignments = await page.locator('.data-table tbody tr').count();
    
    // Create second test scenario
    await page.goto('/scenarios');
    await page.click('button:has-text("Create Scenario")');
    await page.fill('input[name="name"]', 'Isolation Test 2');
    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');
    
    // Switch to scenario 2
    await page.click('.scenario-selector');
    await page.click('text="Isolation Test 2"');
    await page.waitForTimeout(500);
    
    // Check assignments in scenario 2
    await page.goto('/assignments');
    await page.waitForLoadState('networkidle');
    const scenario2Assignments = await page.locator('.data-table tbody tr').count();
    
    // Scenario 2 should have different assignment count than scenario 1
    // (either baseline assignments if branched from baseline, or different count)
    expect(scenario2Assignments).not.toBe(scenario1Assignments);
  });

  test('should show only scenario-specific data in reports', async ({ page }) => {
    // Create a scenario with specific assignments
    await page.goto('/scenarios');
    await page.click('button:has-text("Create Scenario")');
    await page.fill('input[name="name"]', 'Report Isolation Test');
    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');
    
    // Switch to the new scenario
    await page.click('.scenario-selector');
    await page.click('text="Report Isolation Test"');
    await page.waitForTimeout(500);
    
    // Navigate to demand report
    await page.goto('/reports?tab=demand');
    await page.waitForLoadState('networkidle');
    
    // Get demand metrics for new scenario (should be minimal/zero)
    const newScenarioDemand = await page.locator('.metric:has-text("Total Demand")').textContent();
    
    // Switch back to baseline
    await page.click('.scenario-selector');
    await page.click('text="Baseline"');
    await page.waitForTimeout(500);
    
    // Refresh report
    await page.goto('/reports?tab=demand');
    await page.waitForLoadState('networkidle');
    
    // Get baseline demand metrics
    const baselineDemand = await page.locator('.metric:has-text("Total Demand")').textContent();
    
    // Demands should be different between scenarios
    expect(newScenarioDemand).not.toBe(baselineDemand);
  });

  test('should maintain separate assignment data per scenario', async ({ page }) => {
    // Create a scenario and add assignments
    await page.goto('/scenarios');
    await page.click('button:has-text("Create Scenario")');
    await page.fill('input[name="name"]', 'Assignment Isolation Test');
    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');
    
    await page.click('.scenario-selector');
    await page.click('text="Assignment Isolation Test"');
    await page.waitForTimeout(500);
    
    // Add a specific assignment
    await page.goto('/assignments');
    await page.click('button:has-text("New Assignment")');
    await page.waitForSelector('.modal-content');
    
    await page.selectOption('select[name="project_id"]', { index: 1 });
    await page.selectOption('select[name="person_id"]', { index: 1 });
    await page.selectOption('select[name="role_id"]', { index: 1 });
    await page.fill('input[name="allocation_percentage"]', '75');
    await page.fill('textarea[name="notes"]', 'Scenario-specific assignment');
    await page.click('button:has-text("Save")');
    await page.waitForLoadState('networkidle');
    
    // Find the assignment with our note
    const scenarioAssignment = page.locator('tr:has-text("Scenario-specific assignment")');
    await expect(scenarioAssignment).toBeVisible();
    
    // Switch to baseline
    await page.click('.scenario-selector');
    await page.click('text="Baseline"');
    await page.waitForTimeout(500);
    
    await page.goto('/assignments');
    await page.waitForLoadState('networkidle');
    
    // The scenario-specific assignment should not appear in baseline
    const baselineAssignment = page.locator('tr:has-text("Scenario-specific assignment")');
    await expect(baselineAssignment).not.toBeVisible();
  });

  test('should correctly aggregate data within scenario boundaries', async ({ page }) => {
    // Test that aggregations (like total hours, utilization) respect scenario boundaries
    await page.goto('/reports?tab=utilization');
    await page.waitForLoadState('networkidle');
    
    // Get baseline utilization metrics
    const baselineMetrics = await page.evaluate(() => {
      const metrics: Record<string, string> = {};
      document.querySelectorAll('.report-summary .metric').forEach(el => {
        const title = el.previousElementSibling?.textContent || '';
        metrics[title] = el.textContent || '';
      });
      return metrics;
    });
    
    // Create and switch to new scenario
    await page.goto('/scenarios');
    await page.click('button:has-text("Create Scenario")');
    await page.fill('input[name="name"]', 'Aggregation Test Scenario');
    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');
    
    await page.click('.scenario-selector');
    await page.click('text="Aggregation Test Scenario"');
    await page.waitForTimeout(500);
    
    // Check utilization in new scenario
    await page.goto('/reports?tab=utilization');
    await page.waitForLoadState('networkidle');
    
    const scenarioMetrics = await page.evaluate(() => {
      const metrics: Record<string, string> = {};
      document.querySelectorAll('.report-summary .metric').forEach(el => {
        const title = el.previousElementSibling?.textContent || '';
        metrics[title] = el.textContent || '';
      });
      return metrics;
    });
    
    // At least one metric should be different
    const hasDifference = Object.keys(baselineMetrics).some(key => 
      baselineMetrics[key] !== scenarioMetrics[key]
    );
    expect(hasDifference).toBe(true);
  });

  test('should handle mixed scenario and direct assignments correctly', async ({ page }) => {
    // This tests that the assignments_view correctly shows both types
    await page.goto('/assignments');
    await page.waitForLoadState('networkidle');
    
    // Look for both scenario badges and non-badged items
    const allRows = await page.locator('.data-table tbody tr').count();
    const scenarioBadges = await page.locator('.scenario-badge').count();
    
    // In baseline, we might have both direct assignments and scenario assignments
    // The counts should be logical (badges <= total rows)
    expect(scenarioBadges).toBeLessThanOrEqual(allRows);
    
    // Check that filtering works correctly
    await page.goto('/assignments?includeAllScenarios=false');
    await page.waitForLoadState('networkidle');
    
    const filteredRows = await page.locator('.data-table tbody tr').count();
    
    await page.goto('/assignments?includeAllScenarios=true');
    await page.waitForLoadState('networkidle');
    
    const unfilteredRows = await page.locator('.data-table tbody tr').count();
    
    // Unfiltered should show >= filtered
    expect(unfilteredRows).toBeGreaterThanOrEqual(filteredRows);
  });

  test('should prevent cross-scenario data leakage', async ({ page }) => {
    // Create two scenarios with different data
    await page.goto('/scenarios');
    await page.click('button:has-text("Create Scenario")');
    await page.fill('input[name="name"]', 'Leakage Test A');
    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');
    
    const scenarioAUrl = page.url();
    const scenarioAId = scenarioAUrl.split('/scenarios/')[1];
    
    await page.goto('/scenarios');
    await page.click('button:has-text("Create Scenario")');
    await page.fill('input[name="name"]', 'Leakage Test B');
    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');
    
    const scenarioBUrl = page.url();
    const scenarioBId = scenarioBUrl.split('/scenarios/')[1];
    
    // Add assignment to scenario A
    await page.click('.scenario-selector');
    await page.click('text="Leakage Test A"');
    await page.waitForTimeout(500);
    
    await page.goto('/assignments');
    await page.click('button:has-text("New Assignment")');
    await page.waitForSelector('.modal-content');
    
    await page.selectOption('select[name="project_id"]', { index: 1 });
    await page.selectOption('select[name="person_id"]', { index: 1 });
    await page.selectOption('select[name="role_id"]', { index: 1 });
    await page.fill('input[name="allocation_percentage"]', '100');
    await page.fill('textarea[name="notes"]', `Scenario A Only - ${scenarioAId}`);
    await page.click('button:has-text("Save")');
    await page.waitForLoadState('networkidle');
    
    // Switch to scenario B and verify no leakage
    await page.click('.scenario-selector');
    await page.click('text="Leakage Test B"');
    await page.waitForTimeout(500);
    
    await page.goto('/assignments');
    await page.waitForLoadState('networkidle');
    
    // Should not see scenario A's assignment
    const leakedAssignment = page.locator(`tr:has-text("${scenarioAId}")`);
    await expect(leakedAssignment).not.toBeVisible();
  });
});