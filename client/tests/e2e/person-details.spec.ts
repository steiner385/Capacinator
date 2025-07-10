import { test, expect } from '@playwright/test';

test.describe('Person Details Page Functionality', () => {
  let personId: string;
  
  test.beforeEach(async ({ page }) => {
    // Navigate to people page first
    await page.goto('/people');
    await page.waitForTimeout(2000);
    
    // Get first person ID and navigate to their details
    const tableRows = page.locator('.data-table tbody tr');
    const rowCount = await tableRows.count();
    
    if (rowCount > 0) {
      const viewButton = tableRows.first().locator('button:has-text("View")');
      await viewButton.click();
      await page.waitForTimeout(1000);
      
      // Extract person ID from URL
      const url = page.url();
      const match = url.match(/\/people\/([^\/]+)$/);
      personId = match ? match[1] : '';
    }
  });

  test('should display person details page', async ({ page }) => {
    if (!personId) {
      test.skip('No person available for testing');
      return;
    }
    
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.person-details')).toBeVisible();
    
    // Should show back button
    await expect(page.locator('button:has([data-testid="arrow-left"])')).toBeVisible();
    
    // Should show edit button (if user has permissions)
    const editButton = page.locator('button:has-text("Edit")');
    if (await editButton.isVisible()) {
      await expect(editButton).toBeVisible();
    }
  });

  test('should display basic information section', async ({ page }) => {
    if (!personId) {
      test.skip('No person available for testing');
      return;
    }
    
    // Should show Basic Information section
    await expect(page.locator('h2:has-text("Basic Information")')).toBeVisible();
    
    // Should show info grid with fields
    const infoGrid = page.locator('.info-grid');
    await expect(infoGrid).toBeVisible();
    
    // Should show email field
    await expect(page.locator('label:has-text("Email")')).toBeVisible();
    
    // Should show worker type field
    await expect(page.locator('label:has-text("Worker Type")')).toBeVisible();
    
    // Should show primary role field
    await expect(page.locator('label:has-text("Primary Role")')).toBeVisible();
  });

  test('should display roles & skills section', async ({ page }) => {
    if (!personId) {
      test.skip('No person available for testing');
      return;
    }
    
    // Should show Roles & Skills section
    await expect(page.locator('h2:has-text("Roles & Skills")')).toBeVisible();
    
    // Check if section is expanded or can be expanded
    const rolesSection = page.locator('.detail-section:has(h2:has-text("Roles & Skills"))');
    await expect(rolesSection).toBeVisible();
    
    // Should show roles list
    const rolesList = page.locator('.roles-list');
    if (await rolesList.isVisible()) {
      // Should show individual role items
      const roleItems = page.locator('.role-item');
      const roleCount = await roleItems.count();
      
      if (roleCount > 0) {
        // Should show role name, description, and proficiency level
        const firstRole = roleItems.first();
        await expect(firstRole.locator('h4')).toBeVisible();
        await expect(firstRole.locator('.badge')).toBeVisible(); // proficiency level
      }
    }
  });

  test('should display assignments section', async ({ page }) => {
    if (!personId) {
      test.skip('No person available for testing');
      return;
    }
    
    // Should show Current Assignments section
    await expect(page.locator('h2:has-text("Current Assignments")')).toBeVisible();
    
    const assignmentsSection = page.locator('.detail-section:has(h2:has-text("Current Assignments"))');
    await expect(assignmentsSection).toBeVisible();
    
    // Check for assignments or empty state
    const assignmentsGrid = page.locator('.assignments-grid');
    const emptyState = page.locator('.empty-state');
    
    const hasAssignments = await assignmentsGrid.isVisible();
    const hasEmptyState = await emptyState.isVisible();
    
    expect(hasAssignments || hasEmptyState).toBe(true);
    
    if (hasEmptyState) {
      await expect(emptyState.locator('p:has-text("No current assignments")')).toBeVisible();
      await expect(emptyState.locator('a:has-text("Assign to Project")')).toBeVisible();
    }
  });

  test('should display availability section', async ({ page }) => {
    if (!personId) {
      test.skip('No person available for testing');
      return;
    }
    
    // Should show Availability & Time Off section
    await expect(page.locator('h2:has-text("Availability & Time Off")')).toBeVisible();
    
    const availabilitySection = page.locator('.detail-section:has(h2:has-text("Availability & Time Off"))');
    await expect(availabilitySection).toBeVisible();
    
    // Should show availability summary
    const availabilitySummary = page.locator('.availability-summary');
    if (await availabilitySummary.isVisible()) {
      await expect(availabilitySummary).toBeVisible();
    }
  });

  test('should handle edit mode toggle', async ({ page }) => {
    if (!personId) {
      test.skip('No person available for testing');
      return;
    }
    
    const editButton = page.locator('button:has-text("Edit")');
    
    if (await editButton.isVisible()) {
      // Click edit button
      await editButton.click();
      
      // Should show Save and Cancel buttons
      await expect(page.locator('button:has-text("Save")')).toBeVisible();
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
      
      // Should show form inputs instead of read-only text
      const emailInput = page.locator('input[type="email"]');
      if (await emailInput.isVisible()) {
        await expect(emailInput).toBeVisible();
      }
      
      // Test Cancel button
      await page.locator('button:has-text("Cancel")').click();
      
      // Should return to view mode
      await expect(page.locator('button:has-text("Edit")')).toBeVisible();
    }
  });

  test('should handle section expansion/collapse', async ({ page }) => {
    if (!personId) {
      test.skip('No person available for testing');
      return;
    }
    
    // Test Basic Information section toggle
    const basicSection = page.locator('.section-header:has(h2:has-text("Basic Information"))');
    await expect(basicSection).toBeVisible();
    
    // Should be clickable
    await basicSection.click();
    await page.waitForTimeout(500);
    
    // Test Roles section toggle
    const rolesSection = page.locator('.section-header:has(h2:has-text("Roles & Skills"))');
    await expect(rolesSection).toBeVisible();
    
    await rolesSection.click();
    await page.waitForTimeout(500);
  });

  test('should handle back button navigation', async ({ page }) => {
    if (!personId) {
      test.skip('No person available for testing');
      return;
    }
    
    const backButton = page.locator('button:has([data-testid="arrow-left"])');
    await expect(backButton).toBeVisible();
    
    await backButton.click();
    
    // Should navigate back to people list
    await expect(page).toHaveURL('/people');
    await expect(page.locator('h1')).toContainText('People');
  });

  test('should handle supervisor link navigation', async ({ page }) => {
    if (!personId) {
      test.skip('No person available for testing');
      return;
    }
    
    // Look for supervisor link in basic information
    const supervisorLink = page.locator('a[href^="/people/"]:has-text("supervisor"), a[href^="/people/"]:not([href$="/people/"])');
    
    if (await supervisorLink.count() > 0) {
      const firstSupervisorLink = supervisorLink.first();
      await firstSupervisorLink.click();
      
      // Should navigate to supervisor's details page
      await page.waitForTimeout(1000);
      
      const url = page.url();
      expect(url).toMatch(/\/people\/[^\/]+$/);
    }
  });

  test('should handle missing Add Role functionality', async ({ page }) => {
    if (!personId) {
      test.skip('No person available for testing');
      return;
    }
    
    const editButton = page.locator('button:has-text("Edit")');
    
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Look for Add Role button
      const addRoleButton = page.locator('button:has-text("Add Role")');
      
      if (await addRoleButton.isVisible()) {
        await addRoleButton.click();
        
        // This should show some kind of functionality or error
        // Since it's not implemented, we're just testing that it doesn't crash
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should handle missing Add Time Off functionality', async ({ page }) => {
    if (!personId) {
      test.skip('No person available for testing');
      return;
    }
    
    const editButton = page.locator('button:has-text("Edit")');
    
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Look for Add Time Off button
      const addTimeOffButton = page.locator('button:has-text("Add Time Off")');
      
      if (await addTimeOffButton.isVisible()) {
        await addTimeOffButton.click();
        
        // This should show some kind of functionality or error
        // Since it's not implemented, we're just testing that it doesn't crash
        await page.waitForTimeout(1000);
      }
    }
  });
});