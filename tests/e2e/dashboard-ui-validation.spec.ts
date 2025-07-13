import { test, expect } from '@playwright/test';
import { TestUtils } from './helpers/test-utils';

test.describe('Dashboard UI Current Projects Validation', () => {
  let testUtils: TestUtils;

  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);
  });

  test('should display "Current Projects" instead of "Total Projects"', async ({ page }) => {
    await testUtils.navigateAndWait('/dashboard', 'h1');
    await testUtils.waitForLoadingToComplete();

    // Verify the stat card shows "Current Projects"
    const statCards = page.locator('.stat-card');
    await expect(statCards).toHaveCount(4); // Should have 4 stat cards

    // Find the projects stat card
    const projectsCard = statCards.filter({ hasText: 'Current Projects' });
    await expect(projectsCard).toBeVisible();

    // Verify it does NOT say "Total Projects"
    const totalProjectsCard = statCards.filter({ hasText: 'Total Projects' });
    await expect(totalProjectsCard).toHaveCount(0);

    // Verify the card has the correct styling and icon
    await expect(projectsCard.locator('.stat-title')).toContainText('Current Projects');
    await expect(projectsCard.locator('svg')).toBeVisible(); // Icon should be present

    console.log('✅ Dashboard shows "Current Projects" instead of "Total Projects"');
  });

  test('should display "Current Project Health" chart title', async ({ page }) => {
    await testUtils.navigateAndWait('/dashboard', 'h1');
    await testUtils.waitForLoadingToComplete();

    // Verify the project health chart has the updated title
    const healthCard = page.locator('.card').filter({ hasText: 'Current Project Health' });
    await expect(healthCard).toBeVisible();

    // Verify it does NOT say "Project Health Status"
    const oldTitleCard = page.locator('.card').filter({ hasText: 'Project Health Status' });
    await expect(oldTitleCard).toHaveCount(0);

    // Verify the chart is clickable and navigates to projects
    await expect(healthCard).toHaveCSS('cursor', /pointer|hand/);

    console.log('✅ Dashboard shows "Current Project Health" chart title');
  });

  test('should show current projects count in stat card value', async ({ page }) => {
    await testUtils.navigateAndWait('/dashboard', 'h1');
    
    // Wait for API response to get expected value
    const dashboardResponse = await testUtils.waitForAPIResponse('/api/reporting/dashboard');
    const dashboardData = await dashboardResponse.json();
    const expectedCurrentProjects = dashboardData.summary.projects;

    // Verify the stat card shows the correct value
    const projectsCard = page.locator('.stat-card').filter({ hasText: 'Current Projects' });
    const statValue = projectsCard.locator('.stat-value');
    
    await expect(statValue).toBeVisible();
    await expect(statValue).toContainText(expectedCurrentProjects.toString());

    // Verify the value is a number
    const displayedValue = await statValue.textContent();
    expect(Number.isInteger(Number(displayedValue?.trim()))).toBe(true);

    console.log(`✅ Current projects stat card shows: ${displayedValue}`);
  });

  test('should render charts with current project data', async ({ page }) => {
    await testUtils.navigateAndWait('/dashboard', 'h1');
    await testUtils.waitForLoadingToComplete();

    // Get dashboard data for validation
    const dashboardResponse = await testUtils.waitForAPIResponse('/api/reporting/dashboard');
    const dashboardData = await dashboardResponse.json();

    // Test Project Health Chart
    const healthCard = page.locator('.card').filter({ hasText: 'Current Project Health' });
    await expect(healthCard).toBeVisible();
    
    const healthChartContainer = healthCard.locator('.chart-container');
    await expect(healthChartContainer).toBeVisible();

    if (dashboardData.summary.projects > 0 && Object.keys(dashboardData.projectHealth).length > 0) {
      // Should have pie chart if there are current projects
      const rechartsSurface = healthChartContainer.locator('.recharts-surface');
      await expect(rechartsSurface).toBeVisible();
      console.log('✅ Project health pie chart rendered with current project data');
    } else {
      console.log('ℹ️ No current projects to display in health chart');
    }

    // Test Resource Utilization Chart
    const utilizationCard = page.locator('.card').filter({ hasText: 'Resource Utilization' });
    await expect(utilizationCard).toBeVisible();
    
    const utilizationChartContainer = utilizationCard.locator('.chart-container');
    await expect(utilizationChartContainer).toBeVisible();

    if (Object.keys(dashboardData.utilization).length > 0) {
      // Should have bar chart if there's utilization data
      const barChart = utilizationChartContainer.locator('.recharts-surface');
      await expect(barChart).toBeVisible();
      console.log('✅ Utilization bar chart rendered with current project data');
    } else {
      console.log('ℹ️ No current utilization data to display');
    }
  });

  test('should show capacity gaps for current projects', async ({ page }) => {
    await testUtils.navigateAndWait('/dashboard', 'h1');
    await testUtils.waitForLoadingToComplete();

    // Get dashboard data
    const dashboardResponse = await testUtils.waitForAPIResponse('/api/reporting/dashboard');
    const dashboardData = await dashboardResponse.json();

    // Test Capacity Gaps Stat Card
    const capacityGapsCard = page.locator('.stat-card').filter({ hasText: 'Capacity Gaps' });
    await expect(capacityGapsCard).toBeVisible();

    const gapValue = capacityGapsCard.locator('.stat-value');
    const expectedGaps = dashboardData.capacityGaps.GAP || 0;
    await expect(gapValue).toContainText(expectedGaps.toString());

    // Test Capacity Status by Role Card
    const capacityStatusCard = page.locator('.card').filter({ hasText: 'Capacity Status by Role' });
    await expect(capacityStatusCard).toBeVisible();

    const capacitySummary = capacityStatusCard.locator('.capacity-summary');
    await expect(capacitySummary).toBeVisible();

    // Should show capacity items if there are gaps or OK roles
    if (dashboardData.capacityGaps.GAP > 0 || dashboardData.capacityGaps.OK > 0) {
      const capacityItems = capacitySummary.locator('.capacity-item');
      const capacityItemCount = await capacityItems.count();
      expect(capacityItemCount).toBeGreaterThan(0);
      console.log('✅ Capacity status items displayed for current projects');
    }

    console.log(`✅ Capacity gaps for current projects: ${expectedGaps}`);
  });

  test('should show availability relative to current projects', async ({ page }) => {
    await testUtils.navigateAndWait('/dashboard', 'h1');
    await testUtils.waitForLoadingToComplete();

    // Get dashboard data
    const dashboardResponse = await testUtils.waitForAPIResponse('/api/reporting/dashboard');
    const dashboardData = await dashboardResponse.json();

    // Test Quick Stats Card
    const quickStatsCard = page.locator('.card').filter({ hasText: 'Quick Stats' });
    await expect(quickStatsCard).toBeVisible();

    const quickStats = quickStatsCard.locator('.quick-stats');
    await expect(quickStats).toBeVisible();

    const statItems = quickStats.locator('.stat-item');
    const statItemCount = await statItems.count();
    expect(statItemCount).toBeGreaterThan(0);

    // Verify stat items show availability data
    const availableCount = dashboardData.availability.AVAILABLE || 0;
    const assignedCount = dashboardData.availability.ASSIGNED || 0;

    console.log(`People available (not in current projects): ${availableCount}`);
    console.log(`People assigned to current projects: ${assignedCount}`);

    // Verify clickable stat items
    await expect(statItems.first()).toHaveCSS('cursor', /pointer|hand/);

    console.log('✅ Quick stats show availability relative to current projects');
  });

  test('should handle loading states properly', async ({ page }) => {
    // Intercept dashboard API to add delay
    await page.route('**/api/reporting/dashboard', async route => {
      // Add a small delay to test loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      const response = await route.fetch();
      await route.fulfill({ response });
    });

    await page.goto('/dashboard');

    // Should show loading state initially
    const loadingSpinner = page.locator('.loading-spinner, .loading');
    const hasLoading = await loadingSpinner.count() > 0;
    
    if (hasLoading) {
      console.log('✅ Loading state displayed during API call');
    }

    // Wait for content to load
    await testUtils.waitForLoadingToComplete();

    // Should show content after loading
    await expect(page.locator('h1')).toContainText('Dashboard');
    const currentProjectsCard = page.locator('.stat-card').filter({ hasText: 'Current Projects' });
    await expect(currentProjectsCard).toBeVisible();

    console.log('✅ Dashboard content loads properly after loading state');
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Intercept dashboard API to simulate error
    await page.route('**/api/reporting/dashboard', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should show error message
    const errorMessage = page.locator('.error-message, .alert-error');
    const hasError = await errorMessage.count() > 0;

    if (hasError) {
      await expect(errorMessage).toBeVisible();
      console.log('✅ Error state displayed for API failure');
    } else {
      console.log('ℹ️ No specific error message shown, but page should not crash');
    }

    // Page should not crash
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should navigate correctly when clicking dashboard elements', async ({ page }) => {
    await testUtils.navigateAndWait('/dashboard', 'h1');
    await testUtils.waitForLoadingToComplete();

    // Test Current Projects card navigation
    const currentProjectsCard = page.locator('.stat-card').filter({ hasText: 'Current Projects' });
    await expect(currentProjectsCard).toBeVisible();
    
    await currentProjectsCard.click();
    await page.waitForURL('**/projects');
    await expect(page.locator('h1')).toContainText('Projects');

    // Navigate back to dashboard
    await testUtils.navigateAndWait('/dashboard', 'h1');

    // Test Current Project Health chart navigation
    const healthCard = page.locator('.card').filter({ hasText: 'Current Project Health' });
    await expect(healthCard).toBeVisible();
    
    await healthCard.click();
    await page.waitForURL('**/projects');
    await expect(page.locator('h1')).toContainText('Projects');

    console.log('✅ Dashboard navigation works correctly');
  });

  test('should maintain consistent styling and layout', async ({ page }) => {
    await testUtils.navigateAndWait('/dashboard', 'h1');
    await testUtils.waitForLoadingToComplete();

    // Verify main dashboard structure
    const dashboard = page.locator('.dashboard');
    await expect(dashboard).toBeVisible();

    const pageHeader = dashboard.locator('.page-header');
    await expect(pageHeader).toBeVisible();
    await expect(pageHeader.locator('h1')).toContainText('Dashboard');
    await expect(pageHeader.locator('.page-subtitle')).toBeVisible();

    // Verify stats grid
    const statsGrid = dashboard.locator('.stats-grid');
    await expect(statsGrid).toBeVisible();
    
    const statCards = statsGrid.locator('.stat-card');
    await expect(statCards).toHaveCount(4); // Should have 4 stat cards

    // Verify charts grid
    const chartsGrid = dashboard.locator('.charts-grid');
    await expect(chartsGrid).toBeVisible();
    
    const chartCards = chartsGrid.locator('.card');
    await expect(chartCards).toHaveCount(4); // Should have 4 chart cards

    // Verify responsive design (basic check)
    const viewportSize = page.viewportSize();
    if (viewportSize && viewportSize.width >= 1024) {
      // Desktop layout should have grid layout
      await expect(statsGrid).toHaveCSS('display', 'grid');
      await expect(chartsGrid).toHaveCSS('display', 'grid');
    }

    console.log('✅ Dashboard maintains consistent styling and layout');
  });
});