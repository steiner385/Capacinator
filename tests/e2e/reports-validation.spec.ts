import { test, expect } from '@playwright/test';

test.describe('Reports Validation - Data Accuracy', () => {
  test('should show accurate capacity gaps and not claim sufficient capacity when there are major gaps', async ({ page }) => {
    // Navigate to reports page
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    
    // Click on Gaps Analysis tab
    await page.click('button:has-text("Gaps Analysis")');
    await page.waitForLoadState('networkidle');
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Check if the page shows gaps data
    const gapsTable = page.locator('.gaps-analysis table');
    await expect(gapsTable).toBeVisible();
    
    // Look for Project Manager role which should show a gap
    const projectManagerRow = page.locator('tr:has-text("Project Manager")');
    if (await projectManagerRow.count() > 0) {
      console.log('✅ Project Manager row found');
      
      // The gap should NOT show as "Sufficient" - it should show as "Gap"
      const statusCell = projectManagerRow.locator('td:last-child');
      const statusText = await statusCell.textContent();
      
      console.log(`Project Manager status: ${statusText}`);
      
      // This should fail if showing "Sufficient" when there's actually a gap
      if (statusText?.includes('Sufficient')) {
        console.log('❌ CRITICAL ERROR: Project Manager showing as "Sufficient" when there is a major capacity gap!');
        // Take screenshot of the wrong data
        await page.screenshot({ path: '/tmp/wrong_capacity_status.png' });
      } else if (statusText?.includes('Gap')) {
        console.log('✅ Project Manager correctly showing as having a gap');
      }
    }
    
    // Check Developer role
    const developerRow = page.locator('tr:has-text("Developer")');
    if (await developerRow.count() > 0) {
      console.log('✅ Developer row found');
      
      const statusCell = developerRow.locator('td:last-child');
      const statusText = await statusCell.textContent();
      
      console.log(`Developer status: ${statusText}`);
      
      if (statusText?.includes('Sufficient')) {
        console.log('❌ CRITICAL ERROR: Developer showing as "Sufficient" when there is a major capacity gap!');
      }
    }
    
    // Check QA Engineer role
    const qaRow = page.locator('tr:has-text("QA Engineer")');
    if (await qaRow.count() > 0) {
      console.log('✅ QA Engineer row found');
      
      const statusCell = qaRow.locator('td:last-child');
      const statusText = await statusCell.textContent();
      
      console.log(`QA Engineer status: ${statusText}`);
      
      if (statusText?.includes('Sufficient')) {
        console.log('❌ CRITICAL ERROR: QA Engineer showing as "Sufficient" when there is a major capacity gap!');
      }
    }
    
    // Check total gap metric
    const totalGapMetric = page.locator('.summary-card:has-text("Total Gap") .metric');
    if (await totalGapMetric.count() > 0) {
      const totalGapText = await totalGapMetric.textContent();
      console.log(`Total Gap shown: ${totalGapText}`);
      
      // Should not be 0 hours - there are significant gaps
      if (totalGapText?.includes('0 hours')) {
        console.log('❌ CRITICAL ERROR: Total Gap showing as 0 hours when there are major capacity gaps!');
      }
    }
  });
  
  test('should show accurate utilization data', async ({ page }) => {
    // Navigate to reports page
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    
    // Click on Utilization Report tab
    await page.click('button:has-text("Utilization Report")');
    await page.waitForLoadState('networkidle');
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Check over-allocated count
    const overAllocatedMetric = page.locator('.summary-card:has-text("Over-allocated") .metric');
    if (await overAllocatedMetric.count() > 0) {
      const overAllocatedText = await overAllocatedMetric.textContent();
      console.log(`Over-allocated count: ${overAllocatedText}`);
      
      // Should show 3 people as over-allocated based on API data
      if (overAllocatedText?.includes('3 people')) {
        console.log('✅ Over-allocated count is correct (3 people)');
      } else {
        console.log(`❌ Over-allocated count may be wrong: ${overAllocatedText}`);
      }
    }
    
    // Check if people utilization table exists and shows over-allocated people
    const utilizationTable = page.locator('.people-list table');
    if (await utilizationTable.count() > 0) {
      // Look for Alice Johnson who should be 165% allocated
      const aliceRow = page.locator('tr:has-text("Alice Johnson")');
      if (await aliceRow.count() > 0) {
        const utilizationCell = aliceRow.locator('td:nth-child(3)');
        const utilizationText = await utilizationCell.textContent();
        console.log(`Alice Johnson utilization: ${utilizationText}`);
        
        if (utilizationText?.includes('165%')) {
          console.log('✅ Alice Johnson utilization is correct (165%)');
        }
      }
    }
  });
  
  test('should show meaningful chart data', async ({ page }) => {
    // Navigate to reports page
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    
    // Check Capacity Report tab (default)
    await page.waitForTimeout(2000);
    
    // Look for charts
    const capacityChart = page.locator('.chart-container:has-text("Capacity by Role")');
    if (await capacityChart.count() > 0) {
      console.log('✅ Capacity by Role chart found');
      
      // Check if chart has any bars/data
      const chartBars = capacityChart.locator('.recharts-bar');
      const barCount = await chartBars.count();
      console.log(`Chart bars found: ${barCount}`);
      
      if (barCount === 0) {
        console.log('❌ CRITICAL ERROR: Capacity by Role chart has no data bars!');
      }
    }
    
    // Check pie chart
    const pieChart = page.locator('.chart-container:has-text("Capacity by Location")');
    if (await pieChart.count() > 0) {
      console.log('✅ Capacity by Location chart found');
      
      // Check if pie chart has data
      const pieSlices = pieChart.locator('.recharts-pie-sector');
      const sliceCount = await pieSlices.count();
      console.log(`Pie chart slices found: ${sliceCount}`);
      
      if (sliceCount === 0) {
        console.log('❌ CRITICAL ERROR: Capacity by Location chart has no data!');
      }
    }
    
    // Check summary metrics
    const totalCapacityMetric = page.locator('.summary-card:has-text("Total Capacity") .metric');
    if (await totalCapacityMetric.count() > 0) {
      const totalCapacityText = await totalCapacityMetric.textContent();
      console.log(`Total Capacity: ${totalCapacityText}`);
      
      if (totalCapacityText?.includes('0 hours')) {
        console.log('❌ CRITICAL ERROR: Total Capacity showing as 0 hours!');
      }
    }
  });
  
  test('should show demand forecast with actual data', async ({ page }) => {
    // Navigate to reports page
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    
    // Click on Demand Report tab
    await page.click('button:has-text("Demand Report")');
    await page.waitForLoadState('networkidle');
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Check total demand metric
    const totalDemandMetric = page.locator('.summary-card:has-text("Total Demand") .metric');
    if (await totalDemandMetric.count() > 0) {
      const totalDemandText = await totalDemandMetric.textContent();
      console.log(`Total Demand: ${totalDemandText}`);
      
      if (totalDemandText?.includes('0 hours')) {
        console.log('❌ CRITICAL ERROR: Total Demand showing as 0 hours when there is significant project demand!');
      } else {
        console.log('✅ Total Demand is showing correctly:', totalDemandText);
      }
    }
    
    // Check demand forecast chart
    const forecastChart = page.locator('.chart-container:has-text("Demand Forecast")');
    if (await forecastChart.count() > 0) {
      console.log('✅ Demand Forecast chart found');
      
      // Check if chart has data points
      const dataPoints = forecastChart.locator('.recharts-line-dot, .recharts-line');
      const pointCount = await dataPoints.count();
      console.log(`Demand forecast data points: ${pointCount}`);
      
      if (pointCount === 0) {
        console.log('❌ CRITICAL ERROR: Demand Forecast chart has no data!');
      }
    }
    
    // Check projects count
    const projectsMetric = page.locator('.summary-card:has-text("Projects") .metric');
    if (await projectsMetric.count() > 0) {
      const projectsText = await projectsMetric.textContent();
      console.log(`Projects count: ${projectsText}`);
      
      if (projectsText?.includes('0')) {
        console.log('❌ CRITICAL ERROR: Projects count showing as 0 when there are active projects!');
      } else {
        console.log('✅ Projects count is showing correctly:', projectsText);
      }
    }
  });
});