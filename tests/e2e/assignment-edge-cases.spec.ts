import { test, expect } from '@playwright/test';

// Helper to set up authenticated user
async function setupUser(page) {
  await page.goto('http://localhost:3121');
  await page.evaluate(() => {
    const user = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Alice Johnson',
      email: 'alice.johnson@example.com',
      primary_role_name: 'Senior Software Engineer'
    };
    localStorage.setItem('capacinator_current_user', JSON.stringify(user));
  });
}

test.describe('Assignment Edge Cases and Validation', () => {
  test.beforeEach(async ({ page }) => {
    await setupUser(page);
  });

  test.describe('Date Validation Edge Cases', () => {
    test('Prevent end date before start date', async ({ page }) => {
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      // Go to first person
      await page.locator('table tbody tr').first().locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Open assignment modal
      await page.click('button:has-text("Add Assignment")');
      await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
      
      // Switch to manual tab
      await page.click('button[role="tab"]:has-text("Manual Selection")');
      
      // Select project
      const projectSelect = page.locator('#project-select');
      const projectOption = await projectSelect.locator('option[value]:not([value=""])').first();
      if (await projectOption.count() > 0) {
        await projectSelect.selectOption(await projectOption.getAttribute('value')!);
      }
      
      // Set invalid date range
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      await page.fill('#start-date', tomorrow.toISOString().split('T')[0]);
      await page.fill('#end-date', yesterday.toISOString().split('T')[0]);
      
      // Try to submit - should show error
      const submitButton = page.locator('button:has-text("Create Assignment")');
      if (await submitButton.isEnabled()) {
        await submitButton.click();
        
        // Look for error message
        const errorMessage = await page.locator('text=/invalid|error|must be after/i').count();
        expect(errorMessage).toBeGreaterThan(0);
      }
      
      await page.keyboard.press('Escape');
    });

    test('Handle past dates appropriately', async ({ page }) => {
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      // Go to first person
      await page.locator('table tbody tr').first().locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Open assignment modal
      await page.click('button:has-text("Add Assignment")');
      await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
      
      // Switch to manual tab
      await page.click('button[role="tab"]:has-text("Manual Selection")');
      
      // Select project
      const projectSelect = page.locator('#project-select');
      const projectOption = await projectSelect.locator('option[value]:not([value=""])').first();
      if (await projectOption.count() > 0) {
        await projectSelect.selectOption(await projectOption.getAttribute('value')!);
      }
      
      // Set past dates
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      
      await page.fill('#start-date', lastMonth.toISOString().split('T')[0]);
      await page.fill('#end-date', lastWeek.toISOString().split('T')[0]);
      
      // System should either prevent or warn about past assignments
      const warningOrError = await page.locator('text=/past|expired|historical/i').count();
      console.log(`Past date warnings/errors found: ${warningOrError}`);
      
      await page.keyboard.press('Escape');
    });

    test('Handle very long date ranges', async ({ page }) => {
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      // Go to first person
      await page.locator('table tbody tr').first().locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Open assignment modal
      await page.click('button:has-text("Add Assignment")');
      await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
      
      // Switch to manual tab
      await page.click('button[role="tab"]:has-text("Manual Selection")');
      
      // Select project
      const projectSelect = page.locator('#project-select');
      const projectOption = await projectSelect.locator('option[value]:not([value=""])').first();
      if (await projectOption.count() > 0) {
        await projectSelect.selectOption(await projectOption.getAttribute('value')!);
      }
      
      // Set very long date range (5 years)
      const today = new Date();
      const fiveYearsLater = new Date(today);
      fiveYearsLater.setFullYear(fiveYearsLater.getFullYear() + 5);
      
      await page.fill('#start-date', today.toISOString().split('T')[0]);
      await page.fill('#end-date', fiveYearsLater.toISOString().split('T')[0]);
      
      // Check for any warnings about long assignments
      const longRangeWarning = await page.locator('text=/long|years|extended/i').count();
      console.log(`Long range warnings found: ${longRangeWarning}`);
      
      await page.keyboard.press('Escape');
    });
  });

  test.describe('Allocation Validation Edge Cases', () => {
    test('Handle zero allocation', async ({ page }) => {
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      // Go to first person
      await page.locator('table tbody tr').first().locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Open assignment modal
      await page.click('button:has-text("Add Assignment")');
      await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
      
      // Switch to manual tab
      await page.click('button[role="tab"]:has-text("Manual Selection")');
      
      // Select project
      const projectSelect = page.locator('#project-select');
      const projectOption = await projectSelect.locator('option[value]:not([value=""])').first();
      if (await projectOption.count() > 0) {
        await projectSelect.selectOption(await projectOption.getAttribute('value')!);
      }
      
      // Set zero allocation
      await page.fill('#allocation-slider', '0');
      
      // Check for validation
      const zeroWarning = await page.locator('text=/zero|must be greater|invalid allocation/i').count();
      console.log(`Zero allocation warnings found: ${zeroWarning}`);
      
      await page.keyboard.press('Escape');
    });

    test('Handle allocation over 100%', async ({ page }) => {
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      // Go to first person
      await page.locator('table tbody tr').first().locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Open assignment modal
      await page.click('button:has-text("Add Assignment")');
      await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
      
      // Switch to manual tab
      await page.click('button[role="tab"]:has-text("Manual Selection")');
      
      // Try to set allocation over 100%
      const allocationInput = page.locator('#allocation-slider');
      
      // Try various ways to exceed 100%
      await allocationInput.fill('150');
      const actualValue = await allocationInput.inputValue();
      
      // Check if input was clamped to 100
      expect(parseInt(actualValue)).toBeLessThanOrEqual(100);
      
      await page.keyboard.press('Escape');
    });

    test('Handle fractional allocations', async ({ page }) => {
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      // Go to first person
      await page.locator('table tbody tr').first().locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Open assignment modal
      await page.click('button:has-text("Add Assignment")');
      await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
      
      // Switch to manual tab
      await page.click('button[role="tab"]:has-text("Manual Selection")');
      
      // Select project
      const projectSelect = page.locator('#project-select');
      const projectOption = await projectSelect.locator('option[value]:not([value=""])').first();
      if (await projectOption.count() > 0) {
        await projectSelect.selectOption(await projectOption.getAttribute('value')!);
      }
      
      // Try fractional allocation
      await page.fill('#allocation-slider', '33.33');
      const actualValue = await page.locator('#allocation-slider').inputValue();
      console.log(`Fractional allocation accepted: ${actualValue}`);
      
      await page.keyboard.press('Escape');
    });
  });

  test.describe('Missing Data Handling', () => {
    test('Handle missing project ID gracefully', async ({ page }) => {
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      // Go to first person
      await page.locator('table tbody tr').first().locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Open assignment modal
      await page.click('button:has-text("Add Assignment")');
      await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
      
      // Switch to manual tab
      await page.click('button[role="tab"]:has-text("Manual Selection")');
      
      // Check if submit is disabled without project selection
      const submitButton = page.locator('button:has-text("Create Assignment")');
      const isDisabled = await submitButton.isDisabled();
      expect(isDisabled).toBeTruthy();
      
      await page.keyboard.press('Escape');
    });

    test('Handle projects without phases', async ({ page }) => {
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      // Go to first person
      await page.locator('table tbody tr').first().locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Open assignment modal
      await page.click('button:has-text("Add Assignment")');
      await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
      
      // Switch to manual tab
      await page.click('button[role="tab"]:has-text("Manual Selection")');
      
      // Select each project and check for phases
      const projectSelect = page.locator('#project-select');
      const projectOptions = await projectSelect.locator('option[value]:not([value=""])').all();
      
      for (const option of projectOptions.slice(0, 3)) {
        const value = await option.getAttribute('value');
        if (value) {
          await projectSelect.selectOption(value);
          await page.waitForTimeout(300);
          
          const phaseSelect = page.locator('#phase-select');
          const phaseCount = await phaseSelect.locator('option[value]:not([value=""])').count();
          
          if (phaseCount === 0) {
            console.log('Found project without phases - dates should be required');
            
            // Verify date fields are enabled for projects without phases
            const startDate = page.locator('#start-date');
            const endDate = page.locator('#end-date');
            
            expect(await startDate.isEnabled()).toBeTruthy();
            expect(await endDate.isEnabled()).toBeTruthy();
          }
        }
      }
      
      await page.keyboard.press('Escape');
    });

    test('Handle null or empty assignment IDs', async ({ page }) => {
      // This test verifies the system handles missing IDs gracefully
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      // Find person with assignments
      const personWithAssignments = page.locator('table tbody tr').filter({
        has: page.locator('td:nth-child(4):not(:has-text("0"))')
      }).first();
      
      if (await personWithAssignments.count() > 0) {
        await personWithAssignments.locator('td:last-child button').first().click();
        await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
        
        // Check console for any key warnings
        page.on('console', msg => {
          if (msg.text().includes('key') && msg.text().includes('Warning')) {
            console.log('React key warning detected:', msg.text());
          }
        });
        
        // Verify assignments render without errors
        const assignmentRows = await page.locator('table').filter({
          has: page.locator('th:has-text("Project")')
        }).locator('tbody tr').count();
        
        expect(assignmentRows).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Concurrent Operations', () => {
    test('Handle rapid assignment creation', async ({ page }) => {
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      // Go to first person
      await page.locator('table tbody tr').first().locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Try to open multiple assignment modals rapidly
      const addButton = page.locator('button:has-text("Add Assignment")');
      
      // Click multiple times quickly
      await addButton.click();
      await addButton.click();
      await addButton.click();
      
      // Should only have one modal open
      const modalCount = await page.locator('text=Smart Assignment').count();
      expect(modalCount).toBe(1);
      
      await page.keyboard.press('Escape');
    });

    test('Handle assignment modification during deletion', async ({ page }) => {
      // This tests the system's handling of concurrent operations
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      // Find person with multiple assignments
      const personRows = await page.locator('table tbody tr').all();
      let targetPerson = null;
      
      for (const row of personRows) {
        const assignmentText = await row.locator('td:nth-child(4)').textContent();
        if (assignmentText && parseInt(assignmentText) > 2) {
          targetPerson = row;
          break;
        }
      }
      
      if (!targetPerson) {
        console.log('No person with multiple assignments found');
        return;
      }
      
      await targetPerson.locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Open reduce workload modal
      const reduceButton = page.locator('button:has-text("Reduce Workload")');
      if (await reduceButton.count() > 0) {
        await reduceButton.click();
        await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
        
        // Try to interact with assignments while modal is open
        // System should handle this gracefully
        console.log('Concurrent operation test - modal interaction');
      }
    });
  });

  test.describe('Special Characters and Input Validation', () => {
    test('Handle special characters in notes field', async ({ page }) => {
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      // Go to first person
      await page.locator('table tbody tr').first().locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Open assignment modal
      await page.click('button:has-text("Add Assignment")');
      await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
      
      // Switch to manual tab
      await page.click('button[role="tab"]:has-text("Manual Selection")');
      
      // Look for notes field
      const notesField = page.locator('textarea[name="notes"], input[name="notes"], #notes');
      if (await notesField.count() > 0) {
        // Test special characters
        const specialChars = `Special chars: <script>alert('test')</script> & "quotes" 'apostrophes' émojis 🎉`;
        await notesField.fill(specialChars);
        
        // Verify input was accepted
        const actualValue = await notesField.inputValue();
        console.log('Special characters handled:', actualValue.length > 0);
      }
      
      await page.keyboard.press('Escape');
    });

    test('Handle extremely long allocation notes', async ({ page }) => {
      await page.goto('http://localhost:3121/people');
      await page.waitForLoadState('networkidle');
      
      // Go to first person
      await page.locator('table tbody tr').first().locator('td:last-child button').first().click();
      await page.waitForSelector('text=Workload Insights', { timeout: 10000 });
      
      // Open assignment modal
      await page.click('button:has-text("Add Assignment")');
      await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
      
      // Switch to manual tab
      await page.click('button[role="tab"]:has-text("Manual Selection")');
      
      // Look for notes field
      const notesField = page.locator('textarea[name="notes"], input[name="notes"], #notes');
      if (await notesField.count() > 0) {
        // Create very long text
        const longText = 'A'.repeat(5000);
        await notesField.fill(longText);
        
        // Check if there's a character limit
        const actualValue = await notesField.inputValue();
        console.log(`Long text handling: ${actualValue.length} characters accepted`);
      }
      
      await page.keyboard.press('Escape');
    });
  });

  test.afterEach(async ({ page, context }) => {
    // Clean up
    await context.clearCookies();
  });
});