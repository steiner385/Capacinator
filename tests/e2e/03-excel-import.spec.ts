import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Excel Import Functionality', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.navigateTo('/import');
    await helpers.setupPage();
  });

  test('should display import page correctly', async ({ page }) => {
    // Should show import page title
    await helpers.verifyPageTitle('Import Data');
    
    // Should show upload area
    await expect(page.locator('.upload-area')).toBeVisible();
    
    // Should show import options
    await expect(page.locator('.import-options')).toBeVisible();
    
    // Should show template information
    await expect(page.locator('.template-info')).toBeVisible();
    
    // Should show V2 template option checked by default
    const useV2Checkbox = page.locator('input[type="checkbox"]').filter({ hasText: 'new template format' }).or(
      page.locator('label:has-text("new template format") input[type="checkbox"]')
    );
    await expect(useV2Checkbox).toBeChecked();
  });

  test('should handle drag and drop file upload', async ({ page }) => {
    // This test simulates drag and drop behavior
    const uploadArea = page.locator('.upload-area');
    await expect(uploadArea).toBeVisible();
    
    // Upload file using the hidden input
    await helpers.uploadFile('simple-test-data.xlsx');
    
    // Should show file selected state
    await expect(page.locator('.file-selected')).toBeVisible();
    
    // Should show file name
    await expect(page.locator('.file-info')).toContainText('simple-test-data.xlsx');
    
    // Should show upload button
    await expect(page.locator('.upload-btn')).toBeVisible();
  });

  test('should successfully import simple test data', async ({ page }) => {
    // Upload simple test file
    await helpers.uploadFile('simple-test-data.xlsx');
    
    // Ensure clear existing data is checked
    const clearExistingCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: 'Clear existing' }).or(
      page.locator('label:has-text("Clear existing") input[type="checkbox"]')
    );
    await clearExistingCheckbox.check();
    
    // Click upload button
    await helpers.clickButton('Upload and Import');
    
    // Wait for import to complete
    await helpers.waitForSuccessMessage();
    
    // Should show success message
    await expect(page.locator('.import-result.success')).toBeVisible();
    
    // Should show import statistics
    await expect(page.locator('.import-stats')).toBeVisible();
    
    // Verify some expected import counts
    await expect(page.locator('.import-stats')).toContainText('projects');
    await expect(page.locator('.import-stats')).toContainText('people');
    await expect(page.locator('.import-stats')).toContainText('roles');
  });

  test('should handle complex test data with warnings', async ({ page }) => {
    // Upload complex test file that contains edge cases
    await helpers.uploadFile('complex-test-data.xlsx');
    
    // Ensure clear existing data is checked
    const clearExistingCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: 'Clear existing' }).or(
      page.locator('label:has-text("Clear existing") input[type="checkbox"]')
    );
    await clearExistingCheckbox.check();
    
    // Click upload button
    await helpers.clickButton('Upload and Import');
    
    // Wait for import to complete (might have errors/warnings)
    try {
      await helpers.waitForSuccessMessage();
    } catch {
      // Import might fail due to edge cases in complex data
      await helpers.waitForErrorMessage();
    }
    
    // Should show import result
    await expect(page.locator('.import-result')).toBeVisible();
    
    // Check if warnings are displayed
    const warningsSection = page.locator('.result-warnings');
    if (await warningsSection.isVisible()) {
      await expect(warningsSection).toContainText('Warnings:');
    }
    
    // Check if errors are displayed
    const errorsSection = page.locator('.result-errors');
    if (await errorsSection.isVisible()) {
      await expect(errorsSection).toContainText('Errors:');
    }
  });

  test('should handle exact template data successfully', async ({ page }) => {
    // Upload exact template file
    await helpers.uploadFile('exact-template-data.xlsx');
    
    // Ensure V2 template format is selected
    const useV2Checkbox = page.locator('input[type="checkbox"]').filter({ hasText: 'new template format' }).or(
      page.locator('label:has-text("new template format") input[type="checkbox"]')
    );
    await useV2Checkbox.check();
    
    // Ensure clear existing data is checked
    const clearExistingCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: 'Clear existing' }).or(
      page.locator('label:has-text("Clear existing") input[type="checkbox"]')
    );
    await clearExistingCheckbox.check();
    
    // Click upload button
    await helpers.clickButton('Upload and Import');
    
    // Wait for import to complete
    await helpers.waitForSuccessMessage();
    
    // Should show success message
    await expect(page.locator('.import-result.success')).toBeVisible();
    
    // Should show comprehensive import statistics
    await expect(page.locator('.import-stats')).toBeVisible();
    
    // Verify expected data types were imported
    const expectedDataTypes = [
      'locations',
      'projectTypes', 
      'phases',
      'roles',
      'people',
      'projects',
      'standardAllocations',
      'assignments'
    ];
    
    for (const dataType of expectedDataTypes) {
      await expect(page.locator('.import-stats')).toContainText(dataType);
    }
  });

  test('should handle file removal', async ({ page }) => {
    // Upload a file
    await helpers.uploadFile('simple-test-data.xlsx');
    
    // Should show file selected state
    await expect(page.locator('.file-selected')).toBeVisible();
    
    // Click remove button
    const removeButton = page.locator('.btn-icon').filter({ hasText: '×' }).or(
      page.locator('button[title*="remove"], button[title*="Remove"]')
    );
    await removeButton.click();
    
    // Should return to upload area
    await expect(page.locator('.upload-area')).toBeVisible();
    await expect(page.locator('.file-selected')).not.toBeVisible();
  });

  test('should validate file types', async ({ page }) => {
    // Try to upload an invalid file type (this test assumes we have a .txt file)
    // Since we don't have invalid files in fixtures, we'll test the UI validation
    
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveAttribute('accept', '.xlsx,.xls');
    
    // The browser should prevent non-Excel files, but we can't easily test this in Playwright
    // We'll verify the accept attribute is set correctly
  });

  test('should handle import without clearing existing data', async ({ page }) => {
    // Upload simple test file
    await helpers.uploadFile('simple-test-data.xlsx');
    
    // Ensure clear existing data is NOT checked
    const clearExistingCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: 'Clear existing' }).or(
      page.locator('label:has-text("Clear existing") input[type="checkbox"]')
    );
    await clearExistingCheckbox.uncheck();
    
    // Click upload button
    await helpers.clickButton('Upload and Import');
    
    // Wait for import to complete
    await helpers.waitForSuccessMessage();
    
    // Should show success message
    await expect(page.locator('.import-result.success')).toBeVisible();
  });

  test('should handle V1 vs V2 template format toggle', async ({ page }) => {
    // Test V2 format (default)
    const useV2Checkbox = page.locator('input[type="checkbox"]').filter({ hasText: 'new template format' }).or(
      page.locator('label:has-text("new template format") input[type="checkbox"]')
    );
    await expect(useV2Checkbox).toBeChecked();
    
    // Toggle to V1 format
    await useV2Checkbox.uncheck();
    await expect(useV2Checkbox).not.toBeChecked();
    
    // Toggle back to V2
    await useV2Checkbox.check();
    await expect(useV2Checkbox).toBeChecked();
  });

  test('should show loading state during import', async ({ page }) => {
    // Upload file
    await helpers.uploadFile('exact-template-data.xlsx');
    
    // Ensure clear existing data is checked
    const clearExistingCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: 'Clear existing' }).or(
      page.locator('label:has-text("Clear existing") input[type="checkbox"]')
    );
    await clearExistingCheckbox.check();
    
    // Click upload button
    await helpers.clickButton('Upload and Import');
    
    // Should show loading state
    await expect(page.locator('button:has-text("Uploading...")')).toBeVisible();
    
    // Button should be disabled during upload
    const uploadButton = page.locator('button:has-text("Uploading...")');
    await expect(uploadButton).toBeDisabled();
    
    // Wait for completion
    await helpers.waitForSuccessMessage();
    
    // Loading state should be gone
    await expect(page.locator('button:has-text("Uploading...")')).not.toBeVisible();
  });

  test('should verify imported data appears in tables', async ({ page }) => {
    // First import some data
    await helpers.uploadFile('simple-test-data.xlsx');
    
    const clearExistingCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: 'Clear existing' }).or(
      page.locator('label:has-text("Clear existing") input[type="checkbox"]')
    );
    await clearExistingCheckbox.check();
    
    await helpers.clickButton('Upload and Import');
    await helpers.waitForSuccessMessage();
    
    // Navigate to projects and verify data is there
    await helpers.navigateViaSidebar('Projects');
    await helpers.waitForDataTable();
    
    const projectRows = await helpers.getTableRowCount();
    expect(projectRows).toBeGreaterThan(0);
    
    // Navigate to people and verify data is there
    await helpers.navigateViaSidebar('People');
    await helpers.waitForDataTable();
    
    const peopleRows = await helpers.getTableRowCount();
    expect(peopleRows).toBeGreaterThan(0);
    
    // Navigate to roles and verify data is there
    await helpers.navigateViaSidebar('Roles');
    await helpers.waitForDataTable();
    
    const roleRows = await helpers.getTableRowCount();
    expect(roleRows).toBeGreaterThan(0);
  });
});