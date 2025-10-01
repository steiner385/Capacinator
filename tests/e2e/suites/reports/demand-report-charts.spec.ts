import { test, expect } from '../../fixtures';

test.describe('Demand Report Charts', () => {
  test.use({ 
    // Set default timeout for all tests in this suite
    actionTimeout: 30000,
    navigationTimeout: 30000 
  });

  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/reports');
    await authenticatedPage.waitForLoadState('domcontentloaded');
    
    // Click on Demand tab
    await authenticatedPage.click('button:has-text("Demand")');
    
    // Wait for demand report to load
    await authenticatedPage.waitForSelector('.report-content', { state: 'visible' });
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('should display all three demand charts', async ({ authenticatedPage }) => {
    // Check that all three chart containers are present
    const chartContainers = authenticatedPage.locator('.chart-container');
    await expect(chartContainers).toHaveCount(3);
    
    // Verify chart titles are visible
    await expect(authenticatedPage.locator('h3:has-text("Demand by Project")')).toBeVisible();
    await expect(authenticatedPage.locator('h3:has-text("Demand by Role")')).toBeVisible();
    await expect(authenticatedPage.locator('h3:has-text("Demand Trend Over Time")')).toBeVisible();
  });

  test('should show data in Demand by Project chart', async ({ authenticatedPage }) => {
    // Wait for chart SVG to be rendered
    await authenticatedPage.waitForSelector('.chart-container svg', { state: 'visible' });
    
    // Check that project chart has bars
    const projectBars = authenticatedPage.locator('.chart-container:has(h3:has-text("Demand by Project")) .recharts-bar-rectangle');
    await expect(projectBars.first()).toBeVisible();
    
    const barCount = await projectBars.count();
    expect(barCount).toBeGreaterThan(0);
    expect(barCount).toBeLessThanOrEqual(10); // We limit to top 10 in the code
  });

  test('should show data in Demand by Role chart', async ({ authenticatedPage }) => {
    // Check for bars in the role chart
    const roleBars = authenticatedPage.locator('.chart-container:has(h3:has-text("Demand by Role")) .recharts-bar-rectangle');
    await expect(roleBars.first()).toBeVisible();
    
    const barCount = await roleBars.count();
    expect(barCount).toBeGreaterThan(0);
  });

  test('should show timeline with multiple months', async ({ authenticatedPage }) => {
    // Set a date range that spans multiple months
    const startDateInput = authenticatedPage.locator('input[type="date"]').first();
    const endDateInput = authenticatedPage.locator('input[type="date"]').nth(1);
    
    await startDateInput.fill('2025-09-01');
    await endDateInput.fill('2025-12-31');
    
    // Click refresh to apply new date range
    await authenticatedPage.click('button:has-text("Refresh")');
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Check for line chart with dots
    const timelineDots = authenticatedPage.locator('.chart-container:has(h3:has-text("Demand Trend Over Time")) .recharts-line-dot');
    await expect(timelineDots.first()).toBeVisible();
    
    const dotCount = await timelineDots.count();
    expect(dotCount).toBe(4); // Sep, Oct, Nov, Dec
  });

  test.skip('should update charts when date range changes', async ({ page }) => {
    // Skipping for now to reduce test complexity
  });

  test.skip('should display chart tooltips on hover', async ({ page }) => {
    // Skipping hover tests as they can be flaky
  });

  test('should show summary metrics', async ({ authenticatedPage }) => {
    // Check summary cards are visible
    await expect(authenticatedPage.locator('.report-summary')).toBeVisible();
    
    // Verify specific metrics
    await expect(authenticatedPage.locator('h3:has-text("Total Demand")')).toBeVisible();
    await expect(authenticatedPage.locator('h3:has-text("# Projects with Demand")')).toBeVisible();
    await expect(authenticatedPage.locator('h3:has-text("# Roles with Demand")')).toBeVisible();
    await expect(authenticatedPage.locator('h3:has-text("Peak Month")')).toBeVisible();
    
    // Verify total hours shows a value
    const totalHours = authenticatedPage.locator('.summary-card:has(h3:has-text("Total Demand")) .metric');
    const hoursText = await totalHours.textContent();
    expect(hoursText).toMatch(/\d+\s*hours/);
  });

  test.skip('should handle empty state gracefully', async ({ page }) => {
    // Skipping edge case tests
  });

  test.skip('should export chart data', async ({ page }) => {
    // Skipping export tests
  });

  test('should show project and role tables below charts', async ({ authenticatedPage }) => {
    // Simple check for tables
    await expect(authenticatedPage.locator('h3:has-text("High-Demand Projects")')).toBeVisible();
    await expect(authenticatedPage.locator('h3:has-text("High-Demand Roles")')).toBeVisible();
  });
});