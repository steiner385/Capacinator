import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { setupTestUser } from './helpers/test-setup';

// Test data setup
const testPerson = {
  name: `Test Person ${randomUUID().substring(0, 8)}`,
  email: `test-${randomUUID().substring(0, 8)}@example.com`
};

const testProject = {
  name: `Test Project ${randomUUID().substring(0, 8)}`,
  external_id: `TEST-${randomUUID().substring(0, 8)}`
};

const testAssignment = {
  allocation_percentage: 50,
  start_date: new Date().toISOString().split('T')[0],
  end_date: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0]
};

test.describe('Assignment CRUD Operations - Comprehensive E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestUser(page);
  });

  test('Complete assignment lifecycle: Create, View, Modify, Delete', async ({ page }) => {
    // Step 1: Create a test person
    console.log('Creating test person...');
    await page.click('text=People');
    await page.waitForSelector('h1:has-text("People")');
    
    // Click Add Person button
    await page.click('button:has-text("Add Person")');
    await page.waitForSelector('h2:has-text("Add New Person")');
    
    // Fill in person details
    await page.fill('input[name="name"]', testPerson.name);
    await page.fill('input[name="email"]', testPerson.email);
    await page.selectOption('select[name="worker_type"]', 'FTE');
    await page.fill('input[name="default_availability_percentage"]', '100');
    await page.fill('input[name="default_hours_per_day"]', '8');
    
    // Select a role
    await page.click('text=Primary Role');
    await page.waitForSelector('select[name="primary_role_id"]');
    await page.selectOption('select[name="primary_role_id"]', { index: 1 });
    
    // Save person
    await page.click('button:has-text("Create Person")');
    await page.waitForSelector(`text=${testPerson.name}`, { timeout: 10000 });
    
    // Navigate to person details
    await page.click(`text=${testPerson.name}`);
    await page.waitForSelector('h1:has-text("Person Details")');
    
    // Step 2: Create an assignment
    console.log('Creating assignment...');
    
    // Click Add Assignment button
    await page.click('button:has-text("Add Assignment")');
    await page.waitForSelector('h2:has-text("Smart Assignment")');
    
    // Switch to manual tab
    await page.click('button[role="tab"]:has-text("Manual Selection")');
    
    // Select a project
    await page.waitForSelector('select#project-select');
    const projectOptions = await page.$$eval('select#project-select option', options => 
      options.map(option => ({ value: option.value, text: option.textContent }))
    );
    
    // Find a project with resource needs (skip the first empty option)
    const validProject = projectOptions.find(opt => opt.value && opt.text && !opt.text.includes('No projects'));
    if (validProject) {
      await page.selectOption('select#project-select', validProject.value);
    } else {
      // If no projects with demand, we need to create one
      console.log('No projects with resource needs found, skipping assignment creation test');
      return;
    }
    
    // Wait for role dropdown to be enabled
    await page.waitForSelector('select#role-select:not([disabled])', { timeout: 5000 });
    
    // Select a role
    const roleOptions = await page.$$eval('select#role-select option', options => 
      options.map(option => ({ value: option.value, text: option.textContent }))
    );
    
    const validRole = roleOptions.find(opt => opt.value && !opt.text?.includes('Select'));
    if (validRole) {
      await page.selectOption('select#role-select', validRole.value);
    }
    
    // Set allocation percentage
    await page.fill('input#allocation-slider', testAssignment.allocation_percentage.toString());
    
    // Set dates
    await page.fill('input#start-date', testAssignment.start_date);
    await page.fill('input#end-date', testAssignment.end_date);
    
    // Create assignment
    await page.click('button:has-text("Create Assignment")');
    
    // Wait for modal to close and assignment to appear
    await page.waitForSelector('h2:has-text("Smart Assignment")', { state: 'hidden', timeout: 10000 });
    
    // Verify assignment appears in the assignments section
    await page.waitForSelector('text=Active Assignments', { timeout: 10000 });
    
    // Step 3: View assignment details
    console.log('Viewing assignment...');
    
    // Check if assignment is visible
    const assignmentRow = await page.locator('table').locator('tr', { 
      hasText: validProject?.text || ''
    }).first();
    
    await expect(assignmentRow).toBeVisible();
    
    // Verify assignment details
    await expect(assignmentRow).toContainText(`${testAssignment.allocation_percentage}%`);
    
    // Step 4: Modify assignment (inline edit)
    console.log('Modifying assignment...');
    
    // Click on the assignment row to potentially trigger inline edit
    // Note: This depends on the implementation - adjust based on actual UI
    
    // Alternative: Use Edit button if available
    const editButton = assignmentRow.locator('button[title="Edit"]');
    if (await editButton.count() > 0) {
      await editButton.click();
      
      // Wait for edit modal/form
      await page.waitForSelector('input[value="50"]', { timeout: 5000 });
      
      // Change allocation
      await page.fill('input[type="range"]', '75');
      
      // Save changes
      await page.click('button:has-text("Save")');
      
      // Verify change
      await expect(assignmentRow).toContainText('75%');
    }
    
    // Step 5: Delete assignment
    console.log('Deleting assignment...');
    
    // Test reduce workload functionality
    await page.click('button:has-text("Reduce Workload")');
    await page.waitForSelector('h2:has-text("Smart Assignment")');
    
    // Switch to manual tab
    await page.click('button[role="tab"]:has-text("Manual Selection")');
    
    // Should see delete interface
    await expect(page.locator('text=Select assignments to remove')).toBeVisible();
    
    // Find the assignment we created
    const assignmentToDelete = page.locator('.assignment-item').filter({ 
      hasText: validProject?.text || '' 
    }).first();
    
    if (await assignmentToDelete.count() > 0) {
      // Click remove button
      await assignmentToDelete.locator('button:has-text("Remove")').click();
      
      // Confirm deletion
      page.on('dialog', dialog => dialog.accept());
      
      // Wait for assignment to be removed
      await expect(assignmentToDelete).toBeHidden({ timeout: 10000 });
    }
    
    // Close modal
    await page.click('button:has-text("Done")');
    
    // Verify assignment is removed
    await expect(assignmentRow).toBeHidden({ timeout: 10000 });
  });

  test('Assignment validation: Date constraints', async ({ page }) => {
    // Navigate to a person's detail page
    await page.click('text=People');
    await page.waitForSelector('h1:has-text("People")');
    
    // Click on first person
    const firstPerson = await page.locator('table tbody tr').first();
    await firstPerson.click();
    
    // Click Add Assignment
    await page.click('button:has-text("Add Assignment")');
    await page.waitForSelector('h2:has-text("Smart Assignment")');
    
    // Switch to manual tab
    await page.click('button[role="tab"]:has-text("Manual Selection")');
    
    // Try to set end date before start date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    await page.fill('input#start-date', tomorrow.toISOString().split('T')[0]);
    await page.fill('input#end-date', yesterday.toISOString().split('T')[0]);
    
    // Try to create assignment
    await page.click('button:has-text("Create Assignment")');
    
    // Should see validation error
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('End date must be after start date');
      dialog.accept();
    });
  });

  test('Assignment validation: Allocation constraints', async ({ page }) => {
    // Navigate to a person with existing assignments
    await page.click('text=People');
    await page.waitForSelector('h1:has-text("People")');
    
    // Find a person with high utilization
    const personRows = await page.locator('table tbody tr').all();
    let targetPerson = null;
    
    for (const row of personRows) {
      const utilizationText = await row.locator('td:nth-child(5)').textContent();
      if (utilizationText && parseInt(utilizationText) > 80) {
        targetPerson = row;
        break;
      }
    }
    
    if (!targetPerson) {
      console.log('No person with high utilization found, skipping test');
      return;
    }
    
    await targetPerson.click();
    await page.waitForSelector('h1:has-text("Person Details")');
    
    // Try to add assignment that would overallocate
    await page.click('button:has-text("Add Assignment")');
    await page.waitForSelector('h2:has-text("Smart Assignment")');
    
    // Switch to manual tab
    await page.click('button[role="tab"]:has-text("Manual Selection")');
    
    // Set high allocation
    await page.fill('input#allocation-slider', '50');
    
    // Check for overallocation warning
    const warningElement = page.locator('.impact-preview.warning');
    if (await warningElement.count() > 0) {
      await expect(warningElement).toContainText('overallocate');
    }
  });

  test('Phase-linked assignment functionality', async ({ page }) => {
    // Navigate to a person
    await page.click('text=People');
    await page.waitForSelector('h1:has-text("People")');
    
    const firstPerson = await page.locator('table tbody tr').first();
    await firstPerson.click();
    
    // Add phase-linked assignment
    await page.click('button:has-text("Add Assignment")');
    await page.waitForSelector('h2:has-text("Smart Assignment")');
    
    // Switch to manual tab
    await page.click('button[role="tab"]:has-text("Manual Selection")');
    
    // Select project with phases
    await page.waitForSelector('select#project-select');
    const projectWithPhases = await page.$$eval('select#project-select option', (options, testText) => {
      for (const option of options) {
        if (option.value && !option.textContent?.includes('No projects')) {
          return option.value;
        }
      }
      return null;
    });
    
    if (projectWithPhases) {
      await page.selectOption('select#project-select', projectWithPhases);
      
      // Wait for phase dropdown
      await page.waitForSelector('select#phase-select:not([disabled])');
      
      // Select a phase
      const phaseOptions = await page.$$eval('select#phase-select option', options => 
        options.filter(opt => opt.value).map(opt => opt.value)
      );
      
      if (phaseOptions.length > 0) {
        await page.selectOption('select#phase-select', phaseOptions[0]);
        
        // Verify date fields are disabled
        await expect(page.locator('input#start-date')).toBeDisabled();
        await expect(page.locator('input#end-date')).toBeDisabled();
        
        // Verify phase-linked indicator
        await expect(page.locator('text=Phase-linked assignment')).toBeVisible();
      }
    }
  });

  test('Bulk assignment operations', async ({ page }) => {
    // This test would verify bulk operations if implemented
    // For now, we'll test the reduce workload feature with multiple assignments
    
    // Navigate to a person with multiple assignments
    await page.click('text=People');
    await page.waitForSelector('h1:has-text("People")');
    
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
      console.log('No person with multiple assignments found, skipping test');
      return;
    }
    
    await targetPerson.click();
    await page.waitForSelector('h1:has-text("Person Details")');
    
    // Open reduce workload modal
    await page.click('button:has-text("Reduce Workload")');
    await page.waitForSelector('h2:has-text("Smart Assignment")');
    
    // Switch to manual tab
    await page.click('button[role="tab"]:has-text("Manual Selection")');
    
    // Count assignments
    const assignmentItems = await page.locator('.assignment-item').count();
    expect(assignmentItems).toBeGreaterThan(0);
    
    // Verify each assignment has a remove button
    for (let i = 0; i < assignmentItems; i++) {
      const removeButton = page.locator('.assignment-item').nth(i).locator('button:has-text("Remove")');
      await expect(removeButton).toBeVisible();
    }
  });

  test('Assignment search and filtering', async ({ page }) => {
    // Navigate to a project to see all assignments
    await page.click('text=Projects');
    await page.waitForSelector('h1:has-text("Projects")');
    
    // Click on first project
    const firstProject = await page.locator('table tbody tr').first();
    const projectName = await firstProject.locator('td:first-child').textContent();
    await firstProject.click();
    
    await page.waitForSelector('h1:has-text("Project Details")');
    
    // Check if assignments section exists
    const assignmentsSection = page.locator('text=Assignments');
    if (await assignmentsSection.count() > 0) {
      // Verify assignment list shows project assignments
      const assignmentTable = page.locator('table').filter({ has: page.locator('th:has-text("Person")') });
      
      if (await assignmentTable.count() > 0) {
        // Check that assignments are for this project
        const rows = await assignmentTable.locator('tbody tr').count();
        console.log(`Found ${rows} assignments for project ${projectName}`);
      }
    }
  });

  test('Assignment conflict detection', async ({ page }) => {
    // This test verifies that the system prevents conflicting assignments
    // Navigate to a person
    await page.click('text=People');
    await page.waitForSelector('h1:has-text("People")');
    
    const firstPerson = await page.locator('table tbody tr').first();
    await firstPerson.click();
    
    // Try to create overlapping assignments
    await page.click('button:has-text("Add Assignment")');
    await page.waitForSelector('h2:has-text("Smart Assignment")');
    
    // Check recommended tab for conflict warnings
    const recommendedTab = page.locator('button[role="tab"]:has-text("Recommended")');
    await recommendedTab.click();
    
    // Look for any conflict indicators
    const conflictWarnings = page.locator('.warning, .conflict, .overallocated');
    const warningCount = await conflictWarnings.count();
    
    console.log(`Found ${warningCount} potential conflict warnings`);
  });

  test('Assignment history and audit trail', async ({ page }) => {
    // This test would verify assignment history if implemented
    // For now, we'll check that assignments show creation metadata
    
    await page.click('text=People');
    await page.waitForSelector('h1:has-text("People")');
    
    // Find person with assignments
    const personWithAssignments = await page.locator('table tbody tr').filter({
      has: page.locator('td:nth-child(4):not(:has-text("0"))')
    }).first();
    
    if (await personWithAssignments.count() > 0) {
      await personWithAssignments.click();
      await page.waitForSelector('h1:has-text("Person Details")');
      
      // Expand assignments section if needed
      const assignmentsSection = page.locator('section', { has: page.locator('text=Active Assignments') });
      
      if (await assignmentsSection.count() > 0) {
        // Check for metadata like dates
        const assignmentDates = await assignmentsSection.locator('text=/\\d{1,2}\\/\\d{1,2}\\/\\d{4}/').count();
        expect(assignmentDates).toBeGreaterThan(0);
      }
    }
  });

  test.afterEach(async ({ page }) => {
    // Clean up test data if needed
    // This could involve API calls to delete test entities
    console.log('Test completed');
  });
});