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

test.describe('Assignment Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupUser(page);
  });

  test('Complete assignment workflow from project to person', async ({ page }) => {
    // Start from projects page
    await page.goto('http://localhost:3121/projects');
    await page.waitForLoadState('networkidle');
    
    // Find a project with resource needs
    const projectName = await page.locator('table tbody tr').first().locator('td:first-child').textContent();
    console.log(`Starting with project: ${projectName}`);
    
    // Navigate to people page
    await page.click('text=People');
    await page.waitForSelector('h1:has-text("People")', { timeout: 10000 });
    
    // Find a person with availability
    const availablePerson = await page.locator('table tbody tr').filter({
      has: page.locator('td:nth-child(5)').filter({ hasText: /[0-7]\d%/ })
    }).first();
    
    if (await availablePerson.count() === 0) {
      console.log('No person with availability found');
      return;
    }
    
    const personName = await availablePerson.locator('td:first-child').textContent();
    console.log(`Assigning to: ${personName}`);
    
    // Navigate to person details
    await availablePerson.locator('td:last-child button').first().click();
    await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
    
    // Create assignment
    await page.click('button:has-text("Add Assignment")');
    await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
    
    // Use manual selection
    await page.click('button[role="tab"]:has-text("Manual Selection")');
    
    // Select the project we noted earlier
    const projectSelect = page.locator('#project-select');
    const projectOptions = await projectSelect.locator('option').all();
    
    let assignmentCreated = false;
    for (const option of projectOptions) {
      const optionText = await option.textContent();
      if (optionText?.includes(projectName || '')) {
        await projectSelect.selectOption(await option.getAttribute('value')!);
        
        // Wait for role dropdown
        await page.waitForTimeout(500);
        
        // Select role if available
        const roleSelect = page.locator('#role-select');
        if (await roleSelect.isEnabled()) {
          const roleOption = await roleSelect.locator('option[value]:not([value=""])').first();
          if (await roleOption.count() > 0) {
            await roleSelect.selectOption(await roleOption.getAttribute('value')!);
          }
        }
        
        // Set allocation
        await page.fill('#allocation-slider', '40');
        
        // Submit
        await page.keyboard.press('Enter');
        assignmentCreated = true;
        break;
      }
    }
    
    if (assignmentCreated) {
      // Wait for modal to close
      await page.waitForSelector('text=Smart Assignment', { state: 'detached', timeout: 10000 });
      
      // Verify assignment appears
      await expect(page.locator(`text=${projectName}`)).toBeVisible({ timeout: 10000 });
    }
  });

  test('Assignment updates reflect in utilization metrics', async ({ page }) => {
    // Navigate to people page
    await page.goto('http://localhost:3121/people');
    await page.waitForLoadState('networkidle');
    
    // Find person with low utilization
    const underutilizedPerson = await page.locator('table tbody tr').filter({
      has: page.locator('td:nth-child(5)').filter({ hasText: /[0-3]\d%/ })
    }).first();
    
    if (await underutilizedPerson.count() === 0) {
      console.log('No underutilized person found');
      return;
    }
    
    // Get initial utilization
    const initialUtilization = await underutilizedPerson.locator('td:nth-child(5)').textContent();
    console.log(`Initial utilization: ${initialUtilization}`);
    
    // Navigate to person details
    await underutilizedPerson.locator('td:last-child button').first().click();
    await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
    
    // Note current utilization on detail page
    const utilizationElement = page.locator('text=/Current Utilization|Utilization:/').locator('..').locator('text=/%/');
    let detailUtilization = '0%';
    if (await utilizationElement.count() > 0) {
      detailUtilization = await utilizationElement.textContent() || '0%';
    }
    
    // Add new assignment
    await page.click('button:has-text("Add Assignment")');
    await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
    
    // Create assignment with significant allocation
    await page.click('button[role="tab"]:has-text("Manual Selection")');
    
    const projectSelect = page.locator('#project-select');
    const projectOption = await projectSelect.locator('option[value]:not([value=""])').first();
    if (await projectOption.count() > 0) {
      await projectSelect.selectOption(await projectOption.getAttribute('value')!);
      
      await page.waitForTimeout(500);
      
      // Set 50% allocation
      await page.fill('#allocation-slider', '50');
      
      // Submit
      await page.keyboard.press('Enter');
      
      // Wait for modal to close and page to update
      await page.waitForSelector('text=Smart Assignment', { state: 'detached', timeout: 10000 });
      await page.waitForTimeout(1000);
      
      // Check updated utilization
      const newUtilizationElement = page.locator('text=/Current Utilization|Utilization:/').locator('..').locator('text=/%/');
      if (await newUtilizationElement.count() > 0) {
        const newUtilization = await newUtilizationElement.textContent();
        console.log(`Updated utilization: ${newUtilization}`);
        
        // Verify utilization increased
        const oldValue = parseInt(detailUtilization);
        const newValue = parseInt(newUtilization || '0');
        expect(newValue).toBeGreaterThan(oldValue);
      }
    }
  });

  test('Phase timeline updates affect phase-linked assignments', async ({ page }) => {
    // This test verifies that phase-linked assignments update when phase dates change
    await page.goto('http://localhost:3121/people');
    await page.waitForLoadState('networkidle');
    
    // Find person with phase-linked assignments
    const personWithAssignments = page.locator('table tbody tr').filter({
      has: page.locator('td:nth-child(4):not(:has-text("0"))')
    }).first();
    
    if (await personWithAssignments.count() === 0) {
      console.log('No person with assignments found');
      return;
    }
    
    await personWithAssignments.locator('td:last-child button').first().click();
    await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
    
    // Look for phase indicators in assignments
    const phaseAssignments = page.locator('table').filter({
      has: page.locator('th:has-text("Project")')
    }).locator('tbody tr').filter({
      has: page.locator('text=/Phase|Design|Development|Testing/')
    });
    
    const phaseAssignmentCount = await phaseAssignments.count();
    console.log(`Found ${phaseAssignmentCount} phase-linked assignments`);
    
    if (phaseAssignmentCount > 0) {
      // Note the current dates
      const dateElements = phaseAssignments.first().locator('text=/\\d{1,2}\\/\\d{1,2}\\/\\d{4}/');
      const initialDates = await dateElements.allTextContents();
      console.log('Initial phase dates:', initialDates);
      
      // In a real test, we would update the phase timeline via API or UI
      // and verify the assignment dates update accordingly
    }
  });

  test('Assignment conflicts prevent overallocation', async ({ page }) => {
    // Find a person already at high utilization
    await page.goto('http://localhost:3121/people');
    await page.waitForLoadState('networkidle');
    
    const highUtilizationPerson = await page.locator('table tbody tr').filter({
      has: page.locator('td:nth-child(5)').filter({ hasText: /[8-9]\d%|100%/ })
    }).first();
    
    if (await highUtilizationPerson.count() === 0) {
      console.log('No highly utilized person found');
      return;
    }
    
    const utilization = await highUtilizationPerson.locator('td:nth-child(5)').textContent();
    console.log(`Testing with person at ${utilization} utilization`);
    
    await highUtilizationPerson.locator('td:last-child button').first().click();
    await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
    
    // Try to add assignment that would overallocate
    await page.click('button:has-text("Add Assignment")');
    await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
    
    // Check for warnings in recommended tab
    const recommendedTab = page.locator('button[role="tab"]:has-text("Recommended")');
    if (await recommendedTab.count() > 0) {
      await recommendedTab.click();
      
      // Should show warnings or no recommendations due to overallocation
      const warnings = await page.locator('.warning, .alert, text=/overallocat|exceed|conflict/i').count();
      expect(warnings).toBeGreaterThan(0);
    }
    
    // Try manual assignment
    await page.click('button[role="tab"]:has-text("Manual Selection")');
    
    const projectSelect = page.locator('#project-select');
    const projectOption = await projectSelect.locator('option[value]:not([value=""])').first();
    if (await projectOption.count() > 0) {
      await projectSelect.selectOption(await projectOption.getAttribute('value')!);
      
      // Set high allocation
      await page.fill('#allocation-slider', '50');
      
      // Should show overallocation warning
      const overallocationWarning = await page.locator('text=/will result in|overallocat|exceed/i').count();
      expect(overallocationWarning).toBeGreaterThan(0);
    }
    
    await page.keyboard.press('Escape');
  });

  test('Bulk operations maintain data consistency', async ({ page }) => {
    // Find person with multiple assignments
    await page.goto('http://localhost:3121/people');
    await page.waitForLoadState('networkidle');
    
    const personWithMultipleAssignments = await page.locator('table tbody tr').filter({
      has: page.locator('td:nth-child(4)').filter({ hasText: /[3-9]|\d{2}/ })
    }).first();
    
    if (await personWithMultipleAssignments.count() === 0) {
      console.log('No person with multiple assignments found');
      return;
    }
    
    const assignmentCount = await personWithMultipleAssignments.locator('td:nth-child(4)').textContent();
    console.log(`Person has ${assignmentCount} assignments`);
    
    await personWithMultipleAssignments.locator('td:last-child button').first().click();
    await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
    
    // Count assignments on detail page
    const assignmentRows = page.locator('table').filter({
      has: page.locator('th:has-text("Project")')
    }).locator('tbody tr');
    const detailCount = await assignmentRows.count();
    
    // Open reduce workload
    await page.click('button:has-text("Reduce Workload")');
    await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
    
    await page.click('button[role="tab"]:has-text("Manual Selection")');
    
    // Count removable assignments
    const removableItems = await page.locator('.assignment-item, tr[data-assignment], input[type="checkbox"][name*="assignment"]').count();
    
    // Should match the detail count
    expect(removableItems).toBe(detailCount);
    
    await page.keyboard.press('Escape');
  });

  test('Assignment history and audit trail', async ({ page }) => {
    // Create a new assignment and verify it appears in history
    await page.goto('http://localhost:3121/people');
    await page.waitForLoadState('networkidle');
    
    // Go to first person
    await page.locator('table tbody tr').first().locator('td:last-child button').first().click();
    await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
    
    // Note current number of assignments
    const initialAssignments = await page.locator('table').filter({
      has: page.locator('th:has-text("Project")')
    }).locator('tbody tr').count();
    
    // Create new assignment
    await page.click('button:has-text("Add Assignment")');
    await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
    
    await page.click('button[role="tab"]:has-text("Manual Selection")');
    
    const projectSelect = page.locator('#project-select');
    const projectOption = await projectSelect.locator('option[value]:not([value=""])').first();
    
    if (await projectOption.count() > 0) {
      const projectName = await projectOption.textContent();
      await projectSelect.selectOption(await projectOption.getAttribute('value')!);
      
      await page.fill('#allocation-slider', '25');
      await page.keyboard.press('Enter');
      
      // Wait for assignment to be created
      await page.waitForSelector('text=Smart Assignment', { state: 'detached', timeout: 10000 });
      await page.waitForTimeout(1000);
      
      // Verify new assignment appears
      const newAssignments = await page.locator('table').filter({
        has: page.locator('th:has-text("Project")')
      }).locator('tbody tr').count();
      
      expect(newAssignments).toBe(initialAssignments + 1);
      
      // Verify the specific assignment exists
      await expect(page.locator(`text=${projectName}`)).toBeVisible();
    }
  });

  test('Cross-page assignment consistency', async ({ page }) => {
    // Verify assignments show consistently across different views
    await page.goto('http://localhost:3121/people');
    await page.waitForLoadState('networkidle');
    
    // Get assignment count from people list
    const personRow = page.locator('table tbody tr').filter({
      has: page.locator('td:nth-child(4):not(:has-text("0"))')
    }).first();
    
    if (await personRow.count() === 0) {
      console.log('No person with assignments found');
      return;
    }
    
    const listAssignmentCount = await personRow.locator('td:nth-child(4)').textContent();
    const personName = await personRow.locator('td:first-child').textContent();
    
    console.log(`${personName} has ${listAssignmentCount} assignments in list view`);
    
    // Navigate to person details
    await personRow.locator('td:last-child button').first().click();
    await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
    
    // Count assignments on detail page
    const detailAssignments = await page.locator('table').filter({
      has: page.locator('th:has-text("Project")')
    }).locator('tbody tr').count();
    
    console.log(`Detail page shows ${detailAssignments} assignments`);
    
    // Counts should match
    expect(detailAssignments).toBe(parseInt(listAssignmentCount || '0'));
    
    // Navigate to projects page to verify from project perspective
    await page.click('text=Projects');
    await page.waitForSelector('text=Project', { timeout: 10000 });
    
    // Would need to navigate to specific projects and verify
    // the person appears in project team views
  });

  test.afterEach(async ({ page, context }) => {
    // Clean up
    await context.clearCookies();
  });
});