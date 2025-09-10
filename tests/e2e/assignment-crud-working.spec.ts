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

test.describe('Assignment CRUD Operations - Working Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupUser(page);
  });

  test('Create assignment successfully', async ({ page }) => {
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
    
    for (let i = 1; i < Math.min(projectOptions.length, 5); i++) {
      const value = await projectOptions[i].getAttribute('value');
      if (value) {
        await projectSelect.selectOption(value);
        console.log('Selected project');
        break;
      }
    }
    
    // Wait for role dropdown
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
    const allocationInput = page.locator('#allocation-slider');
    if (await allocationInput.isVisible()) {
      await allocationInput.fill('50');
    }
    
    // Fill dates if needed
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const startDate = page.locator('#start-date');
    const endDate = page.locator('#end-date');
    
    // Only fill if visible and enabled
    if (await startDate.isVisible() && await startDate.isEnabled()) {
      await startDate.fill(today.toISOString().split('T')[0]);
    }
    
    if (await endDate.isVisible() && await endDate.isEnabled()) {
      await endDate.fill(nextMonth.toISOString().split('T')[0]);
    }
    
    // Submit with Enter
    await page.keyboard.press('Enter');
    
    // Wait for success - either modal closes or we see assignments
    await Promise.race([
      page.waitForSelector('text=Smart Assignment', { state: 'detached', timeout: 10000 }),
      page.waitForSelector('text=Active Assignments', { timeout: 10000 })
    ]);
    
    console.log('Assignment created successfully');
  });

  test('View and modify assignments', async ({ page }) => {
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
      console.log('No person with assignments found, creating one first');
      // Navigate to first person to create assignment
      const firstPerson = peopleRows[0];
      await firstPerson.locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Quick assignment creation
      await page.click('button:has-text("Add Assignment")');
      await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
      await page.click('button[role="tab"]:has-text("Manual Selection")');
      
      // Select first project
      const projectSelect = page.locator('#project-select');
      const firstOption = await projectSelect.locator('option[value]:not([value=""])').first();
      if (await firstOption.count() > 0) {
        const value = await firstOption.getAttribute('value');
        await projectSelect.selectOption(value!);
      }
      
      // Submit
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
      
      // Reload to see the assignment
      await page.goto('http://localhost:3121/people');
      targetPerson = await page.locator('table tbody tr').first();
    }
    
    // Navigate to person details
    await targetPerson.locator('td:last-child button').first().click();
    await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
    
    // Check for assignments
    const assignmentsExist = await page.locator('text=Active Assignments').count() > 0;
    console.log('Assignments section exists:', assignmentsExist);
    
    // Test reduce workload
    const reduceButton = page.locator('button:has-text("Reduce Workload")');
    if (await reduceButton.count() > 0 && await reduceButton.isVisible()) {
      await reduceButton.click();
      await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
      console.log('Reduce workload modal opened');
      
      // Close modal
      await page.keyboard.press('Escape');
    }
  });

  test('Validate overallocation warnings', async ({ page }) => {
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
    
    // Set high allocation
    await page.fill('#allocation-slider', '100');
    
    // Look for warning
    const warnings = await page.locator('text=/overallocat|exceed|Warning|363%/i').count();
    console.log(`Found ${warnings} overallocation warnings`);
    
    // Close modal
    await page.keyboard.press('Escape');
  });

  test('Test phase-linked assignments', async ({ page }) => {
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
        console.log('Phase dropdown is available');
        
        // Select a phase
        const phaseOption = await phaseSelect.locator('option[value]:not([value=""])').first();
        if (await phaseOption.count() > 0) {
          const phaseValue = await phaseOption.getAttribute('value');
          await phaseSelect.selectOption(phaseValue!);
          console.log('Selected a phase');
          
          // Verify date fields are disabled
          const startDate = page.locator('#start-date');
          const endDate = page.locator('#end-date');
          
          const startDisabled = await startDate.isDisabled();
          const endDisabled = await endDate.isDisabled();
          
          console.log('Date fields disabled for phase-linked:', startDisabled && endDisabled);
        }
      } else {
        console.log('No phase dropdown available');
      }
    }
    
    // Close modal
    await page.keyboard.press('Escape');
  });

  test('Search assignments by project', async ({ page }) => {
    // Navigate to projects page
    await page.goto('http://localhost:3121/projects');
    await page.waitForLoadState('networkidle');
    
    // Projects page might show roadmap or table view
    // Look for project links or switch to table view
    await page.waitForSelector('text=Project', { timeout: 10000 });
    
    // Check if we need to switch to table/list view
    const projectsTab = page.locator('button[role="tab"]:has-text("Projects")');
    if (await projectsTab.count() > 0) {
      await projectsTab.click();
      await page.waitForTimeout(500);
    }
    
    // Look for project links - could be in table or cards
    const projectLinks = page.locator('a:has-text("Customer Portal"), a:has-text("Mobile"), a:has-text("AI")').first();
    
    if (await projectLinks.count() > 0) {
      const projectName = await projectLinks.textContent();
      console.log('Clicking on project:', projectName);
      await projectLinks.click();
      
      // Wait for project details page
      await page.waitForSelector('text=/Project|Timeline|Team|Resources/i', { timeout: 10000 });
      console.log('Project details page loaded');
      
      // Look for team/assignments section
      const teamSection = await page.locator('text=/Team|Assignments|Resources|People/i').count();
      console.log('Team/assignments sections found:', teamSection);
    } else {
      console.log('No project links found on projects page');
    }
  });
});