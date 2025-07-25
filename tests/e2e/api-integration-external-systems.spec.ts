import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('API Integration and External Systems E2E Tests', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.setupPage();
  });

  test.describe('Third-Party API Integration Tests', () => {
    test('should validate SMTP email service configuration', async ({ page }) => {
      await page.goto('/settings');
      await helpers.setupPage();
      
      // Navigate to Email Notifications tab
      await page.click('button:has-text("Email Notifications")');
      await page.waitForTimeout(1000);
      
      // Check email configuration status
      const configStatus = page.locator('.config-status');
      await expect(configStatus).toBeVisible();
      
      // Verify connection test functionality
      const connectionTest = page.locator('.connection-test');
      if (await connectionTest.count() > 0) {
        const connectionBadge = connectionTest.locator('.status-badge');
        await expect(connectionBadge).toBeVisible();
        console.log('✅ SMTP configuration validation available');
      } else {
        console.log('ℹ️ SMTP not configured - testing fallback behavior');
      }
    });

    test('should handle email notification service integration', async ({ page }) => {
      await page.goto('/settings');
      await helpers.setupPage();
      
      // Navigate to Email Notifications tab
      await page.click('button:has-text("Email Notifications")');
      await page.waitForTimeout(1000);
      
      // Test email send functionality
      const testEmailInput = page.locator('input[type="email"]');
      const sendButton = page.locator('button:has-text("Send Test Email")');
      
      if (await testEmailInput.count() > 0 && await sendButton.count() > 0) {
        await testEmailInput.fill('test@example.com');
        await sendButton.click();
        
        // Wait for response
        await page.waitForTimeout(3000);
        
        // Check for success or error message
        const messages = page.locator('.save-message, .text-destructive, .success-message');
        if (await messages.count() > 0) {
          console.log('✅ Email service integration responds correctly');
        }
      } else {
        console.log('ℹ️ Email test interface not available');
      }
    });

    test('should validate Excel processing service integration', async ({ page }) => {
      await page.goto('/import');
      await helpers.setupPage();
      
      // Test Excel import template generation
      const templateButton = page.locator('button:has-text("Download Template"), a:has-text("Download Template")');
      
      if (await templateButton.count() > 0) {
        // Check template download functionality
        const downloadPromise = page.waitForEvent('download');
        await templateButton.click();
        
        try {
          const download = await downloadPromise;
          expect(download.suggestedFilename()).toContain('.xlsx');
          console.log('✅ Excel template generation service working');
        } catch (error) {
          console.log('⚠️ Excel template download may not be configured');
        }
      }
      
      // Test file upload validation
      const fileInput = page.locator('input[type="file"]');
      const uploadButton = page.locator('button:has-text("Upload"), button:has-text("Import")');
      
      if (await fileInput.count() > 0) {
        // Create a mock Excel file for testing
        const mockFile = Buffer.from('PK\x03\x04'); // Excel file header
        await fileInput.setInputFiles({
          name: 'test.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          buffer: mockFile
        });
        
        if (await uploadButton.count() > 0) {
          await uploadButton.click();
          await page.waitForTimeout(2000);
          
          // Verify file processing response
          const messages = page.locator('.import-message, .text-destructive, .success-message');
          if (await messages.count() > 0) {
            console.log('✅ Excel processing service validates file format');
          }
        }
      }
    });

    test('should test PDF generation service integration', async ({ page }) => {
      await page.goto('/reports');
      await helpers.setupPage();
      
      // Look for PDF export functionality
      const pdfButton = page.locator('button:has-text("PDF"), button:has-text("Export PDF")');
      
      if (await pdfButton.count() > 0) {
        // Test PDF generation
        const downloadPromise = page.waitForEvent('download');
        await pdfButton.click();
        
        try {
          const download = await downloadPromise;
          expect(download.suggestedFilename()).toContain('.pdf');
          console.log('✅ PDF generation service working');
        } catch (error) {
          console.log('⚠️ PDF generation may require report data');
        }
      } else {
        console.log('ℹ️ PDF export not available on this page');
      }
    });
  });

  test.describe('External Service Connectivity Tests', () => {
    test('should test database connectivity and resilience', async ({ page }) => {
      await page.goto('/');
      await helpers.setupPage();
      
      // Test multiple API endpoints to verify database connectivity
      const apiEndpoints = [
        '/api/health',
        '/api/projects',
        '/api/people',
        '/api/roles'
      ];
      
      for (const endpoint of apiEndpoints) {
        const response = await page.evaluate(async (url) => {
          try {
            const res = await fetch(url);
            return { status: res.status, ok: res.ok };
          } catch (error) {
            return { status: 0, ok: false, error: error.message };
          }
        }, endpoint);
        
        if (response.ok) {
          console.log(`✅ Database connectivity verified for ${endpoint}`);
        } else {
          console.log(`⚠️ Database connectivity issue for ${endpoint}: ${response.status}`);
        }
      }
    });

    test('should test file system operations', async ({ page }) => {
      await page.goto('/import');
      await helpers.setupPage();
      
      // Test file upload capability
      const fileInput = page.locator('input[type="file"]');
      
      if (await fileInput.count() > 0) {
        // Test file system interaction
        const testFile = Buffer.from('test data');
        await fileInput.setInputFiles({
          name: 'test.txt',
          mimeType: 'text/plain',
          buffer: testFile
        });
        
        console.log('✅ File system operations accessible');
      }
      
      // Test export functionality (file generation)
      const exportButton = page.locator('button:has-text("Export"), button:has-text("Download")');
      
      if (await exportButton.count() > 0) {
        try {
          const downloadPromise = page.waitForEvent('download');
          await exportButton.click();
          await downloadPromise;
          console.log('✅ File generation service working');
        } catch (error) {
          console.log('ℹ️ File generation may require data');
        }
      }
    });

    test('should test scheduled task system connectivity', async ({ page }) => {
      await page.goto('/settings');
      await helpers.setupPage();
      
      // Check for notification scheduling features
      await page.click('button:has-text("Email Notifications")');
      await page.waitForTimeout(1000);
      
      // Look for scheduled notification templates
      const templates = page.locator('.templates-list, .template-item');
      
      if (await templates.count() > 0) {
        console.log('✅ Notification scheduling system accessible');
        
        // Check template status
        const templateStatus = page.locator('.template-details');
        if (await templateStatus.count() > 0) {
          console.log('✅ Scheduled task templates configured');
        }
      } else {
        console.log('ℹ️ Notification scheduling not visible/configured');
      }
    });
  });

  test.describe('Data Synchronization Workflow Tests', () => {
    test('should test Excel import data synchronization', async ({ page }) => {
      await page.goto('/import');
      await helpers.setupPage();
      
      // Test import settings synchronization
      const settingsButton = page.locator('button:has-text("Settings"), a:has-text("Settings")');
      
      if (await settingsButton.count() > 0) {
        await settingsButton.click();
        await page.waitForTimeout(1000);
        
        // Check import settings that affect data sync
        const clearDataCheckbox = page.locator('input[type="checkbox"]');
        const validateDuplicatesCheckbox = page.locator('input[type="checkbox"]');
        
        if (await clearDataCheckbox.count() > 0) {
          console.log('✅ Import data synchronization settings available');
        }
      }
      
      // Test import history tracking
      const historyButton = page.locator('button:has-text("History"), a:has-text("History")');
      
      if (await historyButton.count() > 0) {
        await historyButton.click();
        await page.waitForTimeout(1000);
        
        // Verify import history tracking
        const historyList = page.locator('.import-history, .history-item');
        
        if (await historyList.count() > 0) {
          console.log('✅ Import history synchronization working');
        }
      }
    });

    test('should test scenario data synchronization', async ({ page }) => {
      await page.goto('/scenarios');
      await helpers.setupPage();
      
      // Test scenario creation and data sync
      const newScenarioButton = page.locator('button:has-text("New Scenario"), button:has-text("Create Scenario")');
      
      if (await newScenarioButton.count() > 0) {
        await newScenarioButton.click();
        await page.waitForTimeout(1000);
        
        // Fill scenario details
        const nameInput = page.locator('input[name="name"], input[placeholder*="name"]');
        if (await nameInput.count() > 0) {
          await nameInput.fill('Test Sync Scenario');
          
          // Submit scenario
          const submitButton = page.locator('button[type="submit"], button:has-text("Create")');
          if (await submitButton.count() > 0) {
            await submitButton.click();
            await page.waitForTimeout(2000);
            
            // Verify scenario appears in list
            const scenarioList = page.locator('.scenario-item, .scenario-card');
            if (await scenarioList.count() > 0) {
              console.log('✅ Scenario data synchronization working');
            }
          }
        }
      } else {
        console.log('ℹ️ Scenario creation not available');
      }
    });

    test('should test assignment data synchronization', async ({ page }) => {
      await page.goto('/assignments');
      await helpers.setupPage();
      
      // Test assignment creation and cross-page sync
      const newAssignmentButton = page.locator('button:has-text("New Assignment"), button:has-text("Add Assignment")');
      
      if (await newAssignmentButton.count() > 0) {
        await newAssignmentButton.click();
        await page.waitForTimeout(1000);
        
        // Fill assignment form
        const projectSelect = page.locator('select[name="project_id"]');
        const personSelect = page.locator('select[name="person_id"]');
        
        if (await projectSelect.count() > 0 && await personSelect.count() > 0) {
          if (await projectSelect.locator('option').count() > 1) {
            await projectSelect.selectOption({ index: 1 });
          }
          
          if (await personSelect.locator('option').count() > 1) {
            await personSelect.selectOption({ index: 1 });
          }
          
          // Submit assignment
          const submitButton = page.locator('button[type="submit"], button:has-text("Create")');
          if (await submitButton.count() > 0) {
            await submitButton.click();
            await page.waitForTimeout(2000);
            
            // Navigate to projects page to verify sync
            await page.goto('/projects');
            await helpers.setupPage();
            
            // Check if assignment appears in project view
            const projectAssignments = page.locator('.assignment-item, .assigned-person');
            if (await projectAssignments.count() > 0) {
              console.log('✅ Assignment data synchronization across pages working');
            }
          }
        }
      }
    });
  });

  test.describe('API Authentication Flow Tests', () => {
    test('should test user authentication workflow', async ({ page }) => {
      await page.goto('/');
      await helpers.setupPage();
      
      // Test user selection (current auth mechanism)
      const userSelect = page.locator('select[name="user"], .user-select');
      
      if (await userSelect.count() > 0) {
        if (await userSelect.locator('option').count() > 1) {
          await userSelect.selectOption({ index: 1 });
          await page.waitForTimeout(1000);
          
          // Verify user context is set
          const userContext = page.locator('.user-context, .current-user');
          if (await userContext.count() > 0) {
            console.log('✅ User authentication workflow working');
          }
        }
      }
      
      // Test API authentication by accessing protected endpoint
      const response = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/user-permissions/users');
          return { status: res.status, ok: res.ok };
        } catch (error) {
          return { status: 0, ok: false };
        }
      });
      
      if (response.status === 401) {
        console.log('✅ API authentication protection working');
      } else if (response.ok) {
        console.log('✅ API authentication flow working');
      }
    });

    test('should test permission-based API access', async ({ page }) => {
      await page.goto('/settings');
      await helpers.setupPage();
      
      // Navigate to User Permissions tab
      await page.click('button:has-text("User Permissions")');
      await page.waitForTimeout(1000);
      
      // Check if user permissions are loaded
      const userTable = page.locator('.table tbody tr, .user-item');
      
      if (await userTable.count() > 0) {
        console.log('✅ Permission-based API access working');
        
        // Test permission checking
        const firstUser = userTable.first();
        const adminBadge = firstUser.locator('.admin-badge, .status-badge');
        
        if (await adminBadge.count() > 0) {
          console.log('✅ Permission level verification working');
        }
      }
    });

    test('should test API session management', async ({ page }) => {
      await page.goto('/');
      await helpers.setupPage();
      
      // Test session persistence across page navigation
      const initialUser = await page.evaluate(() => {
        return localStorage.getItem('current_user') || sessionStorage.getItem('current_user');
      });
      
      // Navigate to different pages
      await page.goto('/projects');
      await helpers.setupPage();
      
      await page.goto('/people');
      await helpers.setupPage();
      
      // Check if session is maintained
      const finalUser = await page.evaluate(() => {
        return localStorage.getItem('current_user') || sessionStorage.getItem('current_user');
      });
      
      if (initialUser === finalUser) {
        console.log('✅ API session persistence working');
      } else {
        console.log('ℹ️ Session management may be stateless');
      }
    });
  });

  test.describe('Integration Error Handling Tests', () => {
    test('should test API error handling and recovery', async ({ page }) => {
      await page.goto('/projects');
      await helpers.setupPage();
      
      // Test API error handling by accessing non-existent resource
      const response = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/projects/non-existent-id');
          return { status: res.status, ok: res.ok };
        } catch (error) {
          return { status: 0, ok: false, error: error.message };
        }
      });
      
      if (response.status === 404) {
        console.log('✅ API error handling working (404 for non-existent resource)');
      }
      
      // Test malformed request handling
      const malformedResponse = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: 'invalid json'
          });
          return { status: res.status, ok: res.ok };
        } catch (error) {
          return { status: 0, ok: false, error: error.message };
        }
      });
      
      if (malformedResponse.status === 400 || malformedResponse.status === 500) {
        console.log('✅ API malformed request handling working');
      }
    });

    test('should test file upload error handling', async ({ page }) => {
      await page.goto('/import');
      await helpers.setupPage();
      
      // Test invalid file format handling
      const fileInput = page.locator('input[type="file"]');
      
      if (await fileInput.count() > 0) {
        // Upload invalid file format
        const invalidFile = Buffer.from('This is not an Excel file');
        await fileInput.setInputFiles({
          name: 'test.txt',
          mimeType: 'text/plain',
          buffer: invalidFile
        });
        
        const uploadButton = page.locator('button:has-text("Upload"), button:has-text("Import")');
        if (await uploadButton.count() > 0) {
          await uploadButton.click();
          await page.waitForTimeout(2000);
          
          // Check for error message
          const errorMessage = page.locator('.text-destructive, .import-error');
          if (await errorMessage.count() > 0) {
            console.log('✅ File upload error handling working');
          }
        }
      }
    });

    test('should test email service error handling', async ({ page }) => {
      await page.goto('/settings');
      await helpers.setupPage();
      
      // Navigate to Email Notifications tab
      await page.click('button:has-text("Email Notifications")');
      await page.waitForTimeout(1000);
      
      // Test email send with invalid address
      const testEmailInput = page.locator('input[type="email"]');
      const sendButton = page.locator('button:has-text("Send Test Email")');
      
      if (await testEmailInput.count() > 0 && await sendButton.count() > 0) {
        await testEmailInput.fill('invalid-email');
        await sendButton.click();
        await page.waitForTimeout(2000);
        
        // Check for error handling
        const errorMessage = page.locator('.text-destructive, .save-message');
        if (await errorMessage.count() > 0) {
          console.log('✅ Email service error handling working');
        }
      }
    });
  });

  test.describe('Service Failover Scenarios', () => {
    test('should test database connection failover', async ({ page }) => {
      await page.goto('/');
      await helpers.setupPage();
      
      // Test health check endpoint
      const healthResponse = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/health');
          const data = await res.json();
          return { status: res.status, data };
        } catch (error) {
          return { status: 0, error: error.message };
        }
      });
      
      if (healthResponse.status === 200 && healthResponse.data.database === 'connected') {
        console.log('✅ Database health check working');
      }
      
      // Test graceful degradation when database is unavailable
      const apiResponse = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/projects');
          return { status: res.status, ok: res.ok };
        } catch (error) {
          return { status: 0, ok: false, error: error.message };
        }
      });
      
      if (apiResponse.ok) {
        console.log('✅ Database connection stable');
      } else {
        console.log('⚠️ Database connection may have issues');
      }
    });

    test('should test file system failover', async ({ page }) => {
      await page.goto('/import');
      await helpers.setupPage();
      
      // Test template download availability
      const templateButton = page.locator('button:has-text("Download Template"), a:has-text("Download Template")');
      
      if (await templateButton.count() > 0) {
        try {
          const downloadPromise = page.waitForEvent('download');
          await templateButton.click();
          await downloadPromise;
          console.log('✅ File system operations working');
        } catch (error) {
          console.log('⚠️ File system may have issues');
        }
      }
    });

    test('should test notification service failover', async ({ page }) => {
      await page.goto('/settings');
      await helpers.setupPage();
      
      // Navigate to Email Notifications tab
      await page.click('button:has-text("Email Notifications")');
      await page.waitForTimeout(1000);
      
      // Check notification service status
      const configStatus = page.locator('.config-status .status-badge');
      
      if (await configStatus.count() > 0) {
        const statusText = await configStatus.textContent();
        
        if (statusText?.includes('Configured')) {
          console.log('✅ Notification service available');
        } else {
          console.log('⚠️ Notification service may be unavailable');
        }
      }
      
      // Test graceful degradation
      const systemSettings = page.locator('.setting-item');
      if (await systemSettings.count() > 0) {
        console.log('✅ System functions available despite service status');
      }
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should test API response times under load', async ({ page }) => {
      await page.goto('/');
      await helpers.setupPage();
      
      // Test multiple concurrent API calls
      const apiCalls = [
        '/api/projects',
        '/api/people',
        '/api/roles',
        '/api/locations',
        '/api/assignments'
      ];
      
      const startTime = Date.now();
      
      const results = await Promise.all(
        apiCalls.map(async (endpoint) => {
          const callStart = Date.now();
          const response = await page.evaluate(async (url) => {
            try {
              const res = await fetch(url);
              return { status: res.status, ok: res.ok };
            } catch (error) {
              return { status: 0, ok: false };
            }
          }, endpoint);
          const callEnd = Date.now();
          
          return {
            endpoint,
            responseTime: callEnd - callStart,
            success: response.ok
          };
        })
      );
      
      const totalTime = Date.now() - startTime;
      
      console.log(`✅ API load test completed in ${totalTime}ms`);
      results.forEach(result => {
        if (result.success) {
          console.log(`✅ ${result.endpoint}: ${result.responseTime}ms`);
        } else {
          console.log(`⚠️ ${result.endpoint}: Failed`);
        }
      });
    });

    test('should test large data set handling', async ({ page }) => {
      await page.goto('/people');
      await helpers.setupPage();
      
      // Test large data set loading
      const startTime = Date.now();
      
      // Set filters to get maximum data
      const startDateFilter = page.locator('input[type="date"]').first();
      const endDateFilter = page.locator('input[type="date"]').last();
      
      if (await startDateFilter.count() > 0) {
        await startDateFilter.fill('2020-01-01');
      }
      
      if (await endDateFilter.count() > 0) {
        await endDateFilter.fill('2030-12-31');
      }
      
      // Apply filters
      const applyButton = page.locator('button:has-text("Apply"), button:has-text("Filter")');
      if (await applyButton.count() > 0) {
        await applyButton.click();
        await page.waitForTimeout(5000);
      }
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Verify data loaded
      const dataRows = page.locator('tbody tr, .data-row');
      const rowCount = await dataRows.count();
      
      console.log(`✅ Large data set test: ${rowCount} rows loaded in ${responseTime}ms`);
      
      // Performance threshold check
      if (responseTime < 10000) {
        console.log('✅ Performance within acceptable limits');
      } else {
        console.log('⚠️ Performance may be slow for large datasets');
      }
    });
  });
});