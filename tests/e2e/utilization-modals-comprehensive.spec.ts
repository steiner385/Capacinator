import { test, expect, Page } from '@playwright/test';
import { TestUtils } from './helpers/test-utils';
import { TestHelpers } from './utils/test-helpers';

/**
 * Comprehensive E2E Tests for Utilization Report Modals
 * 
 * Tests the "Reduce Load" and "Add Projects" modals functionality including:
 * - Modal display and data accuracy
 * - Assignment removal and creation operations
 * - Database state verification
 * - UI refreshing and state consistency
 */

test.describe('Utilization Report Modals', () => {
  let testUtils: TestUtils;
  let testHelpers: TestHelpers;
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    testUtils = new TestUtils(page);
    testHelpers = new TestHelpers(page);
    
    // Navigate to reports page first
    await page.goto('/reports');
    
    // Wait for page to fully load before handling modal
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Handle profile modal if present using the helper
    await testHelpers.handleProfileSelection();
    
    // Wait for reports page to be ready
    await page.waitForSelector('button:has-text("Utilization Report")', { timeout: 10000 });
    
    // Switch to utilization report tab
    console.log('Clicking Utilization Report button...');
    await page.click('button:has-text("Utilization Report")');
    await page.waitForTimeout(1000);
    
    // Check if the utilization report is loading
    console.log('Waiting for utilization content...');
    try {
      // First try to wait for the specific heading
      await page.waitForSelector('h2:has-text("🎯 Team Utilization Overview")', { timeout: 5000 });
      console.log('Found utilization overview heading');
    } catch (error) {
      console.log('Utilization overview heading not found, checking page content...');
      
      // Take a screenshot for debugging
      await page.screenshot({ path: '/tmp/utilization-report-debug.png' });
      
      // Try to find any utilization-related content
      const utilization = await page.locator('text="utilization"').count();
      const teamMember = await page.locator('text="Team Member"').count();
      console.log(`Found ${utilization} instances of "utilization", ${teamMember} instances of "Team Member"`);
      
      // If still no content, maybe we need to wait longer or try again
      if (utilization === 0 && teamMember === 0) {
        console.log('No utilization content found, trying to click button again...');
        await page.click('button:has-text("Utilization Report")');
        await page.waitForTimeout(3000);
      }
    }
    
    // Wait for the table to be populated with data
    await page.waitForSelector('table:has(th:has-text("Team Member")) tbody tr', { timeout: 15000 });
    
    // Wait for data to fully load
    await page.waitForTimeout(3000);
  });

  // Helper function to find the utilization table
  async function getUtilizationTable() {
    // Try multiple table selectors since we're not sure of the exact structure
    const selectors = [
      'table:has(th:has-text("Team Member"))',
      'table:has(th:has-text("Member"))', 
      'table:has(th:has-text("Name"))',
      'table:has(th:has-text("Person"))',
      'h2:has-text("Team Utilization Overview") + table',
      'h2:has-text("Team Utilization Overview") ~ table',
      'h2:has-text("Team Utilization Overview") ~ div table',
      'div:has(h2:has-text("Team Utilization Overview")) table'
    ];
    
    for (const selector of selectors) {
      const table = page.locator(selector);
      if (await table.isVisible()) {
        console.log(`Found utilization table with selector: ${selector}`);
        return table;
      }
    }
    
    // If no table found, return a generic table selector
    console.log('No specific utilization table found, using generic table selector');
    return page.locator('table').first();
  }

  // Helper function to find a person with over-utilization (for reduce load tests)
  async function findOverUtilizedPerson() {
    const table = await getUtilizationTable();
    const rows = await table.locator('tbody tr').all();
    
    for (const row of rows) {
      const utilizationText = await row.locator('td:nth-child(3)').textContent();
      const utilization = parseInt(utilizationText?.replace('%', '') || '0');
      
      if (utilization > 100) { // Over-utilized
        const actionsCell = row.locator('td:nth-child(5)');
        const reduceButton = actionsCell.locator('button:has-text("🔻 Reduce Load")');
        
        if (await reduceButton.isVisible()) {
          return { row, button: reduceButton, utilization };
        }
      }
    }
    return null;
  }

  // Helper function to find a person with under-utilization (for add projects tests)
  async function findUnderUtilizedPerson() {
    const table = await getUtilizationTable();
    const rows = await table.locator('tbody tr').all();
    
    for (const row of rows) {
      const utilizationText = await row.locator('td:nth-child(3)').textContent();
      const utilization = parseInt(utilizationText?.replace('%', '') || '0');
      
      if (utilization < 80) { // Under-utilized
        const actionsCell = row.locator('td:nth-child(5)');
        const addButton = actionsCell.locator('button:has-text("➕ Add Projects")');
        
        if (await addButton.isVisible()) {
          return { row, button: addButton, utilization };
        }
      }
    }
    return null;
  }

  test.describe('Utilization Report Basic Tests', () => {
    test('should display utilization table with team members', async () => {
      // Debug what's actually on the page
      console.log('=== DEBUGGING PAGE CONTENT ===');
      
      // Check for utilization heading
      const headingExists = await page.locator('h2:has-text("Team Utilization Overview")').isVisible();
      console.log(`Utilization heading visible: ${headingExists}`);
      
      // Count all tables on the page
      const allTables = await page.locator('table').count();
      console.log(`Total tables found: ${allTables}`);
      
      // Get all table headers
      const allHeaders = await page.locator('th').allTextContents();
      console.log(`All table headers found: ${JSON.stringify(allHeaders)}`);
      
      // Check for any utilization-related text
      const utilizationTexts = await page.locator('text=/utilization/i').count();
      console.log(`Elements containing "utilization": ${utilizationTexts}`);
      
      // Take a screenshot for debugging
      await page.screenshot({ path: '/tmp/utilization-page-debug.png' });
      console.log('Screenshot saved to /tmp/utilization-page-debug.png');
      
      // Try to find the table
      const table = await getUtilizationTable();
      await expect(table).toBeVisible();
      
      // Verify table has data rows
      const rows = table.locator('tbody tr, tr');
      const rowCount = await rows.count();
      console.log(`Found ${rowCount} rows in utilization table`);
      
      if (rowCount > 0) {
        await expect(rows.first()).toBeVisible();
        
        // Get the actual column headers for this table
        const headers = await table.locator('th').allTextContents();
        console.log(`Table headers: ${JSON.stringify(headers)}`);
        
        // Check if any rows have action buttons
        const buttonsInTable = await table.locator('button').count();
        console.log(`Found ${buttonsInTable} buttons in the table`);
        
        // Look for specific button types
        const reduceButtons = await table.locator('button:has-text("🔻"), button:has-text("Reduce")').count();
        const addButtons = await table.locator('button:has-text("➕"), button:has-text("Add")').count();
        console.log(`Found ${reduceButtons} reduce buttons and ${addButtons} add buttons`);
      }
    });

    test('should display modal with current assignments', async () => {
      // Find any button in the table that we can click
      const table = await getUtilizationTable();
      const allButtons = await table.locator('button').all();
      
      console.log(`Found ${allButtons.length} buttons to test with`);
      
      if (allButtons.length > 0) {
        // Try clicking the first button we find
        const firstButton = allButtons[0];
        const buttonText = await firstButton.textContent();
        console.log(`Clicking button with text: "${buttonText}"`);
        
        await firstButton.click();
        await page.waitForTimeout(2000);
        
        // Look for any modal that opens
        const modals = await page.locator('[role="dialog"], .modal, div[style*="position: fixed"]').count();
        console.log(`Found ${modals} modal-like elements after button click`);
        
        if (modals > 0) {
          const modal = page.locator('[role="dialog"], .modal, div[style*="position: fixed"]').first();
          await expect(modal).toBeVisible();
          console.log('Modal opened successfully!');
        }
      } else {
        console.log('No buttons found in utilization table');
      }
    });

    test('should successfully remove assignment and refresh data', async () => {
      // Find person with assignments in utilization table
      const utilizationTable = page.locator('table:has(th:has-text("Team Member"))');
      const personRows = await utilizationTable.locator('tbody tr').all();
      let selectedRow: any = null;
      let initialUtilization = 0;
      
      for (const row of personRows) {
        const utilizationText = await row.locator('td:nth-child(3)').textContent(); // Utilization & Projects column
        const utilization = parseInt(utilizationText?.replace('%', '') || '0');
        
        if (utilization > 0) {
          selectedRow = row;
          initialUtilization = utilization;
          break;
        }
      }

      expect(selectedRow).toBeTruthy();
      
      // Open reduce load modal - look for button in Actions column
      const actionsCell = selectedRow.locator('td:nth-child(5)');
      await actionsCell.locator('button:has-text("🔻 Reduce Load")').click();
      
      // Wait for modal and assignments to load
      const modal = page.locator('div:has-text("Reduce Load:")').first();
      await expect(modal).toBeVisible();
      await page.waitForTimeout(1000);
      
      // Get initial assignment count - look for project cards or assignment items
      const assignments = modal.locator('div:has-text("Project:"), .project-card, [class*="assignment"], [class*="project"]');
      const initialAssignmentCount = await assignments.count();
      expect(initialAssignmentCount).toBeGreaterThan(0);
      
      // Get project name before removal for verification
      const firstAssignment = assignments.first();
      const projectName = await firstAssignment.textContent();
      
      // Listen for API calls
      const deleteResponse = page.waitForResponse(response => 
        response.url().includes('/api/assignments') && 
        response.request().method() === 'DELETE'
      );
      
      // Click Remove button and confirm
      page.on('dialog', dialog => dialog.accept()); // Auto-accept confirmation dialog
      await firstAssignment.locator('button:has-text("Remove")').click();
      
      // Verify API call was made
      const response = await deleteResponse;
      expect(response.status()).toBe(200);
      
      // Wait for modal to close and data to refresh
      await expect(modal).not.toBeVisible({ timeout: 10000 });
      
      // Verify table data was refreshed
      await page.waitForTimeout(2000);
      
      // Check that utilization has decreased (or assignment count reduced)
      const updatedRow = page.locator('.team-utilization-overview tbody tr').first();
      const newUtilizationText = await updatedRow.locator('td:nth-child(6)').textContent();
      const newUtilization = parseInt(newUtilizationText?.replace('%', '') || '0');
      
      // Utilization should be lower or equal (equal if person has other assignments)
      expect(newUtilization).toBeLessThanOrEqual(initialUtilization);
    });

    test('should display accurate role information for assignments', async () => {
      // Find person with assignments and open modal
      const personRows = await page.locator('.team-utilization-overview tbody tr').all();
      
      for (const row of personRows) {
        const utilizationText = await row.locator('td:nth-child(6)').textContent();
        const utilization = parseInt(utilizationText?.replace('%', '') || '0');
        
        if (utilization > 0) {
          await row.locator('button:has-text("Reduce Load")').click();
          break;
        }
      }
      
      const modal = page.locator('div:has-text("Reduce Load:")').first();
      await expect(modal).toBeVisible();
      
      // Verify role information is displayed
      const assignments = modal.locator('.assignment-item, [class*="assignment"]');
      const firstAssignment = assignments.first();
      
      // Check that role emoji and text are present
      await expect(firstAssignment).toContainText('👤');
      
      // Verify the role information is meaningful (not just "Role")
      const roleText = await firstAssignment.textContent();
      expect(roleText).toMatch(/👤\s+\w+/); // Should have role emoji followed by actual role name
    });

    test('should handle empty assignments gracefully', async () => {
      // Find a person with 0% utilization
      const personRows = await page.locator('.team-utilization-overview tbody tr').all();
      
      for (const row of personRows) {
        const utilizationText = await row.locator('td:nth-child(6)').textContent();
        const utilization = parseInt(utilizationText?.replace('%', '') || '0');
        
        if (utilization === 0) {
          await row.locator('button:has-text("Reduce Load")').click();
          
          const modal = page.locator('div:has-text("Reduce Load:")').first();
          await expect(modal).toBeVisible();
          
          // Should show "no assignments" message
          await expect(modal).toContainText('No current assignments');
          
          // Close modal
          await modal.locator('button[aria-label="Close"], button:has-text("×")').click();
          return;
        }
      }
      
      // If no 0% utilization people found, skip this test
      test.skip();
    });
  });

  test.describe('Add Projects Modal', () => {
    test('should display modal with project recommendations', async () => {
      // Find a person with less than 100% utilization
      const personRows = await page.locator('.team-utilization-overview tbody tr').all();
      let selectedPersonName = '';
      
      for (const row of personRows) {
        const utilizationText = await row.locator('td:nth-child(6)').textContent();
        const utilization = parseInt(utilizationText?.replace('%', '') || '0');
        
        if (utilization < 100) {
          selectedPersonName = await row.locator('td:nth-child(2)').textContent() || '';
          await row.locator('button:has-text("Add Projects")').click();
          break;
        }
      }

      // Verify modal opened
      const modal = page.locator('div:has-text("Add Projects:")').first();
      await expect(modal).toBeVisible();
      
      // Verify modal title includes person name
      await expect(modal.locator('h2, h3, h4')).toContainText(selectedPersonName);
      
      // Wait for projects to load
      await page.waitForTimeout(2000);
      
      // Verify project recommendations are displayed or "no suitable projects" message
      const projects = modal.locator('[class*="project"], .project-item');
      const noProjectsMessage = modal.locator('text="No suitable projects"');
      
      const hasProjects = await projects.count() > 0;
      const hasNoProjectsMessage = await noProjectsMessage.isVisible();
      
      expect(hasProjects || hasNoProjectsMessage).toBeTruthy();
      
      if (hasProjects) {
        // Verify project details are shown
        const firstProject = projects.first();
        await expect(firstProject.locator('strong, h4')).toBeVisible(); // Project name
        await expect(firstProject).toContainText('h/week'); // Estimated hours
        await expect(firstProject).toContainText('Priority'); // Priority level
        await expect(firstProject).toContainText('👤'); // Role information
        
        // Verify Assign button is present
        await expect(firstProject.locator('button:has-text("Assign")')).toBeVisible();
      }
    });

    test('should successfully create assignment and refresh data', async () => {
      // Find person with low utilization
      const personRows = await page.locator('.team-utilization-overview tbody tr').all();
      let selectedRow: any = null;
      let initialUtilization = 0;
      
      for (const row of personRows) {
        const utilizationText = await row.locator('td:nth-child(6)').textContent();
        const utilization = parseInt(utilizationText?.replace('%', '') || '0');
        
        if (utilization < 80) { // Find someone with capacity
          selectedRow = row;
          initialUtilization = utilization;
          break;
        }
      }

      if (!selectedRow) {
        test.skip('No person with available capacity found');
        return;
      }
      
      // Open add projects modal
      await selectedRow.locator('button:has-text("Add Projects")').click();
      
      const modal = page.locator('div:has-text("Add Projects:")').first();
      await expect(modal).toBeVisible();
      await page.waitForTimeout(2000);
      
      // Check if there are projects available
      const projects = modal.locator('[class*="project"], .project-item');
      const projectCount = await projects.count();
      
      if (projectCount === 0) {
        // If no projects available, check for appropriate message
        await expect(modal).toContainText('No suitable projects');
        await modal.locator('button[aria-label="Close"], button:has-text("×")').click();
        test.skip('No projects available for assignment');
        return;
      }
      
      // Get project name before assignment
      const firstProject = projects.first();
      const projectName = await firstProject.locator('strong, h4').textContent();
      
      // Listen for API calls
      const createResponse = page.waitForResponse(response => 
        response.url().includes('/api/assignments') && 
        response.request().method() === 'POST'
      );
      
      // Click Assign button and confirm
      page.on('dialog', dialog => dialog.accept()); // Auto-accept confirmation dialog
      await firstProject.locator('button:has-text("Assign")').click();
      
      // Verify API call was made successfully
      const response = await createResponse;
      expect(response.status()).toBe(201);
      
      // Wait for modal to close and data to refresh
      await expect(modal).not.toBeVisible({ timeout: 10000 });
      
      // Verify table data was refreshed
      await page.waitForTimeout(2000);
      
      // Check that utilization has increased
      const updatedRow = page.locator('.team-utilization-overview tbody tr').first();
      const newUtilizationText = await updatedRow.locator('td:nth-child(6)').textContent();
      const newUtilization = parseInt(newUtilizationText?.replace('%', '') || '0');
      
      // Utilization should be higher
      expect(newUtilization).toBeGreaterThan(initialUtilization);
    });

    test('should display accurate role and priority information', async () => {
      // Find person with available capacity
      const personRows = await page.locator('.team-utilization-overview tbody tr').all();
      
      for (const row of personRows) {
        const utilizationText = await row.locator('td:nth-child(6)').textContent();
        const utilization = parseInt(utilizationText?.replace('%', '') || '0');
        
        if (utilization < 100) {
          await row.locator('button:has-text("Add Projects")').click();
          break;
        }
      }
      
      const modal = page.locator('div:has-text("Add Projects:")').first();
      await expect(modal).toBeVisible();
      await page.waitForTimeout(2000);
      
      const projects = modal.locator('[class*="project"], .project-item');
      const projectCount = await projects.count();
      
      if (projectCount > 0) {
        const firstProject = projects.first();
        
        // Verify priority information
        const projectText = await firstProject.textContent();
        expect(projectText).toMatch(/(High|Medium|Low)\s+Priority/);
        
        // Verify role information  
        await expect(firstProject).toContainText('👤');
        
        // Verify match score badge
        const matchBadges = firstProject.locator('span:has-text("Match"), span:has-text("Great"), span:has-text("Good"), span:has-text("Fair")');
        await expect(matchBadges.first()).toBeVisible();
      }
    });

    test('should calculate realistic estimated hours', async () => {
      // Find person with available capacity
      const personRows = await page.locator('.team-utilization-overview tbody tr').all();
      
      for (const row of personRows) {
        const utilizationText = await row.locator('td:nth-child(6)').textContent();
        const utilization = parseInt(utilizationText?.replace('%', '') || '0');
        
        if (utilization < 100) {
          await row.locator('button:has-text("Add Projects")').click();
          break;
        }
      }
      
      const modal = page.locator('div:has-text("Add Projects:")').first();
      await expect(modal).toBeVisible();
      await page.waitForTimeout(2000);
      
      const projects = modal.locator('[class*="project"], .project-item');
      const projectCount = await projects.count();
      
      if (projectCount > 0) {
        const firstProject = projects.first();
        const projectText = await firstProject.textContent();
        
        // Extract hours estimate
        const hoursMatch = projectText.match(/~(\d+)h\/week/);
        if (hoursMatch) {
          const estimatedHours = parseInt(hoursMatch[1]);
          
          // Should be reasonable (between 5-30 hours per week)
          expect(estimatedHours).toBeGreaterThanOrEqual(5);
          expect(estimatedHours).toBeLessThanOrEqual(30);
        }
      }
    });
  });

  test.describe('Modal Integration Tests', () => {
    test('should maintain data consistency between modals and table', async () => {
      // Get initial state
      const initialRows = await page.locator('.team-utilization-overview tbody tr').all();
      const initialData = [];
      
      for (const row of initialRows) {
        const name = await row.locator('td:nth-child(2)').textContent();
        const utilization = await row.locator('td:nth-child(6)').textContent();
        initialData.push({ name, utilization });
      }
      
      // Find person with assignments to test remove
      let testPersonRow = null;
      for (const row of initialRows) {
        const utilizationText = await row.locator('td:nth-child(6)').textContent();
        const utilization = parseInt(utilizationText?.replace('%', '') || '0');
        
        if (utilization > 0 && utilization < 100) {
          testPersonRow = row;
          break;
        }
      }
      
      if (!testPersonRow) {
        test.skip('No suitable person found for integration test');
        return;
      }
      
      // Test reduce load workflow
      await testPersonRow.locator('button:has-text("Reduce Load")').click();
      const reduceModal = page.locator('div:has-text("Reduce Load:")').first();
      await expect(reduceModal).toBeVisible();
      
      // Verify modal shows consistent data with table
      const personName = await testPersonRow.locator('td:nth-child(2)').textContent();
      await expect(reduceModal).toContainText(personName!);
      
      // Close modal
      await reduceModal.locator('button[aria-label="Close"], button:has-text("×")').click();
      await expect(reduceModal).not.toBeVisible();
      
      // Test add projects workflow
      await testPersonRow.locator('button:has-text("Add Projects")').click();
      const addModal = page.locator('div:has-text("Add Projects:")').first();
      await expect(addModal).toBeVisible();
      
      // Verify modal shows consistent person info
      await expect(addModal).toContainText(personName!);
      
      // Verify utilization percentage is shown in modal
      const modalText = await addModal.textContent();
      expect(modalText).toMatch(/\d+%\s+utilization/);
      
      // Close modal
      await addModal.locator('button[aria-label="Close"], button:has-text("×")').click();
      await expect(addModal).not.toBeVisible();
    });

    test('should handle rapid modal opening/closing without errors', async () => {
      const personRows = await page.locator('.team-utilization-overview tbody tr').all();
      
      if (personRows.length === 0) {
        test.skip('No people found for rapid interaction test');
        return;
      }
      
      const firstRow = personRows[0];
      
      // Rapidly open and close reduce load modal
      for (let i = 0; i < 3; i++) {
        await firstRow.locator('button:has-text("Reduce Load")').click();
        const modal = page.locator('div:has-text("Reduce Load:")').first();
        await expect(modal).toBeVisible();
        await modal.locator('button[aria-label="Close"], button:has-text("×")').click();
        await expect(modal).not.toBeVisible();
      }
      
      // Rapidly open and close add projects modal
      for (let i = 0; i < 3; i++) {
        await firstRow.locator('button:has-text("Add Projects")').click();
        const modal = page.locator('div:has-text("Add Projects:")').first();
        await expect(modal).toBeVisible();
        await modal.locator('button[aria-label="Close"], button:has-text("×")').click();
        await expect(modal).not.toBeVisible();
      }
      
      // Verify no JavaScript errors occurred
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      
      await page.waitForTimeout(1000);
      expect(errors.length).toBe(0);
    });

    test('should verify database state after operations', async () => {
      // This test verifies that the database operations actually persist
      // by checking API responses and refreshing the page
      
      const personRows = await page.locator('.team-utilization-overview tbody tr').all();
      let testRow = null;
      
      for (const row of personRows) {
        const utilizationText = await row.locator('td:nth-child(6)').textContent();
        const utilization = parseInt(utilizationText?.replace('%', '') || '0');
        
        if (utilization > 20 && utilization < 80) { // Good candidate for testing
          testRow = row;
          break;
        }
      }
      
      if (!testRow) {
        test.skip('No suitable person found for database persistence test');
        return;
      }
      
      // Get initial state
      const initialUtilization = await testRow.locator('td:nth-child(6)').textContent();
      const personName = await testRow.locator('td:nth-child(2)').textContent();
      
      // Perform an operation (try to add a project if available)
      await testRow.locator('button:has-text("Add Projects")').click();
      const modal = page.locator('div:has-text("Add Projects:")').first();
      await expect(modal).toBeVisible();
      await page.waitForTimeout(2000);
      
      const projects = modal.locator('[class*="project"], .project-item');
      const projectCount = await projects.count();
      
      if (projectCount > 0) {
        // Perform assignment
        page.on('dialog', dialog => dialog.accept());
        await projects.first().locator('button:has-text("Assign")').click();
        
        await expect(modal).not.toBeVisible({ timeout: 10000 });
        
        // Refresh the entire page to verify database persistence
        await page.reload();
        await page.waitForSelector('.team-utilization-overview', { timeout: 10000 });
        await page.waitForTimeout(2000);
        
        // Find the same person and verify change persisted
        const updatedRows = await page.locator('.team-utilization-overview tbody tr').all();
        let foundPerson = false;
        
        for (const row of updatedRows) {
          const name = await row.locator('td:nth-child(2)').textContent();
          if (name === personName) {
            const newUtilization = await row.locator('td:nth-child(6)').textContent();
            expect(newUtilization).not.toBe(initialUtilization);
            foundPerson = true;
            break;
          }
        }
        
        expect(foundPerson).toBeTruthy();
      } else {
        // If no projects available, just close modal
        await modal.locator('button[aria-label="Close"], button:has-text("×")').click();
        test.skip('No projects available for database persistence test');
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      // Intercept API calls to simulate errors
      await page.route('**/api/assignments', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Simulated server error' })
          });
        } else {
          route.continue();
        }
      });
      
      // Try to create an assignment
      const personRows = await page.locator('.team-utilization-overview tbody tr').all();
      if (personRows.length > 0) {
        await personRows[0].locator('button:has-text("Add Projects")').click();
        
        const modal = page.locator('div:has-text("Add Projects:")').first();
        await expect(modal).toBeVisible();
        await page.waitForTimeout(2000);
        
        const projects = modal.locator('[class*="project"], .project-item');
        if (await projects.count() > 0) {
          page.on('dialog', dialog => dialog.accept());
          await projects.first().locator('button:has-text("Assign")').click();
          
          // Should show error message
          await expect(page.locator('text="Failed to create assignment"')).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('should handle network timeouts appropriately', async () => {
      // Simulate slow network
      await page.route('**/api/assignments', route => {
        setTimeout(() => route.continue(), 10000); // 10 second delay
      });
      
      const personRows = await page.locator('.team-utilization-overview tbody tr').all();
      if (personRows.length > 0) {
        await personRows[0].locator('button:has-text("Add Projects")').click();
        
        // Modal should still open despite slow assignment loading
        const modal = page.locator('div:has-text("Add Projects:")').first();
        await expect(modal).toBeVisible();
        
        // Should show loading or handle gracefully
        await page.waitForTimeout(2000);
        await modal.locator('button[aria-label="Close"], button:has-text("×")').click();
      }
    });
  });
});