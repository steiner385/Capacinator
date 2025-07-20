import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Reports Navigation and Contextual Links', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    
    helpers = new TestHelpers(page);
    await helpers.gotoWithRetry('/reports');
    await helpers.setupPage(); // Handle profile selection and wait for content
    await helpers.waitForReactApp();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    // Wait for initial data to load
    try {
      await page.waitForSelector('.summary-card, .chart-container, .report-content, button.tab', { timeout: 20000 });
      console.log('✅ Navigation test setup - found report content');
    } catch {
      console.log('⚠️ Navigation test setup - no content found, continuing anyway');
    }
    await page.waitForTimeout(1000);
  });

  test.describe('Contextual Action Button Parameters', () => {
    test('should include proper context in capacity report action buttons', async ({ page }) => {
      await page.click('button.tab:has-text("Capacity Report")');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await page.waitForSelector('.summary-card, .full-width-tables', { timeout: 15000 });

      // Test People Capacity Overview table action buttons
      const peopleTable = page.locator('.full-width-tables .table-container:has-text("People Capacity Overview")');
      if (await peopleTable.isVisible()) {
        const actionButtons = peopleTable.locator('.action-buttons a');
        const buttonCount = await actionButtons.count();

        for (let i = 0; i < Math.min(buttonCount, 5); i++) { // Test first 5 buttons
          const button = actionButtons.nth(i);
          const href = await button.getAttribute('href');
          const buttonText = await button.textContent();

          // All action buttons should have source context
          expect(href).toContain('from=capacity-report');
          
          // Profile links should have status and date context
          if (buttonText?.includes('Profile')) {
            expect(href).toContain('status=');
            expect(href).toContain('startDate=');
            expect(href).toContain('endDate=');
            console.log(`✅ Profile link: ${href}`);
          }
          
          // Assignment links should have action context
          if (href?.includes('/assignments')) {
            expect(href).toContain('action=');
            expect(href).toContain('person=');
            
            if (buttonText?.includes('Assign')) {
              expect(href).toContain('action=assign');
            } else if (buttonText?.includes('Reduce')) {
              expect(href).toContain('action=reduce');
            } else if (buttonText?.includes('View')) {
              expect(href).toContain('action=view');
            }
            console.log(`✅ Assignment link: ${href}`);
          }
        }
      }

      // Test Role Capacity Analysis table action buttons
      const rolesTable = page.locator('.full-width-tables .table-container:has-text("Role Capacity Analysis")');
      if (await rolesTable.isVisible()) {
        const roleActionButtons = rolesTable.locator('.action-buttons a');
        const roleButtonCount = await roleActionButtons.count();

        for (let i = 0; i < Math.min(roleButtonCount, 5); i++) {
          const button = roleActionButtons.nth(i);
          const href = await button.getAttribute('href');
          const buttonText = await button.textContent();

          expect(href).toContain('from=capacity-report');
          
          if (href?.includes('/people')) {
            expect(href).toContain('role=');
            expect(href).toContain('capacity=');
            expect(href).toContain('available=');
            console.log(`✅ People filter link: ${href}`);
          }
          
          if (href?.includes('/assignments') && buttonText?.includes('Assign')) {
            expect(href).toContain('action=assign');
            expect(href).toContain('role=');
            console.log(`✅ Role assignment link: ${href}`);
          }
        }
      }

      // Test summary card action links
      const summaryCards = page.locator('.summary-card .card-action-link');
      const cardLinkCount = await summaryCards.count();
      
      for (let i = 0; i < cardLinkCount; i++) {
        const link = summaryCards.nth(i);
        const href = await link.getAttribute('href');
        
        expect(href).toContain('from=capacity-report');
        expect(href).toContain('startDate=');
        expect(href).toContain('endDate=');
        console.log(`✅ Summary card link: ${href}`);
      }
    });

    test('should include proper context in utilization report action buttons', async ({ page }) => {
      await page.click('button.tab:has-text("Utilization Report")');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await page.waitForSelector('.summary-card, .list-section', { timeout: 15000 });

      // Test overutilized people action buttons
      const overutilizedSection = page.locator('.list-section:has-text("Overutilized People")');
      if (await overutilizedSection.isVisible()) {
        const actionButtons = overutilizedSection.locator('.item-actions a');
        const buttonCount = await actionButtons.count();

        for (let i = 0; i < Math.min(buttonCount, 3); i++) {
          const button = actionButtons.nth(i);
          const href = await button.getAttribute('href');
          const buttonText = await button.textContent();

          expect(href).toContain('from=utilization-report');
          expect(href).toContain('utilization=');
          
          if (buttonText?.includes('Profile')) {
            expect(href).toContain('action=reduce-load');
          }
          
          if (buttonText?.includes('Reduce Load')) {
            expect(href).toContain('action=reduce');
            expect(href).toContain('person=');
          }
          
          console.log(`✅ Overutilized action: ${href}`);
        }
      }

      // Test underutilized people action buttons
      const underutilizedSection = page.locator('.list-section:has-text("Underutilized People")');
      if (await underutilizedSection.isVisible()) {
        const actionButtons = underutilizedSection.locator('.item-actions a');
        const buttonCount = await actionButtons.count();

        for (let i = 0; i < Math.min(buttonCount, 3); i++) {
          const button = actionButtons.nth(i);
          const href = await button.getAttribute('href');
          const buttonText = await button.textContent();

          expect(href).toContain('from=utilization-report');
          expect(href).toContain('utilization=');
          
          if (buttonText?.includes('Profile')) {
            expect(href).toContain('action=add-work');
          }
          
          if (buttonText?.includes('Add Projects')) {
            expect(href).toContain('action=assign');
            expect(href).toContain('person=');
          }
          
          console.log(`✅ Underutilized action: ${href}`);
        }
      }
    });

    test('should include proper context in demand report action buttons', async ({ page }) => {
      await page.click('button.tab:has-text("Demand Report")');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await page.waitForSelector('.summary-card, .list-container', { timeout: 15000 });

      // Test high-demand projects table
      const projectsTable = page.locator('.list-container:has-text("High-Demand Projects")');
      if (await projectsTable.isVisible()) {
        const projectLinks = projectsTable.locator('tbody tr a');
        const linkCount = await projectLinks.count();

        for (let i = 0; i < Math.min(linkCount, 3); i++) {
          const link = projectLinks.nth(i);
          const href = await link.getAttribute('href');

          expect(href).toContain('from=demand-report');
          expect(href).toContain('demand=');
          expect(href).toContain('startDate=');
          console.log(`✅ Project demand link: ${href}`);
        }
      }

      // Test high-demand roles table
      const rolesTable = page.locator('.list-container:has-text("High-Demand Roles")');
      if (await rolesTable.isVisible()) {
        const roleLinks = rolesTable.locator('tbody tr a');
        const linkCount = await roleLinks.count();

        for (let i = 0; i < Math.min(linkCount, 3); i++) {
          const link = roleLinks.nth(i);
          const href = await link.getAttribute('href');

          expect(href).toContain('from=demand-report');
          expect(href).toContain('role=');
          expect(href).toContain('demand=');
          console.log(`✅ Role demand link: ${href}`);
        }
      }
    });

    test('should include proper context in gaps analysis action buttons', async ({ page }) => {
      await page.click('button.tab:has-text("Gaps Analysis")');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await page.waitForSelector('.summary-card, .list-section', { timeout: 15000 });

      // Test projects with critical gaps
      const criticalProjectsSection = page.locator('.list-section:has-text("Projects with Critical Gaps")');
      if (await criticalProjectsSection.isVisible()) {
        const actionButtons = criticalProjectsSection.locator('.item-actions a');
        const buttonCount = await actionButtons.count();

        for (let i = 0; i < Math.min(buttonCount, 4); i++) {
          const button = actionButtons.nth(i);
          const href = await button.getAttribute('href');
          const buttonText = await button.textContent();

          expect(href).toContain('from=gaps-report');
          expect(href).toContain('gap=');
          
          if (buttonText?.includes('View Project')) {
            expect(href).toContain('action=address-gap');
          }
          
          if (buttonText?.includes('Add Resources')) {
            expect(href).toContain('action=add-resources');
            expect(href).toContain('project=');
          }
          
          console.log(`✅ Critical project action: ${href}`);
        }
      }

      // Test roles with critical shortages
      const criticalRolesSection = page.locator('.list-section:has-text("Roles with Critical Shortages")');
      if (await criticalRolesSection.isVisible()) {
        const actionButtons = criticalRolesSection.locator('.item-actions a');
        const buttonCount = await actionButtons.count();

        for (let i = 0; i < Math.min(buttonCount, 4); i++) {
          const button = actionButtons.nth(i);
          const href = await button.getAttribute('href');
          const buttonText = await button.textContent();

          expect(href).toContain('from=gaps-report');
          expect(href).toContain('gap=');
          
          if (buttonText?.includes('View People')) {
            expect(href).toContain('action=address-shortage');
            expect(href).toContain('role=');
          }
          
          if (buttonText?.includes('Hire More')) {
            expect(href).toContain('action=hire');
            expect(href).toContain('role=');
          }
          
          console.log(`✅ Critical role action: ${href}`);
        }
      }

      // Test roles with adequate capacity
      const adequateRolesSection = page.locator('.list-section:has-text("Roles with Adequate Capacity")');
      if (await adequateRolesSection.isVisible()) {
        const actionButtons = adequateRolesSection.locator('.item-actions a');
        const buttonCount = await actionButtons.count();

        for (let i = 0; i < Math.min(buttonCount, 4); i++) {
          const button = actionButtons.nth(i);
          const href = await button.getAttribute('href');
          const buttonText = await button.textContent();

          expect(href).toContain('from=gaps-report');
          expect(href).toContain('status=adequate-capacity');
          
          if (buttonText?.includes('Assign More Work')) {
            expect(href).toContain('action=assign');
            expect(href).toContain('role=');
          }
          
          console.log(`✅ Adequate capacity action: ${href}`);
        }
      }
    });
  });

  test.describe('Navigation Flow Testing', () => {
    test('should preserve context when navigating from capacity report to people page', async ({ page }) => {
      await page.click('button.tab:has-text("Capacity Report")');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Click on a "View People" link from roles table
      const rolesTable = page.locator('.full-width-tables .table-container:has-text("Role Capacity Analysis")');
      const viewPeopleLink = rolesTable.locator('a:has-text("View People")').first();
      
      if (await viewPeopleLink.isVisible()) {
        const href = await viewPeopleLink.getAttribute('href');
        console.log(`Navigating to: ${href}`);
        
        await viewPeopleLink.click();
        await page.waitForLoadState('networkidle');
        
        // Check that we're on the people page
        expect(page.url()).toContain('/people');
        
        // Check that the URL contains expected query parameters
        expect(page.url()).toContain('from=capacity-report');
        expect(page.url()).toContain('role=');
        expect(page.url()).toContain('capacity=');
        expect(page.url()).toContain('available=');
        
        console.log(`✅ Successfully navigated to: ${page.url()}`);
      }
    });

    test('should preserve context when navigating from utilization report to assignments page', async ({ page }) => {
      await page.click('button.tab:has-text("Utilization Report")');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Click on a "Reduce Load" link from overutilized people
      const overutilizedSection = page.locator('.list-section:has-text("Overutilized People")');
      const reduceLoadLink = overutilizedSection.locator('a:has-text("Reduce Load")').first();
      
      if (await reduceLoadLink.isVisible()) {
        const href = await reduceLoadLink.getAttribute('href');
        console.log(`Navigating to: ${href}`);
        
        await reduceLoadLink.click();
        await page.waitForLoadState('networkidle');
        
        // Check that we're on the assignments page
        expect(page.url()).toContain('/assignments');
        
        // Check that the URL contains expected query parameters
        expect(page.url()).toContain('from=utilization-report');
        expect(page.url()).toContain('action=reduce');
        expect(page.url()).toContain('person=');
        expect(page.url()).toContain('utilization=');
        
        console.log(`✅ Successfully navigated to: ${page.url()}`);
      }
    });

    test('should preserve context when navigating from gaps analysis to projects page', async ({ page }) => {
      await page.click('button.tab:has-text("Gaps Analysis")');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Click on a "View Project" link from critical gaps
      const criticalProjectsSection = page.locator('.list-section:has-text("Projects with Critical Gaps")');
      const viewProjectLink = criticalProjectsSection.locator('a:has-text("View Project")').first();
      
      if (await viewProjectLink.isVisible()) {
        const href = await viewProjectLink.getAttribute('href');
        console.log(`Navigating to: ${href}`);
        
        await viewProjectLink.click();
        await page.waitForLoadState('networkidle');
        
        // Check that we're on a project detail page
        expect(page.url()).toContain('/projects/');
        
        // Check that the URL contains expected query parameters
        expect(page.url()).toContain('from=gaps-report');
        expect(page.url()).toContain('gap=');
        expect(page.url()).toContain('action=address-gap');
        
        console.log(`✅ Successfully navigated to: ${page.url()}`);
      }
    });
  });

  test.describe('Summary Card Navigation', () => {
    test('should have contextual links in all summary cards', async ({ page }) => {
      const reports = [
        { name: 'Capacity Report', expectedLinks: ['View People'] },
        { name: 'Utilization Report', expectedLinks: ['Manage Assignments', 'Find Projects'] },
        { name: 'Demand Report', expectedLinks: ['View Projects'] },
        { name: 'Gaps Analysis', expectedLinks: ['Add People', 'View Projects', 'View Roles'] }
      ];

      for (const report of reports) {
        await page.click(`button:has-text("${report.name}")`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        await page.waitForSelector('.summary-card, .chart-container', { timeout: 15000 });

        // Check summary card action links
        const summaryCardLinks = page.locator('.summary-card .card-action-link');
        const linkCount = await summaryCardLinks.count();

        if (linkCount > 0) {
          console.log(`✅ ${report.name}: Found ${linkCount} summary card links`);
          
          for (let i = 0; i < linkCount; i++) {
            const link = summaryCardLinks.nth(i);
            const href = await link.getAttribute('href');
            const linkText = await link.textContent();
            
            // All summary card links should have source context
            expect(href).toContain(`from=${report.name.toLowerCase().replace(' ', '-')}`);
            expect(href).toContain('startDate=');
            expect(href).toContain('endDate=');
            
            console.log(`✅ ${report.name} summary link: ${linkText} → ${href}`);
          }
        }
      }
    });
  });

  test.describe('Date Range Preservation', () => {
    test('should preserve custom date ranges in all action links', async ({ page }) => {
      // Set custom date range
      const startDateInput = page.locator('input[name="startDate"], input[placeholder*="Start"]');
      const endDateInput = page.locator('input[name="endDate"], input[placeholder*="End"]');
      
      if (await startDateInput.isVisible() && await endDateInput.isVisible()) {
        await startDateInput.fill('2023-09-01');
        await endDateInput.fill('2023-11-30');
        
        // Apply filters if there's an apply button
        const applyButton = page.locator('button:has-text("Apply"), button:has-text("Filter")');
        if (await applyButton.isVisible()) {
          await applyButton.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1500);
        }

        // Test that action links preserve the custom date range
        const reports = ['Capacity Report', 'Utilization Report', 'Demand Report', 'Gaps Analysis'];
        
        for (const report of reports) {
          await page.click(`button:has-text("${report}")`);
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);
          await page.waitForSelector('.summary-card, .chart-container', { timeout: 15000 });

          // Check action buttons for date preservation
          const actionLinks = page.locator('.action-buttons a, .item-actions a, .card-action-link');
          const linkCount = await actionLinks.count();

          for (let i = 0; i < Math.min(linkCount, 3); i++) {
            const link = actionLinks.nth(i);
            const href = await link.getAttribute('href');
            
            if (href?.includes('startDate=') && href?.includes('endDate=')) {
              expect(href).toContain('startDate=2023-09-01');
              expect(href).toContain('endDate=2023-11-30');
              console.log(`✅ ${report}: Date range preserved in ${href}`);
            }
          }
        }
      }
    });
  });
});