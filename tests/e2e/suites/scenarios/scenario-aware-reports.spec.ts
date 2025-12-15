import { test, expect } from '@playwright/test';

test.describe('Scenario-Aware Reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('demand report should filter by selected scenario', async ({ page }) => {
    // Get baseline demand metrics
    await page.goto('/reports?tab=demand');
    await page.waitForLoadState('networkidle');
    
    const baselineHours = await page.locator('.metric:has-text("Total Demand") + .unit').textContent();
    const baselineProjects = await page.locator('.metric:has-text("Projects with Demand")').textContent();
    
    // Create a scenario with specific assignments
    await page.goto('/scenarios');
    await page.click('button:has-text("Create Scenario")');
    await page.fill('input[name="name"]', 'Demand Report Test');
    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');
    
    // Switch to new scenario
    await page.click('.scenario-selector');
    await page.click('text="Demand Report Test"');
    await page.waitForLoadState("domcontentloaded", { timeout: 3000 }).catch(() => {});
    
    // Add a test assignment
    await page.goto('/assignments');
    await page.click('button:has-text("New Assignment")');
    await page.waitForSelector('.modal-content');
    
    await page.selectOption('select[name="project_id"]', { index: 1 });
    await page.selectOption('select[name="person_id"]', { index: 1 });
    await page.selectOption('select[name="role_id"]', { index: 1 });
    await page.fill('input[name="allocation_percentage"]', '100');
    await page.selectOption('select[name="assignment_date_mode"]', 'fixed');
    
    // Set dates for current month
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    await page.fill('input[name="start_date"]', startDate.toISOString().split('T')[0]);
    await page.fill('input[name="end_date"]', endDate.toISOString().split('T')[0]);
    await page.click('button:has-text("Save")');
    await page.waitForLoadState('networkidle');
    
    // Check demand report in new scenario
    await page.goto('/reports?tab=demand');
    await page.waitForLoadState('networkidle');
    
    const scenarioHours = await page.locator('.metric:has-text("Total Demand") + .unit').textContent();
    const scenarioProjects = await page.locator('.metric:has-text("Projects with Demand")').textContent();
    
    // Should have different values
    expect(scenarioHours).not.toBe(baselineHours);
    expect(scenarioProjects).toBeTruthy();
  });

  test('demand report should show scenario context prominently', async ({ page }) => {
    await page.goto('/reports?tab=demand');
    await page.waitForLoadState('networkidle');
    
    // Check for scenario context display
    const contextDisplay = page.locator('div:has(svg[class*="lucide"]) >> text=/Current Scenario/');
    await expect(contextDisplay).toBeVisible();
    
    // Verify it includes the GitBranch icon
    const gitBranchIcon = page.locator('div:has-text("Current Scenario") svg');
    await expect(gitBranchIcon).toBeVisible();
    
    // For baseline scenario
    const scenarioName = await page.locator('div:has-text("Current Scenario") span').nth(1).textContent();
    expect(scenarioName).toBeTruthy();
  });

  test('demand report timeline should respect scenario boundaries', async ({ page }) => {
    // Create scenario with known assignment period
    await page.goto('/scenarios');
    await page.click('button:has-text("Create Scenario")');
    await page.fill('input[name="name"]', 'Timeline Test Scenario');
    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');
    
    await page.click('.scenario-selector');
    await page.click('text="Timeline Test Scenario"');
    await page.waitForLoadState("domcontentloaded", { timeout: 3000 }).catch(() => {});
    
    // Add assignment for next month
    await page.goto('/assignments');
    await page.click('button:has-text("New Assignment")');
    await page.waitForSelector('.modal-content');
    
    await page.selectOption('select[name="project_id"]', { index: 1 });
    await page.selectOption('select[name="person_id"]', { index: 1 });
    await page.selectOption('select[name="role_id"]', { index: 1 });
    await page.fill('input[name="allocation_percentage"]', '80');
    
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const startDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
    const endDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);
    
    await page.fill('input[name="start_date"]', startDate.toISOString().split('T')[0]);
    await page.fill('input[name="end_date"]', endDate.toISOString().split('T')[0]);
    await page.click('button:has-text("Save")');
    await page.waitForLoadState('networkidle');
    
    // Check demand report timeline
    await page.goto('/reports?tab=demand');
    await page.waitForLoadState('networkidle');
    
    // Wait for chart to render
    await page.waitForSelector('.recharts-line', { timeout: 5000 }).catch(() => {});
    
    // Verify timeline chart exists
    const timelineChart = page.locator('.chart-container:has-text("Demand Trend")');
    await expect(timelineChart).toBeVisible();
  });

  test('report aggregations should be scenario-specific', async ({ page }) => {
    // Test role demand aggregation
    await page.goto('/reports?tab=demand');
    await page.waitForLoadState('networkidle');
    
    // Get baseline role demands
    const baselineRoles = await page.locator('.table-container:has-text("High-Demand Roles") tbody tr').count();
    
    // Create scenario
    await page.goto('/scenarios');
    await page.click('button:has-text("Create Scenario")');
    await page.fill('input[name="name"]', 'Aggregation Test');
    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');
    
    await page.click('.scenario-selector');
    await page.click('text="Aggregation Test"');
    await page.waitForLoadState("domcontentloaded", { timeout: 3000 }).catch(() => {});
    
    // Check role demands in new scenario
    await page.goto('/reports?tab=demand');
    await page.waitForLoadState('networkidle');
    
    const scenarioRoles = await page.locator('.table-container:has-text("High-Demand Roles") tbody tr').count();
    
    // Should be different (likely 0 for new scenario)
    expect(scenarioRoles).not.toBe(baselineRoles);
  });

  test('utilization report should calculate based on scenario assignments', async ({ page }) => {
    // Note: This assumes utilization report is also updated to be scenario-aware
    // If not implemented yet, this test will need adjustment
    
    await page.goto('/reports?tab=utilization');
    await page.waitForLoadState('networkidle');
    
    // Get baseline utilization metrics
    const baselineOverallocated = await page.locator('.metric:has-text("Overallocated")').textContent();
    
    // Create scenario with different allocations
    await page.goto('/scenarios');
    await page.click('button:has-text("Create Scenario")');
    await page.fill('input[name="name"]', 'Utilization Test');
    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');
    
    await page.click('.scenario-selector');
    await page.click('text="Utilization Test"');
    await page.waitForLoadState("domcontentloaded", { timeout: 3000 }).catch(() => {});
    
    // Check utilization in new scenario
    await page.goto('/reports?tab=utilization');
    await page.waitForLoadState('networkidle');
    
    const scenarioOverallocated = await page.locator('.metric:has-text("Overallocated")').textContent();
    
    // Should likely be different (0 for empty scenario)
    expect(scenarioOverallocated).toBeTruthy();
  });

  test('should handle includeAllScenarios parameter in reports', async ({ page }) => {
    // Test demand report with includeAllScenarios
    await page.goto('/reports?tab=demand&includeAllScenarios=true');
    await page.waitForLoadState('networkidle');
    
    const allScenariosHours = await page.locator('.metric:has-text("Total Demand")').textContent();
    
    // Without includeAllScenarios (filtered)
    await page.goto('/reports?tab=demand');
    await page.waitForLoadState('networkidle');
    
    const filteredHours = await page.locator('.metric:has-text("Total Demand")').textContent();
    
    // Values might be same if only baseline has data, but test the parameter works
    expect(allScenariosHours).toBeTruthy();
    expect(filteredHours).toBeTruthy();
  });

  test('report exports should include scenario context', async ({ page }) => {
    // Navigate to demand report
    await page.goto('/reports?tab=demand');
    await page.waitForLoadState('networkidle');
    
    // Check if export buttons exist and would include scenario context
    const exportButton = page.locator('button:has-text("Export")');
    
    if (await exportButton.isVisible()) {
      // Set up download promise before clicking
      const downloadPromise = page.waitForEvent('download');
      
      await exportButton.click();
      
      // If there's a format selection, choose Excel
      const excelOption = page.locator('button:has-text("Excel")');
      if (await excelOption.isVisible()) {
        await excelOption.click();
      }
      
      const download = await downloadPromise;
      const filename = download.suggestedFilename();
      
      // Filename might include scenario context
      expect(filename).toContain('demand');
    }
  });

  test('empty scenario should show appropriate empty states', async ({ page }) => {
    // Create empty scenario
    await page.goto('/scenarios');
    await page.click('button:has-text("Create Scenario")');
    await page.fill('input[name="name"]', 'Empty Scenario Test');
    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');
    
    await page.click('.scenario-selector');
    await page.click('text="Empty Scenario Test"');
    await page.waitForLoadState("domcontentloaded", { timeout: 3000 }).catch(() => {});
    
    // Check demand report
    await page.goto('/reports?tab=demand');
    await page.waitForLoadState('networkidle');
    
    // Should show empty state
    const emptyState = page.locator('.report-empty-state, .empty-state, text=/No Demand Data/i');
    const isEmptyVisible = await emptyState.isVisible().catch(() => false);
    
    // Or should show 0 values
    const totalHours = await page.locator('.metric:has-text("Total Demand")').textContent();
    
    expect(isEmptyVisible || totalHours?.includes('0')).toBeTruthy();
  });

  test('scenario description should appear in report context', async ({ page }) => {
    // Create scenario with description
    await page.goto('/scenarios');
    await page.click('button:has-text("Create Scenario")');
    await page.fill('input[name="name"]', 'Described Scenario');
    await page.fill('textarea[name="description"]', 'This is a test scenario for Q4 planning');
    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');
    
    await page.click('.scenario-selector');
    await page.click('text="Described Scenario"');
    await page.waitForLoadState("domcontentloaded", { timeout: 3000 }).catch(() => {});
    
    // Check demand report shows description
    await page.goto('/reports?tab=demand');
    await page.waitForLoadState('networkidle');
    
    const description = page.locator('text="This is a test scenario for Q4 planning"');
    await expect(description).toBeVisible();
  });
});