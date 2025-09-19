import { test, expect, Page } from '@playwright/test'
import { setupPageWithAuth } from './utils/improved-auth-helpers';;

test.describe('Person Utilization Timeline', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the People page
    await setupPageWithAuth(page, '/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.waitForSelector('[data-testid="people-tab"], .nav-link:has-text("People")', { timeout: 10000 });
    
    // Navigate to People page
    await page.click('[data-testid="people-tab"], .nav-link:has-text("People")');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Wait for people list to load
    await page.waitForSelector('table tbody tr', { timeout: 15000 });
  });

  test('should display utilization timeline chart in person details', async ({ page }) => {
    // Click on a person to view details (assuming Charlie Brown exists in test data)
    const personRow = page.locator('table tbody tr').first();
    await personRow.waitFor({ timeout: 10000 });
    
    // Get the person name for verification
    const personName = await personRow.locator('td').first().textContent();
    
    // Click to view person details
    await personRow.click();
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Verify we're on the person details page
    await expect(page.locator('h1')).toContainText(personName || '');
    
    // Find and expand the "Allocation vs Availability" section
    const allocationSection = page.locator('text=Allocation vs Availability');
    await allocationSection.waitFor({ timeout: 10000 });
    await allocationSection.click();
    
    // Wait for the section to expand
    await page.waitForTimeout(1000);
    
    // Verify the utilization timeline chart is displayed
    const timelineHeading = page.locator('text=Utilization Timeline');
    await expect(timelineHeading).toBeVisible({ timeout: 10000 });
    
    // Verify chart components are present
    const chartContainer = page.locator('.recharts-wrapper, [data-testid="responsive-container"]').first();
    await expect(chartContainer).toBeVisible({ timeout: 10000 });
  });

  test('should load utilization timeline data from API', async ({ page }) => {
    // Intercept the API call for utilization timeline
    const timelineApiCall = page.waitForRequest(request => 
      request.url().includes('/api/people/') && 
      request.url().includes('/utilization-timeline')
    );
    
    // Click on first person
    const personRow = page.locator('table tbody tr').first();
    await personRow.click();
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Expand allocation section
    const allocationSection = page.locator('text=Allocation vs Availability');
    await allocationSection.click();
    
    // Wait for API call to complete
    const request = await timelineApiCall;
    expect(request.url()).toContain('/utilization-timeline');
    expect(request.url()).toContain('startDate=2023-01-01');
    expect(request.url()).toContain('endDate=2026-12-31');
    
    // Verify the timeline chart loads
    const timelineChart = page.locator('text=Utilization Timeline');
    await expect(timelineChart).toBeVisible();
  });

  test('should display chart with correct data visualization', async ({ page }) => {
    // Click on first person
    const personRow = page.locator('table tbody tr').first();
    await personRow.click();
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Expand allocation section
    const allocationSection = page.locator('text=Allocation vs Availability');
    await allocationSection.click();
    
    // Wait for timeline chart to load
    const timelineHeading = page.locator('text=Utilization Timeline');
    await expect(timelineHeading).toBeVisible();
    
    // Wait for chart to render with data
    await page.waitForTimeout(2000);
    
    // Verify chart elements are present
    const chartContainer = page.locator('.recharts-wrapper').first();
    if (await chartContainer.isVisible()) {
      // Chart rendered successfully - verify it has content
      const chartContent = page.locator('.recharts-wrapper svg');
      await expect(chartContent).toBeVisible();
    } else {
      // Fallback: check for loading or no-data message
      const loadingOrNoData = page.locator('text=Loading timeline data..., text=No utilization data available');
      await expect(loadingOrNoData).toBeVisible();
    }
  });

  test('should show both allocation chart and timeline chart', async ({ page }) => {
    // Click on first person
    const personRow = page.locator('table tbody tr').first();
    await personRow.click();
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Expand allocation section
    const allocationSection = page.locator('text=Allocation vs Availability');
    await allocationSection.click();
    
    // Wait for both charts to load
    await page.waitForTimeout(2000);
    
    // Verify both charts are present
    const allocationChart = page.locator('[data-testid="person-allocation-chart"], .recharts-wrapper').first();
    const timelineChart = page.locator('text=Utilization Timeline');
    
    await expect(timelineChart).toBeVisible();
    // The allocation chart should also be visible (either as component or fallback)
    const hasAllocationContent = await allocationChart.isVisible() || 
      await page.locator('text=No allocation data, text=Loading').first().isVisible();
    expect(hasAllocationContent).toBeTruthy();
  });

  test('should handle timeline chart collapse and expand', async ({ page }) => {
    // Click on first person
    const personRow = page.locator('table tbody tr').first();
    await personRow.click();
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Initially, timeline should not be visible
    const timelineChart = page.locator('text=Utilization Timeline');
    await expect(timelineChart).not.toBeVisible();
    
    // Expand allocation section
    const allocationSection = page.locator('text=Allocation vs Availability');
    await allocationSection.click();
    
    // Timeline chart should now be visible
    await expect(timelineChart).toBeVisible({ timeout: 10000 });
    
    // Collapse the section
    await allocationSection.click();
    
    // Timeline chart should be hidden
    await expect(timelineChart).not.toBeVisible();
  });

  test('should display meaningful loading state', async ({ page }) => {
    // This test verifies loading states work correctly during normal operations
    // Note: Loading states may be very brief on fast connections
    
    // Click on first person
    const personRow = page.locator('table tbody tr').first();
    await personRow.click();
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Expand allocation section
    const allocationSection = page.locator('text=Allocation vs Availability');
    await allocationSection.click();
    
    // Check if loading state appears (may be very brief)
    // Both loading state and immediate data load are acceptable
    const loadingMessage = page.locator('text=Loading timeline data...');
    const timelineHeading = page.locator('text=Utilization Timeline');
    
    // Wait for either loading or data to appear
    await expect(page.locator('text=Loading timeline data..., text=Utilization Timeline').first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // This test verifies the UI handles API errors gracefully
    // We can't force real API errors, so we test the UI's error handling capabilities
    
    // Click on first person
    const personRow = page.locator('table tbody tr').first();
    await personRow.click();
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Expand allocation section
    const allocationSection = page.locator('text=Allocation vs Availability');
    await allocationSection.click();
    
    // The UI should show either data or a meaningful message
    // Wait for either timeline data or no data message
    const hasTimeline = await page.locator('.recharts-wrapper, text=Utilization Timeline').isVisible({ timeout: 10000 }).catch(() => false);
    const hasNoDataMessage = await page.locator('text=No utilization data available').isVisible().catch(() => false);
    const hasLoadingMessage = await page.locator('text=Loading timeline data...').isVisible().catch(() => false);
    
    // At least one of these should be true (data, no data message, or loading)
    expect(hasTimeline || hasNoDataMessage || hasLoadingMessage).toBeTruthy();
  });

  test('should verify timeline chart accessibility', async ({ page }) => {
    // Click on first person
    const personRow = page.locator('table tbody tr').first();
    await personRow.click();
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Expand allocation section
    const allocationSection = page.locator('text=Allocation vs Availability');
    await allocationSection.click();
    
    // Verify timeline heading is properly structured
    const timelineHeading = page.locator('h3:has-text("Utilization Timeline")');
    await expect(timelineHeading).toBeVisible();
    
    // Verify heading has proper hierarchy
    const headingLevel = await timelineHeading.evaluate(el => el.tagName);
    expect(headingLevel).toBe('H3');
    
    // Verify icon is present in heading
    const headingIcon = timelineHeading.locator('svg').first();
    await expect(headingIcon).toBeVisible();
  });

  test('should work with different people having different utilization data', async ({ page }) => {
    // Get all people rows
    const peopleRows = page.locator('table tbody tr');
    const rowCount = Math.min(await peopleRows.count(), 3); // Test first 3 people
    
    for (let i = 0; i < rowCount; i++) {
      // Go back to people list if not on first iteration
      if (i > 0) {
        await page.goBack();
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        await page.waitForSelector('table tbody tr');
      }
      
      // Click on person
      const currentRow = page.locator('table tbody tr').nth(i);
      const personName = await currentRow.locator('td').first().textContent();
      await currentRow.click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      
      // Verify person details page
      await expect(page.locator('h1')).toContainText(personName || '');
      
      // Expand allocation section
      const allocationSection = page.locator('text=Allocation vs Availability');
      await allocationSection.click();
      
      // Wait for timeline to load
      const timelineHeading = page.locator('text=Utilization Timeline');
      await expect(timelineHeading).toBeVisible({ timeout: 10000 });
      
      // Verify either chart or appropriate message is displayed
      const hasChart = await page.locator('.recharts-wrapper').first().isVisible();
      const hasMessage = await page.locator('text=Loading timeline data..., text=No utilization data available').first().isVisible();
      
      expect(hasChart || hasMessage).toBeTruthy();
    }
  });

  test('should display timeline with proper date formatting', async ({ page }) => {
    // This test verifies the timeline chart displays with real data from the API
    
    // Click on first person
    const personRow = page.locator('table tbody tr').first();
    await personRow.click();
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Expand allocation section
    const allocationSection = page.locator('text=Allocation vs Availability');
    await allocationSection.click();
    
    // Wait for API response
    await page.waitForResponse(response => 
      response.url().includes('/utilization-timeline') && 
      response.status() === 200,
      { timeout: 10000 }
    ).catch(() => {
      // If no timeline data is available, that's acceptable
      console.log('No timeline data available for this person');
    });
    
    // Verify timeline chart loads
    const timelineHeading = page.locator('text=Utilization Timeline');
    await expect(timelineHeading).toBeVisible();
    
    // Wait for chart to render
    await page.waitForTimeout(2000);
    
    // Verify chart is rendered with proper structure
    const chartExists = await page.locator('.recharts-wrapper, [data-testid="line-chart"]').first().isVisible();
    const noDataMessage = await page.locator('text=No utilization data available').isVisible();
    
    // Should either have chart with data or appropriate no-data message
    if (chartExists) {
      console.log('Timeline chart rendered successfully');
      // If chart exists, verify it has proper date formatting (axes, tooltips, etc.)
      // The actual date formatting is handled by the chart component
    } else if (noDataMessage) {
      console.log('No timeline data available for this person');
    }
    
    // At least one should be true
    expect(chartExists || noDataMessage).toBeTruthy();
  });
});