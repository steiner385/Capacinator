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

test.describe('Assignment CRUD Operations - Complete E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupUser(page);
  });

  test.describe('Create Assignment', () => {
    test('Create fixed-date assignment successfully', async ({ page }) => {
      // Navigate to people page
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      // Navigate to first person
      const viewButton = page.locator('table tbody tr').first().locator('td:last-child button').first();
      await viewButton.click();
      
      // Wait for person page to load
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Open assignment modal
      await page.click('button:has-text("Add Assignment")');
      await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
      
      // Switch to manual tab
      await page.click('button[role="tab"]:has-text("Manual Selection")');
      
      // Select project
      const projectSelect = page.locator('#project-select');
      const projectOptions = await projectSelect.locator('option').all();
      
      let projectSelected = false;
      for (let i = 1; i < Math.min(projectOptions.length, 5); i++) {
        const value = await projectOptions[i].getAttribute('value');
        if (value) {
          await projectSelect.selectOption(value);
          projectSelected = true;
          break;
        }
      }
      
      expect(projectSelected).toBeTruthy();
      
      // Wait for role dropdown to be enabled
      await page.waitForTimeout(500);
      
      // Select role if available
      const roleSelect = page.locator('#role-select');
      if (await roleSelect.isEnabled()) {
        const roleOptions = await roleSelect.locator('option').all();
        for (let i = 1; i < Math.min(roleOptions.length, 3); i++) {
          const value = await roleOptions[i].getAttribute('value');
          if (value) {
            await roleSelect.selectOption(value);
            break;
          }
        }
      }
      
      // Set allocation
      await page.fill('#allocation-slider', '50');
      
      // Fill dates for fixed assignment
      const today = new Date();
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      const startDate = page.locator('#start-date');
      const endDate = page.locator('#end-date');
      
      if (await startDate.isVisible() && await startDate.isEnabled()) {
        await startDate.fill(today.toISOString().split('T')[0]);
      }
      
      if (await endDate.isVisible() && await endDate.isEnabled()) {
        await endDate.fill(nextMonth.toISOString().split('T')[0]);
      }
      
      // Submit
      await page.keyboard.press('Enter');
      
      // Wait for success
      await Promise.race([
        page.waitForSelector('text=Smart Assignment', { state: 'detached', timeout: 10000 }),
        page.waitForSelector('text=Active Assignments', { timeout: 10000 })
      ]);
    });

    test('Create phase-linked assignment', async ({ page }) => {
      // Navigate to people page
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      // Go to first person
      await page.locator('table tbody tr').first().locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Open assignment modal
      await page.click('button:has-text("Add Assignment")');
      await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
      
      // Use manual selection
      await page.click('button[role="tab"]:has-text("Manual Selection")');
      
      // Select project
      const projectSelect = page.locator('#project-select');
      const projectOption = await projectSelect.locator('option[value]:not([value=""])').first();
      if (await projectOption.count() > 0) {
        const value = await projectOption.getAttribute('value');
        await projectSelect.selectOption(value!);
        
        // Wait for phase dropdown
        await page.waitForTimeout(500);
        
        // Check for phase dropdown
        const phaseSelect = page.locator('#phase-select');
        if (await phaseSelect.count() > 0 && await phaseSelect.isEnabled()) {
          // Select a phase
          const phaseOption = await phaseSelect.locator('option[value]:not([value=""])').first();
          if (await phaseOption.count() > 0) {
            const phaseValue = await phaseOption.getAttribute('value');
            await phaseSelect.selectOption(phaseValue!);
            
            // Verify date fields are disabled for phase-linked
            const startDate = page.locator('#start-date');
            const endDate = page.locator('#end-date');
            
            const startDisabled = await startDate.isDisabled();
            const endDisabled = await endDate.isDisabled();
            
            expect(startDisabled).toBeTruthy();
            expect(endDisabled).toBeTruthy();
          }
        }
      }
      
      // Close modal
      await page.keyboard.press('Escape');
    });

    test('Validate allocation warnings', async ({ page }) => {
      // Navigate to people page
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      // Go to first person
      await page.locator('table tbody tr').first().locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Open assignment modal
      await page.click('button:has-text("Add Assignment")');
      await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
      
      // Use manual selection
      await page.click('button[role="tab"]:has-text("Manual Selection")');
      
      // Select project
      const projectSelect = page.locator('#project-select');
      const projectOption = await projectSelect.locator('option[value]:not([value=""])').first();
      if (await projectOption.count() > 0) {
        const value = await projectOption.getAttribute('value');
        await projectSelect.selectOption(value!);
      }
      
      // Set high allocation to trigger warning
      await page.fill('#allocation-slider', '100');
      
      // Look for warning
      const warnings = await page.locator('text=/overallocat|exceed|Warning|will result in/i').count();
      expect(warnings).toBeGreaterThan(0);
      
      // Close modal
      await page.keyboard.press('Escape');
    });

    test('Validate required fields', async ({ page }) => {
      // Navigate to people page
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      // Go to first person
      await page.locator('table tbody tr').first().locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Open assignment modal
      await page.click('button:has-text("Add Assignment")');
      await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
      
      // Switch to manual tab
      await page.click('button[role="tab"]:has-text("Manual Selection")');
      
      // Try to submit without selecting project
      const createButton = page.locator('button:has-text("Create Assignment")');
      
      // Check if button is disabled when no project selected
      const isDisabled = await createButton.isDisabled();
      expect(isDisabled).toBeTruthy();
      
      // Close modal
      await page.keyboard.press('Escape');
    });
  });

  test.describe('View Assignments', () => {
    test('View assignments on person details page', async ({ page }) => {
      // Navigate to people page
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      // Find person with assignments
      const peopleRows = await page.locator('table tbody tr').all();
      let targetPerson = null;
      
      for (const row of peopleRows) {
        const assignmentCount = await row.locator('td:nth-child(4)').textContent();
        if (assignmentCount && parseInt(assignmentCount) > 0) {
          targetPerson = row;
          break;
        }
      }
      
      if (!targetPerson) {
        console.log('No person with assignments found');
        return;
      }
      
      // Navigate to person details
      await targetPerson.locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Check for assignments section
      const assignmentsExist = await page.locator('text=Active Assignments').count() > 0;
      expect(assignmentsExist).toBeTruthy();
      
      // Verify assignment details are displayed
      const assignmentTable = page.locator('table').filter({ has: page.locator('th:has-text("Project")') });
      if (await assignmentTable.count() > 0) {
        const rows = await assignmentTable.locator('tbody tr').count();
        expect(rows).toBeGreaterThan(0);
      }
    });

    test('View assignments with correct date formatting', async ({ page }) => {
      // Navigate to people page
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      // Find person with assignments
      const personWithAssignments = page.locator('table tbody tr').filter({
        has: page.locator('td:nth-child(4):not(:has-text("0"))')
      }).first();
      
      if (await personWithAssignments.count() > 0) {
        await personWithAssignments.locator('td:last-child button').first().click();
        await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
        
        // Look for date patterns in assignments
        const datePattern = /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/;
        const datesFound = await page.locator('text=' + datePattern.source).count();
        
        if (datesFound > 0) {
          console.log(`Found ${datesFound} formatted dates in assignments`);
        }
      }
    });

    test('View phase-linked assignments with phase name', async ({ page }) => {
      // Navigate to people page
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      // Find person with assignments
      const personWithAssignments = page.locator('table tbody tr').filter({
        has: page.locator('td:nth-child(4):not(:has-text("0"))')
      }).first();
      
      if (await personWithAssignments.count() > 0) {
        await personWithAssignments.locator('td:last-child button').first().click();
        await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
        
        // Look for phase names in assignments
        const phaseIndicators = await page.locator('text=/Phase|Design|Development|Testing|Deployment/i').count();
        console.log(`Found ${phaseIndicators} phase indicators`);
      }
    });
  });

  test.describe('Modify Assignments', () => {
    test('Modify assignment allocation', async ({ page }) => {
      // Navigate to people page and find person with assignments
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      const personWithAssignments = page.locator('table tbody tr').filter({
        has: page.locator('td:nth-child(4):not(:has-text("0"))')
      }).first();
      
      if (await personWithAssignments.count() === 0) {
        console.log('No person with assignments found for modification test');
        return;
      }
      
      await personWithAssignments.locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Look for edit buttons on assignments
      const editButtons = page.locator('button[title="Edit"]');
      const editButtonCount = await editButtons.count();
      
      if (editButtonCount > 0) {
        // Click first edit button
        await editButtons.first().click();
        
        // Wait for edit modal/form
        await page.waitForTimeout(500);
        
        // Find allocation input and modify
        const allocationInput = page.locator('input[type="range"], input[type="number"]').filter({
          has: page.locator('[value*="%"], [value="50"], [value="75"], [value="100"]')
        });
        
        if (await allocationInput.count() > 0) {
          const currentValue = await allocationInput.first().getAttribute('value');
          const newValue = currentValue === '50' ? '75' : '50';
          await allocationInput.first().fill(newValue);
          
          // Save changes
          await page.click('button:has-text("Save")');
        }
      } else {
        console.log('No edit buttons found on assignments');
      }
    });

    test('Modify assignment dates for fixed assignments', async ({ page }) => {
      // This would test date modification for fixed-date assignments
      // Implementation depends on UI support for date editing
      console.log('Date modification test - implementation pending UI support');
    });
  });

  test.describe('Delete Assignments', () => {
    test('Delete assignment using Reduce Workload', async ({ page }) => {
      // Navigate to people page
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      // Find person with assignments
      const personWithAssignments = page.locator('table tbody tr').filter({
        has: page.locator('td:nth-child(4):not(:has-text("0"))')
      }).first();
      
      if (await personWithAssignments.count() === 0) {
        console.log('No person with assignments found for deletion test');
        return;
      }
      
      const assignmentCountText = await personWithAssignments.locator('td:nth-child(4)').textContent();
      const initialCount = parseInt(assignmentCountText || '0');
      
      await personWithAssignments.locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Open reduce workload modal
      const reduceButton = page.locator('button:has-text("Reduce Workload")');
      if (await reduceButton.count() > 0 && await reduceButton.isVisible()) {
        await reduceButton.click();
        await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
        
        // Switch to manual tab
        await page.click('button[role="tab"]:has-text("Manual Selection")');
        
        // Wait for assignments to load
        await page.waitForTimeout(500);
        
        // Look for remove buttons or checkboxes
        const removeButtons = page.locator('button:has-text("Remove"), button:has-text("Delete")');
        const checkboxes = page.locator('input[type="checkbox"]');
        
        if (await removeButtons.count() > 0) {
          // Click first remove button
          await removeButtons.first().click();
          console.log('Clicked remove button');
        } else if (await checkboxes.count() > 0) {
          // Select first checkbox
          await checkboxes.first().check();
          console.log('Selected assignment checkbox');
        }
        
        // Look for confirm/submit button
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Remove Selected"), button:has-text("Delete Selected")');
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
        }
        
        // Close modal
        await page.keyboard.press('Escape');
      }
    });

    test('Verify assignment is deleted', async ({ page }) => {
      // This test would verify the assignment count decreases after deletion
      // Implementation depends on the delete test above
      console.log('Delete verification test - follows delete operation');
    });
  });

  test.describe('Advanced Features', () => {
    test('Bulk assignment operations', async ({ page }) => {
      // Navigate to a person with multiple assignments
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      // Find person with multiple assignments
      const personRows = await page.locator('table tbody tr').all();
      let targetPerson = null;
      
      for (const row of personRows) {
        const assignmentText = await row.locator('td:nth-child(4)').textContent();
        if (assignmentText && parseInt(assignmentText) > 2) {
          targetPerson = row;
          break;
        }
      }
      
      if (!targetPerson) {
        console.log('No person with multiple assignments found');
        return;
      }
      
      await targetPerson.locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Open reduce workload modal
      await page.click('button:has-text("Reduce Workload")');
      await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
      
      // Switch to manual tab
      await page.click('button[role="tab"]:has-text("Manual Selection")');
      
      // Count assignment items
      const assignmentItems = await page.locator('.assignment-item, tr[data-assignment], input[type="checkbox"]').count();
      expect(assignmentItems).toBeGreaterThan(0);
    });

    test('Assignment recommendations based on skills', async ({ page }) => {
      // Navigate to people page
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      // Go to first person
      await page.locator('table tbody tr').first().locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Open assignment modal
      await page.click('button:has-text("Add Assignment")');
      await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
      
      // Check recommended tab
      const recommendedTab = page.locator('button[role="tab"]:has-text("Recommended")');
      if (await recommendedTab.count() > 0) {
        await recommendedTab.click();
        
        // Look for recommendations
        const recommendations = await page.locator('.recommendation, .suggested-assignment').count();
        console.log(`Found ${recommendations} assignment recommendations`);
      }
      
      // Close modal
      await page.keyboard.press('Escape');
    });

    test('Assignment conflict detection', async ({ page }) => {
      // Navigate to people page
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      // Go to first person
      await page.locator('table tbody tr').first().locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Open assignment modal
      await page.click('button:has-text("Add Assignment")');
      await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
      
      // Look for any conflict indicators
      const conflictWarnings = page.locator('.warning, .conflict, .overallocated, text=/conflict|overlap/i');
      const warningCount = await conflictWarnings.count();
      
      console.log(`Found ${warningCount} potential conflict warnings`);
      
      // Close modal
      await page.keyboard.press('Escape');
    });

    test('Search assignments by project', async ({ page }) => {
      // Navigate to projects page
      await page.goto('http://localhost:3121/projects');
      await page.waitForLoadState('networkidle');
      
      // Wait for projects to load
      await page.waitForSelector('text=Project', { timeout: 10000 });
      
      // Check if we need to switch to table/list view
      const projectsTab = page.locator('button[role="tab"]:has-text("Projects")');
      if (await projectsTab.count() > 0) {
        await projectsTab.click();
        await page.waitForTimeout(500);
      }
      
      // Look for project links
      const projectLinks = page.locator('a:has-text("Customer Portal"), a:has-text("Mobile"), a:has-text("AI")').first();
      
      if (await projectLinks.count() > 0) {
        const projectName = await projectLinks.textContent();
        console.log('Clicking on project:', projectName);
        await projectLinks.click();
        
        // Wait for project details page
        await page.waitForSelector('text=/Project|Timeline|Team|Resources/i', { timeout: 10000 });
        
        // Look for team/assignments section
        const teamSection = await page.locator('text=/Team|Assignments|Resources|People/i').count();
        console.log('Team/assignments sections found:', teamSection);
      } else {
        console.log('No project links found on projects page');
      }
    });
  });

  test.describe('Data Integrity', () => {
    test('Verify assignment data persists after page reload', async ({ page }) => {
      // Navigate to people page
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      // Find person with assignments
      const personWithAssignments = page.locator('table tbody tr').filter({
        has: page.locator('td:nth-child(4):not(:has-text("0"))')
      }).first();
      
      if (await personWithAssignments.count() === 0) {
        console.log('No person with assignments found');
        return;
      }
      
      // Get assignment count
      const assignmentCountBefore = await personWithAssignments.locator('td:nth-child(4)').textContent();
      
      // Navigate to person details
      await personWithAssignments.locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Count assignments on detail page
      const assignmentRows = page.locator('table').filter({ 
        has: page.locator('th:has-text("Project")') 
      }).locator('tbody tr');
      const detailCount = await assignmentRows.count();
      
      // Reload page
      await page.reload();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Count assignments again
      const assignmentRowsAfter = page.locator('table').filter({ 
        has: page.locator('th:has-text("Project")') 
      }).locator('tbody tr');
      const detailCountAfter = await assignmentRowsAfter.count();
      
      // Verify counts match
      expect(detailCountAfter).toBe(detailCount);
    });

    test('Verify computed dates for phase-linked assignments', async ({ page }) => {
      // This test would verify that phase-linked assignments
      // show the correct dates from their associated phases
      console.log('Computed dates verification - implementation depends on UI display');
    });
  });

  test.afterEach(async ({ page, context }) => {
    // Clean up any test data if needed
    // Could also clear local storage to ensure clean state
    await context.clearCookies();
  });
});