/**
 * Example of standardized e2e test using unified fixtures
 * This serves as a template for all e2e tests
 */

import { test, expect, tags, patterns } from '../fixtures';

// Use test.describe for grouping related tests
test.describe('Feature: Projects Management', () => {
  // Tag tests for selective execution
  test.describe.configure({ mode: 'serial' }); // Use serial for dependent tests

  // Simple navigation test
  test(`${tags.smoke} should navigate to Projects page`, async ({ authenticatedPage, testHelpers }) => {
    await testHelpers.navigateViaSidebar('Projects');
    await expect(authenticatedPage).toHaveURL(/.*\/projects/);
    await testHelpers.verifyPageTitle('Projects');
  });

  // CRUD operations using patterns
  test.describe('CRUD Operations', () => {
    test(`${tags.crud} ${patterns.crud('project').create}`, async ({ authenticatedPage, testHelpers }) => {
      await testHelpers.navigateTo('/projects');
      
      // Click add button
      await authenticatedPage.getByRole('button', { name: /add.*project/i }).click();
      
      // Fill form
      await authenticatedPage.fill('input[name="name"]', 'Test Project');
      await authenticatedPage.selectOption('select[name="project_type_id"]', { index: 1 });
      
      // Submit
      await authenticatedPage.getByRole('button', { name: /save|create/i }).click();
      
      // Verify success
      await testHelpers.waitForDataTable();
      await expect(authenticatedPage.locator('table')).toContainText('Test Project');
    });

    test(`${tags.crud} ${patterns.crud('project').update}`, async ({ authenticatedPage, testHelpers }) => {
      await testHelpers.navigateTo('/projects');
      await testHelpers.waitForDataTable();
      
      // Click edit on first row
      const firstRow = authenticatedPage.locator('tbody tr').first();
      await firstRow.getByRole('button', { name: /edit/i }).click();
      
      // Update name
      await authenticatedPage.fill('input[name="name"]', 'Updated Project Name');
      await authenticatedPage.getByRole('button', { name: /save|update/i }).click();
      
      // Verify update
      await testHelpers.waitForDataTable();
      await expect(authenticatedPage.locator('table')).toContainText('Updated Project Name');
    });
  });

  // API testing example
  test('should create project via API', async ({ apiContext, testData }) => {
    const project = testData.generateProject();
    
    const response = await apiContext.post('/api/projects', {
      data: project,
    });
    
    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();
    expect(responseData.data).toHaveProperty('id');
  });

  // Complex workflow test
  test(`${tags.slow} should handle project with assignments workflow`, async ({ 
    authenticatedPage, 
    testHelpers,
    testData 
  }) => {
    // Create test data
    const projectName = `E2E Project ${Date.now()}`;
    
    // Navigate to projects
    await testHelpers.navigateTo('/projects');
    
    // Create project
    await authenticatedPage.getByRole('button', { name: /add/i }).click();
    await authenticatedPage.fill('input[name="name"]', projectName);
    // ... fill other fields
    await authenticatedPage.getByRole('button', { name: /save/i }).click();
    
    // Navigate to new project
    await authenticatedPage.getByText(projectName).click();
    
    // Add assignment
    await authenticatedPage.getByRole('button', { name: /add.*assignment/i }).click();
    // ... complete assignment workflow
    
    // Verify in assignments page
    await testHelpers.navigateTo('/assignments');
    await expect(authenticatedPage.locator('table')).toContainText(projectName);
  });

  // Cleanup example
  test.afterEach(async ({ testData }) => {
    // Clean up any test data created
    await testData.cleanup();
  });
});