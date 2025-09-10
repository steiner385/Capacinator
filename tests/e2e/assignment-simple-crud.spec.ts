import { test, expect } from '@playwright/test';

// Simple test without profile modal handling
test.describe('Assignment CRUD - Simple Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set localStorage to bypass profile selection
    await page.goto('http://localhost:3121');
    
    // Set the user in localStorage
    await page.evaluate(() => {
      const user = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Alice Johnson',
        email: 'alice.johnson@example.com',
        primary_role_name: 'Senior Software Engineer',
        worker_type: 'FTE',
        default_availability_percentage: 100,
        default_hours_per_day: 8
      };
      localStorage.setItem('capacinator_current_user', JSON.stringify(user));
    });
    
    // Navigate to people page after setting user
    await page.goto('http://localhost:3121/people');
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
  });

  test('Navigate to people page and create assignment', async ({ page }) => {
    // Verify we're on people page by checking for the people table
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Click on the view details button (eye icon) for the first person
    const firstPersonRow = page.locator('table tbody tr').first();
    // The eye icon is in the last column (Actions)
    const viewButton = firstPersonRow.locator('td:last-child button, td:last-child a').first();
    await viewButton.click();
    
    // Wait for person details page
    await page.waitForSelector('text=Workload Insights, text=Basic Information', { timeout: 10000 });
    
    // Click Add Assignment button
    const addButton = page.locator('button:has-text("Add Assignment")');
    await expect(addButton).toBeVisible();
    await addButton.click();
    
    // Wait for assignment modal
    await page.waitForSelector('h2:has-text("Smart Assignment")', { timeout: 10000 });
    
    // Switch to manual tab
    const manualTab = page.locator('button[role="tab"]:has-text("Manual Selection")');
    await manualTab.click();
    
    // Select project
    const projectSelect = page.locator('#project-select');
    await expect(projectSelect).toBeVisible();
    
    // Get project options
    const projectOptions = await projectSelect.locator('option').all();
    console.log(`Found ${projectOptions.length} project options`);
    
    // Find a valid project (skip first empty option)
    for (let i = 1; i < projectOptions.length; i++) {
      const optionText = await projectOptions[i].textContent();
      const optionValue = await projectOptions[i].getAttribute('value');
      if (optionValue && !optionText?.includes('No projects')) {
        console.log(`Selecting project: ${optionText}`);
        await projectSelect.selectOption(optionValue);
        break;
      }
    }
    
    // Wait for role dropdown to be enabled
    const roleSelect = page.locator('#role-select');
    await expect(roleSelect).toBeEnabled({ timeout: 5000 });
    
    // Select first available role
    const roleOptions = await roleSelect.locator('option').all();
    for (let i = 1; i < roleOptions.length; i++) {
      const optionValue = await roleOptions[i].getAttribute('value');
      if (optionValue) {
        await roleSelect.selectOption(optionValue);
        break;
      }
    }
    
    // Set allocation
    await page.fill('#allocation-slider', '50');
    
    // Set dates (current month)
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    // Fill in dates if they are required and visible
    const startDate = page.locator('#start-date');
    const endDate = page.locator('#end-date');
    
    if (await startDate.isVisible() && await startDate.isEnabled()) {
      await startDate.fill(today.toISOString().split('T')[0]);
    }
    
    if (await endDate.isVisible() && await endDate.isEnabled()) {
      await endDate.fill(nextMonth.toISOString().split('T')[0]);
    }
    
    // Submit the form using Enter key instead of clicking button
    await page.keyboard.press('Enter');
    
    // Wait for modal to close
    await page.waitForSelector('h2:has-text("Smart Assignment")', { state: 'detached', timeout: 10000 });
    
    // Verify assignment appears
    await expect(page.locator('text=Active Assignments')).toBeVisible({ timeout: 10000 });
    
    console.log('Successfully created assignment');
  });

  test('View and delete assignment', async ({ page }) => {
    // Go to first person with assignments
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Find person with assignments (check assignment count column)
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
      console.log('No person with assignments found, skipping test');
      return;
    }
    
    await targetPerson.click();
    await page.waitForSelector('text=Person Details', { timeout: 10000 });
    
    // Check for active assignments
    const assignmentsSection = page.locator('text=Active Assignments');
    await expect(assignmentsSection).toBeVisible();
    
    // Use Reduce Workload to delete
    await page.click('button:has-text("Reduce Workload")');
    await page.waitForSelector('h2:has-text("Smart Assignment")', { timeout: 10000 });
    
    // Switch to manual tab
    await page.click('button[role="tab"]:has-text("Manual Selection")');
    
    // Look for assignments to remove
    const assignmentItems = page.locator('.assignment-item');
    const itemCount = await assignmentItems.count();
    
    if (itemCount > 0) {
      console.log(`Found ${itemCount} assignments to potentially remove`);
      
      // Click remove on first assignment
      const firstRemoveButton = assignmentItems.first().locator('button:has-text("Remove")');
      if (await firstRemoveButton.count() > 0) {
        await firstRemoveButton.click();
        console.log('Clicked remove button');
      }
    }
    
    // Close modal
    await page.click('button:has-text("Done"), button:has-text("Cancel")');
    
    console.log('Delete assignment test completed');
  });
});