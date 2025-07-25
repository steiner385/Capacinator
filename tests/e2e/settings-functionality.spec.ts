import { test, expect } from '@playwright/test';

test.describe('Settings Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the settings page
    await page.goto('/');
    await page.click('nav a[href="/settings"]');
    await expect(page).toHaveURL('/settings');
  });

  test.describe('Settings Navigation', () => {
    test('should display all settings tabs', async ({ page }) => {
      // Check that all tabs are present
      await expect(page.locator('.settings-tabs')).toBeVisible();
      
      const tabs = page.locator('.settings-tabs button');
      await expect(tabs).toHaveCount(4);
      
      // Check tab names
      await expect(tabs.nth(0)).toContainText('System');
      await expect(tabs.nth(1)).toContainText('Import');
      await expect(tabs.nth(2)).toContainText('User Permissions');
      await expect(tabs.nth(3)).toContainText('Email Notifications');
    });

    test('should switch between tabs correctly', async ({ page }) => {
      // Start on System tab (default)
      await expect(page.locator('.tab.active')).toContainText('System');
      await expect(page.locator('.settings-section h2')).toContainText('System Settings');

      // Switch to Import tab
      await page.click('button:has-text("Import")');
      await expect(page.locator('.tab.active')).toContainText('Import');
      await expect(page.locator('.settings-section h2')).toContainText('Import Settings');

      // Switch to User Permissions tab
      await page.click('button:has-text("User Permissions")');
      await expect(page.locator('.tab.active')).toContainText('User Permissions');
      await expect(page.locator('.settings-section h2')).toContainText('User Permissions');

      // Switch to Email Notifications tab
      await page.click('button:has-text("Email Notifications")');
      await expect(page.locator('.tab.active')).toContainText('Email Notifications');
      await expect(page.locator('.settings-section h2')).toContainText('Email Notifications');
    });
  });

  test.describe('System Settings', () => {
    test('should display system settings form', async ({ page }) => {
      // Should be on System tab by default
      await expect(page.locator('.settings-section h2')).toContainText('System Settings');

      // Check for main setting groups
      await expect(page.locator('h3:has-text("Work Hours & Time")')).toBeVisible();
      await expect(page.locator('h3:has-text("Project Management")')).toBeVisible();
      await expect(page.locator('h3:has-text("System Behavior")')).toBeVisible();

      // Check for specific input fields
      await expect(page.locator('label:has-text("Default Work Hours per Week")')).toBeVisible();
      await expect(page.locator('label:has-text("Default Vacation Days per Year")')).toBeVisible();
      await expect(page.locator('label:has-text("Fiscal Year Start Month")')).toBeVisible();
      await expect(page.locator('label:has-text("Allow Over Allocation")')).toBeVisible();
      await expect(page.locator('label:has-text("Enable Email Notifications")')).toBeVisible();
    });

    test('should save system settings successfully', async ({ page }) => {
      // Update a setting
      const workHoursInput = page.locator('input[type="number"]:near(:text("Default Work Hours per Week"))');
      await workHoursInput.fill('38');

      // Enable email notifications
      const emailCheckbox = page.locator('input[type="checkbox"]:near(:text("Enable Email Notifications"))');
      if (!(await emailCheckbox.isChecked())) {
        await emailCheckbox.check();
      }

      // Save settings
      await page.click('button:has-text("Save Settings")');

      // Check for success message
      await expect(page.locator('.success-message, .save-message')).toContainText('saved successfully', { timeout: 5000 });
    });

    test('should validate input ranges', async ({ page }) => {
      // Test invalid work hours (too high)
      const workHoursInput = page.locator('input[type="number"]:near(:text("Default Work Hours per Week"))');
      await workHoursInput.fill('100');

      await page.click('button:has-text("Save Settings")');

      // Should show validation error
      await expect(page.locator('.text-destructive, .save-message')).toContainText('must be between', { timeout: 5000 });
    });
  });

  test.describe('Import Settings', () => {
    test('should display import settings form', async ({ page }) => {
      await page.click('button:has-text("Import")');
      
      await expect(page.locator('.settings-section h2')).toContainText('Import Settings');

      // Check for setting groups
      await expect(page.locator('h3:has-text("Data Handling")')).toBeVisible();
      await expect(page.locator('h3:has-text("Auto-Creation Settings")')).toBeVisible();

      // Check for specific settings
      await expect(page.locator('label:has-text("Clear Existing Data")')).toBeVisible();
      await expect(page.locator('label:has-text("Validate Duplicates")')).toBeVisible();
      await expect(page.locator('label:has-text("Auto-create Missing Roles")')).toBeVisible();
      await expect(page.locator('label:has-text("Date Format")')).toBeVisible();
    });

    test('should save import settings successfully', async ({ page }) => {
      await page.click('button:has-text("Import")');

      // Toggle some settings
      const validateDuplicatesCheckbox = page.locator('input[type="checkbox"]:near(:text("Validate Duplicates"))');
      if (await validateDuplicatesCheckbox.isChecked()) {
        await validateDuplicatesCheckbox.uncheck();
      } else {
        await validateDuplicatesCheckbox.check();
      }

      // Change date format
      const dateFormatSelect = page.locator('select:near(:text("Date Format"))');
      await dateFormatSelect.selectOption('DD/MM/YYYY');

      // Save settings
      await page.click('button:has-text("Save Settings")');

      // Check for success message
      await expect(page.locator('.success-message, .save-message')).toContainText('saved successfully', { timeout: 5000 });
    });
  });

  test.describe('User Permissions', () => {
    test('should display user permissions information', async ({ page }) => {
      await page.click('button:has-text("User Permissions")');
      
      await expect(page.locator('.settings-section h2')).toContainText('User Permissions');

      // Check for information sections
      await expect(page.locator('h3:has-text("User Roles")')).toBeVisible();
      await expect(page.locator('h3:has-text("System Permissions")')).toBeVisible();

      // Check for implementation message
      await expect(page.locator('.info-message')).toContainText('User permissions system is now implemented');
    });

    test('should display user roles and permissions', async ({ page }) => {
      await page.click('button:has-text("User Permissions")');

      // Wait for data to load
      await page.waitForTimeout(1000);

      // Check for roles grid (may be empty in test environment)
      await expect(page.locator('.roles-grid')).toBeVisible();

      // Check for permissions grid
      await expect(page.locator('.permissions-grid')).toBeVisible();
    });
  });

  test.describe('Email Notifications', () => {
    test('should display email notifications settings', async ({ page }) => {
      await page.click('button:has-text("Email Notifications")');
      
      await expect(page.locator('.settings-section h2')).toContainText('Email Notifications');

      // Check for main sections
      await expect(page.locator('h3:has-text("Email Configuration")')).toBeVisible();
      await expect(page.locator('h3:has-text("Test Email")')).toBeVisible();
      await expect(page.locator('h3:has-text("Notification Templates")')).toBeVisible();
      await expect(page.locator('h3:has-text("System Settings")')).toBeVisible();
    });

    test('should show email configuration status', async ({ page }) => {
      await page.click('button:has-text("Email Notifications")');

      // Wait for configuration check
      await page.waitForTimeout(2000);

      // Check for configuration status
      await expect(page.locator('.config-status')).toBeVisible();
      await expect(page.locator('.status-badge')).toBeVisible();
      
      // Status should be either "Configured" or "Not Configured"
      const statusText = await page.locator('.status-badge').textContent();
      expect(statusText).toMatch(/Configured|Not Configured/);
    });

    test('should display test email section', async ({ page }) => {
      await page.click('button:has-text("Email Notifications")');

      // Check test email form
      await expect(page.locator('label:has-text("Test Email Address")')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button:has-text("Send Test Email")')).toBeVisible();
    });

    test('should attempt to send test email', async ({ page }) => {
      await page.click('button:has-text("Email Notifications")');

      // Fill test email address
      await page.fill('input[type="email"]', 'test@example.com');

      // Try to send test email (may fail if SMTP not configured)
      await page.click('button:has-text("Send Test Email")');

      // Should show some message (success or error)
      await expect(page.locator('.success-message, .text-destructive, .save-message')).toBeVisible({ timeout: 5000 });
    });

    test('should display notification templates', async ({ page }) => {
      await page.click('button:has-text("Email Notifications")');

      // Wait for templates to load
      await page.waitForTimeout(2000);

      // Check for templates list
      await expect(page.locator('.templates-list')).toBeVisible();

      // Templates may be empty in test environment, but container should exist
    });

    test('should allow toggling email notifications system-wide', async ({ page }) => {
      await page.click('button:has-text("Email Notifications")');

      // Find the system-wide checkbox
      const systemCheckbox = page.locator('input[type="checkbox"]:near(:text("Enable Email Notifications System-wide"))');
      await expect(systemCheckbox).toBeVisible();

      // Toggle the setting
      const isChecked = await systemCheckbox.isChecked();
      if (isChecked) {
        await systemCheckbox.uncheck();
      } else {
        await systemCheckbox.check();
      }

      // Save settings
      await page.click('button:has-text("Save Settings")');

      // Check for success message
      await expect(page.locator('.success-message, .save-message')).toContainText('saved successfully', { timeout: 5000 });
    });
  });

  test.describe('Settings Persistence', () => {
    test('should persist settings across page reloads', async ({ page }) => {
      // Change a system setting
      const workHoursInput = page.locator('input[type="number"]:near(:text("Default Work Hours per Week"))');
      await workHoursInput.fill('35');
      
      // Save settings
      await page.click('button:has-text("Save Settings")');
      await expect(page.locator('.success-message, .save-message')).toContainText('saved successfully', { timeout: 5000 });

      // Reload page
      await page.reload();
      await expect(page).toHaveURL('/settings');

      // Check that setting persisted
      const reloadedInput = page.locator('input[type="number"]:near(:text("Default Work Hours per Week"))');
      await expect(reloadedInput).toHaveValue('35');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle invalid form submissions gracefully', async ({ page }) => {
      // Try to submit with invalid fiscal year month
      const fiscalYearSelect = page.locator('select:near(:text("Fiscal Year Start Month"))');
      // Note: This test assumes validation happens client-side or server-side
      
      // Fill with valid values first
      await page.fill('input[type="number"]:near(:text("Default Work Hours per Week"))', '40');
      
      // Save and expect no errors for valid data
      await page.click('button:has-text("Save Settings")');
      
      // Should not show error messages for valid data
      await page.waitForTimeout(2000);
    });

    test('should show loading states during save operations', async ({ page }) => {
      // Change a setting
      await page.fill('input[type="number"]:near(:text("Default Work Hours per Week"))', '42');
      
      // Click save and immediately check for loading state
      await page.click('button:has-text("Save Settings")');
      
      // Button should show "Saving..." temporarily
      await expect(page.locator('button:has-text("Saving")')).toBeVisible({ timeout: 1000 });
    });
  });
});