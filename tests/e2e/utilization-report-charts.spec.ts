import { test, expect } from '@playwright/test';
import { setupTestData, cleanupTestData } from './fixtures';

test.describe('Utilization Report Charts E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test data with reasonable allocations
    await setupTestData({
      assignments: [
        {
          personName: 'Alice Johnson',
          projectName: 'Mobile App',
          allocation: 40,
          startDate: '2025-09-01',
          endDate: '2025-12-31'
        },
        {
          personName: 'Alice Johnson',
          projectName: 'Web Platform',
          allocation: 35,
          startDate: '2025-10-01',
          endDate: '2025-11-30'
        },
        {
          personName: 'Bob Smith',
          projectName: 'Mobile App',
          allocation: 60,
          startDate: '2025-09-01',
          endDate: '2025-12-31'
        },
        {
          personName: 'Charlie Brown',
          projectName: 'API Development',
          allocation: 80,
          startDate: '2025-09-15',
          endDate: '2025-11-15'
        },
        {
          personName: 'Diana Prince',
          projectName: 'Cloud Migration',
          allocation: 100,
          startDate: '2025-10-01',
          endDate: '2025-12-15'
        },
        {
          personName: 'Eve Davis',
          projectName: 'Security Audit',
          allocation: 120, // Overallocated
          startDate: '2025-09-01',
          endDate: '2025-10-31'
        }
      ]
    });

    // Navigate to utilization report
    await page.goto('/reports');
    await page.click('text=Utilization Report');
    await page.waitForSelector('[data-testid="utilization-report-page"]');
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should display utilization charts with data', async ({ page }) => {
    // Wait for charts to load
    await page.waitForSelector('[data-testid="utilization-by-person-chart"]');
    await page.waitForSelector('[data-testid="utilization-by-role-chart"]');
    await page.waitForSelector('[data-testid="utilization-distribution-chart"]');
    
    // Verify summary cards show correct values
    const utilizationPercentage = await page.textContent('[data-testid="overall-utilization-percentage"]');
    expect(parseInt(utilizationPercentage)).toBeGreaterThan(0);
    expect(parseInt(utilizationPercentage)).toBeLessThan(200); // Reasonable range
    
    const overutilizedCount = await page.textContent('[data-testid="people-overutilized-count"]');
    expect(parseInt(overutilizedCount)).toBe(1); // Eve Davis
    
    const underutilizedCount = await page.textContent('[data-testid="people-underutilized-count"]');
    expect(parseInt(underutilizedCount)).toBeGreaterThan(0);
  });

  test('should update charts when date range changes', async ({ page }) => {
    // Set initial date range
    await page.fill('[data-testid="start-date-input"]', '2025-09-01');
    await page.fill('[data-testid="end-date-input"]', '2025-09-30');
    await page.click('[data-testid="apply-filters-button"]');
    
    // Wait for charts to update
    await page.waitForTimeout(500);
    
    // Get initial utilization value
    const initialUtilization = await page.textContent('[data-testid="overall-utilization-percentage"]');
    
    // Change date range to include more assignments
    await page.fill('[data-testid="end-date-input"]', '2025-12-31');
    await page.click('[data-testid="apply-filters-button"]');
    
    // Wait for charts to update
    await page.waitForTimeout(500);
    
    // Verify utilization changed
    const updatedUtilization = await page.textContent('[data-testid="overall-utilization-percentage"]');
    expect(parseInt(updatedUtilization)).not.toBe(parseInt(initialUtilization));
  });

  test('should display person utilization table with correct data', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('[data-testid="utilization-table"]');
    
    // Verify table headers
    await expect(page.locator('th:text("Name")')).toBeVisible();
    await expect(page.locator('th:text("Role")')).toBeVisible();
    await expect(page.locator('th:text("Utilization (%)")')).toBeVisible();
    await expect(page.locator('th:text("Available Capacity (%)")')).toBeVisible();
    await expect(page.locator('th:text("Available Hours (Daily)")')).toBeVisible();
    
    // Verify Alice's row
    const aliceRow = page.locator('tr', { has: page.locator('text="Alice Johnson"') });
    await expect(aliceRow).toBeVisible();
    
    const aliceUtilization = await aliceRow.locator('[data-testid="utilization-percentage"]').textContent();
    expect(parseInt(aliceUtilization)).toBe(75); // 40% + 35%
    
    // Verify Eve's overallocation is highlighted
    const eveRow = page.locator('tr', { has: page.locator('text="Eve Davis"') });
    await expect(eveRow).toBeVisible();
    await expect(eveRow.locator('[data-testid="overallocation-indicator"]')).toBeVisible();
    
    const eveUtilization = await eveRow.locator('[data-testid="utilization-percentage"]').textContent();
    expect(parseInt(eveUtilization)).toBe(120);
  });

  test('should handle edge cases gracefully', async ({ page }) => {
    // Test with no date range (should use defaults)
    await page.fill('[data-testid="start-date-input"]', '');
    await page.fill('[data-testid="end-date-input"]', '');
    await page.click('[data-testid="apply-filters-button"]');
    
    // Should still display charts
    await expect(page.locator('[data-testid="utilization-by-person-chart"]')).toBeVisible();
    
    // Test with date range that has no assignments
    await page.fill('[data-testid="start-date-input"]', '2024-01-01');
    await page.fill('[data-testid="end-date-input"]', '2024-01-31');
    await page.click('[data-testid="apply-filters-button"]');
    
    // Should show "No assignments found" message
    await expect(page.locator('text=No Project Assignments Found')).toBeVisible();
    await expect(page.locator('text=Utilization is 0%')).toBeVisible();
  });

  test('should display charts properly with high utilization values', async ({ page }) => {
    // Add assignments with very high percentages
    await setupTestData({
      assignments: [
        {
          personName: 'Frank Test',
          projectName: 'Project 1',
          allocation: 150,
          startDate: '2025-09-01',
          endDate: '2025-12-31'
        },
        {
          personName: 'Frank Test',
          projectName: 'Project 2',
          allocation: 100,
          startDate: '2025-09-01',
          endDate: '2025-12-31'
        }
      ]
    });
    
    await page.reload();
    await page.waitForSelector('[data-testid="utilization-report-page"]');
    
    // Verify charts still render (not blank)
    const chartCanvas = page.locator('[data-testid="utilization-by-person-chart"] canvas');
    await expect(chartCanvas).toBeVisible();
    
    // Get canvas dimensions to ensure it's rendered
    const canvasBox = await chartCanvas.boundingBox();
    expect(canvasBox.width).toBeGreaterThan(0);
    expect(canvasBox.height).toBeGreaterThan(0);
    
    // Verify Frank Test appears in the table with high utilization
    const frankRow = page.locator('tr', { has: page.locator('text="Frank Test"') });
    await expect(frankRow).toBeVisible();
    
    const frankUtilization = await frankRow.locator('[data-testid="utilization-percentage"]').textContent();
    expect(parseInt(frankUtilization)).toBe(250); // 150% + 100%
    
    // Verify the chart Y-axis can accommodate high values
    // This would depend on your chart implementation
    await expect(page.locator('[data-testid="chart-y-axis-max"]')).toHaveText(/[2-3][0-9][0-9]/); // Should show 200-399 range
  });

  test('should export utilization data correctly', async ({ page }) => {
    // Click export button
    await page.click('[data-testid="export-utilization-button"]');
    
    // Wait for download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Export to Excel')
    ]);
    
    // Verify download
    expect(download.suggestedFilename()).toContain('utilization-report');
    expect(download.suggestedFilename()).toContain('.xlsx');
  });

  test('should filter by location and project type', async ({ page }) => {
    // Apply location filter
    await page.selectOption('[data-testid="location-filter"]', 'New York');
    await page.click('[data-testid="apply-filters-button"]');
    
    // Wait for update
    await page.waitForTimeout(500);
    
    // Verify only people from New York are shown
    const tableRows = await page.locator('[data-testid="utilization-table"] tbody tr').count();
    expect(tableRows).toBeGreaterThan(0);
    
    // Apply project type filter
    await page.selectOption('[data-testid="project-type-filter"]', 'Development');
    await page.click('[data-testid="apply-filters-button"]');
    
    // Verify filtered results
    await page.waitForTimeout(500);
    const filteredRows = await page.locator('[data-testid="utilization-table"] tbody tr').count();
    expect(filteredRows).toBeLessThanOrEqual(tableRows);
  });

  test('should navigate to person details from utilization table', async ({ page }) => {
    // Click on a person's name
    await page.click('text=Alice Johnson');
    
    // Should navigate to person details page
    await page.waitForURL(/\/people\/[a-f0-9-]+$/);
    await expect(page.locator('h1:text("Alice Johnson")')).toBeVisible();
    
    // Verify assignment details are shown
    await expect(page.locator('text=Mobile App')).toBeVisible();
    await expect(page.locator('text=40%')).toBeVisible();
  });

  test('should show tooltips on chart hover', async ({ page }) => {
    // Hover over a bar in the utilization chart
    const chart = page.locator('[data-testid="utilization-by-person-chart"]');
    await chart.hover({ position: { x: 100, y: 100 } });
    
    // Wait for tooltip
    await page.waitForSelector('[data-testid="chart-tooltip"]', { timeout: 2000 });
    
    // Verify tooltip content
    const tooltipText = await page.textContent('[data-testid="chart-tooltip"]');
    expect(tooltipText).toContain('%');
    expect(tooltipText).toMatch(/\d+ hours/);
  });
});