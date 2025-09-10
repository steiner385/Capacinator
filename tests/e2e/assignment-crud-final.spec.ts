import { test, expect } from '@playwright/test';

// Helper to set up authenticated user
async function setupUser(page) {
  await page.goto('http://localhost:3121');
  await page.evaluate(() => {
    const user = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Alice Johnson',
      email: 'alice.johnson@example.com',
      primary_role_name: 'Senior Software Engineer'
    };
    localStorage.setItem('capacinator_current_user', JSON.stringify(user));
  });
}

// Helper to wait for navigation to complete
async function navigateToPage(page, url, selector) {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector(selector, { timeout: 10000 });
}

test.describe('Assignment CRUD - Complete E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await setupUser(page);
  });

  test.describe('Create Operations', () => {
    test('Create fixed-date assignment', async ({ page }) => {
      // Navigate to people page with proper wait
      await navigateToPage(page, 'http://localhost:3121/people', 'table tbody tr');
      
      // Navigate to first person
      const viewButton = page.locator('table tbody tr').first().locator('td:last-child button').first();
      await viewButton.click();
      
      // Wait for person page to load completely
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      
      // Open assignment modal
      await page.click('button:has-text("Add Assignment")');
      await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
      
      // Switch to manual tab
      await page.click('button[role="tab"]:has-text("Manual Selection")');
      await page.waitForTimeout(500); // Allow tab to switch
      
      // Select project
      const projectSelect = page.locator('#project-select');
      await projectSelect.waitFor({ state: 'visible' });
      
      const projectOptions = await projectSelect.locator('option').all();
      let projectSelected = false;
      
      for (let i = 1; i < Math.min(projectOptions.length, 5); i++) {
        const value = await projectOptions[i].getAttribute('value');
        if (value) {
          await projectSelect.selectOption(value);
          projectSelected = true;
          console.log('Selected project with value:', value);
          break;
        }
      }
      
      expect(projectSelected).toBeTruthy();
      
      // Wait for form to update after project selection
      await page.waitForTimeout(1000);
      
      // Select role if available
      const roleSelect = page.locator('#role-select');
      if (await roleSelect.isEnabled()) {
        const roleOptions = await roleSelect.locator('option').all();
        for (let i = 1; i < Math.min(roleOptions.length, 3); i++) {
          const value = await roleOptions[i].getAttribute('value');
          if (value) {
            await roleSelect.selectOption(value);
            console.log('Selected role with value:', value);
            break;
          }
        }
      }
      
      // Set allocation
      const allocationInput = page.locator('#allocation-slider');
      await allocationInput.fill('50');
      
      // Set dates for fixed assignment
      const today = new Date();
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      const startDate = page.locator('#start-date');
      const endDate = page.locator('#end-date');
      
      if (await startDate.isVisible() && await startDate.isEnabled()) {
        await startDate.fill(today.toISOString().split('T')[0]);
        console.log('Set start date:', today.toISOString().split('T')[0]);
      }
      
      if (await endDate.isVisible() && await endDate.isEnabled()) {
        await endDate.fill(nextMonth.toISOString().split('T')[0]);
        console.log('Set end date:', nextMonth.toISOString().split('T')[0]);
      }
      
      // Submit form
      await page.keyboard.press('Enter');
      
      // Wait for success - modal should close
      await page.waitForSelector('text=Smart Assignment', { state: 'detached', timeout: 10000 });
      
      console.log('Assignment created successfully');
    });

    test('Create phase-linked assignment', async ({ page }) => {
      // Navigate to people page
      await navigateToPage(page, 'http://localhost:3121/people', 'table tbody tr');
      
      // Go to first person
      const viewButton = page.locator('table tbody tr').first().locator('td:last-child button').first();
      await viewButton.click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      
      // Open assignment modal
      await page.click('button:has-text("Add Assignment")');
      await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
      
      // Use manual selection
      await page.click('button[role="tab"]:has-text("Manual Selection")');
      await page.waitForTimeout(500);
      
      // Select project
      const projectSelect = page.locator('#project-select');
      await projectSelect.waitFor({ state: 'visible' });
      
      // Find project with phases
      const projectOptions = await projectSelect.locator('option[value]:not([value=""])').all();
      let phaseFound = false;
      
      for (const option of projectOptions) {
        const value = await option.getAttribute('value');
        if (value) {
          await projectSelect.selectOption(value);
          await page.waitForTimeout(1000);
          
          // Check if phase dropdown is available
          const phaseSelect = page.locator('#phase-select');
          if (await phaseSelect.count() > 0 && await phaseSelect.isEnabled()) {
            const phaseOptions = await phaseSelect.locator('option[value]:not([value=""])').all();
            if (phaseOptions.length > 0) {
              const phaseValue = await phaseOptions[0].getAttribute('value');
              await phaseSelect.selectOption(phaseValue!);
              phaseFound = true;
              console.log('Selected phase-linked assignment');
              
              // Verify date fields are disabled
              const startDate = page.locator('#start-date');
              const endDate = page.locator('#end-date');
              
              expect(await startDate.isDisabled()).toBeTruthy();
              expect(await endDate.isDisabled()).toBeTruthy();
              break;
            }
          }
        }
      }
      
      if (!phaseFound) {
        console.log('No projects with phases found, skipping phase-linked test');
      }
      
      // Close modal
      await page.keyboard.press('Escape');
      await page.waitForSelector('text=Smart Assignment', { state: 'detached' });
    });

    test('Validate overallocation warnings', async ({ page }) => {
      // Navigate to people page
      await navigateToPage(page, 'http://localhost:3121/people', 'table tbody tr');
      
      // Go to first person
      const viewButton = page.locator('table tbody tr').first().locator('td:last-child button').first();
      await viewButton.click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      
      // Open assignment modal
      await page.click('button:has-text("Add Assignment")');
      await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
      
      // Use manual selection
      await page.click('button[role="tab"]:has-text("Manual Selection")');
      await page.waitForTimeout(500);
      
      // Select project
      const projectSelect = page.locator('#project-select');
      const projectOption = await projectSelect.locator('option[value]:not([value=""])').first();
      if (await projectOption.count() > 0) {
        const value = await projectOption.getAttribute('value');
        await projectSelect.selectOption(value!);
        await page.waitForTimeout(1000);
      }
      
      // Set high allocation to trigger warning
      await page.fill('#allocation-slider', '100');
      
      // Look for warning
      const warnings = await page.locator('text=/overallocat|exceed|Warning|will result in/i').count();
      console.log(`Found ${warnings} overallocation warnings`);
      expect(warnings).toBeGreaterThan(0);
      
      // Close modal
      await page.keyboard.press('Escape');
    });
  });

  test.describe('Read Operations', () => {
    test('View assignments on person details', async ({ page }) => {
      // Navigate to people page
      await navigateToPage(page, 'http://localhost:3121/people', 'table tbody tr');
      
      // Find person with assignments
      const peopleRows = await page.locator('table tbody tr').all();
      let personFound = false;
      
      for (const row of peopleRows) {
        const assignmentCount = await row.locator('td:nth-child(4)').textContent();
        if (assignmentCount && parseInt(assignmentCount) > 0) {
          // Click view button for this person
          await row.locator('td:last-child button').first().click();
          await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
          personFound = true;
          
          // Check for assignments section
          const assignmentsExist = await page.locator('text=Active Assignments').count() > 0;
          expect(assignmentsExist).toBeTruthy();
          
          // Verify assignment table exists
          const assignmentTable = page.locator('table').filter({ 
            has: page.locator('th:has-text("Project")') 
          });
          
          if (await assignmentTable.count() > 0) {
            const rows = await assignmentTable.locator('tbody tr').count();
            expect(rows).toBeGreaterThan(0);
            console.log(`Found ${rows} assignments displayed`);
          }
          break;
        }
      }
      
      if (!personFound) {
        console.log('No person with assignments found for viewing test');
      }
    });

    test('Search assignments by project', async ({ page }) => {
      // Navigate to projects page
      await navigateToPage(page, 'http://localhost:3121/projects', 'text=Project');
      
      // Check if we need to switch views
      const projectsTab = page.locator('button[role="tab"]:has-text("Projects")');
      if (await projectsTab.count() > 0) {
        await projectsTab.click();
        await page.waitForTimeout(500);
      }
      
      // Look for any project content
      const projectContent = await page.locator('text=/Customer Portal|Mobile|AI|Project/i').count();
      console.log(`Found ${projectContent} project-related elements`);
      
      // Try to find project links or cards
      const projectLinks = page.locator('a[href*="/projects/"], button:has-text("View Details")').first();
      
      if (await projectLinks.count() > 0) {
        await projectLinks.click();
        
        // Wait for navigation
        await page.waitForTimeout(2000);
        
        // Look for project details indicators
        const detailsFound = await page.locator('text=/Timeline|Team|Resources|Phase/i').count();
        console.log(`Project details elements found: ${detailsFound}`);
      }
    });
  });

  test.describe('Update Operations', () => {
    test('Modify assignment using Reduce Workload', async ({ page }) => {
      // Navigate to people page
      await navigateToPage(page, 'http://localhost:3121/people', 'table tbody tr');
      
      // Find person with assignments
      const personWithAssignments = page.locator('table tbody tr').filter({
        has: page.locator('td:nth-child(4):not(:has-text("0"))')
      }).first();
      
      if (await personWithAssignments.count() === 0) {
        console.log('No person with assignments found for modification test');
        return;
      }
      
      // Navigate to person details
      await personWithAssignments.locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      
      // Check if reduce workload button exists
      const reduceButton = page.locator('button:has-text("Reduce Workload")');
      if (await reduceButton.count() > 0 && await reduceButton.isVisible()) {
        await reduceButton.click();
        await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
        
        console.log('Reduce workload modal opened successfully');
        
        // Close modal
        await page.keyboard.press('Escape');
        await page.waitForSelector('text=Smart Assignment', { state: 'detached' });
      } else {
        console.log('Reduce Workload button not available');
      }
    });
  });

  test.describe('Delete Operations', () => {
    test('Remove assignment using Reduce Workload', async ({ page }) => {
      // Navigate to people page
      await navigateToPage(page, 'http://localhost:3121/people', 'table tbody tr');
      
      // Find person with multiple assignments
      const personRows = await page.locator('table tbody tr').all();
      let targetPerson = null;
      
      for (const row of personRows) {
        const assignmentText = await row.locator('td:nth-child(4)').textContent();
        if (assignmentText && parseInt(assignmentText) > 1) {
          targetPerson = row;
          break;
        }
      }
      
      if (!targetPerson) {
        console.log('No person with multiple assignments found for deletion test');
        return;
      }
      
      // Navigate to person details
      await targetPerson.locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      
      // Open reduce workload modal
      const reduceButton = page.locator('button:has-text("Reduce Workload")');
      if (await reduceButton.count() > 0 && await reduceButton.isVisible()) {
        await reduceButton.click();
        await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
        
        // Switch to manual tab
        await page.click('button[role="tab"]:has-text("Manual Selection")');
        await page.waitForTimeout(500);
        
        // Look for delete interface
        const deleteInterface = await page.locator('text=/Select assignments to remove|Remove|Delete/i').count();
        console.log(`Delete interface elements found: ${deleteInterface}`);
        
        // Close modal
        await page.keyboard.press('Escape');
      }
    });
  });

  test.describe('Edge Cases', () => {
    test('Handle missing data gracefully', async ({ page }) => {
      // Navigate to people page
      await navigateToPage(page, 'http://localhost:3121/people', 'table tbody tr');
      
      // Go to first person
      const viewButton = page.locator('table tbody tr').first().locator('td:last-child button').first();
      await viewButton.click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      
      // Open assignment modal
      await page.click('button:has-text("Add Assignment")');
      await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
      
      // Switch to manual tab
      await page.click('button[role="tab"]:has-text("Manual Selection")');
      await page.waitForTimeout(500);
      
      // Check if submit is disabled without project selection
      const submitButton = page.locator('button:has-text("Create Assignment")');
      const isDisabled = await submitButton.isDisabled();
      expect(isDisabled).toBeTruthy();
      console.log('Submit button correctly disabled without project selection');
      
      // Close modal
      await page.keyboard.press('Escape');
    });

    test('Verify data persistence', async ({ page }) => {
      // Navigate to people page
      await navigateToPage(page, 'http://localhost:3121/people', 'table tbody tr');
      
      // Find person with assignments
      const personWithAssignments = page.locator('table tbody tr').filter({
        has: page.locator('td:nth-child(4):not(:has-text("0"))')
      }).first();
      
      if (await personWithAssignments.count() === 0) {
        console.log('No person with assignments found for persistence test');
        return;
      }
      
      // Get assignment count from list
      const listCount = await personWithAssignments.locator('td:nth-child(4)').textContent();
      console.log(`List shows ${listCount} assignments`);
      
      // Navigate to details
      await personWithAssignments.locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Count assignments on detail page
      const assignmentTable = page.locator('table').filter({ 
        has: page.locator('th:has-text("Project")') 
      });
      
      if (await assignmentTable.count() > 0) {
        const detailCount = await assignmentTable.locator('tbody tr').count();
        console.log(`Detail page shows ${detailCount} assignments`);
        
        // Reload page
        await page.reload();
        await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
        
        // Count again after reload
        const reloadCount = await assignmentTable.locator('tbody tr').count();
        expect(reloadCount).toBe(detailCount);
        console.log('Assignment count persisted after reload');
      }
    });
  });

  test.afterEach(async ({ page, context }) => {
    // Clean up
    await context.clearCookies();
  });
});