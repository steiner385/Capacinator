import { test, expect, Page } from '@playwright/test';

test.describe('Inline Edit in Assignments Table', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Navigate to login page
    await page.goto('http://localhost:3001/login');
    
    // Login as Admin User
    await page.getByLabel('Select Person').click();
    await page.getByRole('option', { name: 'Admin User' }).click();
    await page.getByRole('button', { name: 'Enter Application' }).click();
    
    // Wait for navigation and go to Assignments page
    await page.waitForURL('**/dashboard');
    await page.getByRole('link', { name: 'Assignments' }).click();
    await page.waitForURL('**/assignments');
    
    // Wait for the table to load
    await page.waitForSelector('table');
    await page.waitForTimeout(1000); // Give time for data to load
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should edit allocation percentage inline', async () => {
    // Find a row with an editable allocation percentage
    const firstEditableCell = page.locator('td:has(input[type="number"])').first();
    const input = firstEditableCell.locator('input[type="number"]');
    
    // Get the original value
    const originalValue = await input.inputValue();
    
    // Click to focus and edit
    await input.click();
    await input.fill('75');
    
    // Press Enter to save
    await input.press('Enter');
    
    // Wait for any API call to complete
    await page.waitForTimeout(500);
    
    // Verify the value was saved
    await expect(input).toHaveValue('75');
    
    // Reload the page to verify persistence
    await page.reload();
    await page.waitForSelector('table');
    
    // Find the same cell again and verify the value persisted
    const reloadedInput = page.locator('td:has(input[type="number"])').first().locator('input[type="number"]');
    await expect(reloadedInput).toHaveValue('75');
  });

  test('should edit notes inline', async () => {
    // Find a row with editable notes
    const notesCell = page.locator('td:has(input[placeholder*="notes" i])').first();
    const notesInput = notesCell.locator('input');
    
    // Click to focus and edit
    await notesInput.click();
    await notesInput.fill('Updated test notes');
    
    // Press Enter to save
    await notesInput.press('Enter');
    
    // Wait for any API call to complete
    await page.waitForTimeout(500);
    
    // Verify the value was saved
    await expect(notesInput).toHaveValue('Updated test notes');
    
    // Reload the page to verify persistence
    await page.reload();
    await page.waitForSelector('table');
    
    // Find the same cell again and verify the value persisted
    const reloadedNotesInput = page.locator('td:has(input[placeholder*="notes" i])').first().locator('input');
    await expect(reloadedNotesInput).toHaveValue('Updated test notes');
  });

  test('should cancel edit with Escape key', async () => {
    // Find an editable allocation percentage
    const input = page.locator('td:has(input[type="number"])').first().locator('input[type="number"]');
    
    // Get the original value
    const originalValue = await input.inputValue();
    
    // Click to focus and edit
    await input.click();
    await input.fill('99');
    
    // Press Escape to cancel
    await input.press('Escape');
    
    // Wait a moment for any potential save
    await page.waitForTimeout(500);
    
    // Verify the value reverted to original
    await expect(input).toHaveValue(originalValue);
  });

  test('should validate allocation percentage range', async () => {
    // Find an editable allocation percentage
    const input = page.locator('td:has(input[type="number"])').first().locator('input[type="number"]');
    
    // Try to enter invalid value (over 100)
    await input.click();
    await input.fill('150');
    await input.press('Enter');
    
    // Wait for validation
    await page.waitForTimeout(500);
    
    // Check if there's an error message or if value is clamped
    const currentValue = await input.inputValue();
    const numValue = parseInt(currentValue);
    
    // Value should be clamped to 100 or show validation error
    expect(numValue).toBeLessThanOrEqual(100);
    expect(numValue).toBeGreaterThanOrEqual(0);
  });

  test('should handle blur event to save changes', async () => {
    // Find an editable allocation percentage
    const input = page.locator('td:has(input[type="number"])').first().locator('input[type="number"]');
    
    // Click to focus and edit
    await input.click();
    await input.fill('80');
    
    // Click outside to blur
    await page.locator('h1').click();
    
    // Wait for save
    await page.waitForTimeout(500);
    
    // Verify the value was saved
    await expect(input).toHaveValue('80');
  });

  test('should show visual feedback during edit', async () => {
    // Find an editable cell
    const cell = page.locator('td:has(input[type="number"])').first();
    const input = cell.locator('input[type="number"]');
    
    // Click to focus
    await input.click();
    
    // Check if the input has focus styling
    await expect(input).toBeFocused();
    
    // The input should have some visual indication it's being edited
    // This could be a border, background color, etc.
    const inputStyles = await input.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        borderColor: styles.borderColor,
        outline: styles.outline,
        boxShadow: styles.boxShadow
      };
    });
    
    // Verify some form of focus styling exists
    expect(
      inputStyles.borderColor !== 'rgb(0, 0, 0)' || 
      inputStyles.outline !== 'none' ||
      inputStyles.boxShadow !== 'none'
    ).toBeTruthy();
  });

  test('should handle concurrent edits properly', async () => {
    // Edit first field
    const firstInput = page.locator('td:has(input[type="number"])').first().locator('input[type="number"]');
    await firstInput.click();
    await firstInput.fill('60');
    
    // Without saving, try to edit another field
    const secondInput = page.locator('td:has(input[type="number"])').nth(1).locator('input[type="number"]');
    await secondInput.click();
    
    // The first edit should be saved automatically
    await page.waitForTimeout(500);
    
    // Verify first value was saved
    await expect(firstInput).toHaveValue('60');
    
    // Now edit the second field
    await secondInput.fill('40');
    await secondInput.press('Enter');
    
    // Verify second value was saved
    await expect(secondInput).toHaveValue('40');
  });

  test('should maintain table sorting after inline edit', async () => {
    // Get the initial order of rows (by project name for example)
    const projectNames = await page.locator('table tbody tr td:nth-child(2)').allTextContents();
    
    // Edit an allocation value
    const input = page.locator('td:has(input[type="number"])').first().locator('input[type="number"]');
    await input.click();
    await input.fill('90');
    await input.press('Enter');
    
    // Wait for save
    await page.waitForTimeout(500);
    
    // Get the order after edit
    const projectNamesAfter = await page.locator('table tbody tr td:nth-child(2)').allTextContents();
    
    // The order should remain the same
    expect(projectNamesAfter).toEqual(projectNames);
  });
});