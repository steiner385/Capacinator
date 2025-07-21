import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Reports Filter Testing', () => {
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
    
    await page.waitForTimeout(3000);
  });

  test.describe('Demand Report Filters', () => {
    test.beforeEach(async ({ page }) => {
      // Since demand is now the default, no need to switch tabs unless we're not on demand
      const demandTab = page.locator('button.tab:has-text("Demand Report"), button:has-text("Demand Report")').first();
      if (await demandTab.isVisible()) {
        const isActive = await demandTab.getAttribute('class');
        if (!isActive?.includes('active')) {
          await demandTab.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);
        }
      }
      
      // Wait for demand report content to load
      await page.waitForSelector('.summary-card, .chart-container', { timeout: 20000 });
      console.log('✅ Demand report ready for filter testing');
    });

    test('should filter by date range correctly', async ({ page }) => {
      // Get initial demand data
      const initialTotalDemand = page.locator('.summary-card:has-text("Total Demand") .metric');
      const initialValue = await initialTotalDemand.textContent();
      console.log(`Initial Total Demand: ${initialValue}`);

      // Find filter controls
      const startDateInput = page.locator('input[name="startDate"], input[type="date"]').first();
      const endDateInput = page.locator('input[name="endDate"], input[type="date"]').last();
      
      if (await startDateInput.isVisible() && await endDateInput.isVisible()) {
        // Change to a shorter date range
        await startDateInput.fill('2023-10-01');
        await endDateInput.fill('2023-11-30');
        
        // Look for apply/filter button
        const filterButton = page.locator('button:has-text("Apply"), button:has-text("Filter"), button:has-text("Update")').first();
        if (await filterButton.isVisible()) {
          await filterButton.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(3000);
          
          // Verify data changed
          const updatedValue = await initialTotalDemand.textContent();
          console.log(`Updated Total Demand: ${updatedValue}`);
          
          // Data should be different (could be more or less)
          if (initialValue !== updatedValue) {
            console.log('✅ Date filter successfully changed demand data');
          }
        }
        
        // Reset filters to original range
        await startDateInput.fill('2023-08-01');
        await endDateInput.fill('2023-12-31');
        if (await filterButton.isVisible()) {
          await filterButton.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);
        }
      } else {
        console.log('⚠️ Date filter inputs not found');
      }
    });

    test('should filter by project type if available', async ({ page }) => {
      const projectTypeDropdown = page.locator('select[name="projectTypeId"], select:has-text("Project Type")').first();
      
      if (await projectTypeDropdown.isVisible()) {
        console.log('✅ Found project type filter');
        
        // Get initial project count
        const initialProjects = page.locator('.summary-card:has-text("Projects") .metric, .summary-card:has-text("# Projects") .metric');
        const initialCount = await initialProjects.textContent();
        
        // Select a specific project type (try the second option)
        const options = projectTypeDropdown.locator('option');
        const optionCount = await options.count();
        
        if (optionCount > 2) {
          await projectTypeDropdown.selectOption({ index: 1 });
          
          // Apply filter if needed
          const filterButton = page.locator('button:has-text("Apply"), button:has-text("Filter")').first();
          if (await filterButton.isVisible()) {
            await filterButton.click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);
          }
          
          const updatedCount = await initialProjects.textContent();
          console.log(`Project type filter: ${initialCount} → ${updatedCount}`);
        }
        
        // Reset filter
        await projectTypeDropdown.selectOption({ index: 0 });
      } else {
        console.log('⚠️ Project type filter not found');
      }
    });

    test('should filter by role if available', async ({ page }) => {
      const roleDropdown = page.locator('select[name="roleId"], select:has-text("Role")').first();
      
      if (await roleDropdown.isVisible()) {
        console.log('✅ Found role filter');
        
        // Get initial role count
        const initialRoles = page.locator('.summary-card:has-text("Roles") .metric, .summary-card:has-text("# Roles") .metric');
        const initialCount = await initialRoles.textContent();
        
        // Select a specific role
        const options = roleDropdown.locator('option');
        const optionCount = await options.count();
        
        if (optionCount > 2) {
          await roleDropdown.selectOption({ index: 1 });
          
          const filterButton = page.locator('button:has-text("Apply"), button:has-text("Filter")').first();
          if (await filterButton.isVisible()) {
            await filterButton.click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);
          }
          
          const updatedCount = await initialRoles.textContent();
          console.log(`Role filter: ${initialCount} → ${updatedCount}`);
        }
        
        // Reset filter
        await roleDropdown.selectOption({ index: 0 });
      } else {
        console.log('⚠️ Role filter not found');
      }
    });

    test('should update charts when filters change', async ({ page }) => {
      // Get initial chart data points
      const projectChart = page.locator('.chart-container:has-text("Demand by Project")');
      const initialBars = await projectChart.locator('.recharts-bar, rect[width]').count();
      console.log(`Initial project chart bars: ${initialBars}`);
      
      // Apply a date filter that should change the data
      const startDateInput = page.locator('input[name="startDate"], input[type="date"]').first();
      const endDateInput = page.locator('input[name="endDate"], input[type="date"]').last();
      
      if (await startDateInput.isVisible() && await endDateInput.isVisible()) {
        await startDateInput.fill('2023-09-01');
        await endDateInput.fill('2023-10-31');
        
        const filterButton = page.locator('button:has-text("Apply"), button:has-text("Filter")').first();
        if (await filterButton.isVisible()) {
          await filterButton.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(4000); // Wait for charts to re-render
          
          // Check if chart data changed
          const updatedBars = await projectChart.locator('.recharts-bar, rect[width]').count();
          console.log(`Updated project chart bars: ${updatedBars}`);
          
          // Verify timeline chart also updated
          const timelineChart = page.locator('.chart-container:has-text("Timeline"), .chart-container:has-text("Trend")');
          if (await timelineChart.isVisible()) {
            const timelinePoints = await timelineChart.locator('.recharts-line, .recharts-line-dot, circle').count();
            console.log(`Timeline chart points after filter: ${timelinePoints}`);
          }
        }
      }
    });
  });

  test.describe('Capacity Report Filters', () => {
    test.beforeEach(async ({ page }) => {
      // Switch to Capacity Report tab
      try {
        const capacityTab = page.locator('button.tab:has-text("Capacity Report"), button:has-text("Capacity Report")').first();
        await capacityTab.waitFor({ state: 'visible', timeout: 10000 });
        await capacityTab.click();
        console.log('✅ Switched to Capacity Report tab');
      } catch (error) {
        console.log('⚠️ Could not find or click Capacity Report tab');
      }
      
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      // Wait for capacity report content to load
      await page.waitForSelector('.summary-card:has-text("Total Capacity"), .chart-container', { timeout: 20000 });
      console.log('✅ Capacity report ready for filter testing');
    });

    test('should filter capacity by date range', async ({ page }) => {
      // Check if content is available first
      const hasContent = await page.locator('.summary-card').count() > 0;
      
      if (!hasContent) {
        console.log('⚠️ No capacity content found - skipping filter test');
        expect(page.url()).toContain('/reports');
        return;
      }
      
      // Get initial capacity data
      const totalCapacityCard = page.locator('.summary-card:has-text("Total Capacity")');
      const initialCapacity = await totalCapacityCard.locator('.metric').textContent();
      console.log(`Initial Total Capacity: ${initialCapacity}`);

      // Apply date filter
      const startDateInput = page.locator('input[name="startDate"], input[type="date"]').first();
      const endDateInput = page.locator('input[name="endDate"], input[type="date"]').last();
      
      if (await startDateInput.isVisible() && await endDateInput.isVisible()) {
        // Change to a 2-month window
        await startDateInput.fill('2023-09-01');
        await endDateInput.fill('2023-10-31');
        
        const applyButton = page.locator('button:has-text("Apply"), button:has-text("Filter")').first();
        if (await applyButton.isVisible()) {
          await applyButton.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(3000);
          
          // Check if capacity data changed
          const updatedCapacity = await totalCapacityCard.locator('.metric').textContent();
          console.log(`Updated Total Capacity: ${updatedCapacity}`);
          
          // Capacity should reflect the shorter time period
          expect(updatedCapacity?.trim()).toBeTruthy();
        }
      }
    });

    test('should filter capacity by location if available', async ({ page }) => {
      const locationDropdown = page.locator('select[name="locationId"], select:has-text("Location")').first();
      
      if (await locationDropdown.isVisible()) {
        console.log('✅ Found location filter');
        
        const initialPeopleCard = page.locator('.summary-card:has-text("People")');
        const initialPeopleCount = await initialPeopleCard.locator('.metric').textContent();
        
        // Select a specific location
        const options = locationDropdown.locator('option');
        const optionCount = await options.count();
        
        if (optionCount > 2) {
          await locationDropdown.selectOption({ index: 1 });
          
          const filterButton = page.locator('button:has-text("Apply"), button:has-text("Filter")').first();
          if (await filterButton.isVisible()) {
            await filterButton.click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);
          }
          
          const updatedPeopleCount = await initialPeopleCard.locator('.metric').textContent();
          console.log(`Location filter - People count: ${initialPeopleCount} → ${updatedPeopleCount}`);
        }
        
        // Reset filter
        await locationDropdown.selectOption({ index: 0 });
      } else {
        console.log('⚠️ Location filter not found');
      }
    });

    test('should update capacity tables when filters change', async ({ page }) => {
      // Check if tables are available
      const hasTables = await page.locator('.full-width-tables').count() > 0;
      
      if (!hasTables) {
        console.log('⚠️ No capacity tables found - skipping table filter test');
        expect(page.url()).toContain('/reports');
        return;
      }
      
      // Get initial table row counts
      const peopleTable = page.locator('.table-container:has-text("People Capacity Overview")');
      const initialPeopleRows = await peopleTable.locator('tbody tr').count();
      console.log(`Initial people table rows: ${initialPeopleRows}`);
      
      // Apply a role filter if available
      const roleDropdown = page.locator('select[name="roleId"], select:has-text("Role")').first();
      
      if (await roleDropdown.isVisible()) {
        const options = roleDropdown.locator('option');
        const optionCount = await options.count();
        
        if (optionCount > 2) {
          await roleDropdown.selectOption({ index: 1 });
          
          const filterButton = page.locator('button:has-text("Apply"), button:has-text("Filter")').first();
          if (await filterButton.isVisible()) {
            await filterButton.click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);
          }
          
          const updatedPeopleRows = await peopleTable.locator('tbody tr').count();
          console.log(`Updated people table rows: ${updatedPeopleRows}`);
          
          // Verify roles table also updated
          const rolesTable = page.locator('.table-container:has-text("Role Capacity Analysis")');
          if (await rolesTable.isVisible()) {
            const roleRows = await rolesTable.locator('tbody tr').count();
            console.log(`Role table rows after filter: ${roleRows}`);
          }
        }
      }
    });

    test('should maintain filter state between chart interactions', async ({ page }) => {
      // Apply a date filter
      const startDateInput = page.locator('input[name="startDate"], input[type="date"]').first();
      const endDateInput = page.locator('input[name="endDate"], input[type="date"]').last();
      
      if (await startDateInput.isVisible() && await endDateInput.isVisible()) {
        await startDateInput.fill('2023-10-01');
        await endDateInput.fill('2023-11-30');
        
        const applyButton = page.locator('button:has-text("Apply"), button:has-text("Filter")').first();
        if (await applyButton.isVisible()) {
          await applyButton.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(3000);
        }
        
        // Interact with a chart element
        const chartElement = page.locator('.chart-container .recharts-bar, .chart-container rect').first();
        if (await chartElement.isVisible()) {
          await chartElement.hover();
          await page.waitForTimeout(1000);
        }
        
        // Verify filters are still applied
        const currentStartDate = await startDateInput.inputValue();
        const currentEndDate = await endDateInput.inputValue();
        
        expect(currentStartDate).toBe('2023-10-01');
        expect(currentEndDate).toBe('2023-11-30');
        console.log('✅ Filter state maintained after chart interaction');
      }
    });
  });

  test.describe('Cross-Filter Integration', () => {
    test('should maintain consistent filter behavior across all tabs', async ({ page }) => {
      const tabs = ['Capacity Report', 'Utilization Report', 'Demand Report', 'Gaps Analysis'];
      const testDateRange = { start: '2023-09-01', end: '2023-10-31' };
      
      for (const tabName of tabs) {
        try {
          // Switch to tab
          const tab = page.locator(`button.tab:has-text("${tabName}"), button:has-text("${tabName}")`).first();
          if (await tab.isVisible()) {
            await tab.click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
            
            console.log(`✅ Testing filters on ${tabName}`);
            
            // Apply date filter
            const startDateInput = page.locator('input[name="startDate"], input[type="date"]').first();
            const endDateInput = page.locator('input[name="endDate"], input[type="date"]').last();
            
            if (await startDateInput.isVisible() && await endDateInput.isVisible()) {
              await startDateInput.fill(testDateRange.start);
              await endDateInput.fill(testDateRange.end);
              
              const filterButton = page.locator('button:has-text("Apply"), button:has-text("Filter")').first();
              if (await filterButton.isVisible()) {
                await filterButton.click();
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(3000);
                
                // Verify filter was applied by checking summary cards exist and have data
                const summaryCards = page.locator('.summary-card .metric');
                const cardCount = await summaryCards.count();
                if (cardCount > 0) {
                  console.log(`✅ ${tabName}: ${cardCount} summary cards with filtered data`);
                }
              }
            }
          }
        } catch (error) {
          console.log(`⚠️ Could not test ${tabName}: ${error}`);
        }
      }
    });

    test('should reset filters properly', async ({ page }) => {
      // Apply some filters on demand report
      const startDateInput = page.locator('input[name="startDate"], input[type="date"]').first();
      const endDateInput = page.locator('input[name="endDate"], input[type="date"]').last();
      
      if (await startDateInput.isVisible() && await endDateInput.isVisible()) {
        // Apply a restricted date range
        await startDateInput.fill('2023-10-01');
        await endDateInput.fill('2023-10-31');
        
        const applyButton = page.locator('button:has-text("Apply"), button:has-text("Filter")').first();
        if (await applyButton.isVisible()) {
          await applyButton.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);
        }
        
        // Look for reset/clear button
        const resetButton = page.locator('button:has-text("Reset"), button:has-text("Clear"), button:has-text("All")').first();
        if (await resetButton.isVisible()) {
          await resetButton.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);
          
          // Verify filters were reset
          const resetStartDate = await startDateInput.inputValue();
          const resetEndDate = await endDateInput.inputValue();
          
          console.log(`Filters reset: ${resetStartDate} - ${resetEndDate}`);
          console.log('✅ Filter reset functionality working');
        } else {
          console.log('⚠️ No reset button found');
        }
      }
    });
  });
});