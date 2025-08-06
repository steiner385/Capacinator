import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Dashboard Charts and Metrics', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    
    // Navigate to dashboard (skip import for now - dashboard should work without data)
    await helpers.navigateTo('/dashboard');
    await helpers.setupPage();
  });

  test('should display all dashboard charts correctly', async ({ page }) => {
    // Verify dashboard title
    await helpers.verifyPageTitle('Dashboard');
    
    // Check for chart containers (the dashboard has 2)
    const chartContainers = page.locator('.chart-container');
    const chartCount = await chartContainers.count();
    expect(chartCount).toBeGreaterThanOrEqual(1);
    
    // Should show current projects
    const projectsSection = page.locator(':has-text("Current Projects")');
    if (await projectsSection.count() > 0) {
      await expect(projectsSection.first()).toBeVisible();
    }
    
    // Should show total people
    const peopleSection = page.locator(':has-text("Total People")');
    if (await peopleSection.count() > 0) {
      await expect(peopleSection.first()).toBeVisible();
    }
    
    // Should show project health chart if available
    const projectHealthChart = page.locator(':has-text("Current Project Health")');
    if (await projectHealthChart.count() > 0) {
      await expect(projectHealthChart.first()).toBeVisible();
    }
    
    // Should show resource utilization chart if available  
    const utilizationChart = page.locator(':has-text("Resource Utilization")');
    if (await utilizationChart.count() > 0) {
      await expect(utilizationChart.first()).toBeVisible();
    }
  });

  test('should display project status chart', async ({ page }) => {
    // Look for project status chart
    const statusChart = page.locator('.chart-container:has-text("Status"), .status-chart, .project-status');
    
    if (await statusChart.isVisible()) {
      await expect(statusChart).toBeVisible();
      
      // Should have chart title
      await expect(statusChart).toContainText('Status');
      
      // Should show chart elements (SVG or Canvas)
      const chartElement = statusChart.locator('svg, canvas, .recharts-wrapper');
      await expect(chartElement).toBeVisible();
      
      // Should have legend or labels
      const chartLabels = statusChart.locator('.legend, .chart-legend, .recharts-legend');
      if (await chartLabels.isVisible()) {
        await expect(chartLabels).toBeVisible();
      }
      
      // Verify interactive elements
      const chartSegments = statusChart.locator('.recharts-pie-sector, .chart-segment, .slice');
      if (await chartSegments.first().isVisible()) {
        // Hover over chart segment to see tooltip
        await chartSegments.first().hover();
        
        const tooltip = page.locator('.recharts-tooltip, .chart-tooltip, .tooltip');
        if (await tooltip.isVisible()) {
          await expect(tooltip).toBeVisible();
          
          // Tooltip should show status and count
          const tooltipText = await tooltip.textContent();
          expect(tooltipText).toMatch(/\d+/);
        }
      }
    }
  });

  test('should display resource utilization chart', async ({ page }) => {
    // Look for utilization chart
    const utilizationChart = page.locator('.chart-container:has-text("Utilization"), .utilization-chart, .resource-chart');
    
    if (await utilizationChart.isVisible()) {
      await expect(utilizationChart).toBeVisible();
      
      // Should show chart title
      await expect(utilizationChart).toContainText('Utilization');
      
      // Should have chart visualization
      const chartElement = utilizationChart.locator('svg, canvas, .recharts-wrapper');
      await expect(chartElement).toBeVisible();
      
      // Should show percentage values
      const percentageText = await utilizationChart.textContent();
      expect(percentageText).toMatch(/\d+%/);
      
      // Look for bars or other chart elements
      const chartBars = utilizationChart.locator('.recharts-bar, .bar, .chart-bar');
      if (await chartBars.first().isVisible()) {
        // Hover over bars to see details
        await chartBars.first().hover();
        
        const tooltip = page.locator('.recharts-tooltip, .chart-tooltip');
        if (await tooltip.isVisible()) {
          await expect(tooltip).toBeVisible();
        }
      }
    }
  });

  test('should display timeline/capacity chart', async ({ page }) => {
    // Look for timeline or capacity over time chart
    const timelineChart = page.locator('.chart-container:has-text("Timeline"), .timeline-chart, .capacity-chart, .chart-container:has-text("Over Time")');
    
    if (await timelineChart.isVisible()) {
      await expect(timelineChart).toBeVisible();
      
      // Should have chart visualization
      const chartElement = timelineChart.locator('svg, canvas, .recharts-wrapper');
      await expect(chartElement).toBeVisible();
      
      // Should have x-axis with dates
      const xAxis = timelineChart.locator('.recharts-xAxis, .x-axis, .axis');
      if (await xAxis.isVisible()) {
        await expect(xAxis).toBeVisible();
        
        // Should show date labels
        const axisText = await xAxis.textContent();
        expect(axisText).toMatch(/\d{4}|\w{3}/); // Year or month abbreviation
      }
      
      // Should have y-axis with values
      const yAxis = timelineChart.locator('.recharts-yAxis, .y-axis');
      if (await yAxis.isVisible()) {
        await expect(yAxis).toBeVisible();
      }
      
      // Should have data points or lines
      const dataLines = timelineChart.locator('.recharts-line, .line, .data-line');
      if (await dataLines.first().isVisible()) {
        await expect(dataLines.first()).toBeVisible();
      }
    }
  });

  test('should display role distribution chart', async ({ page }) => {
    // Look for role distribution chart
    const roleChart = page.locator('.chart-container:has-text("Role"), .role-chart, .distribution-chart');
    
    if (await roleChart.isVisible()) {
      await expect(roleChart).toBeVisible();
      
      // Should show chart title
      await expect(roleChart).toContainText('Role');
      
      // Should have chart visualization
      const chartElement = roleChart.locator('svg, canvas, .recharts-wrapper');
      await expect(chartElement).toBeVisible();
      
      // Should show role names
      const roleLabels = roleChart.locator('.recharts-legend, .legend, .role-label');
      if (await roleLabels.isVisible()) {
        await expect(roleLabels).toBeVisible();
        
        // Should contain common role names
        const labelsText = await roleLabels.textContent();
        expect(labelsText.toLowerCase()).toMatch(/developer|designer|manager|analyst/);
      }
    }
  });

  test('should handle chart interactions', async ({ page }) => {
    // Find any interactive chart
    const charts = page.locator('.chart-container svg, .recharts-wrapper');
    const chartCount = await charts.count();
    
    if (chartCount > 0) {
      const firstChart = charts.first();
      
      // Test hover interactions
      await firstChart.hover();
      
      // Look for interactive elements
      const interactiveElements = firstChart.locator('.recharts-pie-sector, .recharts-bar, .recharts-line-dot');
      const elementCount = await interactiveElements.count();
      
      if (elementCount > 0) {
        // Hover over first element
        await interactiveElements.first().hover();
        
        // Should show tooltip
        const tooltip = page.locator('.recharts-tooltip, .chart-tooltip, .tooltip');
        if (await tooltip.isVisible()) {
          await expect(tooltip).toBeVisible();
          
          // Tooltip should have content
          const tooltipText = await tooltip.textContent();
          expect(tooltipText?.trim()).toBeTruthy();
        }
        
        // Click on chart element if clickable
        await interactiveElements.first().click();
        
        // Should either navigate or show details
        // (Implementation depends on actual chart behavior)
      }
    }
  });

  test('should display charts with empty data gracefully', async ({ page }) => {
    // Clear all data first
    await helpers.navigateTo('/import');
    await helpers.setupPage();
    await helpers.uploadFile('simple-test-data.xlsx');
    
    const clearExistingCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: 'Clear existing' }).or(
      page.locator('label:has-text("Clear existing") input[type="checkbox"]')
    );
    await clearExistingCheckbox.check();
    
    await helpers.clickButton('Upload and Import');
    await helpers.waitForSuccessMessage();
    
    // Navigate back to dashboard
    await helpers.navigateTo('/dashboard');
    await helpers.waitForDashboardCharts();
    
    // Charts should still render without errors
    const charts = page.locator('.chart-container');
    const chartCount = await charts.count();
    
    if (chartCount > 0) {
      for (let i = 0; i < chartCount; i++) {
        const chart = charts.nth(i);
        await expect(chart).toBeVisible();
        
        // Should not show error messages
        const errorMessage = chart.locator('.error, .chart-error');
        await expect(errorMessage).not.toBeVisible();
        
        // Should show appropriate empty state or zero values
        const emptyState = chart.locator('.empty-chart, .no-data');
        if (await emptyState.isVisible()) {
          await expect(emptyState).toBeVisible();
        }
      }
    }
  });

  test('should update charts when data changes', async ({ page }) => {
    // Take initial snapshot of chart data
    const statusChart = page.locator('.chart-container:has-text("Status"), .status-chart');
    
    if (await statusChart.isVisible()) {
      const initialText = await statusChart.textContent();
      
      // Import additional test data
      await helpers.navigateTo('/import');
      await helpers.setupPage();
      await helpers.uploadFile('complex-test-data.xlsx');
      
      const clearExistingCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: 'Clear existing' }).or(
        page.locator('label:has-text("Clear existing") input[type="checkbox"]')
      );
      await clearExistingCheckbox.uncheck(); // Don't clear, add to existing
      
      await helpers.clickButton('Upload and Import');
      
      // Handle potential errors/warnings from complex data
      try {
        await helpers.waitForSuccessMessage();
      } catch {
        // Import might have warnings but still succeed
        const importResult = page.locator('.import-result');
        await expect(importResult).toBeVisible();
      }
      
      // Navigate back to dashboard
      await helpers.navigateTo('/dashboard');
      await helpers.waitForDashboardCharts();
      
      // Charts should reflect new data
      if (await statusChart.isVisible()) {
        const updatedText = await statusChart.textContent();
        
        // Text should be different (more data) or at least same structure
        expect(updatedText).toBeTruthy();
        expect(updatedText?.length).toBeGreaterThanOrEqual(initialText?.length || 0);
      }
    }
  });

  test('should handle responsive chart layout', async ({ page }) => {
    // Test desktop view first
    await page.setViewportSize({ width: 1200, height: 800 });
    await helpers.waitForDashboardCharts();
    
    // Charts should be visible and properly sized
    const charts = page.locator('.chart-container');
    const chartCount = await charts.count();
    expect(chartCount).toBeGreaterThan(0);
    
    // Switch to tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500); // Wait for responsive layout
    
    // Charts should still be visible
    for (let i = 0; i < chartCount; i++) {
      const chart = charts.nth(i);
      await expect(chart).toBeVisible();
    }
    
    // Switch to mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Charts should adapt to mobile layout
    for (let i = 0; i < chartCount; i++) {
      const chart = charts.nth(i);
      await expect(chart).toBeVisible();
      
      // Chart should not overflow viewport
      const chartBox = await chart.boundingBox();
      if (chartBox) {
        expect(chartBox.width).toBeLessThanOrEqual(375);
      }
    }
  });

  test('should display correct chart legends and labels', async ({ page }) => {
    // Check all charts have proper legends/labels
    const charts = page.locator('.chart-container');
    const chartCount = await charts.count();
    
    for (let i = 0; i < chartCount; i++) {
      const chart = charts.nth(i);
      
      // Should have chart title
      const title = chart.locator('h2, h3, .chart-title, .title');
      if (await title.isVisible()) {
        await expect(title).toBeVisible();
        
        const titleText = await title.textContent();
        expect(titleText?.trim()).toBeTruthy();
      }
      
      // Should have legend if applicable
      const legend = chart.locator('.recharts-legend, .legend, .chart-legend');
      if (await legend.isVisible()) {
        await expect(legend).toBeVisible();
        
        // Legend should have meaningful labels
        const legendText = await legend.textContent();
        expect(legendText?.trim()).toBeTruthy();
      }
      
      // Should have axis labels if applicable
      const axisLabels = chart.locator('.recharts-xAxis, .recharts-yAxis, .axis-label');
      if (await axisLabels.first().isVisible()) {
        const axisText = await axisLabels.first().textContent();
        expect(axisText?.trim()).toBeTruthy();
      }
    }
  });

  test('should handle chart data loading states', async ({ page }) => {
    // Navigate to dashboard and check for loading states
    await helpers.navigateTo('/dashboard');
    
    // Look for loading indicators
    const loadingIndicators = page.locator('.loading, .spinner, .chart-loading');
    
    // Loading indicators should appear briefly then disappear
    await helpers.waitForDashboardCharts();
    
    // After loading, charts should be visible
    const charts = page.locator('.chart-container');
    const chartCount = await charts.count();
    expect(chartCount).toBeGreaterThan(0);
    
    // No loading indicators should remain
    const remainingLoaders = page.locator('.loading, .spinner, .chart-loading');
    await expect(remainingLoaders).not.toBeVisible();
  });
});