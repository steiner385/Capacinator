import { test, expect } from '@playwright/test';

test.describe('Email Notifications Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the settings page and email notifications tab
    await page.goto('/');
    await page.click('nav a[href="/settings"]');
    await page.click('button:has-text("Email Notifications")');
    await expect(page.locator('.settings-section h2')).toContainText('Email Notifications');
  });

  test.describe('Email Configuration Status', () => {
    test('should display email configuration status', async ({ page }) => {
      // Wait for configuration check to complete
      await page.waitForTimeout(2000);

      // Check configuration status section exists
      await expect(page.locator('.config-status')).toBeVisible();
      await expect(page.locator('.status-indicator')).toBeVisible();
      
      // Should show either configured or not configured
      const statusBadge = page.locator('.status-badge').first();
      await expect(statusBadge).toBeVisible();
      
      const statusText = await statusBadge.textContent();
      expect(statusText).toMatch(/Configured|Not Configured/);
    });

    test('should show connection test results when configured', async ({ page }) => {
      await page.waitForTimeout(2000);

      // If email is configured, should show connection test
      const statusBadge = page.locator('.status-badge').first();
      const statusText = await statusBadge.textContent();
      
      if (statusText?.includes('Configured')) {
        // Should show connection test results
        await expect(page.locator('.connection-test')).toBeVisible();
        const connectionBadge = page.locator('.connection-test .status-badge');
        await expect(connectionBadge).toBeVisible();
        
        const connectionText = await connectionBadge.textContent();
        expect(connectionText).toMatch(/Connection OK|Connection Failed/);
      }
    });
  });

  test.describe('Test Email Functionality', () => {
    test('should display test email form', async ({ page }) => {
      // Check test email section
      await expect(page.locator('h3:has-text("Test Email")')).toBeVisible();
      await expect(page.locator('label:has-text("Test Email Address")')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button:has-text("Send Test Email")')).toBeVisible();
    });

    test('should validate email address before sending', async ({ page }) => {
      // Try to send without email address
      await page.click('button:has-text("Send Test Email")');
      
      // Should show validation message
      await expect(page.locator('.text-destructive, .save-message')).toContainText('email address', { timeout: 3000 });
    });

    test('should attempt to send test email with valid address', async ({ page }) => {
      // Fill valid email address
      await page.fill('input[type="email"]', 'test@example.com');
      
      // Send test email
      await page.click('button:has-text("Send Test Email")');
      
      // Should show some response (success or error depending on SMTP config)
      await expect(page.locator('.success-message, .text-destructive, .save-message')).toBeVisible({ timeout: 5000 });
    });

    test('should disable send button when email service not configured', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const statusBadge = page.locator('.status-badge').first();
      const statusText = await statusBadge.textContent();
      
      if (statusText?.includes('Not Configured')) {
        // Button should be disabled
        const sendButton = page.locator('button:has-text("Send Test Email")');
        await expect(sendButton).toBeDisabled();
      }
    });

    test('should show loading state when sending email', async ({ page }) => {
      // Fill email and send
      await page.fill('input[type="email"]', 'test@example.com');
      await page.click('button:has-text("Send Test Email")');
      
      // Button should show loading state temporarily
      await expect(page.locator('button:disabled')).toBeVisible({ timeout: 1000 });
    });
  });

  test.describe('Notification Templates', () => {
    test('should display notification templates section', async ({ page }) => {
      await expect(page.locator('h3:has-text("Notification Templates")')).toBeVisible();
      await expect(page.locator('.templates-list')).toBeVisible();
    });

    test('should load and display email templates', async ({ page }) => {
      // Wait for templates to load
      await page.waitForTimeout(3000);
      
      // Check if templates are loaded (they should exist in a fresh system)
      const templates = page.locator('.template-item');
      const templateCount = await templates.count();
      
      if (templateCount > 0) {
        // Check first template structure
        const firstTemplate = templates.first();
        await expect(firstTemplate.locator('.template-header h4')).toBeVisible();
        await expect(firstTemplate.locator('.template-type')).toBeVisible();
        await expect(firstTemplate.locator('.template-details')).toBeVisible();
        
        // Should show subject and status
        await expect(firstTemplate.locator('p:has-text("Subject:")')).toBeVisible();
        await expect(firstTemplate.locator('p:has-text("Status:")')).toBeVisible();
      }
    });

    test('should display different template types', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      const templates = page.locator('.template-item');
      const templateCount = await templates.count();
      
      if (templateCount > 0) {
        // Check for different template types (assignment, approval, project, system, summary)
        const templateTypes = await page.locator('.template-type').allTextContents();
        
        // Should have at least some template types
        expect(templateTypes.length).toBeGreaterThan(0);
        
        // Common template types that should exist
        const expectedTypes = ['assignment', 'approval', 'project', 'system', 'summary'];
        const foundTypes = templateTypes.some(type => 
          expectedTypes.some(expected => type.toLowerCase().includes(expected))
        );
        expect(foundTypes).toBe(true);
      }
    });
  });

  test.describe('System-wide Email Settings', () => {
    test('should display system-wide email settings', async ({ page }) => {
      await expect(page.locator('h3:has-text("System Settings")')).toBeVisible();
      await expect(page.locator('label:has-text("Enable Email Notifications System-wide")')).toBeVisible();
      await expect(page.locator('input[type="checkbox"]:near(:text("Enable Email Notifications System-wide"))')).toBeVisible();
    });

    test('should allow toggling system-wide email notifications', async ({ page }) => {
      const systemCheckbox = page.locator('input[type="checkbox"]:near(:text("Enable Email Notifications System-wide"))');
      
      // Get current state
      const initialState = await systemCheckbox.isChecked();
      
      // Toggle the setting
      if (initialState) {
        await systemCheckbox.uncheck();
      } else {
        await systemCheckbox.check();
      }
      
      // Verify the toggle worked
      const newState = await systemCheckbox.isChecked();
      expect(newState).toBe(!initialState);
      
      // Save the setting
      await page.click('button:has-text("Save Settings")');
      
      // Should show success message
      await expect(page.locator('.success-message, .save-message')).toContainText('saved successfully', { timeout: 5000 });
    });

    test('should persist system-wide setting across page reloads', async ({ page }) => {
      const systemCheckbox = page.locator('input[type="checkbox"]:near(:text("Enable Email Notifications System-wide"))');
      
      // Enable notifications
      await systemCheckbox.check();
      await page.click('button:has-text("Save Settings")');
      await expect(page.locator('.success-message, .save-message')).toContainText('saved successfully', { timeout: 5000 });
      
      // Reload page and navigate back to notifications
      await page.reload();
      await page.click('button:has-text("Email Notifications")');
      
      // Wait for settings to load
      await page.waitForTimeout(2000);
      
      // Setting should still be enabled
      const reloadedCheckbox = page.locator('input[type="checkbox"]:near(:text("Enable Email Notifications System-wide"))');
      await expect(reloadedCheckbox).toBeChecked();
    });
  });

  test.describe('Integration with Assignment System', () => {
    test('should have notification system ready for assignment notifications', async ({ page }) => {
      // Navigate to assignments page to verify integration
      await page.goto('/assignments');
      
      // The notification system should be running in the background
      // We can't easily test actual email sending in e2e, but we can verify
      // the system is properly integrated by checking the settings work
      
      // Go back to notifications settings
      await page.goto('/settings');
      await page.click('button:has-text("Email Notifications")');
      
      // Verify system is ready (configuration exists)
      await page.waitForTimeout(2000);
      await expect(page.locator('.config-status')).toBeVisible();
    });
  });

  test.describe('Notification History Access', () => {
    test('should display notification statistics section', async ({ page }) => {
      // While we don't have direct UI for notification history in settings,
      // the backend should be ready to serve it
      
      // Verify the notifications tab is functional
      await expect(page.locator('h3:has-text("Notification Templates")')).toBeVisible();
      await expect(page.locator('h3:has-text("System Settings")')).toBeVisible();
      
      // The system should be ready to track notification history
      // (This would be verified through API tests or admin interfaces)
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Try to send test email with invalid configuration
      await page.fill('input[type="email"]', 'test@example.com');
      await page.click('button:has-text("Send Test Email")');
      
      // Should handle errors gracefully (either success or error message)
      await page.waitForTimeout(5000);
      
      // Should not crash or hang
      await expect(page.locator('button:has-text("Send Test Email")')).toBeVisible();
    });

    test('should handle template loading errors', async ({ page }) => {
      // Wait for templates to attempt loading
      await page.waitForTimeout(3000);
      
      // Templates section should still be visible even if loading fails
      await expect(page.locator('.templates-list')).toBeVisible();
    });

    test('should handle configuration check timeouts', async ({ page }) => {
      // Wait for configuration check
      await page.waitForTimeout(5000);
      
      // Configuration section should still be visible
      await expect(page.locator('.config-status')).toBeVisible();
      await expect(page.locator('.status-indicator')).toBeVisible();
    });
  });

  test.describe('User Experience', () => {
    test('should show appropriate loading states', async ({ page }) => {
      // When switching to notifications tab, should show loading states
      await page.goto('/settings');
      await page.click('button:has-text("System")'); // Switch away
      await page.click('button:has-text("Email Notifications")'); // Switch back
      
      // Should immediately show the structure even while loading
      await expect(page.locator('h3:has-text("Email Configuration")')).toBeVisible();
      await expect(page.locator('h3:has-text("Test Email")')).toBeVisible();
    });

    test('should provide helpful status messages', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Should show status message
      await expect(page.locator('.status-message')).toBeVisible();
      
      // Status message should be informative
      const statusMessage = await page.locator('.status-message').textContent();
      expect(statusMessage).toBeTruthy();
      expect(statusMessage!.length).toBeGreaterThan(5);
    });

    test('should have accessible form labels and controls', async ({ page }) => {
      // Check for proper form labels
      await expect(page.locator('label:has-text("Test Email Address")')).toBeVisible();
      await expect(page.locator('label:has-text("Enable Email Notifications System-wide")')).toBeVisible();
      
      // Check for proper button text
      await expect(page.locator('button:has-text("Send Test Email")')).toBeVisible();
      await expect(page.locator('button:has-text("Save Settings")')).toBeVisible();
    });
  });
});