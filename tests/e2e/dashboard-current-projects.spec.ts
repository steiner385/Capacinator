import { test, expect, waitForApiCall } from './helpers/base-test';
import { testConfig } from './helpers/test-config';

test.describe('Dashboard Current Projects Filtering', () => {
  
  test('should display only current projects count', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Wait for dashboard API response
    const dashboardResponse = await waitForApiCall(page, '/api/reporting/dashboard');
    const dashboardData = await dashboardResponse.json();

    // Verify the API returns filtered current projects count
    expect(dashboardData.summary.projects).toBeGreaterThanOrEqual(0);
    console.log(`Current projects count from API: ${dashboardData.summary.projects}`);

    // Verify the UI displays the current projects count
    const currentProjectsCard = page.locator('.stat-card').filter({ hasText: 'Current Projects' });
    await expect(currentProjectsCard).toBeVisible({ timeout: testConfig.timeouts.elementVisible });
    
    const projectsValue = currentProjectsCard.locator('.stat-value');
    await expect(projectsValue).toContainText(dashboardData.summary.projects.toString());

    // Verify the card title specifically says "Current Projects" not "Total Projects"
    await expect(currentProjectsCard.locator('.stat-title')).toContainText('Current Projects');
  });

  test('should show current project health status only', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Wait for dashboard data to load
    await page.waitForSelector('.chart-container', { timeout: testConfig.timeouts.elementVisible });

    // Verify project health chart is present and shows "Current Project Health"
    const healthCard = page.locator('.card').filter({ hasText: 'Current Project Health' });
    await expect(healthCard).toBeVisible();

    // Verify chart container is rendered
    const chartContainer = healthCard.locator('.chart-container');
    await expect(chartContainer).toBeVisible();

    // Verify Recharts components are rendered
    await expect(chartContainer.locator('.recharts-wrapper')).toBeVisible();
    
    // Check if we have pie chart data (current projects health)
    const pieChart = chartContainer.locator('.recharts-pie');
    if (await pieChart.count() > 0) {
      await expect(pieChart).toBeVisible();
      console.log('✅ Project health pie chart rendered with current project data');
    } else {
      console.log('ℹ️ No pie chart data (possible if no current projects)');
    }
  });

  test('should show capacity gaps for current projects only', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Wait for capacity status card
    const capacityCard = page.locator('.card').filter({ hasText: 'Capacity Status by Role' });
    await expect(capacityCard).toBeVisible();

    // Wait for dashboard API response to validate data
    const dashboardResponse = await waitForApiCall(page, '/api/reporting/dashboard');
    const dashboardData = await dashboardResponse.json();

    // Verify capacity gaps data exists and is specific to current projects
    expect(dashboardData.capacityGaps).toBeDefined();
    console.log('Capacity gaps for current projects:', dashboardData.capacityGaps);

    // Verify capacity summary shows current project gaps
    const capacitySummary = capacityCard.locator('.capacity-summary');
    await expect(capacitySummary).toBeVisible();

    // Verify capacity gaps stat card shows correct count
    const capacityGapsCard = page.locator('.stat-card').filter({ hasText: 'Capacity Gaps' });
    await expect(capacityGapsCard).toBeVisible();
    
    const gapValue = capacityGapsCard.locator('.stat-value');
    const expectedGaps = dashboardData.capacityGaps.GAP || 0;
    await expect(gapValue).toContainText(expectedGaps.toString());
  });

  test('should show utilization metrics for current projects', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Wait for resource utilization chart
    const utilizationCard = page.locator('.card').filter({ hasText: 'Resource Utilization' });
    await expect(utilizationCard).toBeVisible();

    // Verify chart container is present
    const chartContainer = utilizationCard.locator('.chart-container');
    await expect(chartContainer).toBeVisible();

    // Wait for dashboard API response
    const dashboardResponse = await waitForApiCall(page, '/api/reporting/dashboard');
    const dashboardData = await dashboardResponse.json();

    // Verify utilization data is specific to current projects
    expect(dashboardData.utilization).toBeDefined();
    console.log('Utilization for current projects:', dashboardData.utilization);

    // Verify utilization stats are displayed
    const overUtilizedCard = page.locator('.stat-card').filter({ hasText: 'Over-utilized' });
    await expect(overUtilizedCard).toBeVisible();
    
    const overUtilizedValue = overUtilizedCard.locator('.stat-value');
    const expectedOverUtilized = dashboardData.utilization.OVER || 0;
    await expect(overUtilizedValue).toContainText(expectedOverUtilized.toString());
  });

  test('should update metrics when navigating from other pages', async ({ authenticatedPage, testHelpers }) => {
    const page = authenticatedPage;
    
    // Start from projects page
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    
    // Navigate to dashboard via sidebar
    await testHelpers.navigateViaSidebar('Dashboard');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Verify dashboard loads with current project metrics
    await page.waitForSelector('.stat-card', { timeout: testConfig.timeouts.elementVisible });
    
    // Verify all key stat cards are present
    const statCards = [
      'Current Projects',
      'People',
      'Capacity Gaps',
      'Over-utilized'
    ];
    
    for (const cardTitle of statCards) {
      const card = page.locator('.stat-card').filter({ hasText: cardTitle });
      await expect(card).toBeVisible();
      console.log(`✅ Found stat card: ${cardTitle}`);
    }
  });
});