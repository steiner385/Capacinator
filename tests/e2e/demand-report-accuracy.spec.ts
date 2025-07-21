import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Demand Report Accuracy Testing', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    
    helpers = new TestHelpers(page);
    await helpers.gotoWithRetry('/reports');
    await helpers.setupPage();
    await helpers.waitForReactApp();
    await page.waitForLoadState('networkidle');
    
    // Wait for reports page to load
    await page.waitForSelector('.report-tabs, button.tab, .report-content', { timeout: 20000 });
    console.log('✅ Reports page loaded');
    
    // Switch to Demand Report tab
    try {
      const demandTab = page.locator('button.tab:has-text("Demand Report"), button:has-text("Demand Report")').first();
      await demandTab.waitFor({ state: 'visible', timeout: 10000 });
      await demandTab.click();
      console.log('✅ Switched to Demand Report tab');
    } catch (error) {
      console.log('⚠️ Could not find or click Demand Report tab:', error.message);
      // Take screenshot for debugging
      await page.screenshot({ path: `test-results/debug-no-demand-tab-${Date.now()}.png` });
    }
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Wait for demand report content to load
    await page.waitForSelector('.summary-card, .chart-container', { timeout: 20000 });
    console.log('✅ Demand report content loaded');
  });

  test('should display accurate demand summary metrics', async ({ page }) => {
    // Verify summary cards are present and contain numeric values
    const summaryCards = page.locator('.summary-card');
    await expect(summaryCards).toHaveCount(4); // Total Demand, Projects, Roles, Peak Month
    
    // Check Total Demand card
    const totalDemandCard = page.locator('.summary-card:has-text("Total Demand")');
    await expect(totalDemandCard).toBeVisible();
    
    const totalDemandValue = totalDemandCard.locator('.metric');
    await expect(totalDemandValue).toBeVisible();
    
    // Verify it shows hours (not percentages)
    const demandText = await totalDemandValue.textContent();
    console.log(`Total Demand shown: ${demandText}`);
    expect(demandText).toMatch(/\d+\s*hours?/i);
    
    // Extract numeric value and verify it's reasonable (should be thousands of hours)
    const demandValue = parseInt(demandText?.match(/\d+/)?.[0] || '0');
    expect(demandValue).toBeGreaterThan(1000); // Should be realistic hours, not percentages
    expect(demandValue).toBeLessThan(50000); // Should be reasonable upper bound
    
    // Check Projects with Demand card
    const projectsCard = page.locator('.summary-card:has-text("Projects with Demand"), .summary-card:has-text("# Projects")');
    await expect(projectsCard).toBeVisible();
    
    const projectsValue = projectsCard.locator('.metric');
    const projectsText = await projectsValue.textContent();
    console.log(`Projects with Demand: ${projectsText}`);
    const projectCount = parseInt(projectsText?.match(/\d+/)?.[0] || '0');
    expect(projectCount).toBeGreaterThan(0);
    expect(projectCount).toBeLessThan(100); // Reasonable project count
    
    // Check Roles with Demand card
    const rolesCard = page.locator('.summary-card:has-text("Roles with Demand"), .summary-card:has-text("# Roles")');
    await expect(rolesCard).toBeVisible();
    
    const rolesValue = rolesCard.locator('.metric');
    const rolesText = await rolesValue.textContent();
    console.log(`Roles with Demand: ${rolesText}`);
    const roleCount = parseInt(rolesText?.match(/\d+/)?.[0] || '0');
    expect(roleCount).toBeGreaterThan(0);
    expect(roleCount).toBeLessThan(50); // Reasonable role count
    
    // Check Peak Month card
    const peakMonthCard = page.locator('.summary-card:has-text("Peak Month")');
    await expect(peakMonthCard).toBeVisible();
    
    const peakMonthValue = peakMonthCard.locator('.metric');
    const peakMonthText = await peakMonthValue.textContent();
    console.log(`Peak Month: ${peakMonthText}`);
    expect(peakMonthText).not.toBe('N/A'); // Should have actual peak month data
  });

  test('should display accurate demand charts with proper data', async ({ page }) => {
    // Wait for charts to render
    await page.waitForSelector('.chart-container', { timeout: 15000 });
    const chartContainers = page.locator('.chart-container');
    
    // Should have at least 3 charts: by project, by role, and timeline
    const chartCount = await chartContainers.count();
    expect(chartCount).toBeGreaterThanOrEqual(3);
    
    // Verify Demand by Project chart
    const projectChart = page.locator('.chart-container:has-text("Demand by Project")');
    await expect(projectChart).toBeVisible();
    
    // Check if chart has data (SVG elements should be present)
    const projectChartSvg = projectChart.locator('svg');
    await expect(projectChartSvg).toBeVisible();
    
    // Verify bars are present (indicating data)
    const projectBars = projectChart.locator('.recharts-bar, .recharts-bar-rectangle, rect[width]');
    const projectBarCount = await projectBars.count();
    expect(projectBarCount).toBeGreaterThan(0);
    console.log(`Project chart has ${projectBarCount} data bars`);
    
    // Verify Demand by Role chart
    const roleChart = page.locator('.chart-container:has-text("Demand by Role")');
    await expect(roleChart).toBeVisible();
    
    const roleChartSvg = roleChart.locator('svg');
    await expect(roleChartSvg).toBeVisible();
    
    const roleBars = roleChart.locator('.recharts-bar, .recharts-bar-rectangle, rect[width]');
    const roleBarCount = await roleBars.count();
    expect(roleBarCount).toBeGreaterThan(0);
    console.log(`Role chart has ${roleBarCount} data bars`);
    
    // Verify Timeline chart
    const timelineChart = page.locator('.chart-container:has-text("Demand Trend Over Time"), .chart-container:has-text("Timeline")');
    await expect(timelineChart).toBeVisible();
    
    const timelineChartSvg = timelineChart.locator('svg');
    await expect(timelineChartSvg).toBeVisible();
    
    // Check for line chart data points
    const timelinePoints = timelineChart.locator('.recharts-line, .recharts-line-dot, circle');
    const timelinePointCount = await timelinePoints.count();
    expect(timelinePointCount).toBeGreaterThan(0);
    console.log(`Timeline chart has ${timelinePointCount} data points`);
  });

  test('should display accurate high-demand project and role tables', async ({ page }) => {
    // Wait for action lists section
    await page.waitForSelector('.action-lists, .list-container', { timeout: 15000 });
    
    // Verify High-Demand Projects table
    const projectsTable = page.locator('.list-container:has-text("High-Demand Projects")');
    await expect(projectsTable).toBeVisible();
    
    const projectsTableRows = projectsTable.locator('tbody tr');
    const projectRowCount = await projectsTableRows.count();
    expect(projectRowCount).toBeGreaterThan(0);
    console.log(`High-demand projects table has ${projectRowCount} rows`);
    
    // Check first project row for accurate data
    if (projectRowCount > 0) {
      const firstProjectRow = projectsTableRows.first();
      
      // Verify project name column
      const projectName = firstProjectRow.locator('td').first();
      const projectNameText = await projectName.textContent();
      expect(projectNameText?.trim()).toBeTruthy();
      console.log(`First project: ${projectNameText}`);
      
      // Verify demand column shows hours
      const projectDemand = firstProjectRow.locator('td').nth(1);
      const projectDemandText = await projectDemand.textContent();
      expect(projectDemandText).toMatch(/\d+\s*(hrs?|hours?)/i);
      console.log(`First project demand: ${projectDemandText}`);
      
      // Verify action link
      const actionLink = firstProjectRow.locator('a, button');
      await expect(actionLink).toBeVisible();
    }
    
    // Verify High-Demand Roles table
    const rolesTable = page.locator('.list-container:has-text("High-Demand Roles")');
    await expect(rolesTable).toBeVisible();
    
    const rolesTableRows = rolesTable.locator('tbody tr');
    const roleRowCount = await rolesTableRows.count();
    expect(roleRowCount).toBeGreaterThan(0);
    console.log(`High-demand roles table has ${roleRowCount} rows`);
    
    // Check first role row for accurate data
    if (roleRowCount > 0) {
      const firstRoleRow = rolesTableRows.first();
      
      // Verify role name column
      const roleName = firstRoleRow.locator('td').first();
      const roleNameText = await roleName.textContent();
      expect(roleNameText?.trim()).toBeTruthy();
      console.log(`First role: ${roleNameText}`);
      
      // Verify demand column shows hours
      const roleDemand = firstRoleRow.locator('td').nth(1);
      const roleDemandText = await roleDemand.textContent();
      expect(roleDemandText).toMatch(/\d+\s*(hrs?|hours?)/i);
      console.log(`First role demand: ${roleDemandText}`);
      
      // Verify action link
      const actionLink = firstRoleRow.locator('a, button');
      await expect(actionLink).toBeVisible();
    }
  });

  test('should verify API data consistency', async ({ page }) => {
    // Intercept the demand report API call
    let apiResponse: any = null;
    
    page.on('response', async (response) => {
      if (response.url().includes('/api/reporting/demand')) {
        try {
          apiResponse = await response.json();
          console.log('✅ Captured demand report API response');
        } catch (error) {
          console.log('⚠️ Failed to parse API response:', error);
        }
      }
    });
    
    // Refresh the page to trigger API call
    await page.reload();
    await helpers.setupPage();
    await page.waitForLoadState('networkidle');
    
    // Switch back to Demand Report tab
    const demandTab = page.locator('button.tab:has-text("Demand Report"), button:has-text("Demand Report")').first();
    await demandTab.click();
    await page.waitForTimeout(3000);
    
    // Wait for API response
    await page.waitForFunction(() => window.performance.timing.loadEventEnd > 0, { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Verify API response structure
    expect(apiResponse).toBeTruthy();
    expect(apiResponse).toHaveProperty('summary');
    expect(apiResponse).toHaveProperty('byProject');
    expect(apiResponse).toHaveProperty('by_role');
    expect(apiResponse).toHaveProperty('by_project_type');
    expect(apiResponse).toHaveProperty('timeline');
    
    // Verify summary contains hours (not percentages)
    const totalHours = apiResponse.summary?.total_hours || 0;
    expect(totalHours).toBeGreaterThan(1000); // Should be realistic hours
    console.log(`API Total Hours: ${totalHours}`);
    
    // Verify projects data
    expect(Array.isArray(apiResponse.byProject)).toBeTruthy();
    expect(apiResponse.byProject.length).toBeGreaterThan(0);
    
    // Check first project has proper structure
    const firstProject = apiResponse.byProject[0];
    expect(firstProject).toHaveProperty('name');
    expect(firstProject).toHaveProperty('demand');
    expect(typeof firstProject.demand).toBe('number');
    expect(firstProject.demand).toBeGreaterThan(0);
    
    // Verify roles data
    expect(Array.isArray(apiResponse.by_role)).toBeTruthy();
    expect(apiResponse.by_role.length).toBeGreaterThan(0);
    
    // Check first role has proper structure
    const firstRole = apiResponse.by_role[0];
    expect(firstRole).toHaveProperty('role_name');
    expect(firstRole).toHaveProperty('total_hours');
    expect(typeof firstRole.total_hours).toBe('number');
    expect(firstRole.total_hours).toBeGreaterThan(0);
    
    // Verify project types data
    expect(Array.isArray(apiResponse.by_project_type)).toBeTruthy();
    expect(apiResponse.by_project_type.length).toBeGreaterThan(0);
    
    // Verify timeline data
    expect(Array.isArray(apiResponse.timeline)).toBeTruthy();
    expect(apiResponse.timeline.length).toBeGreaterThan(0);
    
    const firstTimelineEntry = apiResponse.timeline[0];
    expect(firstTimelineEntry).toHaveProperty('month');
    expect(firstTimelineEntry).toHaveProperty('total_hours');
    
    console.log(`✅ API validation complete: ${apiResponse.byProject.length} projects, ${apiResponse.by_role.length} roles, ${apiResponse.timeline.length} timeline entries`);
  });

  test('should verify date filtering works correctly', async ({ page }) => {
    // Wait for filter controls
    await page.waitForSelector('.filter-controls, .date-picker, input[type="date"]', { timeout: 15000 });
    
    // Set date filters to a specific range
    const startDateInput = page.locator('input[name="startDate"], input[placeholder*="Start"], input[id*="start"]').first();
    const endDateInput = page.locator('input[name="endDate"], input[placeholder*="End"], input[id*="end"]').first();
    
    if (await startDateInput.isVisible() && await endDateInput.isVisible()) {
      await startDateInput.fill('2023-08-01');
      await endDateInput.fill('2023-12-31');
      
      // Apply filters
      const applyButton = page.locator('button:has-text("Apply"), button:has-text("Update"), button[type="submit"]').first();
      if (await applyButton.isVisible()) {
        await applyButton.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
      }
      
      // Verify data is updated
      const totalDemandCard = page.locator('.summary-card:has-text("Total Demand")');
      const totalDemandValue = totalDemandCard.locator('.metric');
      const demandText = await totalDemandValue.textContent();
      
      console.log(`Filtered demand (Aug-Dec 2023): ${demandText}`);
      expect(demandText).toMatch(/\d+\s*hours?/i);
      
      const demandValue = parseInt(demandText?.match(/\d+/)?.[0] || '0');
      expect(demandValue).toBeGreaterThan(0);
      
      console.log('✅ Date filtering appears to be working');
    } else {
      console.log('⚠️ Date filter inputs not found, skipping date filter test');
    }
  });

  test('should verify actionable links work correctly', async ({ page }) => {
    // Wait for action lists
    await page.waitForSelector('.list-container', { timeout: 15000 });
    
    // Test project action link
    const projectActionLink = page.locator('.list-container:has-text("High-Demand Projects") a, .list-container:has-text("High-Demand Projects") button').first();
    
    if (await projectActionLink.isVisible()) {
      const linkHref = await projectActionLink.getAttribute('href');
      if (linkHref) {
        console.log(`Project action link: ${linkHref}`);
        expect(linkHref).toContain('/projects');
        expect(linkHref).toContain('from=demand-report');
        
        // Verify link contains contextual parameters
        expect(linkHref).toMatch(/startDate|endDate|action/);
        console.log('✅ Project action link has correct parameters');
      }
    }
    
    // Test role action link
    const roleActionLink = page.locator('.list-container:has-text("High-Demand Roles") a, .list-container:has-text("High-Demand Roles") button').first();
    
    if (await roleActionLink.isVisible()) {
      const linkHref = await roleActionLink.getAttribute('href');
      if (linkHref) {
        console.log(`Role action link: ${linkHref}`);
        expect(linkHref).toContain('/people');
        expect(linkHref).toContain('role=');
        expect(linkHref).toContain('from=demand-report');
        
        console.log('✅ Role action link has correct parameters');
      }
    }
  });
});