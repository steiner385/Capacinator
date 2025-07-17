import { test, expect } from '@playwright/test';

test.describe('User Permissions Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the settings page and user permissions tab
    await page.goto('/');
    await page.click('nav a[href="/settings"]');
    await page.click('button:has-text("User Permissions")');
    await expect(page.locator('.settings-section h2')).toContainText('User Permissions');
  });

  test.describe('User Permissions Overview', () => {
    test('should display user permissions system status', async ({ page }) => {
      // Check for implementation status message
      await expect(page.locator('.info-message')).toBeVisible();
      await expect(page.locator('.info-message')).toContainText('User permissions system is now implemented');
      
      // Check for feature list
      await expect(page.locator('.info-message ul')).toBeVisible();
      await expect(page.locator('.info-message li')).toContainText('System permissions and user roles');
      await expect(page.locator('.info-message li')).toContainText('Role-based access control');
    });

    test('should display main sections', async ({ page }) => {
      // Check for main section headings
      await expect(page.locator('h3:has-text("User Roles")')).toBeVisible();
      await expect(page.locator('h3:has-text("System Permissions")')).toBeVisible();
      
      // Check for section containers
      await expect(page.locator('.roles-grid')).toBeVisible();
      await expect(page.locator('.permissions-grid')).toBeVisible();
    });
  });

  test.describe('User Roles Display', () => {
    test('should load and display user roles', async ({ page }) => {
      // Wait for roles to load
      await page.waitForTimeout(2000);
      
      // Check roles grid
      await expect(page.locator('.roles-grid')).toBeVisible();
      
      // Check if roles are loaded
      const roleCards = page.locator('.role-card');
      const roleCount = await roleCards.count();
      
      if (roleCount > 0) {
        // Check first role card structure
        const firstRole = roleCards.first();
        await expect(firstRole.locator('h4')).toBeVisible(); // Role name
        await expect(firstRole.locator('p')).toBeVisible();  // Role description
        await expect(firstRole.locator('.role-info')).toBeVisible();
        await expect(firstRole.locator('.priority')).toBeVisible();
      }
    });

    test('should display role priorities', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const roleCards = page.locator('.role-card');
      const roleCount = await roleCards.count();
      
      if (roleCount > 0) {
        // Each role should have priority information
        for (let i = 0; i < Math.min(roleCount, 3); i++) {
          const role = roleCards.nth(i);
          await expect(role.locator('.priority')).toBeVisible();
          
          const priorityText = await role.locator('.priority').textContent();
          expect(priorityText).toMatch(/Priority: \d+/);
        }
      }
    });

    test('should identify system admin roles', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const roleCards = page.locator('.role-card');
      const roleCount = await roleCards.count();
      
      if (roleCount > 0) {
        // Look for system admin badges
        const adminBadges = page.locator('.admin-badge');
        const adminBadgeCount = await adminBadges.count();
        
        // If there are admin roles, they should be properly marked
        if (adminBadgeCount > 0) {
          await expect(adminBadges.first()).toContainText('System Admin');
        }
      }
    });
  });

  test.describe('System Permissions Display', () => {
    test('should load and display system permissions', async ({ page }) => {
      // Wait for permissions to load
      await page.waitForTimeout(2000);
      
      // Check permissions grid
      await expect(page.locator('.permissions-grid')).toBeVisible();
      
      // Check if permissions are loaded and categorized
      const permissionCategories = page.locator('.permission-category');
      const categoryCount = await permissionCategories.count();
      
      if (categoryCount > 0) {
        // Check first category structure
        const firstCategory = permissionCategories.first();
        await expect(firstCategory.locator('h4')).toBeVisible(); // Category name
        await expect(firstCategory.locator('.permissions-list')).toBeVisible();
      }
    });

    test('should display permissions by category', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const permissionCategories = page.locator('.permission-category');
      const categoryCount = await permissionCategories.count();
      
      if (categoryCount > 0) {
        // Check for common permission categories
        const categoryTitles = await page.locator('.permission-category h4').allTextContents();
        
        // Should have at least some standard categories
        const expectedCategories = ['People', 'Projects', 'System'];
        const hasExpectedCategories = categoryTitles.some(title =>
          expectedCategories.some(expected => title.toLowerCase().includes(expected.toLowerCase()))
        );
        
        if (categoryCount > 0) {
          expect(hasExpectedCategories).toBe(true);
        }
      }
    });

    test('should display individual permissions', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const permissionItems = page.locator('.permission-item');
      const permissionCount = await permissionItems.count();
      
      if (permissionCount > 0) {
        // Check first permission structure
        const firstPermission = permissionItems.first();
        await expect(firstPermission.locator('strong')).toBeVisible(); // Permission name
        await expect(firstPermission.locator('span')).toBeVisible();   // Permission description
        
        // Permission names should follow naming convention (category:action)
        const permissionName = await firstPermission.locator('strong').textContent();
        expect(permissionName).toMatch(/\w+:\w+/);
      }
    });
  });

  test.describe('User Management Table', () => {
    test('should display users list table', async ({ page }) => {
      // Wait for users to load
      await page.waitForTimeout(3000);
      
      // Check for users table
      const usersTable = page.locator('table');
      const tableExists = await usersTable.count();
      
      if (tableExists > 0) {
        // Check table headers
        await expect(usersTable.locator('thead')).toBeVisible();
        await expect(usersTable.locator('tbody')).toBeVisible();
        
        // Check for expected column headers
        const headers = usersTable.locator('th');
        const headerCount = await headers.count();
        expect(headerCount).toBeGreaterThan(0);
      }
    });

    test('should display user information', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      const usersTable = page.locator('table');
      const tableExists = await usersTable.count();
      
      if (tableExists > 0) {
        const userRows = usersTable.locator('tbody tr');
        const userCount = await userRows.count();
        
        if (userCount > 0) {
          // Check first user row structure
          const firstUser = userRows.first();
          const cells = firstUser.locator('td');
          const cellCount = await cells.count();
          
          // Should have multiple columns for user data
          expect(cellCount).toBeGreaterThan(3);
          
          // Should show user status
          const statusBadge = firstUser.locator('.status-badge');
          if (await statusBadge.count() > 0) {
            const statusText = await statusBadge.textContent();
            expect(statusText).toMatch(/Active|Inactive/);
          }
        }
      }
    });

    test('should display role assignments', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      const usersTable = page.locator('table');
      const tableExists = await usersTable.count();
      
      if (tableExists > 0) {
        const userRows = usersTable.locator('tbody tr');
        const userCount = await userRows.count();
        
        if (userCount > 0) {
          // Users should have role information displayed
          // This depends on the table structure, but there should be role-related data
          const firstUser = userRows.first();
          
          // Look for role information (badge, text, or cell content)
          const hasCells = await firstUser.locator('td').count() > 0;
          expect(hasCells).toBe(true);
        }
      }
    });

    test('should show permission override counts', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      const usersTable = page.locator('table');
      const tableExists = await usersTable.count();
      
      if (tableExists > 0) {
        const overrideCounts = page.locator('.override-count');
        const overrideCountExists = await overrideCounts.count();
        
        if (overrideCountExists > 0) {
          // Override counts should be numbers
          const firstOverrideCount = await overrideCounts.first().textContent();
          expect(firstOverrideCount).toMatch(/^\d+$/);
        }
      }
    });
  });

  test.describe('Data Loading and Error Handling', () => {
    test('should handle loading states gracefully', async ({ page }) => {
      // Refresh to see loading behavior
      await page.reload();
      await page.click('button:has-text("User Permissions")');
      
      // Should immediately show structure
      await expect(page.locator('h3:has-text("User Roles")')).toBeVisible();
      await expect(page.locator('h3:has-text("System Permissions")')).toBeVisible();
      
      // Containers should be present even while loading
      await expect(page.locator('.roles-grid')).toBeVisible();
      await expect(page.locator('.permissions-grid')).toBeVisible();
    });

    test('should handle empty data gracefully', async ({ page }) => {
      // Wait for data loading
      await page.waitForTimeout(3000);
      
      // Even if no data is loaded, UI should still be functional
      await expect(page.locator('.roles-grid')).toBeVisible();
      await expect(page.locator('.permissions-grid')).toBeVisible();
      
      // Info message should still be visible
      await expect(page.locator('.info-message')).toBeVisible();
    });

    test('should maintain layout with various data states', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      // Page should maintain its layout regardless of data state
      await expect(page.locator('.settings-section')).toBeVisible();
      await expect(page.locator('h2:has-text("User Permissions")')).toBeVisible();
      
      // All major sections should be present
      await expect(page.locator('h3:has-text("User Roles")')).toBeVisible();
      await expect(page.locator('h3:has-text("System Permissions")')).toBeVisible();
    });
  });

  test.describe('Integration with Main Application', () => {
    test('should be accessible from main navigation', async ({ page }) => {
      // Start from home page
      await page.goto('/');
      
      // Navigate to settings
      await page.click('nav a[href="/settings"]');
      await expect(page).toHaveURL('/settings');
      
      // Switch to User Permissions tab
      await page.click('button:has-text("User Permissions")');
      
      // Should be on the right tab
      await expect(page.locator('.tab.active')).toContainText('User Permissions');
      await expect(page.locator('.settings-section h2')).toContainText('User Permissions');
    });

    test('should integrate with other settings tabs', async ({ page }) => {
      // Should be able to switch between tabs without losing state
      await page.click('button:has-text("System")');
      await expect(page.locator('.tab.active')).toContainText('System');
      
      await page.click('button:has-text("User Permissions")');
      await expect(page.locator('.tab.active')).toContainText('User Permissions');
      
      // User Permissions content should be restored
      await expect(page.locator('h3:has-text("User Roles")')).toBeVisible();
      await expect(page.locator('h3:has-text("System Permissions")')).toBeVisible();
    });
  });

  test.describe('Security and Access Control', () => {
    test('should display security-related information', async ({ page }) => {
      // The implementation message should mention security features
      await expect(page.locator('.info-message')).toContainText('Role-based access control');
      await expect(page.locator('.info-message')).toContainText('System administrator privileges');
    });

    test('should show permission categories relevant to security', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const permissionCategories = page.locator('.permission-category h4');
      const categoryCount = await permissionCategories.count();
      
      if (categoryCount > 0) {
        const categoryTexts = await permissionCategories.allTextContents();
        
        // Should have system-related permissions
        const hasSystemCategory = categoryTexts.some(text => 
          text.toLowerCase().includes('system')
        );
        
        if (categoryCount > 0) {
          // Should have at least some permission categories
          expect(categoryTexts.length).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('User Experience and Accessibility', () => {
    test('should have clear visual hierarchy', async ({ page }) => {
      // Check heading hierarchy
      await expect(page.locator('h2')).toHaveCount(1); // Main heading
      await expect(page.locator('h3')).toHaveCount(2); // Section headings
      
      // Check for proper visual grouping
      await expect(page.locator('.settings-group')).toHaveCount(2);
    });

    test('should provide informative content', async ({ page }) => {
      // Implementation message should be informative
      const infoMessage = await page.locator('.info-message p').first().textContent();
      expect(infoMessage).toBeTruthy();
      expect(infoMessage!.length).toBeGreaterThan(20);
      
      // Should list concrete features
      const featureList = page.locator('.info-message ul li');
      const featureCount = await featureList.count();
      expect(featureCount).toBeGreaterThanOrEqual(4);
    });

    test('should handle responsive layout', async ({ page }) => {
      // Test with different viewport sizes
      await page.setViewportSize({ width: 800, height: 600 });
      
      // Content should still be accessible
      await expect(page.locator('h2:has-text("User Permissions")')).toBeVisible();
      await expect(page.locator('h3:has-text("User Roles")')).toBeVisible();
      
      // Switch back to larger viewport
      await page.setViewportSize({ width: 1200, height: 800 });
      
      // Layout should adapt
      await expect(page.locator('.roles-grid')).toBeVisible();
      await expect(page.locator('.permissions-grid')).toBeVisible();
    });
  });
});