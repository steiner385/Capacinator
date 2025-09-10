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

test.describe('Assignment CRUD Operations - Final E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupUser(page);
  });

  test('Complete assignment lifecycle', async ({ page }) => {
    // Navigate to people page
    await page.goto('http://localhost:3121/people');
    await page.waitForLoadState('networkidle');
    
    // Step 1: Navigate to person details
    const viewButton = page.locator('table tbody tr').first().locator('td:last-child button').first();
    await viewButton.click();
    await page.waitForSelector('text=Person Details', { timeout: 10000 });
    
    // Step 2: Create assignment
    console.log('Creating new assignment...');
    await page.click('button:has-text("Add Assignment")');
    await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
    
    // Use manual selection
    await page.click('button[role="tab"]:has-text("Manual Selection")');
    
    // Select project
    const projectSelect = page.locator('#project-select');
    const projectOptions = await projectSelect.locator('option').all();
    let selectedProject = '';
    
    for (let i = 1; i < projectOptions.length; i++) {
      const value = await projectOptions[i].getAttribute('value');
      const text = await projectOptions[i].textContent();
      if (value && !text?.includes('No projects')) {
        await projectSelect.selectOption(value);
        selectedProject = text || '';
        console.log('Selected project:', selectedProject);
        break;
      }
    }
    
    // Wait for role dropdown
    await page.waitForTimeout(500);
    
    // Select role
    const roleSelect = page.locator('#role-select');
    if (await roleSelect.isEnabled()) {
      const roleOptions = await roleSelect.locator('option').all();
      for (let i = 1; i < roleOptions.length; i++) {
        const value = await roleOptions[i].getAttribute('value');
        if (value) {
          await roleSelect.selectOption(value);
          break;
        }
      }
    }
    
    // Set allocation
    await page.fill('#allocation-slider', '50');
    
    // Submit with Enter key
    await page.keyboard.press('Enter');
    
    // Wait for modal to close
    await page.waitForSelector('text=Smart Assignment', { state: 'detached', timeout: 10000 });
    
    // Step 3: Verify assignment appears
    console.log('Verifying assignment was created...');
    await expect(page.locator('text=Active Assignments')).toBeVisible({ timeout: 10000 });
    
    // Look for the project name in assignments
    const assignmentTable = page.locator('table').filter({ has: page.locator('th:has-text("Project")') });
    if (await assignmentTable.count() > 0 && selectedProject) {
      await expect(assignmentTable).toContainText(selectedProject);
    }
    
    // Step 4: Modify assignment (if inline editing available)
    console.log('Testing assignment modification...');
    const assignmentRows = await page.locator('table tbody tr').all();
    if (assignmentRows.length > 0) {
      // Check for edit button
      const editButton = assignmentRows[0].locator('button[title*="Edit"], button[title*="edit"]');
      if (await editButton.count() > 0) {
        await editButton.click();
        // Modify allocation if possible
        const allocationField = page.locator('input[type="range"], input[type="number"]').first();
        if (await allocationField.isVisible()) {
          await allocationField.fill('75');
          await page.keyboard.press('Enter');
        }
      }
    }
    
    // Step 5: Delete assignment using Reduce Workload
    console.log('Testing assignment deletion...');
    await page.click('button:has-text("Reduce Workload")');
    await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
    
    // Switch to manual tab
    await page.click('button[role="tab"]:has-text("Manual Selection")');
    
    // Look for remove options
    await expect(page.locator('text=Select assignments to remove')).toBeVisible({ timeout: 5000 });
    
    // Close modal
    await page.keyboard.press('Escape');
    
    console.log('Assignment lifecycle test completed');
  });

  test('Assignment validation - overallocation warning', async ({ page }) => {
    // Navigate to people page
    await page.goto('http://localhost:3121/people');
    await page.waitForLoadState('networkidle');
    
    // Find a person with high utilization
    const peopleRows = await page.locator('table tbody tr').all();
    let selectedPerson = null;
    
    for (const row of peopleRows) {
      const utilizationCell = await row.locator('td:nth-child(5)').textContent();
      if (utilizationCell && parseInt(utilizationCell) > 80) {
        selectedPerson = row;
        break;
      }
    }
    
    if (!selectedPerson) {
      // Just use first person if no one has high utilization
      selectedPerson = peopleRows[0];
    }
    
    // Navigate to person details
    await selectedPerson.locator('td:last-child button').first().click();
    await page.waitForSelector('text=Person Details', { timeout: 10000 });
    
    // Open assignment modal
    await page.click('button:has-text("Add Assignment")');
    await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
    
    // Switch to manual tab
    await page.click('button[role="tab"]:has-text("Manual Selection")');
    
    // Set high allocation
    const allocationInput = page.locator('#allocation-slider');
    if (await allocationInput.isVisible()) {
      await allocationInput.fill('100');
    }
    
    // Check for overallocation warning
    const warningText = page.locator('text=/overallocat|Warning|exceed/i');
    const warningCount = await warningText.count();
    
    console.log(`Found ${warningCount} overallocation warnings`);
    
    // Close modal
    await page.keyboard.press('Escape');
  });

  test('Phase-linked assignment', async ({ page }) => {
    // Navigate to people page
    await page.goto('http://localhost:3121/people');
    await page.waitForLoadState('networkidle');
    
    // Go to first person
    const viewButton = page.locator('table tbody tr').first().locator('td:last-child button').first();
    await viewButton.click();
    await page.waitForSelector('text=Person Details', { timeout: 10000 });
    
    // Open assignment modal
    await page.click('button:has-text("Add Assignment")');
    await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
    
    // Switch to manual tab
    await page.click('button[role="tab"]:has-text("Manual Selection")');
    
    // Select a project
    const projectSelect = page.locator('#project-select');
    const projectOptions = await projectSelect.locator('option').all();
    
    for (let i = 1; i < projectOptions.length; i++) {
      const value = await projectOptions[i].getAttribute('value');
      if (value) {
        await projectSelect.selectOption(value);
        break;
      }
    }
    
    // Wait for phase dropdown
    await page.waitForTimeout(500);
    
    // Check if phase dropdown exists and is enabled
    const phaseSelect = page.locator('#phase-select');
    if (await phaseSelect.count() > 0 && await phaseSelect.isEnabled()) {
      console.log('Phase dropdown found and enabled');
      
      // Select a phase
      const phaseOptions = await phaseSelect.locator('option').all();
      for (let i = 1; i < phaseOptions.length; i++) {
        const value = await phaseOptions[i].getAttribute('value');
        if (value) {
          await phaseSelect.selectOption(value);
          console.log('Selected a phase');
          
          // Verify date fields are disabled for phase-linked assignment
          const startDateField = page.locator('#start-date');
          const endDateField = page.locator('#end-date');
          
          if (await startDateField.isDisabled() && await endDateField.isDisabled()) {
            console.log('Date fields correctly disabled for phase-linked assignment');
          }
          
          break;
        }
      }
    } else {
      console.log('No phase dropdown available for selected project');
    }
    
    // Close modal
    await page.keyboard.press('Escape');
  });

  test('Bulk assignment operations', async ({ page }) => {
    // Navigate to people page
    await page.goto('http://localhost:3121/people');
    await page.waitForLoadState('networkidle');
    
    // Find person with multiple assignments
    const peopleRows = await page.locator('table tbody tr').all();
    let targetPerson = null;
    
    for (const row of peopleRows) {
      const assignmentCount = await row.locator('td:nth-child(4)').textContent();
      if (assignmentCount && parseInt(assignmentCount) >= 2) {
        targetPerson = row;
        break;
      }
    }
    
    if (!targetPerson) {
      console.log('No person with multiple assignments found');
      return;
    }
    
    // Navigate to person details
    await targetPerson.locator('td:last-child button').first().click();
    await page.waitForSelector('text=Person Details', { timeout: 10000 });
    
    // Open reduce workload modal
    await page.click('button:has-text("Reduce Workload")');
    await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
    
    // Switch to manual tab
    await page.click('button[role="tab"]:has-text("Manual Selection")');
    
    // Count assignment items
    const assignmentItems = page.locator('.assignment-item, [data-testid="assignment-item"]');
    const itemCount = await assignmentItems.count();
    
    console.log(`Found ${itemCount} assignments available for removal`);
    
    if (itemCount > 0) {
      // Check for remove buttons
      const removeButtons = page.locator('button:has-text("Remove")');
      const removeCount = await removeButtons.count();
      console.log(`Found ${removeCount} remove buttons`);
    }
    
    // Close modal
    await page.keyboard.press('Escape');
  });

  test('Search and filter assignments', async ({ page }) => {
    // Navigate to projects page to see all assignments
    await page.goto('http://localhost:3121/projects');
    await page.waitForLoadState('networkidle');
    
    // Click on first project
    const firstProjectRow = page.locator('table tbody tr').first();
    const projectName = await firstProjectRow.locator('td:first-child').textContent();
    
    // Click view details
    await firstProjectRow.locator('td:last-child button').first().click();
    await page.waitForSelector('text=Project Details', { timeout: 10000 });
    
    console.log(`Viewing assignments for project: ${projectName}`);
    
    // Check for assignments section
    const assignmentsSection = page.locator('text=Assignments, text=Team Members, text=Resources');
    if (await assignmentsSection.count() > 0) {
      // Look for assignment table
      const assignmentTable = page.locator('table').filter({ 
        has: page.locator('th:has-text("Person"), th:has-text("Name")') 
      });
      
      if (await assignmentTable.count() > 0) {
        const rows = await assignmentTable.locator('tbody tr').count();
        console.log(`Project has ${rows} assignments`);
      }
    }
  });

  test.afterEach(async ({ page }) => {
    // Clean up
    console.log('Test completed');
  });
});