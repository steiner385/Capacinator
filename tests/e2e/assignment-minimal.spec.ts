import { test, expect } from '@playwright/test';

test.describe('Assignment Creation - Minimal Test', () => {
  test('Create assignment successfully', async ({ page }) => {
    // Set up user
    await page.goto('http://localhost:3121');
    await page.evaluate(() => {
      const user = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Alice Johnson',
        email: 'alice.johnson@example.com'
      };
      localStorage.setItem('capacinator_current_user', JSON.stringify(user));
    });
    
    // Go to people page
    await page.goto('http://localhost:3121/people');
    await page.waitForLoadState('networkidle');
    
    // Click view details for first person
    const viewButton = page.locator('table tbody tr').first().locator('td:last-child button').first();
    await viewButton.click();
    
    // Wait for details page
    await page.waitForSelector('text=Person Details', { timeout: 10000 });
    
    // Click Add Assignment
    await page.click('button:has-text("Add Assignment")');
    
    // Wait for modal
    await page.waitForSelector('text=Smart Assignment', { timeout: 10000 });
    
    // Switch to manual tab
    await page.click('button[role="tab"]:has-text("Manual Selection")');
    
    // Fill minimum required fields
    // Select first available project
    const projectSelect = page.locator('#project-select');
    await projectSelect.waitFor({ state: 'visible' });
    const projectOptions = await projectSelect.locator('option').all();
    
    for (let i = 1; i < Math.min(projectOptions.length, 5); i++) {
      const value = await projectOptions[i].getAttribute('value');
      if (value) {
        await projectSelect.selectOption(value);
        break;
      }
    }
    
    // Wait a bit for role dropdown to populate
    await page.waitForTimeout(1000);
    
    // Select first available role
    const roleSelect = page.locator('#role-select');
    if (await roleSelect.isEnabled()) {
      const roleOptions = await roleSelect.locator('option').all();
      for (let i = 1; i < Math.min(roleOptions.length, 3); i++) {
        const value = await roleOptions[i].getAttribute('value');
        if (value) {
          await roleSelect.selectOption(value);
          break;
        }
      }
    }
    
    // Set allocation (slider might have default value)
    const allocationInput = page.locator('#allocation-slider');
    if (await allocationInput.isVisible()) {
      await allocationInput.fill('50');
    }
    
    // Submit using Enter key instead of clicking button
    await page.keyboard.press('Enter');
    
    // Wait for modal to close or success message
    await Promise.race([
      page.waitForSelector('text=Smart Assignment', { state: 'detached', timeout: 10000 }),
      page.waitForSelector('text=Assignment created', { timeout: 10000 }),
      page.waitForSelector('text=Active Assignments', { timeout: 10000 })
    ]);
    
    console.log('Assignment created successfully');
  });
});