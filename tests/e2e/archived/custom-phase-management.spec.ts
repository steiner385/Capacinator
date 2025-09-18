/**
 * E2E tests for custom phase management functionality
 * Tests: creating custom phases, duplicating phases, phase reordering, resource allocation copying
 */

import { test, expect, Page } from '@playwright/test';
import { TestDataGenerator } from './helpers/test-data-generator';

test.describe('Custom Phase Management', () => {
  let testData: TestDataGenerator;

  test.beforeEach(async ({ page, request }) => {
    testData = new TestDataGenerator(request);
    await testData.resetTestData();
    await page.goto('/');
  });

  test.afterEach(async ({ page }) => {
    await testData.cleanup();
  });

  test('should create a custom phase with blank resource allocation', async ({ page }) => {
    // Create test project
    const project = await testData.createTestProject({
      name: 'Custom Phase Test Project',
      projectType: 'Web Application',
      location: 'New York City'
    });

    // Navigate to project detail page
    await page.goto(`/projects/${project.id}`);
    
    // Wait for project details to load and expand phases section
    await page.waitForSelector('h1:has-text("Custom Phase Test Project")');
    await page.click('text=Project Phases & Timeline');
    
    // Click "Add Phase" button (consolidated UI)
    await page.click('button:has-text("Add Phase")');
    
    // Select "Blank Custom Phase" option
    await page.locator('.selection-card').filter({ hasText: 'Blank Custom Phase' }).click();
    
    // Fill out custom phase form
    await page.fill('input[name="phase_name"]', 'Client Review Iteration');
    await page.fill('textarea[name="description"]', 'Custom phase for client feedback and review cycles');
    await page.fill('input[name="order_index"]', '15');
    await page.fill('input[name="start_date"]', '2024-06-01');
    await page.fill('input[name="end_date"]', '2024-06-15');
    
    // Submit form - button text is "Create Phase" for custom phase mode
    await page.click('button[type="submit"]:has-text("Create Phase")');
    
    // Wait for modal to close and phase to appear in table
    await page.waitForSelector('button:has-text("Add Phase")', { state: 'visible' });
    await expect(page.locator('table tbody tr:has-text("Client Review Iteration")')).toBeVisible();
    
    // Verify phase details in table
    const phaseRow = page.locator('table tbody tr:has-text("Client Review Iteration")');
    await expect(phaseRow.locator('td:nth-child(3)')).toContainText('6/1/2024'); // Start date
    await expect(phaseRow.locator('td:nth-child(4)')).toContainText('6/15/2024'); // End date
    await expect(phaseRow.locator('td:nth-child(5)')).toContainText('15 days'); // Duration
    
    // Verify the custom phase appears in the phases list
    await expect(page.locator('text=Client Review Iteration')).toBeVisible();
    
    // Check that resource demands are initially empty for custom phase (no template match)
    await page.click('text=Resource Demand');
    await page.waitForSelector('.chart-container', { state: 'visible', timeout: 10000 });
    
    // Custom phases should not have automatic resource demands without templates
    const demandText = await page.textContent('.demand-summary, .chart-container');
    expect(demandText).not.toContain('Client Review Iteration');
  });

  test('should duplicate an existing phase with resource allocations', async ({ page }) => {
    // Create test project with existing phases
    const project = await testData.createTestProject({
      name: 'Phase Duplication Test Project',
      projectType: 'Web Application',
      location: 'San Francisco'
    });

    // Add some standard phases first
    await testData.addProjectPhases(project.id, [
      { phaseName: 'Planning', startDate: '2024-01-01', endDate: '2024-01-31' },
      { phaseName: 'Development', startDate: '2024-02-01', endDate: '2024-04-30' }
    ]);

    // Navigate to project detail page
    await page.goto(`/projects/${project.id}`);
    await page.waitForSelector('h1:has-text("Phase Duplication Test Project")');
    await page.click('text=Project Phases & Timeline');
    
    // Verify existing phases are present
    await expect(page.locator('table tbody tr:has-text("Planning")')).toBeVisible();
    await expect(page.locator('table tbody tr:has-text("Development")')).toBeVisible();
    
    // Click "Add Phase" button (consolidated UI)
    await page.click('button:has-text("Add Phase")');
    
    // Select "Duplicate Existing Phase" option
    await page.locator('.selection-card').filter({ hasText: 'Duplicate Existing Phase' }).click();
    
    // Select source phase to duplicate
    await page.selectOption('select[name="source_phase"]', { label: 'Development' });
    
    // Select placement - "After" another phase
    await page.locator('.selection-card-inline').filter({ hasText: 'After' }).click();
    await page.selectOption('select[name="after_phase_id"]', { label: 'Planning' });
    
    // Fill out duplication details
    await page.fill('input[name="custom_name"]', 'Development Round 2');
    
    // Submit duplication - button text is "Duplicate Phase" for duplicate mode
    await page.click('button[type="submit"]:has-text("Duplicate Phase")');
    
    // Wait for modal to close and new phase to appear
    await page.waitForSelector('button:has-text("Add Phase")', { state: 'visible' });
    await expect(page.locator('table tbody tr:has-text("System Integration Testing")')).toBeVisible();
    
    // Verify the duplicated phase has correct dates
    const duplicatedPhaseRow = page.locator('table tbody tr:has-text("System Integration Testing")');
    await expect(duplicatedPhaseRow.locator('td:nth-child(3)')).toContainText('5/1/2024');
    await expect(duplicatedPhaseRow.locator('td:nth-child(4)')).toContainText('6/30/2024');
    
    // Verify resource demands were calculated for the duplicated phase
    await page.click('text=Resource Demand');
    await page.waitForSelector('.chart-container', { state: 'visible', timeout: 10000 });
    
    // Should have resource demands from templates
    await expect(page.locator('text=System Integration Testing')).toBeVisible();
  });

  test('should reorder phases using arrow controls', async ({ page }) => {
    // Create test project with multiple phases
    const project = await testData.createTestProject({
      name: 'Phase Reordering Test Project',
      projectType: 'Web Application',
      location: 'London'
    });

    // Add phases in a specific order
    await testData.addProjectPhases(project.id, [
      { phaseName: 'Planning', startDate: '2024-01-01', endDate: '2024-01-31' },
      { phaseName: 'Development', startDate: '2024-02-01', endDate: '2024-04-30' },
      { phaseName: 'System Integration Testing', startDate: '2024-05-01', endDate: '2024-05-31' }
    ]);

    await page.goto(`/projects/${project.id}`);
    await page.waitForSelector('h1:has-text("Phase Reordering Test Project")');
    await page.click('text=Project Phases & Timeline');
    
    // Verify initial order (should be chronological by start date)
    const tableRows = page.locator('table tbody tr');
    await expect(tableRows.nth(0)).toContainText('Planning');
    await expect(tableRows.nth(1)).toContainText('Development');
    await expect(tableRows.nth(2)).toContainText('System Integration Testing');
    
    // Move the middle phase (Development) up
    await page.click('table tbody tr:has-text("Development") button[title="Move phase earlier"]');
    
    // Wait for the reordering to complete
    await page.waitForTimeout(2000); // Wait for API call and UI update
    
    // Verify that Development moved before Planning (dates should have been adjusted)
    await page.reload(); // Reload to see updated order
    await page.click('text=Project Phases & Timeline');
    
    // After reordering, Development should now be first (with earlier dates)
    const updatedRows = page.locator('table tbody tr');
    const firstPhaseText = await updatedRows.nth(0).textContent();
    const secondPhaseText = await updatedRows.nth(1).textContent();
    
    // The phase that was moved should have its dates adjusted to be earlier
    expect(firstPhaseText).toContain('Development');
    expect(secondPhaseText).toContain('Planning');
  });

  test('should delete a custom phase and clean up resources', async ({ page }) => {
    // Create test project
    const project = await testData.createTestProject({
      name: 'Phase Deletion Test Project',
      projectType: 'Mobile Application',
      location: 'Remote'
    });

    // Add some phases
    await testData.addProjectPhases(project.id, [
      { phaseName: 'Planning', startDate: '2024-01-01', endDate: '2024-01-31' },
      { phaseName: 'Development', startDate: '2024-02-01', endDate: '2024-04-30' }
    ]);

    await page.goto(`/projects/${project.id}`);
    await page.waitForSelector('h1:has-text("Phase Deletion Test Project")');
    await page.click('text=Project Phases & Timeline');
    
    // Verify phase is present
    await expect(page.locator('table tbody tr:has-text("Development")')).toBeVisible();
    
    // Mock the confirmation dialog
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Are you sure you want to remove the "Development" phase');
      await dialog.accept();
    });
    
    // Delete the Development phase
    await page.click('table tbody tr:has-text("Development") button[title="Remove phase from project"]');
    
    // Wait for deletion to complete
    await page.waitForTimeout(1000);
    
    // Verify phase is removed from table
    await expect(page.locator('table tbody tr:has-text("Development")')).not.toBeVisible();
    await expect(page.locator('table tbody tr:has-text("Planning")')).toBeVisible();
  });

  test('should add existing phase from master list', async ({ page }) => {
    // Create test project
    const project = await testData.createTestProject({
      name: 'Add Existing Phase Test Project',
      projectType: 'AI/ML Platform',
      location: 'Seattle'
    });

    await page.goto(`/projects/${project.id}`);
    await page.waitForSelector('h1:has-text("Add Existing Phase Test Project")');
    await page.click('text=Project Phases & Timeline');
    
    // Initially should have no phases or only basic ones
    const initialRows = await page.locator('table tbody tr').count();
    
    // Click "Add Existing Phase"
    await page.click('button:has-text("Add Existing Phase")');
    
    // Select a phase from the dropdown
    await page.selectOption('select[name="phase_id"]', { label: 'User Acceptance Testing' });
    await page.fill('input[name="start_date"]', '2024-07-01');
    await page.fill('input[name="end_date"]', '2024-07-15');
    
    // Submit the form
    await page.click('button[type="submit"]:has-text("Add Phase")');
    
    // Wait for modal to close and phase to appear
    await page.waitForSelector('button:has-text("Add Existing Phase")', { state: 'visible' });
    await expect(page.locator('table tbody tr:has-text("User Acceptance Testing")')).toBeVisible();
    
    // Verify the phase was added with correct dates
    const newPhaseRow = page.locator('table tbody tr:has-text("User Acceptance Testing")');
    await expect(newPhaseRow.locator('td:nth-child(3)')).toContainText('7/1/2024');
    await expect(newPhaseRow.locator('td:nth-child(4)')).toContainText('7/15/2024');
    await expect(newPhaseRow.locator('td:nth-child(5)')).toContainText('15 days');
    
    // Verify row count increased
    const finalRows = await page.locator('table tbody tr').count();
    expect(finalRows).toBeGreaterThan(initialRows);
  });

  test('should handle validation errors gracefully', async ({ page }) => {
    // Create test project
    const project = await testData.createTestProject({
      name: 'Validation Test Project',
      projectType: 'Security',
      location: 'New York City'
    });

    await page.goto(`/projects/${project.id}`);
    await page.waitForSelector('h1:has-text("Validation Test Project")');
    await page.click('text=Project Phases & Timeline');
    
    // Test custom phase validation - missing required fields
    await page.click('button:has-text("Create Custom Phase")');
    
    // Try to submit without filling required fields
    await page.click('button[type="submit"]:has-text("Create Phase")');
    
    // Form should not submit and required fields should be highlighted
    await expect(page.locator('input[name="phase_name"]:invalid')).toBeVisible();
    await expect(page.locator('input[name="start_date"]:invalid')).toBeVisible();
    await expect(page.locator('input[name="end_date"]:invalid')).toBeVisible();
    
    // Fill fields with invalid date range (end before start)
    await page.fill('input[name="phase_name"]', 'Invalid Date Phase');
    await page.fill('input[name="start_date"]', '2024-06-15');
    await page.fill('input[name="end_date"]', '2024-06-01'); // End before start
    
    await page.click('button[type="submit"]:has-text("Create Phase")');
    
    // Should show validation error for invalid date range
    await expect(page.locator('input[name="end_date"]:invalid')).toBeVisible();
    
    // Cancel the modal
    await page.click('button:has-text("Cancel")');
    await expect(page.locator('input[name="phase_name"]')).not.toBeVisible();
  });

  test('should prevent duplicate phase assignments', async ({ page }) => {
    // Create test project with an existing phase
    const project = await testData.createTestProject({
      name: 'Duplicate Prevention Test Project',
      projectType: 'Data Analytics',
      location: 'San Francisco'
    });

    // Add a phase first
    await testData.addProjectPhases(project.id, [
      { phaseName: 'Planning', startDate: '2024-01-01', endDate: '2024-01-31' }
    ]);

    await page.goto(`/projects/${project.id}`);
    await page.waitForSelector('h1:has-text("Duplicate Prevention Test Project")');
    await page.click('text=Project Phases & Timeline');
    
    // Verify existing phase
    await expect(page.locator('table tbody tr:has-text("Planning")')).toBeVisible();
    
    // Try to add the same phase again
    await page.click('button:has-text("Add Existing Phase")');
    
    // The Planning phase should not be available in the dropdown
    const planningOption = page.locator('select[name="phase_id"] option:has-text("Planning")');
    await expect(planningOption).not.toBeVisible();
    
    // Cancel the modal
    await page.click('button:has-text("Cancel")');
  });

  test('should display phase timeline chronologically', async ({ page }) => {
    // Create test project
    const project = await testData.createTestProject({
      name: 'Timeline Order Test Project',
      projectType: 'Cloud Migration',
      location: 'Remote'
    });

    // Add phases in non-chronological order
    await testData.addProjectPhases(project.id, [
      { phaseName: 'System Integration Testing', startDate: '2024-05-01', endDate: '2024-05-31' },
      { phaseName: 'Planning', startDate: '2024-01-01', endDate: '2024-01-31' },
      { phaseName: 'Development', startDate: '2024-02-01', endDate: '2024-04-30' }
    ]);

    await page.goto(`/projects/${project.id}`);
    await page.waitForSelector('h1:has-text("Timeline Order Test Project")');
    await page.click('text=Project Phases & Timeline');
    
    // Verify phases are displayed in chronological order regardless of creation order
    const tableRows = page.locator('table tbody tr');
    await expect(tableRows.nth(0)).toContainText('Planning'); // Jan 1-31
    await expect(tableRows.nth(1)).toContainText('Development'); // Feb 1 - Apr 30
    await expect(tableRows.nth(2)).toContainText('System Integration Testing'); // May 1-31
    
    // Verify start dates are in order
    await expect(tableRows.nth(0).locator('td:nth-child(3)')).toContainText('1/1/2024');
    await expect(tableRows.nth(1).locator('td:nth-child(3)')).toContainText('2/1/2024');
    await expect(tableRows.nth(2).locator('td:nth-child(3)')).toContainText('5/1/2024');
  });
});