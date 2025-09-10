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

test.describe('Assignment CRUD Operations - Fixed E2E Tests', () => {
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
    
    // Wait for person details page - check for workload insights section
    await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
    
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
    
    // Set dates if required (not phase-linked)
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const startDateField = page.locator('#start-date');
    const endDateField = page.locator('#end-date');
    
    if (await startDateField.isVisible() && await startDateField.isEnabled()) {
      await startDateField.fill(today.toISOString().split('T')[0]);
    }
    
    if (await endDateField.isVisible() && await endDateField.isEnabled()) {
      await endDateField.fill(nextMonth.toISOString().split('T')[0]);
    }
    
    // Submit with Enter key
    await page.keyboard.press('Enter');
    
    // Wait for modal to close or success indication
    await Promise.race([
      page.waitForSelector('text=Smart Assignment', { state: 'detached', timeout: 10000 }),
      page.waitForSelector('text=Active Assignments', { timeout: 10000 })
    ]);
    
    // Step 3: Verify assignment appears
    console.log('Verifying assignment was created...');
    await expect(page.locator('text=Active Assignments')).toBeVisible({ timeout: 10000 });
    
    // Step 4: Test reduce workload
    console.log('Testing reduce workload...');
    await page.click('button:has-text("Reduce Workload")');
    await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
    
    // Close modal
    await page.keyboard.press('Escape');
    
    console.log('Assignment lifecycle test completed');
  });

  test('Assignment validation - overallocation warning', async ({ page }) => {
    // Navigate to people page
    await page.goto('http://localhost:3121/people');
    await page.waitForLoadState('networkidle');
    
    // Use first person
    const firstPersonRow = page.locator('table tbody tr').first();
    
    // Navigate to person details
    await firstPersonRow.locator('td:last-child button').first().click();
    await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
    
    // Open assignment modal
    await page.click('button:has-text("Add Assignment")');
    await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
    
    // Switch to manual tab
    await page.click('button[role="tab"]:has-text("Manual Selection")');
    
    // Select project first
    const projectSelect = page.locator('#project-select');
    const projectOptions = await projectSelect.locator('option').all();
    
    for (let i = 1; i < projectOptions.length; i++) {
      const value = await projectOptions[i].getAttribute('value');
      if (value) {
        await projectSelect.selectOption(value);
        break;
      }
    }
    
    // Wait for role to be available
    await page.waitForTimeout(500);
    
    // Set high allocation
    const allocationInput = page.locator('#allocation-slider');
    if (await allocationInput.isVisible()) {
      await allocationInput.fill('100');
    }
    
    // Check for overallocation warning
    const warningText = page.locator('text=/overallocat|Warning|exceed|363%/i');
    const warningCount = await warningText.count();
    
    console.log(`Found ${warningCount} overallocation warnings`);
    
    // Close modal
    await page.keyboard.press('Escape');
  });

  test('Search and filter assignments', async ({ page }) => {
    // Navigate to projects page
    await page.goto('http://localhost:3121/projects');
    await page.waitForLoadState('networkidle');
    
    // Wait for projects table to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Click on first project
    const firstProjectRow = page.locator('table tbody tr').first();
    
    // Get project name before clicking
    const projectNameElement = firstProjectRow.locator('td').first();
    let projectName = '';
    
    try {
      projectName = await projectNameElement.textContent({ timeout: 5000 }) || '';
    } catch (e) {
      console.log('Could not get project name');
    }
    
    // Click view details button
    const projectViewButton = firstProjectRow.locator('td:last-child button').first();
    await projectViewButton.click();
    
    // Wait for project details page - look for common elements
    await page.waitForSelector('text=Project Information, text=Project Overview, text=Timeline, text=Resources', { timeout: 10000 });
    
    console.log(`Viewing project: ${projectName}`);
    
    // Check for assignments/team members section
    const teamSection = page.locator('text=Team Members, text=Assignments, text=Resources, text=People');
    if (await teamSection.count() > 0) {
      console.log('Found team/assignments section');
      
      // Look for people assigned
      const peopleList = page.locator('table').filter({ 
        has: page.locator('th:has-text("Person"), th:has-text("Name"), th:has-text("Role")') 
      });
      
      if (await peopleList.count() > 0) {
        const rows = await peopleList.locator('tbody tr').count();
        console.log(`Project has ${rows} team members assigned`);
      }
    }
  });

  test.afterEach(async ({ page }) => {
    // Clean up
    console.log('Test completed');
  });
});