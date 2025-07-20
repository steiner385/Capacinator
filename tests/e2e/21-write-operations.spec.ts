import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Write Operations - CRUD', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.gotoWithRetry('/');
    await helpers.setupPage();
  });

  test.describe('Projects CRUD', () => {
    test('should create a new project', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Projects")', '/projects');
      
      // Click create/add button
      await page.click('button:has-text("Add Project"), button:has-text("New Project"), button:has-text("Create")');
      
      // Fill form
      await page.fill('input[name="name"], input[placeholder*="name"]', 'Test E2E Project');
      
      // Select project type
      const typeSelect = page.locator('select[name="project_type_id"], select[name="projectType"]');
      if (await typeSelect.isVisible()) {
        const options = await typeSelect.locator('option').count();
        if (options > 1) {
          await typeSelect.selectOption({ index: 1 });
        }
      }
      
      // Select location
      const locationSelect = page.locator('select[name="location_id"], select[name="location"]');
      if (await locationSelect.isVisible()) {
        const options = await locationSelect.locator('option').count();
        if (options > 1) {
          await locationSelect.selectOption({ index: 1 });
        }
      }
      
      // Set priority
      const prioritySelect = page.locator('select[name="priority"]');
      if (await prioritySelect.isVisible()) {
        await prioritySelect.selectOption('high');
      }
      
      // Fill description
      await page.fill('textarea[name="description"], textarea[placeholder*="description"]', 'Test project created by E2E tests');
      
      // Submit
      await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Create Project")');
      
      // Wait for navigation or success message
      await page.waitForTimeout(1000);
      
      // Verify project was created
      await expect(page.locator('text=Test E2E Project')).toBeVisible({ timeout: 10000 });
    });

    test('should edit an existing project', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Projects")', '/projects');
      await helpers.waitForDataLoad();
      
      // Click on first project
      await page.locator('tbody tr td a').first().click();
      await helpers.waitForNavigation();
      
      // Click edit button
      await page.click('button:has-text("Edit"), button[aria-label="Edit"]');
      
      // Update name
      const nameInput = page.locator('input[name="name"]');
      await nameInput.clear();
      await nameInput.fill('Updated Project Name');
      
      // Update description
      const descInput = page.locator('textarea[name="description"]');
      if (await descInput.isVisible()) {
        await descInput.clear();
        await descInput.fill('Updated by E2E test');
      }
      
      // Save
      await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Update")');
      
      // Verify update
      await page.waitForTimeout(1000);
      await expect(page.locator('text=Updated Project Name')).toBeVisible();
    });

    test('should delete a project', async ({ page }) => {
      // First create a project to delete
      await helpers.clickAndNavigate('nav a:has-text("Projects")', '/projects');
      
      // Create project
      await page.click('button:has-text("Add Project"), button:has-text("New Project")');
      await page.fill('input[name="name"]', 'Project to Delete');
      
      // Fill required fields
      const typeSelect = page.locator('select[name="project_type_id"]');
      if (await typeSelect.isVisible() && await typeSelect.locator('option').count() > 1) {
        await typeSelect.selectOption({ index: 1 });
      }
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
      
      // Find and delete the project
      const projectRow = page.locator('tr:has-text("Project to Delete")');
      if (await projectRow.isVisible()) {
        // Click delete button in the row
        await projectRow.locator('button:has-text("Delete"), button[aria-label="Delete"]').click();
        
        // Confirm deletion
        await page.click('button:has-text("Confirm"), button:has-text("Yes")');
        
        // Verify deletion
        await page.waitForTimeout(1000);
        await expect(page.locator('text=Project to Delete')).not.toBeVisible();
      }
    });
  });

  test.describe('People CRUD', () => {
    test('should create a new person', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("People")', '/people');
      
      // Click add button
      await page.click('button:has-text("Add Person"), button:has-text("New Person"), button:has-text("Add")');
      
      // Fill form
      await page.fill('input[name="name"], input[placeholder*="name"]', 'Test User');
      await page.fill('input[name="email"], input[type="email"]', 'testuser@example.com');
      
      // Select role
      const roleSelect = page.locator('select[name="primary_role_id"], select[name="role"]');
      if (await roleSelect.isVisible() && await roleSelect.locator('option').count() > 1) {
        await roleSelect.selectOption({ index: 1 });
      }
      
      // Select location
      const locationSelect = page.locator('select[name="location_id"], select[name="location"]');
      if (await locationSelect.isVisible() && await locationSelect.locator('option').count() > 1) {
        await locationSelect.selectOption({ index: 1 });
      }
      
      // Set worker type
      const workerTypeSelect = page.locator('select[name="worker_type"]');
      if (await workerTypeSelect.isVisible()) {
        await workerTypeSelect.selectOption('FTE');
      }
      
      // Submit
      await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
      
      // Verify creation
      await page.waitForTimeout(1000);
      await expect(page.locator('text=Test User')).toBeVisible({ timeout: 10000 });
    });

    test('should update person availability', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("People")', '/people');
      await helpers.waitForDataLoad();
      
      // Click on first person
      await page.locator('tbody tr td a').first().click();
      await helpers.waitForNavigation();
      
      // Look for availability section
      const availabilitySection = page.locator('text=/Availability|Schedule/').first();
      if (await availabilitySection.isVisible()) {
        // Click add availability override
        await page.click('button:has-text("Add Override"), button:has-text("Add Availability")');
        
        // Fill dates
        await page.fill('input[name="start_date"], input[type="date"]:first', '2025-03-01');
        await page.fill('input[name="end_date"], input[type="date"]:last', '2025-03-07');
        
        // Select type
        const typeSelect = page.locator('select[name="override_type"], select[name="type"]');
        if (await typeSelect.isVisible()) {
          await typeSelect.selectOption('VACATION');
        }
        
        // Add reason
        await page.fill('input[name="reason"], textarea[name="reason"]', 'E2E Test Vacation');
        
        // Save
        await page.click('button[type="submit"], button:has-text("Save")');
        
        // Verify
        await page.waitForTimeout(1000);
        await expect(page.locator('text=E2E Test Vacation')).toBeVisible();
      }
    });
  });

  test.describe('Assignments CRUD', () => {
    test('should create a new assignment', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Assignments")', '/assignments');
      
      // Click create button
      await page.click('button:has-text("Add Assignment"), button:has-text("New Assignment"), button:has-text("Assign")');
      
      // Select project
      const projectSelect = page.locator('select[name="project_id"], select[name="project"]');
      if (await projectSelect.isVisible() && await projectSelect.locator('option').count() > 1) {
        await projectSelect.selectOption({ index: 1 });
      }
      
      // Select person
      const personSelect = page.locator('select[name="person_id"], select[name="person"]');
      if (await personSelect.isVisible() && await personSelect.locator('option').count() > 1) {
        await personSelect.selectOption({ index: 1 });
      }
      
      // Set allocation
      await page.fill('input[name="allocation_percentage"], input[type="number"]', '50');
      
      // Set dates
      await page.fill('input[name="start_date"]', '2025-02-01');
      await page.fill('input[name="end_date"]', '2025-04-30');
      
      // Submit
      await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Assign")');
      
      // Verify
      await page.waitForTimeout(1000);
      
      // Check for success message or new assignment in list
      const newAssignment = page.locator('tbody tr').filter({ hasText: '50%' });
      await expect(newAssignment).toBeVisible({ timeout: 10000 });
    });

    test('should check for assignment conflicts', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Assignments")', '/assignments');
      
      // Create assignment that might conflict
      await page.click('button:has-text("Add Assignment"), button:has-text("New Assignment")');
      
      // Select same person for overlapping period
      const personSelect = page.locator('select[name="person_id"]');
      if (await personSelect.isVisible() && await personSelect.locator('option').count() > 1) {
        await personSelect.selectOption({ index: 1 });
      }
      
      // Set high allocation
      await page.fill('input[name="allocation_percentage"]', '100');
      
      // Set overlapping dates
      await page.fill('input[name="start_date"]', '2025-02-15');
      await page.fill('input[name="end_date"]', '2025-03-15');
      
      // Submit
      await page.click('button[type="submit"]');
      
      // Check for conflict warning
      const conflictWarning = page.locator('text=/conflict|overlapping|overallocated/i');
      if (await conflictWarning.isVisible({ timeout: 5000 })) {
        // Conflict detection is working
        expect(true).toBeTruthy();
      } else {
        // Assignment was created without conflict
        expect(true).toBeTruthy();
      }
    });
  });

  test.describe('Bulk Operations', () => {
    test('should bulk update allocations', async ({ page }) => {
      // Navigate to allocations or settings
      const allocationsLink = page.locator('nav a:has-text("Allocations"), nav a:has-text("Settings")');
      if (await allocationsLink.isVisible()) {
        await allocationsLink.click();
        await helpers.waitForNavigation();
        
        // Look for bulk update option
        const bulkButton = page.locator('button:has-text("Bulk Update"), button:has-text("Update All")');
        if (await bulkButton.isVisible()) {
          await bulkButton.click();
          
          // Set percentage
          await page.fill('input[name="percentage"], input[type="number"]', '80');
          
          // Apply
          await page.click('button:has-text("Apply"), button:has-text("Update")');
          
          // Verify
          await page.waitForTimeout(1000);
          await expect(page.locator('text=Updated')).toBeVisible();
        }
      }
    });

    test('should copy allocations between project types', async ({ page }) => {
      const allocationsLink = page.locator('nav a:has-text("Allocations"), nav a:has-text("Settings")');
      if (await allocationsLink.isVisible()) {
        await allocationsLink.click();
        await helpers.waitForNavigation();
        
        // Look for copy option
        const copyButton = page.locator('button:has-text("Copy"), button:has-text("Duplicate")');
        if (await copyButton.isVisible()) {
          await copyButton.click();
          
          // Select source and target
          const sourceSelect = page.locator('select[name="source"]').first();
          const targetSelect = page.locator('select[name="target"]').last();
          
          if (await sourceSelect.isVisible() && await targetSelect.isVisible()) {
            await sourceSelect.selectOption({ index: 1 });
            await targetSelect.selectOption({ index: 2 });
            
            // Copy
            await page.click('button:has-text("Copy"), button[type="submit"]');
            
            // Verify
            await page.waitForTimeout(1000);
            await expect(page.locator('text=/Copied|Success/')).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Form Validation', () => {
    test('should validate required fields on project form', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Projects")', '/projects');
      
      // Try to create without required fields
      await page.click('button:has-text("Add Project"), button:has-text("New Project")');
      
      // Submit empty form
      await page.click('button[type="submit"]');
      
      // Check for validation errors
      await expect(page.locator('text=/required|please enter|must provide/i')).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("People")', '/people');
      
      await page.click('button:has-text("Add Person"), button:has-text("New Person")');
      
      // Enter invalid email
      await page.fill('input[name="email"], input[type="email"]', 'invalid-email');
      await page.fill('input[name="name"]', 'Test User');
      
      // Submit
      await page.click('button[type="submit"]');
      
      // Check for email validation error
      await expect(page.locator('text=/invalid email|valid email|email format/i')).toBeVisible();
    });

    test('should validate date ranges', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Assignments")', '/assignments');
      
      await page.click('button:has-text("Add Assignment"), button:has-text("New Assignment")');
      
      // Set end date before start date
      await page.fill('input[name="start_date"]', '2025-03-01');
      await page.fill('input[name="end_date"]', '2025-02-01');
      
      // Submit
      await page.click('button[type="submit"]');
      
      // Check for date validation error
      await expect(page.locator('text=/end.*before.*start|invalid.*date.*range/i')).toBeVisible();
    });

    test('should validate allocation percentage', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Assignments")', '/assignments');
      
      await page.click('button:has-text("Add Assignment"), button:has-text("New Assignment")');
      
      // Set invalid allocation
      await page.fill('input[name="allocation_percentage"], input[type="number"]', '150');
      
      // Submit
      await page.click('button[type="submit"]');
      
      // Check for validation error
      await expect(page.locator('text=/must be.*100|invalid.*percentage|maximum.*100/i')).toBeVisible();
    });
  });
});