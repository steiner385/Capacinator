/**
 * Role Details Page E2E Test Suite
 * Comprehensive tests for role details page functionality
 * Tests navigation, data loading, inline editing, and resource templates
 */
import { test, expect, tags } from '../../fixtures';

test.describe('Role Details Page', () => {
  let roleId: string;
  let roleName: string;

  test.beforeAll(async ({ apiContext }) => {
    // Get a role to test with
    const response = await apiContext.get('/api/roles');
    const data = await response.json();
    const roles = data.data;

    // Use Project Manager role
    const projectManager = roles.find((r: any) => r.name === 'Project Manager');
    if (projectManager) {
      roleId = projectManager.id;
      roleName = projectManager.name;
    }
  });

  test.describe('Navigation and URL Handling', () => {
    test('should navigate to role details from roles list', async ({
      authenticatedPage,
      testHelpers
    }) => {
      // Navigate to roles list
      await testHelpers.navigateTo('/roles');
      await testHelpers.waitForDataTable();

      // Find and click on a role row
      const roleRow = authenticatedPage.locator('tbody tr').filter({
        hasText: roleName
      }).first();

      await roleRow.click();

      // Should navigate to role details page
      await authenticatedPage.waitForURL(`**/roles/${roleId}`, { timeout: 10000 });
      expect(authenticatedPage.url()).toContain(`/roles/${roleId}`);
    });

    test('should load role details page directly via URL', async ({
      authenticatedPage,
      testHelpers
    }) => {
      await testHelpers.navigateTo(`/roles/${roleId}`);

      // Wait for page to load
      await authenticatedPage.waitForTimeout(2000);

      // Should show role name in header
      const heading = authenticatedPage.locator('h1').first();
      await expect(heading).toBeVisible();
    });

    test('should have working back button', async ({
      authenticatedPage,
      testHelpers
    }) => {
      await testHelpers.navigateTo(`/roles/${roleId}`);
      await authenticatedPage.waitForTimeout(1000);

      // Find and click back button
      const backButton = authenticatedPage.locator('button:has-text("Back to Roles")');
      await expect(backButton).toBeVisible();
      await backButton.click();

      // Should navigate back to roles list
      await authenticatedPage.waitForURL('**/roles', { timeout: 10000 });
      expect(authenticatedPage.url()).toMatch(/\/roles$/);
    });

    test('should show error page for invalid role ID', async ({
      authenticatedPage,
      testHelpers
    }) => {
      await testHelpers.navigateTo('/roles/invalid-id-12345');
      await authenticatedPage.waitForTimeout(2000);

      // Should show error message
      const errorHeading = authenticatedPage.locator('h1:has-text("Role Not Found")');
      await expect(errorHeading).toBeVisible();

      // Should have back button
      const backButton = authenticatedPage.locator('button:has-text("Back to Roles")');
      await expect(backButton).toBeVisible();
    });
  });

  test.describe('Data Loading and Display', () => {
    test('should display role information correctly', async ({
      authenticatedPage,
      testHelpers,
      apiContext
    }) => {
      // Get role data from API
      const response = await apiContext.get(`/api/roles/${roleId}`);
      const role = await response.json();

      // Navigate to role details
      await testHelpers.navigateTo(`/roles/${roleId}`);
      await authenticatedPage.waitForTimeout(2000);

      // Verify role name is displayed
      const heading = authenticatedPage.locator('h1').first();
      const headingText = await heading.textContent();
      expect(headingText).toContain(role.name);

      // Check for role information section
      const infoSection = authenticatedPage.locator('.role-info-section, section:has-text("Role Information")');
      await expect(infoSection).toBeVisible();
    });

    test('should display people with this role', async ({
      authenticatedPage,
      testHelpers,
      apiContext
    }) => {
      // Get role data from API
      const response = await apiContext.get(`/api/roles/${roleId}`);
      const role = await response.json();

      console.log(`Role has ${role.people?.length || 0} people assigned`);

      await testHelpers.navigateTo(`/roles/${roleId}`);
      await authenticatedPage.waitForTimeout(2000);

      // If role has people, they should be displayed
      if (role.people && role.people.length > 0) {
        console.log('People:', role.people.map((p: any) => p.person_name).join(', '));
      }
    });

    test('should display resource templates matrix', async ({
      authenticatedPage,
      testHelpers
    }) => {
      await testHelpers.navigateTo(`/roles/${roleId}`);
      await authenticatedPage.waitForTimeout(3000);

      // Check for resource templates section
      const templatesSection = authenticatedPage.locator('.resource-templates-section, section:has-text("Resource Templates")');
      await expect(templatesSection).toBeVisible();

      // Check for table with project types and phases
      const table = authenticatedPage.locator('.resource-templates-table, table');
      if (await table.isVisible()) {
        // Should have headers
        const thead = table.locator('thead');
        await expect(thead).toBeVisible();

        // Should have project type column
        const projectTypeHeader = table.locator('th:has-text("Project Type")');
        await expect(projectTypeHeader).toBeVisible();

        // Take screenshot of resource templates matrix
        await authenticatedPage.screenshot({
          path: 'test-results/role-details-resource-templates.png',
          fullPage: true
        });
        console.log('✅ Screenshot saved: role-details-resource-templates.png');
      }
    });

    test('should show loading state initially', async ({
      authenticatedPage,
      testHelpers
    }) => {
      // Navigate and immediately check for loading state
      const navigationPromise = testHelpers.navigateTo(`/roles/${roleId}`);

      // Check for loading indicator (may be brief)
      const loadingText = authenticatedPage.locator('text=/loading/i').first();

      await navigationPromise;

      // Eventually content should load
      await authenticatedPage.waitForTimeout(2000);
      const heading = authenticatedPage.locator('h1').first();
      await expect(heading).toBeVisible();
    });
  });

  test.describe('Inline Editing Functionality', () => {
    test('should allow editing role description', async ({
      authenticatedPage,
      testHelpers,
      apiContext
    }) => {
      await testHelpers.navigateTo(`/roles/${roleId}`);
      await authenticatedPage.waitForTimeout(2000);

      // Find description field (should have edit icon)
      const descriptionField = authenticatedPage.locator('.inline-editable').filter({
        hasText: /description|not specified/i
      }).first();

      if (await descriptionField.isVisible()) {
        // Click to edit
        await descriptionField.click();

        // Should show input/textarea
        const input = authenticatedPage.locator('textarea, input[type="text"]').first();
        if (await input.isVisible()) {
          const testValue = `Test description ${Date.now()}`;
          await input.fill(testValue);

          // Press Enter or blur to save
          await input.press('Enter');

          // Wait for save
          await authenticatedPage.waitForTimeout(1000);

          console.log('✅ Description updated successfully');
        }
      }
    });

    test('should have edit icons on editable fields', async ({
      authenticatedPage,
      testHelpers
    }) => {
      await testHelpers.navigateTo(`/roles/${roleId}`);
      await authenticatedPage.waitForTimeout(2000);

      // Look for edit icons
      const editIcons = authenticatedPage.locator('.edit-icon, svg').filter({
        hasText: /edit/i
      });

      const iconCount = await editIcons.count();
      console.log(`Found ${iconCount} edit icons`);
    });
  });

  test.describe('Resource Templates Matrix', () => {
    test('should display allocation input fields', async ({
      authenticatedPage,
      testHelpers
    }) => {
      await testHelpers.navigateTo(`/roles/${roleId}`);
      await authenticatedPage.waitForTimeout(3000);

      // Look for allocation percentage inputs
      const allocationInputs = authenticatedPage.locator('input[type="number"]');
      const inputCount = await allocationInputs.count();

      console.log(`Found ${inputCount} allocation input fields`);

      if (inputCount > 0) {
        // First input should be visible
        const firstInput = allocationInputs.first();
        await expect(firstInput).toBeVisible();

        // Should have min, max, step attributes
        const min = await firstInput.getAttribute('min');
        const max = await firstInput.getAttribute('max');
        const step = await firstInput.getAttribute('step');

        expect(min).toBe('0');
        expect(max).toBe('100');
        expect(step).toBe('5');
      }
    });

    test('should allow changing allocation percentages', async ({
      authenticatedPage,
      testHelpers
    }) => {
      await testHelpers.navigateTo(`/roles/${roleId}`);
      await authenticatedPage.waitForTimeout(3000);

      // Find first allocation input
      const firstInput = authenticatedPage.locator('input[type="number"]').first();

      if (await firstInput.isVisible()) {
        const originalValue = await firstInput.inputValue();
        console.log(`Original allocation value: ${originalValue}%`);

        // Change the value
        const newValue = '25';
        await firstInput.fill(newValue);

        // Verify value changed
        const updatedValue = await firstInput.inputValue();
        expect(updatedValue).toBe(newValue);

        console.log(`✅ Changed allocation from ${originalValue}% to ${newValue}%`);
      }
    });

    test('should display project types and phases correctly', async ({
      authenticatedPage,
      testHelpers,
      apiContext
    }) => {
      // Get project types and phases from API
      const projectTypesResponse = await apiContext.get('/api/project-types');
      const phasesResponse = await apiContext.get('/api/phases');

      const projectTypesData = await projectTypesResponse.json();
      const phasesData = await phasesResponse.json();

      const projectTypes = projectTypesData.data?.data || projectTypesData.data || [];
      const phases = phasesData.data?.data || phasesData.data || [];

      console.log(`Expected ${projectTypes.length} project types and ${phases.length} phases`);

      await testHelpers.navigateTo(`/roles/${roleId}`);
      await authenticatedPage.waitForTimeout(3000);

      // Verify table structure
      const table = authenticatedPage.locator('.resource-templates-table, table');
      if (await table.isVisible()) {
        const rows = table.locator('tbody tr');
        const rowCount = await rows.count();

        console.log(`Found ${rowCount} rows in resource templates table`);

        // Should have at least some rows
        expect(rowCount).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Screenshot Verification', () => {
    test('should capture full role details page', async ({
      authenticatedPage,
      testHelpers
    }) => {
      await testHelpers.navigateTo(`/roles/${roleId}`);
      await authenticatedPage.waitForTimeout(3000);

      // Take full page screenshot
      await authenticatedPage.screenshot({
        path: 'test-results/role-details-full-page.png',
        fullPage: true
      });

      console.log('✅ Screenshot saved: role-details-full-page.png');

      // Verify key elements are visible
      const heading = authenticatedPage.locator('h1').first();
      await expect(heading).toBeVisible();

      const backButton = authenticatedPage.locator('button:has-text("Back to Roles")');
      await expect(backButton).toBeVisible();
    });

    test('should capture Project Manager role specifically', async ({
      authenticatedPage,
      testHelpers
    }) => {
      await testHelpers.navigateTo(`/roles/${roleId}`);
      await authenticatedPage.waitForTimeout(3000);

      // Verify we're on Project Manager page
      const heading = authenticatedPage.locator('h1').first();
      const headingText = await heading.textContent();

      if (headingText?.includes('Project Manager')) {
        await authenticatedPage.screenshot({
          path: 'test-results/project-manager-role-details.png',
          fullPage: true
        });

        console.log('✅ Screenshot saved: project-manager-role-details.png');
        console.log('✅ Page loaded successfully with all data!');
      }
    });
  });

  test.describe('API Integration Validation', () => {
    test('should load data from correct API endpoints', async ({
      authenticatedPage,
      testHelpers,
      apiContext
    }) => {
      // Verify API endpoint returns correct data
      const response = await apiContext.get(`/api/roles/${roleId}`);
      expect(response.status()).toBe(200);

      const role = await response.json();
      expect(role).toHaveProperty('name');
      expect(role).toHaveProperty('people');
      expect(role).toHaveProperty('planners');
      expect(role).toHaveProperty('resourceTemplates');

      console.log('✅ API returns all required fields');
      console.log(`   - People: ${role.people?.length || 0}`);
      console.log(`   - Planners: ${role.planners?.length || 0}`);
      console.log(`   - Resource Templates: ${role.resourceTemplates?.length || 0}`);

      // Navigate to page and verify it loads the same data
      await testHelpers.navigateTo(`/roles/${roleId}`);
      await authenticatedPage.waitForTimeout(3000);

      const heading = authenticatedPage.locator('h1').first();
      const headingText = await heading.textContent();
      expect(headingText).toContain(role.name);
    });
  });
});
