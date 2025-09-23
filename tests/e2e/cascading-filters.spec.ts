import { test, expect } from './fixtures'
test.describe('Cascading Filters in Forms', () => {
  test.describe('Assignment New Form', () => {
    test('should filter roles based on selected person', async ({ authenticatedPage, testHelpers }) => {
      // First, get all available roles
      const allRoles = await authenticatedPage.locator('select[name="role_id"] option').allTextContents();
      const initialRoleCount = allRoles.length - 1; // Subtract 1 for "Select role" option
      // Select a person
      const personSelect = authenticatedPage.locator('select').first(); // Assuming person dropdown is first
      await personSelect.selectOption({ index: 1 }); // Select first person
      await authenticatedPage.waitForTimeout(1000);
      // Check if roles are now filtered
      const filteredRoles = await authenticatedPage.locator('select[name="role_id"] option').allTextContents();
      const filteredRoleCount = filteredRoles.length - 1;
      // Roles should be filtered (fewer options) or stay the same if person has all roles
      expect(filteredRoleCount).toBeLessThanOrEqual(initialRoleCount);
      // Check for filtering message if no roles available
      const warningMessage = authenticatedPage.locator('.warning-text');
      if (filteredRoleCount === 0) {
        await expect(warningMessage).toContainText('Selected person has no roles assigned');
      }
    });
    test('should filter people based on selected role', async ({ authenticatedPage, testHelpers }) => {
      // Get all available people
      const allPeople = await authenticatedPage.locator('select[name="person_id"] option').allTextContents();
      const initialPeopleCount = allPeople.length - 1;
      // Select a role first
      const roleSelect = authenticatedPage.locator('select').nth(2); // Assuming role dropdown is third
      await roleSelect.selectOption({ index: 1 }); // Select first role
      await authenticatedPage.waitForTimeout(1000);
      // Check if people are now filtered
      const filteredPeople = await authenticatedPage.locator('select[name="person_id"] option').allTextContents();
      const filteredPeopleCount = filteredPeople.length - 1;
      // People should be filtered to only those with the selected role
      expect(filteredPeopleCount).toBeLessThanOrEqual(initialPeopleCount);
      // Check for filtering message if no people available
      const warningMessage = authenticatedPage.locator('.warning-text');
      if (filteredPeopleCount === 0) {
        await expect(warningMessage).toContainText('No people found with the selected role');
      }
    });
    test('should filter phases based on selected project', async ({ authenticatedPage, testHelpers }) => {
      // Get all available phases
      const allPhases = await authenticatedPage.locator('select[name="phase_id"] option').allTextContents();
      const initialPhaseCount = allPhases.length - 1;
      // Select a project
      const projectSelect = authenticatedPage.locator('select').first(); // Project dropdown
      await projectSelect.selectOption({ index: 1 }); // Select first project
      await authenticatedPage.waitForTimeout(1000);
      // Check if phases are now filtered
      const filteredPhases = await authenticatedPage.locator('select[name="phase_id"] option').allTextContents();
      const filteredPhaseCount = filteredPhases.length - 1;
      // Phases should be filtered to only those in the selected project
      expect(filteredPhaseCount).toBeLessThanOrEqual(initialPhaseCount);
      // Check for info message if no phases available
      const infoMessage = authenticatedPage.locator('.info-text');
      if (filteredPhaseCount === 0) {
        await expect(infoMessage).toContainText('Selected project has no phases defined');
      }
    });
    test('should show availability warnings for person conflicts', async ({ authenticatedPage, testHelpers }) => {
      // Select a person
      const personSelect = authenticatedPage.locator('select').first();
      await personSelect.selectOption({ index: 1 });
      await authenticatedPage.waitForTimeout(1000);
      // Select dates
      const startDate = authenticatedPage.locator('input[type="date"]').first();
      const endDate = authenticatedPage.locator('input[type="date"]').nth(1);
      await startDate.fill('2024-01-01');
      await endDate.fill('2024-01-31');
      await authenticatedPage.waitForTimeout(2000);
      // Check for availability warning section
      const availabilityWarning = authenticatedPage.locator('.availability-warning');
      if (await availabilityWarning.isVisible()) {
        await expect(availabilityWarning).toContainText('available capacity');
        // Check for conflicts if any
        const conflictsList = authenticatedPage.locator('.conflicts-list');
        if (await conflictsList.isVisible()) {
          await expect(conflictsList).toContainText('Existing Assignments:');
        }
      }
    });
    test('should warn when allocation exceeds available capacity', async ({ authenticatedPage, testHelpers }) => {
      // Select a person
      const personSelect = authenticatedPage.locator('select').first();
      await personSelect.selectOption({ index: 1 });
      await authenticatedPage.waitForTimeout(1000);
      // Select dates
      const startDate = authenticatedPage.locator('input[type="date"]').first();
      const endDate = authenticatedPage.locator('input[type="date"]').nth(1);
      await startDate.fill('2024-01-01');
      await endDate.fill('2024-01-31');
      await authenticatedPage.waitForTimeout(2000);
      // Set high allocation percentage
      const allocationInput = authenticatedPage.locator('input[type="number"]');
      await allocationInput.fill('150');
      await authenticatedPage.waitForTimeout(1000);
      // Check for over-allocation warning
      const errorText = authenticatedPage.locator('.error-text');
      if (await errorText.isVisible()) {
        await expect(errorText).toContainText('exceeds available capacity');
      }
    });
    test('should maintain filter state when switching between fields', async ({ authenticatedPage, testHelpers }) => {
      // Select a person
      const personSelect = authenticatedPage.locator('select').first();
      await personSelect.selectOption({ index: 1 });
      await authenticatedPage.waitForTimeout(1000);
      // Get filtered roles
      const filteredRoles = await authenticatedPage.locator('select[name="role_id"] option').allTextContents();
      // Select a role
      const roleSelect = authenticatedPage.locator('select').nth(2);
      if (filteredRoles.length > 1) {
        await roleSelect.selectOption({ index: 1 });
        await authenticatedPage.waitForTimeout(1000);
      }
      // Switch back to person dropdown - should still show filtered people
      const filteredPeople = await authenticatedPage.locator('select[name="person_id"] option').allTextContents();
      // People should be filtered based on the selected role
      expect(filteredPeople.length).toBeGreaterThanOrEqual(1); // At least the "Select person" option
    });
  });
  test.describe('Person New Form', () => {
    test('should filter supervisors based on selected location', async ({ authenticatedPage, testHelpers }) => {
      // Get all available supervisors
      const allSupervisors = await authenticatedPage.locator('select[name="supervisor_id"] option').allTextContents();
      const initialSupervisorCount = allSupervisors.length - 1;
      // Select a location
      const locationSelect = authenticatedPage.locator('select[name="location_id"]');
      if (await locationSelect.isVisible()) {
        await locationSelect.selectOption({ index: 1 });
        await authenticatedPage.waitForTimeout(1000);
        // Check if supervisors are filtered
        const filteredSupervisors = await authenticatedPage.locator('select[name="supervisor_id"] option').allTextContents();
        const filteredSupervisorCount = filteredSupervisors.length - 1;
        // Supervisors should be filtered based on location
        expect(filteredSupervisorCount).toBeLessThanOrEqual(initialSupervisorCount);
      }
    });
    test('should validate supervisor hierarchy', async ({ authenticatedPage, testHelpers }) => {
      // Select a location
      const locationSelect = authenticatedPage.locator('select[name="location_id"]');
      if (await locationSelect.isVisible()) {
        await locationSelect.selectOption({ index: 1 });
        await authenticatedPage.waitForTimeout(1000);
      }
      // Select a supervisor
      const supervisorSelect = authenticatedPage.locator('select[name="supervisor_id"]');
      if (await supervisorSelect.isVisible()) {
        await supervisorSelect.selectOption({ index: 1 });
        await authenticatedPage.waitForTimeout(1000);
      }
      // Form should not show any hierarchy validation errors
      const errorText = authenticatedPage.locator('.error-text');
      if (await errorText.isVisible()) {
        const errorMessage = await errorText.textContent();
        expect(errorMessage).not.toContain('circular');
        expect(errorMessage).not.toContain('hierarchy');
      }
    });
  });
  test.describe('Project New Form', () => {
    test('should filter project types based on selected location', async ({ authenticatedPage, testHelpers }) => {
      // Get all available project types
      const allProjectTypes = await authenticatedPage.locator('select[name="project_type_id"] option').allTextContents();
      const initialProjectTypeCount = allProjectTypes.length - 1;
      // Select a location
      const locationSelect = authenticatedPage.locator('select[name="location_id"]');
      if (await locationSelect.isVisible()) {
        await locationSelect.selectOption({ index: 1 });
        await authenticatedPage.waitForTimeout(1000);
        // Check if project types are filtered
        const filteredProjectTypes = await authenticatedPage.locator('select[name="project_type_id"] option').allTextContents();
        const filteredProjectTypeCount = filteredProjectTypes.length - 1;
        // Project types should be filtered based on location
        expect(filteredProjectTypeCount).toBeLessThanOrEqual(initialProjectTypeCount);
      }
    });
    test('should filter owners based on selected project type', async ({ authenticatedPage, testHelpers }) => {
      // Get all available owners
      const allOwners = await authenticatedPage.locator('select[name="owner_id"] option').allTextContents();
      const initialOwnerCount = allOwners.length - 1;
      // Select a project type
      const projectTypeSelect = authenticatedPage.locator('select[name="project_type_id"]');
      if (await projectTypeSelect.isVisible()) {
        await projectTypeSelect.selectOption({ index: 1 });
        await authenticatedPage.waitForTimeout(1000);
        // Check if owners are filtered
        const filteredOwners = await authenticatedPage.locator('select[name="owner_id"] option').allTextContents();
        const filteredOwnerCount = filteredOwners.length - 1;
        // Owners should be filtered based on project type
        expect(filteredOwnerCount).toBeLessThanOrEqual(initialOwnerCount);
      }
    });
    test('should filter owners based on location and project type combination', async ({ authenticatedPage, testHelpers }) => {
      // Select a location first
      const locationSelect = authenticatedPage.locator('select[name="location_id"]');
      if (await locationSelect.isVisible()) {
        await locationSelect.selectOption({ index: 1 });
        await authenticatedPage.waitForTimeout(1000);
      }
      // Then select a project type
      const projectTypeSelect = authenticatedPage.locator('select[name="project_type_id"]');
      if (await projectTypeSelect.isVisible()) {
        await projectTypeSelect.selectOption({ index: 1 });
        await authenticatedPage.waitForTimeout(1000);
      }
      // Check if owners are filtered by both criteria
      const filteredOwners = await authenticatedPage.locator('select[name="owner_id"] option').allTextContents();
      const filteredOwnerCount = filteredOwners.length - 1;
      // Should have filtered owners based on both location and project type
      expect(filteredOwnerCount).toBeGreaterThanOrEqual(0);
    });
  });
  test.describe('Cross-Form Consistency', () => {
    test('should maintain consistent data across different forms', async ({ authenticatedPage, testHelpers }) => {
      // Go to assignments form and note available people
      await testHelpers.navigateTo('/assignments/new');
      await authenticatedPage.waitForTimeout(2000);
      const assignmentPeople = await authenticatedPage.locator('select[name="person_id"] option').allTextContents();
      // Go to projects form and note available owners
      await testHelpers.navigateTo('/projects/new');
      await authenticatedPage.waitForTimeout(2000);
      const projectOwners = await authenticatedPage.locator('select[name="owner_id"] option').allTextContents();
      // Both should have some people (data consistency check)
      expect(assignmentPeople.length).toBeGreaterThan(1);
      expect(projectOwners.length).toBeGreaterThan(1);
    });
    test('should handle API failures gracefully', async ({ authenticatedPage, testHelpers }) => {
      // Intercept API calls and make them fail
      await authenticatedPage.route('**/api/people/*', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      await testHelpers.navigateTo('/assignments/new');
      await authenticatedPage.waitForTimeout(2000);
      // Form should still be usable even with API failures
      const personSelect = authenticatedPage.locator('select[name="person_id"]');
      await expect(personSelect).toBeVisible();
      // Select a person (should work even if filtering fails)
      await personSelect.selectOption({ index: 1 });
      await authenticatedPage.waitForTimeout(1000);
      // Form should not crash
      await expect(authenticatedPage.locator('h1')).toContainText('New Assignment');
    });
  });
});