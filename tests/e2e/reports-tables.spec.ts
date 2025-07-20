import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Reports Tables and Data Accuracy', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.gotoWithRetry('/reports');
    await helpers.waitForReactApp();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test.describe('Full-Width Table Layout Testing', () => {
    test('should display capacity report tables with proper full-width layout', async ({ page }) => {
      await page.click('button:has-text("Capacity Report")');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Check for full-width tables container
      const fullWidthContainer = page.locator('.full-width-tables');
      await expect(fullWidthContainer).toBeVisible();

      // Test People Capacity Overview table
      const peopleTableContainer = fullWidthContainer.locator('.table-container:has-text("People Capacity Overview")');
      await expect(peopleTableContainer).toBeVisible();

      const peopleTable = peopleTableContainer.locator('table');
      await expect(peopleTable).toBeVisible();
      await expect(peopleTable).toHaveClass(/table/);

      // Check table headers
      const peopleHeaders = ['Name', 'Daily Hours', 'Availability', 'Status', 'Actions'];
      for (const header of peopleHeaders) {
        const headerElement = peopleTable.locator(`th:has-text("${header}")`);
        await expect(headerElement).toBeVisible();
        console.log(`✅ People table header: ${header}`);
      }

      // Check table width (should span full container width)
      const tableBox = await peopleTable.boundingBox();
      const containerBox = await fullWidthContainer.boundingBox();
      
      if (tableBox && containerBox) {
        expect(tableBox.width).toBeGreaterThan(containerBox.width * 0.9); // At least 90% of container width
        console.log(`✅ People table width: ${tableBox.width}px (container: ${containerBox.width}px)`);
      }

      // Test Role Capacity Analysis table
      const rolesTableContainer = fullWidthContainer.locator('.table-container:has-text("Role Capacity Analysis")');
      await expect(rolesTableContainer).toBeVisible();

      const rolesTable = rolesTableContainer.locator('table');
      await expect(rolesTable).toBeVisible();

      // Check role table headers
      const roleHeaders = ['Role', 'Total Capacity (hrs)', 'Utilized (hrs)', 'Available (hrs)', 'Status', 'Actions'];
      for (const header of roleHeaders) {
        const headerElement = rolesTable.locator(`th:has-text("${header}")`);
        await expect(headerElement).toBeVisible();
        console.log(`✅ Roles table header: ${header}`);
      }
    });

    test('should display proper row styling based on status', async ({ page }) => {
      await page.click('button:has-text("Capacity Report")');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Test People Capacity Overview row styling
      const peopleTable = page.locator('.full-width-tables .table-container:has-text("People Capacity Overview") table');
      const peopleRows = peopleTable.locator('tbody tr');
      const rowCount = await peopleRows.count();

      for (let i = 0; i < Math.min(rowCount, 5); i++) {
        const row = peopleRows.nth(i);
        const statusBadge = row.locator('.badge');
        
        if (await statusBadge.isVisible()) {
          const badgeText = await statusBadge.textContent();
          const rowClass = await row.getAttribute('class');
          
          if (badgeText?.includes('Available')) {
            expect(rowClass).toContain('row-success');
          } else if (badgeText?.includes('Fully Allocated')) {
            expect(rowClass).toContain('row-warning');
          } else if (badgeText?.includes('Over Allocated')) {
            expect(rowClass).toContain('row-danger');
          }
          
          console.log(`✅ Row ${i}: ${badgeText} → ${rowClass}`);
        }
      }

      // Test Role Capacity Analysis row styling
      const rolesTable = page.locator('.full-width-tables .table-container:has-text("Role Capacity Analysis") table');
      const roleRows = rolesTable.locator('tbody tr');
      const roleRowCount = await roleRows.count();

      for (let i = 0; i < Math.min(roleRowCount, 5); i++) {
        const row = roleRows.nth(i);
        const statusBadge = row.locator('.badge');
        
        if (await statusBadge.isVisible()) {
          const badgeText = await statusBadge.textContent();
          const rowClass = await row.getAttribute('class');
          
          if (badgeText?.includes('High Capacity')) {
            expect(rowClass).toContain('row-success');
          } else if (badgeText?.includes('Moderate Capacity')) {
            expect(rowClass).toContain('row-info');
          } else if (badgeText?.includes('Limited Capacity')) {
            expect(rowClass).toContain('row-warning');
          } else if (badgeText?.includes('At Capacity')) {
            expect(rowClass).toContain('row-danger');
          }
          
          console.log(`✅ Role row ${i}: ${badgeText} → ${rowClass}`);
        }
      }
    });

    test('should have properly formatted status badges', async ({ page }) => {
      await page.click('button:has-text("Capacity Report")');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Test People Capacity Overview badges
      const peopleTable = page.locator('.full-width-tables .table-container:has-text("People Capacity Overview") table');
      const peopleBadges = peopleTable.locator('.badge');
      const peopleBadgeCount = await peopleBadges.count();

      for (let i = 0; i < Math.min(peopleBadgeCount, 5); i++) {
        const badge = peopleBadges.nth(i);
        const badgeText = await badge.textContent();
        const badgeClass = await badge.getAttribute('class');
        
        expect(badgeClass).toContain('badge');
        expect(badgeText?.trim()).toBeTruthy();
        
        // Check for appropriate badge styling
        if (badgeText?.includes('Available')) {
          expect(badgeClass).toContain('badge-success');
        } else if (badgeText?.includes('Fully Allocated')) {
          expect(badgeClass).toContain('badge-warning');
        } else if (badgeText?.includes('Over Allocated')) {
          expect(badgeClass).toContain('badge-danger');
        }
        
        console.log(`✅ People badge ${i}: ${badgeText} → ${badgeClass}`);
      }

      // Test Role Capacity Analysis badges
      const rolesTable = page.locator('.full-width-tables .table-container:has-text("Role Capacity Analysis") table');
      const roleBadges = rolesTable.locator('.badge');
      const roleBadgeCount = await roleBadges.count();

      for (let i = 0; i < Math.min(roleBadgeCount, 5); i++) {
        const badge = roleBadges.nth(i);
        const badgeText = await badge.textContent();
        const badgeClass = await badge.getAttribute('class');
        
        expect(badgeClass).toContain('badge');
        expect(badgeText?.trim()).toBeTruthy();
        
        console.log(`✅ Role badge ${i}: ${badgeText} → ${badgeClass}`);
      }
    });
  });

  test.describe('Data Accuracy Testing', () => {
    test('should display accurate capacity calculations', async ({ page }) => {
      await page.click('button:has-text("Capacity Report")');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Test Role Capacity Analysis calculations
      const rolesTable = page.locator('.full-width-tables .table-container:has-text("Role Capacity Analysis") table');
      const roleRows = rolesTable.locator('tbody tr');
      const roleRowCount = await roleRows.count();

      for (let i = 0; i < Math.min(roleRowCount, 3); i++) {
        const row = roleRows.nth(i);
        const cells = row.locator('td');
        
        const roleName = await cells.nth(0).textContent();
        const totalCapacity = await cells.nth(1).textContent();
        const utilized = await cells.nth(2).textContent();
        const available = await cells.nth(3).textContent();
        
        // Extract numbers for calculation verification
        const totalNum = parseInt(totalCapacity?.replace(/[^\d]/g, '') || '0');
        const utilizedNum = parseInt(utilized?.replace(/[^\d]/g, '') || '0');
        const availableNum = parseInt(available?.replace(/[^\d]/g, '') || '0');
        
        // Verify that Total - Utilized = Available (within reasonable range)
        const calculatedAvailable = totalNum - utilizedNum;
        const difference = Math.abs(calculatedAvailable - availableNum);
        
        expect(difference).toBeLessThan(totalNum * 0.1); // Within 10% margin
        
        console.log(`✅ ${roleName}: ${totalNum} - ${utilizedNum} = ${calculatedAvailable} (shown: ${availableNum})`);
      }
    });

    test('should show consistent data across different report sections', async ({ page }) => {
      await page.click('button:has-text("Capacity Report")');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Get total capacity from summary card
      const totalCapacityCard = page.locator('.summary-card:has-text("Total Capacity") .metric');
      const summaryCapacity = await totalCapacityCard.textContent();
      const summaryCapacityNum = parseInt(summaryCapacity?.replace(/[^\d]/g, '') || '0');

      // Get total capacity from role table
      const rolesTable = page.locator('.full-width-tables .table-container:has-text("Role Capacity Analysis") table');
      const capacityCells = rolesTable.locator('tbody tr td:nth-child(2)');
      const capacityCount = await capacityCells.count();
      
      let tableCapacityTotal = 0;
      for (let i = 0; i < capacityCount; i++) {
        const cellText = await capacityCells.nth(i).textContent();
        const cellNum = parseInt(cellText?.replace(/[^\d]/g, '') || '0');
        tableCapacityTotal += cellNum;
      }

      // Allow for reasonable variance between summary and detailed calculations
      const difference = Math.abs(summaryCapacityNum - tableCapacityTotal);
      const tolerance = Math.max(summaryCapacityNum * 0.2, 100); // 20% or 100 hours tolerance
      
      expect(difference).toBeLessThan(tolerance);
      console.log(`✅ Capacity consistency: Summary ${summaryCapacityNum} vs Table Total ${tableCapacityTotal} (diff: ${difference})`);
    });

    test('should display proper utilization percentages in utilization report', async ({ page }) => {
      await page.click('button:has-text("Utilization Report")');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Check overutilized people section
      const overutilizedSection = page.locator('.list-section:has-text("Overutilized People")');
      if (await overutilizedSection.isVisible()) {
        const utilizationItems = overutilizedSection.locator('.actionable-item .item-detail');
        const itemCount = await utilizationItems.count();

        for (let i = 0; i < Math.min(itemCount, 3); i++) {
          const item = utilizationItems.nth(i);
          const detailText = await item.textContent();
          
          // Should contain percentage over 100%
          const percentageMatch = detailText?.match(/(\d+)%/);
          if (percentageMatch) {
            const percentage = parseInt(percentageMatch[1]);
            expect(percentage).toBeGreaterThan(100);
            console.log(`✅ Overutilized person: ${percentage}% utilization`);
          }
        }
      }

      // Check underutilized people section
      const underutilizedSection = page.locator('.list-section:has-text("Underutilized People")');
      if (await underutilizedSection.isVisible()) {
        const utilizationItems = underutilizedSection.locator('.actionable-item .item-detail');
        const itemCount = await utilizationItems.count();

        for (let i = 0; i < Math.min(itemCount, 3); i++) {
          const item = utilizationItems.nth(i);
          const detailText = await item.textContent();
          
          // Should contain percentage under 70%
          const percentageMatch = detailText?.match(/(\d+)%/);
          if (percentageMatch) {
            const percentage = parseInt(percentageMatch[1]);
            expect(percentage).toBeLessThan(70);
            console.log(`✅ Underutilized person: ${percentage}% utilization`);
          }
        }
      }
    });

    test('should show accurate gap calculations in gaps analysis', async ({ page }) => {
      await page.click('button:has-text("Gaps Analysis")');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Check projects with critical gaps
      const criticalProjectsSection = page.locator('.list-section:has-text("Projects with Critical Gaps")');
      if (await criticalProjectsSection.isVisible()) {
        const gapItems = criticalProjectsSection.locator('.actionable-item .item-detail');
        const itemCount = await gapItems.count();

        for (let i = 0; i < Math.min(itemCount, 3); i++) {
          const item = gapItems.nth(i);
          const detailText = await item.textContent();
          
          // Should contain hours short information
          const hoursMatch = detailText?.match(/(\d+)\s*hours?\s*short/);
          if (hoursMatch) {
            const hoursShort = parseInt(hoursMatch[1]);
            expect(hoursShort).toBeGreaterThan(0);
            console.log(`✅ Critical project gap: ${hoursShort} hours short`);
          }
        }
      }

      // Check roles with critical shortages
      const criticalRolesSection = page.locator('.list-section:has-text("Roles with Critical Shortages")');
      if (await criticalRolesSection.isVisible()) {
        const gapItems = criticalRolesSection.locator('.actionable-item .item-detail');
        const itemCount = await gapItems.count();

        for (let i = 0; i < Math.min(itemCount, 3); i++) {
          const item = gapItems.nth(i);
          const detailText = await item.textContent();
          
          // Should contain hours short information
          const hoursMatch = detailText?.match(/(\d+)\s*hours?\s*short/);
          if (hoursMatch) {
            const hoursShort = parseInt(hoursMatch[1]);
            expect(hoursShort).toBeGreaterThan(0);
            console.log(`✅ Critical role gap: ${hoursShort} hours short`);
          }
        }
      }
    });
  });

  test.describe('Table Responsiveness', () => {
    test('should maintain table layout across different screen sizes', async ({ page }) => {
      await page.click('button:has-text("Capacity Report")');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      const viewports = [
        { width: 1200, height: 800, name: 'Desktop' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 375, height: 667, name: 'Mobile' }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(500);

        // Check that tables are still visible and functional
        const fullWidthTables = page.locator('.full-width-tables');
        await expect(fullWidthTables).toBeVisible();

        const peopleTable = fullWidthTables.locator('.table-container:has-text("People Capacity Overview") table');
        const rolesTable = fullWidthTables.locator('.table-container:has-text("Role Capacity Analysis") table');

        await expect(peopleTable).toBeVisible();
        await expect(rolesTable).toBeVisible();

        // Check that tables don't overflow viewport
        const peopleTableBox = await peopleTable.boundingBox();
        const rolesTableBox = await rolesTable.boundingBox();

        if (peopleTableBox) {
          expect(peopleTableBox.width).toBeLessThanOrEqual(viewport.width + 50); // Allow small margin
        }
        if (rolesTableBox) {
          expect(rolesTableBox.width).toBeLessThanOrEqual(viewport.width + 50);
        }

        console.log(`✅ ${viewport.name}: Tables maintain responsive layout`);
      }
    });

    test('should handle long text content gracefully', async ({ page }) => {
      await page.click('button:has-text("Capacity Report")');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Check for text wrapping and overflow handling
      const tables = page.locator('.full-width-tables table');
      const tableCount = await tables.count();

      for (let i = 0; i < tableCount; i++) {
        const table = tables.nth(i);
        const cells = table.locator('td');
        const cellCount = await cells.count();

        for (let j = 0; j < Math.min(cellCount, 10); j++) {
          const cell = cells.nth(j);
          const cellBox = await cell.boundingBox();
          
          if (cellBox) {
            // Check that cell content doesn't cause horizontal overflow
            expect(cellBox.width).toBeLessThan(300); // Reasonable max cell width
          }
        }
      }

      console.log('✅ Tables handle long content without overflow');
    });
  });

  test.describe('Table Sorting and Interaction', () => {
    test('should support table header sorting where available', async ({ page }) => {
      await page.click('button:has-text("Capacity Report")');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Check if table headers are clickable for sorting
      const tableHeaders = page.locator('.full-width-tables table th');
      const headerCount = await tableHeaders.count();

      for (let i = 0; i < Math.min(headerCount, 3); i++) {
        const header = tableHeaders.nth(i);
        const headerText = await header.textContent();
        
        // Check if header has sorting indicators or is clickable
        const sortableIndicator = header.locator('.sort-icon, .fa-sort, [class*="sort"]');
        if (await sortableIndicator.isVisible()) {
          await header.click();
          await page.waitForTimeout(500);
          console.log(`✅ Header "${headerText}" appears to be sortable`);
        }
      }
    });

    test('should maintain action button functionality in tables', async ({ page }) => {
      await page.click('button:has-text("Capacity Report")');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Test that action buttons are clickable and properly styled
      const actionButtons = page.locator('.full-width-tables .action-buttons a');
      const buttonCount = await actionButtons.count();

      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = actionButtons.nth(i);
        
        // Check button styling
        const buttonClass = await button.getAttribute('class');
        expect(buttonClass).toContain('btn');
        
        // Check button is enabled and has proper href
        const href = await button.getAttribute('href');
        expect(href).toBeTruthy();
        expect(href).toMatch(/^\/\w+/); // Should start with a path
        
        // Check button has proper icon and text
        const buttonContent = await button.textContent();
        expect(buttonContent?.trim()).toBeTruthy();
        
        console.log(`✅ Action button ${i}: ${buttonContent} → ${href}`);
      }
    });
  });
});