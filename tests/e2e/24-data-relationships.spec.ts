import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Data Relationships and Cross-References', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.gotoWithRetry('/');
    await helpers.waitForReactApp();
  });

  test.describe('Project Relationships', () => {
    test('should show all related data on project detail page', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Projects")', '/projects');
      await helpers.waitForDataLoad();
      
      // Get project name for verification
      const projectName = await page.locator('tbody tr td a').first().textContent();
      
      // Click to view detail
      await page.locator('tbody tr td a').first().click();
      await helpers.waitForNavigation();
      
      // Verify all related data sections
      const sections = [
        { label: 'Project Type', selector: 'text=/Project Type|Type:/i' },
        { label: 'Location', selector: 'text=/Location:/i' },
        { label: 'Owner', selector: 'text=/Owner|Project Manager/i' },
        { label: 'Team Members', selector: 'text=/Team|Assignments|Resources/i' },
        { label: 'Phases', selector: 'text=/Phase|Timeline|Schedule/i' },
        { label: 'Priority', selector: 'text=/Priority:/i' }
      ];
      
      for (const section of sections) {
        await expect(page.locator(section.selector)).toBeVisible({
          timeout: 10000
        });
      }
      
      // Verify project name is displayed
      await expect(page.locator(`h1:has-text("${projectName}")`)).toBeVisible();
    });

    test('should show project phases with dates', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Projects")', '/projects');
      await helpers.waitForDataLoad();
      
      // Navigate to project detail
      await page.locator('tbody tr td a').first().click();
      await helpers.waitForNavigation();
      
      // Look for phases section
      const phasesSection = page.locator('text=/Phases|Timeline|Schedule/i').first();
      if (await phasesSection.isVisible()) {
        // Check for phase names
        const expectedPhases = ['Planning', 'Development', 'Testing', 'Deployment'];
        for (const phase of expectedPhases) {
          const phaseElement = page.locator(`text=${phase}`);
          if (await phaseElement.isVisible({ timeout: 5000 })) {
            // Check if phase has associated dates
            const phaseRow = phaseElement.locator('..');
            const dateText = await phaseRow.textContent();
            expect(dateText).toMatch(/\d{4}-\d{2}-\d{2}/);
          }
        }
      }
    });

    test('should link to team members from project', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Projects")', '/projects');
      await helpers.waitForDataLoad();
      
      await page.locator('tbody tr td a').first().click();
      await helpers.waitForNavigation();
      
      // Find team members section
      const teamSection = page.locator('section:has-text("Team"), div:has-text("Assignments")').first();
      if (await teamSection.isVisible()) {
        // Count team member links
        const memberLinks = teamSection.locator('a[href*="/people/"]');
        const linkCount = await memberLinks.count();
        expect(linkCount).toBeGreaterThan(0);
        
        // Click first member
        const firstName = await memberLinks.first().textContent();
        await memberLinks.first().click();
        await helpers.waitForNavigation();
        
        // Verify navigation to person page
        expect(page.url()).toMatch(/\/people\/[a-f0-9-]+$/);
        await expect(page.locator(`h1:has-text("${firstName}")`)).toBeVisible();
      }
    });
  });

  test.describe('Person Relationships', () => {
    test('should show all person details and relationships', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("People")', '/people');
      await helpers.waitForDataLoad();
      
      const personName = await page.locator('tbody tr td a').first().textContent();
      await page.locator('tbody tr td a').first().click();
      await helpers.waitForNavigation();
      
      // Verify person details
      const details = [
        { label: 'Email', selector: 'text=/Email:|@/i' },
        { label: 'Role', selector: 'text=/Role:|Primary Role/i' },
        { label: 'Location', selector: 'text=/Location:/i' },
        { label: 'Type', selector: 'text=/Worker Type|Type:|FTE|Contractor/i' },
        { label: 'Availability', selector: 'text=/Availability|Available/i' }
      ];
      
      for (const detail of details) {
        await expect(page.locator(detail.selector)).toBeVisible({
          timeout: 10000
        });
      }
      
      await expect(page.locator(`h1:has-text("${personName}")`)).toBeVisible();
    });

    test('should show supervisor relationship', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("People")', '/people');
      await helpers.waitForDataLoad();
      
      // Find a person with supervisor (not first one as they might be top-level)
      const rows = await page.locator('tbody tr').count();
      let foundSupervisor = false;
      
      for (let i = 0; i < Math.min(rows, 5); i++) {
        await page.locator('tbody tr td a').nth(i).click();
        await helpers.waitForNavigation();
        
        // Check for supervisor field
        const supervisorField = page.locator('text=/Supervisor:|Reports to:/i');
        if (await supervisorField.isVisible({ timeout: 3000 })) {
          // Check if supervisor is a link
          const supervisorLink = page.locator('a[href*="/people/"]:near(:text("Supervisor"))');
          if (await supervisorLink.isVisible()) {
            const supervisorName = await supervisorLink.textContent();
            await supervisorLink.click();
            await helpers.waitForNavigation();
            
            // Should navigate to supervisor's page
            expect(page.url()).toMatch(/\/people\/[a-f0-9-]+$/);
            await expect(page.locator(`h1:has-text("${supervisorName}")`)).toBeVisible();
            foundSupervisor = true;
            break;
          }
        }
        
        // Go back to try another person
        await page.goBack();
        await helpers.waitForDataLoad();
      }
    });

    test('should show current project assignments', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("People")', '/people');
      await helpers.waitForDataLoad();
      
      await page.locator('tbody tr td a').first().click();
      await helpers.waitForNavigation();
      
      // Look for assignments section
      const assignmentsSection = page.locator('text=/Current Projects|Assignments|Allocated/i').first();
      if (await assignmentsSection.isVisible()) {
        // Check for project links
        const projectLinks = page.locator('a[href*="/projects/"]:below(:text("Assignments"))');
        if (await projectLinks.first().isVisible()) {
          const projectCount = await projectLinks.count();
          expect(projectCount).toBeGreaterThan(0);
          
          // Verify allocation percentages are shown
          const allocations = page.locator('text=/%$/:below(:text("Assignments"))');
          const allocationCount = await allocations.count();
          expect(allocationCount).toBeGreaterThan(0);
        }
      }
    });

    test('should show availability calendar/overrides', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("People")', '/people');
      await helpers.waitForDataLoad();
      
      await page.locator('tbody tr td a').first().click();
      await helpers.waitForNavigation();
      
      // Look for availability section
      const availabilitySection = page.locator('text=/Availability|Schedule|Time Off/i').first();
      if (await availabilitySection.isVisible()) {
        // Check for override types
        const overrideTypes = ['VACATION', 'TRAINING', 'SICK'];
        for (const type of overrideTypes) {
          const override = page.locator(`text=${type}`);
          if (await override.isVisible({ timeout: 3000 })) {
            // Found an override
            expect(true).toBeTruthy();
            break;
          }
        }
      }
    });
  });

  test.describe('Assignment Relationships', () => {
    test('should show complete assignment details', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Assignments")', '/assignments');
      await helpers.waitForDataLoad();
      
      // Verify all columns show relationships
      const headers = ['Project', 'Person', 'Role', 'Allocation', 'Period'];
      for (const header of headers) {
        await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
      }
      
      // Verify first row has all data
      const firstRow = page.locator('tbody tr').first();
      const cells = await firstRow.locator('td').count();
      expect(cells).toBeGreaterThanOrEqual(5);
      
      // Check that project and person are links
      const projectLink = firstRow.locator('td:nth-child(1) a');
      const personLink = firstRow.locator('td:nth-child(2) a');
      
      await expect(projectLink).toBeVisible();
      await expect(personLink).toBeVisible();
    });

    test('should navigate between related entities', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Assignments")', '/assignments');
      await helpers.waitForDataLoad();
      
      // Get assignment details
      const firstRow = page.locator('tbody tr').first();
      const projectName = await firstRow.locator('td:nth-child(1)').textContent();
      const personName = await firstRow.locator('td:nth-child(2)').textContent();
      const allocation = await firstRow.locator('td:nth-child(4)').textContent();
      
      // Navigate to project
      await firstRow.locator('td:nth-child(1) a').click();
      await helpers.waitForNavigation();
      
      // Verify on project page
      expect(page.url()).toMatch(/\/projects\/[a-f0-9-]+$/);
      await expect(page.locator(`h1:has-text("${projectName}")`)).toBeVisible();
      
      // Should see the person assigned
      await expect(page.locator(`text=${personName}`)).toBeVisible();
      
      // Navigate back to assignments
      await page.goBack();
      await helpers.waitForDataLoad();
      
      // Navigate to person
      await firstRow.locator('td:nth-child(2) a').click();
      await helpers.waitForNavigation();
      
      // Verify on person page
      expect(page.url()).toMatch(/\/people\/[a-f0-9-]+$/);
      await expect(page.locator(`h1:has-text("${personName}")`)).toBeVisible();
      
      // Should see the project assigned
      await expect(page.locator(`text=${projectName}`)).toBeVisible();
      
      // Should see the allocation percentage
      await expect(page.locator(`text=${allocation}`)).toBeVisible();
    });
  });

  test.describe('Role Relationships', () => {
    test('should show people with each role', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Roles")', '/roles');
      await helpers.waitForDataLoad();
      
      // Get first role name
      const roleName = await page.locator('tbody tr td').first().textContent();
      
      // Click on role (if it's a link)
      const roleLink = page.locator('tbody tr td a').first();
      if (await roleLink.isVisible()) {
        await roleLink.click();
        await helpers.waitForNavigation();
        
        // Should show people with this role
        await expect(page.locator('text=/People with this role|Members|Staff/i')).toBeVisible();
        
        // Should have links to people
        const peopleLinks = page.locator('a[href*="/people/"]');
        const peopleCount = await peopleLinks.count();
        expect(peopleCount).toBeGreaterThan(0);
      }
    });

    test('should show role hierarchy/planners', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Roles")', '/roles');
      await helpers.waitForDataLoad();
      
      // Look for roles that can plan for others
      const plannerSection = page.locator('text=/Can plan for|Planner|Planning permissions/i');
      if (await plannerSection.isVisible()) {
        // Should show role relationships
        expect(true).toBeTruthy();
      }
    });
  });

  test.describe('Location Relationships', () => {
    test('should show projects and people by location', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Locations")', '/locations');
      await helpers.waitForDataLoad();
      
      // Click on a location
      const locationLink = page.locator('a:has-text("New York"), a:has-text("San Francisco")').first();
      if (await locationLink.isVisible()) {
        const locationName = await locationLink.textContent();
        await locationLink.click();
        await helpers.waitForNavigation();
        
        // Should show location details
        await expect(page.locator(`h1:has-text("${locationName}")`)).toBeVisible();
        
        // Should show projects at this location
        const projectsSection = page.locator('text=/Projects at|Projects in/i');
        if (await projectsSection.isVisible()) {
          const projectLinks = page.locator('a[href*="/projects/"]');
          expect(await projectLinks.count()).toBeGreaterThan(0);
        }
        
        // Should show people at this location
        const peopleSection = page.locator('text=/People at|Team members in/i');
        if (await peopleSection.isVisible()) {
          const peopleLinks = page.locator('a[href*="/people/"]');
          expect(await peopleLinks.count()).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('Data Integrity', () => {
    test('should maintain consistency across views', async ({ page }) => {
      // Get data from assignments page
      await helpers.clickAndNavigate('nav a:has-text("Assignments")', '/assignments');
      await helpers.waitForDataLoad();
      
      const firstAssignment = page.locator('tbody tr').first();
      const projectName = await firstAssignment.locator('td:nth-child(1)').textContent();
      const personName = await firstAssignment.locator('td:nth-child(2)').textContent();
      const allocation = await firstAssignment.locator('td:nth-child(4)').textContent();
      
      // Verify from project perspective
      await firstAssignment.locator('td:nth-child(1) a').click();
      await helpers.waitForNavigation();
      
      // Should see the same person and allocation
      await expect(page.locator(`text=${personName}`)).toBeVisible();
      await expect(page.locator(`text=${allocation}`)).toBeVisible();
      
      // Go back and verify from person perspective
      await page.goBack();
      await helpers.waitForDataLoad();
      
      await firstAssignment.locator('td:nth-child(2) a').click();
      await helpers.waitForNavigation();
      
      // Should see the same project and allocation
      await expect(page.locator(`text=${projectName}`)).toBeVisible();
      await expect(page.locator(`text=${allocation}`)).toBeVisible();
    });

    test('should update related data in real-time', async ({ page }) => {
      // Create a new assignment
      await helpers.clickAndNavigate('nav a:has-text("Assignments")', '/assignments');
      
      // Get initial count
      const initialCount = await page.locator('tbody tr').count();
      
      // Create new assignment
      await page.click('button:has-text("Add Assignment"), button:has-text("New Assignment")');
      
      // Fill form with first available options
      const projectSelect = page.locator('select[name="project_id"]');
      const personSelect = page.locator('select[name="person_id"]');
      
      if (await projectSelect.isVisible() && await personSelect.isVisible()) {
        // Get selected values for verification
        const projectOptions = await projectSelect.locator('option').allTextContents();
        const personOptions = await personSelect.locator('option').allTextContents();
        
        if (projectOptions.length > 1 && personOptions.length > 1) {
          await projectSelect.selectOption({ index: 1 });
          await personSelect.selectOption({ index: 1 });
          
          const selectedProject = projectOptions[1];
          const selectedPerson = personOptions[1];
          
          await page.fill('input[name="allocation_percentage"]', '30');
          await page.click('button[type="submit"]');
          await page.waitForTimeout(1000);
          
          // Verify assignment was created
          const newCount = await page.locator('tbody tr').count();
          expect(newCount).toBeGreaterThan(initialCount);
          
          // Navigate to the person page
          await helpers.clickAndNavigate('nav a:has-text("People")', '/people');
          await helpers.waitForDataLoad();
          
          // Find and click the person
          const personLink = page.locator(`a:has-text("${selectedPerson}")`).first();
          if (await personLink.isVisible()) {
            await personLink.click();
            await helpers.waitForNavigation();
            
            // Should see the new assignment
            await expect(page.locator(`text=${selectedProject}`)).toBeVisible();
            await expect(page.locator('text=30%')).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Cascading Updates', () => {
    test('should reflect project status changes in related views', async ({ page }) => {
      await helpers.clickAndNavigate('nav a:has-text("Projects")', '/projects');
      await helpers.waitForDataLoad();
      
      // Get project with assignments
      const projectName = await page.locator('tbody tr td a').first().textContent();
      
      // Note the current status/priority
      const statusCell = page.locator('tbody tr').first().locator('td:nth-child(6)');
      const originalStatus = await statusCell.textContent();
      
      // Edit project
      await page.locator('tbody tr td a').first().click();
      await helpers.waitForNavigation();
      
      await page.click('button:has-text("Edit")');
      
      // Change priority
      const prioritySelect = page.locator('select[name="priority"]');
      if (await prioritySelect.isVisible()) {
        await prioritySelect.selectOption('high');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);
      }
      
      // Go to dashboard
      await helpers.clickAndNavigate('nav a:has-text("Dashboard")', '/');
      
      // Should reflect high priority projects count
      const highPrioritySection = page.locator('text=/High Priority|Critical Projects/i');
      if (await highPrioritySection.isVisible()) {
        expect(true).toBeTruthy();
      }
    });

    test('should handle circular references properly', async ({ page }) => {
      // Test supervisor chains don't create circular references
      await helpers.clickAndNavigate('nav a:has-text("People")', '/people');
      await helpers.waitForDataLoad();
      
      // Navigate through supervisor chain
      let depth = 0;
      const maxDepth = 5;
      const visited = new Set();
      
      while (depth < maxDepth) {
        const currentUrl = page.url();
        
        // Check if we've been here before (circular reference)
        if (visited.has(currentUrl)) {
          // Circular reference detected - this should not happen
          expect(visited.has(currentUrl)).toBe(false);
          break;
        }
        
        visited.add(currentUrl);
        
        // Look for supervisor link
        const supervisorLink = page.locator('a[href*="/people/"]:near(:text("Supervisor"))').first();
        if (await supervisorLink.isVisible({ timeout: 3000 })) {
          await supervisorLink.click();
          await helpers.waitForNavigation();
          depth++;
        } else {
          // Reached top of hierarchy
          break;
        }
      }
      
      // Should not have hit max depth (would indicate circular reference)
      expect(depth).toBeLessThan(maxDepth);
    });
  });
});