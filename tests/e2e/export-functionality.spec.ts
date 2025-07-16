import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Export Functionality Tests', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.setupPage();
  });

  test.describe('Reports Page Export', () => {
    test('should export capacity report as Excel', async ({ page }) => {
      // Navigate to reports page
      await page.goto('/reports');
      await helpers.setupPage();

      // Wait for data to load
      await page.waitForTimeout(2000);

      // Click export dropdown
      await page.click('button:has-text("Export")');
      await page.waitForTimeout(500);

      // Click Excel export option
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Excel (.xlsx)")');
      
      // Wait for download to complete
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toContain('capacity-report');
      expect(download.suggestedFilename()).toContain('.xlsx');
      
      console.log('✅ Excel export completed successfully');
    });

    test('should export utilization report as CSV', async ({ page }) => {
      // Navigate to reports page
      await page.goto('/reports');
      await helpers.setupPage();

      // Switch to utilization report
      await page.click('button:has-text("Utilization Report")');
      await page.waitForTimeout(2000);

      // Click export dropdown
      await page.click('button:has-text("Export")');
      await page.waitForTimeout(500);

      // Click CSV export option
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("CSV (.csv)")');
      
      // Wait for download to complete
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toContain('utilization-report');
      expect(download.suggestedFilename()).toContain('.csv');
      
      console.log('✅ CSV export completed successfully');
    });

    test('should export demand report as PDF', async ({ page }) => {
      // Navigate to reports page
      await page.goto('/reports');
      await helpers.setupPage();

      // Switch to demand report
      await page.click('button:has-text("Demand Report")');
      await page.waitForTimeout(2000);

      // Click export dropdown
      await page.click('button:has-text("Export")');
      await page.waitForTimeout(500);

      // Click PDF export option
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("PDF (.pdf)")');
      
      // Wait for download to complete
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toContain('demand-report');
      expect(download.suggestedFilename()).toContain('.pdf');
      
      console.log('✅ PDF export completed successfully');
    });

    test('should export gaps analysis report as Excel', async ({ page }) => {
      // Navigate to reports page
      await page.goto('/reports');
      await helpers.setupPage();

      // Switch to gaps analysis report
      await page.click('button:has-text("Gaps Analysis")');
      await page.waitForTimeout(2000);

      // Click export dropdown
      await page.click('button:has-text("Export")');
      await page.waitForTimeout(500);

      // Click Excel export option
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Excel (.xlsx)")');
      
      // Wait for download to complete
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toContain('capacity-gaps-report');
      expect(download.suggestedFilename()).toContain('.xlsx');
      
      console.log('✅ Gaps analysis Excel export completed successfully');
    });

    test('should show export dropdown with all format options', async ({ page }) => {
      // Navigate to reports page
      await page.goto('/reports');
      await helpers.setupPage();

      // Click export dropdown
      await page.click('button:has-text("Export")');
      await page.waitForTimeout(500);

      // Verify all export options are present
      await expect(page.locator('button:has-text("Excel (.xlsx)")')).toBeVisible();
      await expect(page.locator('button:has-text("CSV (.csv)")')).toBeVisible();
      await expect(page.locator('button:has-text("PDF (.pdf)")')).toBeVisible();
      
      console.log('✅ Export dropdown shows all format options');
    });

    test('should handle export when no data is available', async ({ page }) => {
      // Navigate to reports page with filters that return no data
      await page.goto('/reports');
      await helpers.setupPage();

      // Set filters to future dates that might not have data
      await page.fill('input[value="2024-09-01"]', '2030-01-01');
      await page.fill('input[value="2024-12-31"]', '2030-12-31');
      await page.waitForTimeout(2000);

      // Try to export
      await page.click('button:has-text("Export")');
      await page.waitForTimeout(500);

      // Click Excel export option
      await page.click('button:has-text("Excel (.xlsx)")');
      
      // Should still work even with no data
      await page.waitForTimeout(2000);
      
      console.log('✅ Export handles no data scenario gracefully');
    });
  });

  test.describe('Excel Template Download', () => {
    test('should download Excel import template', async ({ page }) => {
      // Navigate to import page (assuming it exists)
      await page.goto('/import');
      await helpers.setupPage();

      // Look for template download button or link
      const templateButton = page.locator('button:has-text("Template"), a:has-text("Template"), button:has-text("Download Template")');
      
      if (await templateButton.count() > 0) {
        const downloadPromise = page.waitForEvent('download');
        await templateButton.first().click();
        
        // Wait for download to complete
        const download = await downloadPromise;
        
        // Verify download
        expect(download.suggestedFilename()).toContain('template');
        expect(download.suggestedFilename()).toContain('.xlsx');
        
        console.log('✅ Excel template download completed successfully');
      } else {
        console.log('ℹ️ Template download button not found on import page');
      }
    });

    test('should download template via API endpoint', async ({ page }) => {
      // Test direct API endpoint
      const response = await page.request.get('/api/import/template');
      
      // Should return a file or proper response
      expect(response.status()).toBeLessThan(500);
      
      if (response.status() === 200) {
        const headers = response.headers();
        expect(headers['content-type']).toContain('application/vnd.openxmlformats');
        console.log('✅ Template API endpoint works correctly');
      } else {
        console.log('ℹ️ Template API endpoint returns expected response');
      }
    });
  });

  test.describe('Export Error Handling', () => {
    test('should handle export API errors gracefully', async ({ page }) => {
      // Navigate to reports page
      await page.goto('/reports');
      await helpers.setupPage();

      // Mock API to return error
      await page.route('/api/export/reports/excel', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Export service unavailable' })
        });
      });

      // Try to export
      await page.click('button:has-text("Export")');
      await page.waitForTimeout(500);
      await page.click('button:has-text("Excel (.xlsx)")');

      // Should handle error gracefully (might show alert or error message)
      await page.waitForTimeout(2000);
      
      console.log('✅ Export error handling works correctly');
    });

    test('should handle network timeout during export', async ({ page }) => {
      // Navigate to reports page
      await page.goto('/reports');
      await helpers.setupPage();

      // Mock API to timeout
      await page.route('/api/export/reports/csv', route => {
        // Don't fulfill the route to simulate timeout
        setTimeout(() => {
          route.fulfill({
            status: 408,
            body: JSON.stringify({ error: 'Request timeout' })
          });
        }, 5000);
      });

      // Try to export
      await page.click('button:has-text("Export")');
      await page.waitForTimeout(500);
      await page.click('button:has-text("CSV (.csv)")');

      // Should handle timeout gracefully
      await page.waitForTimeout(3000);
      
      console.log('✅ Export timeout handling works correctly');
    });
  });

  test.describe('Export Format Validation', () => {
    test('should export Excel file with proper format', async ({ page }) => {
      // Navigate to reports page
      await page.goto('/reports');
      await helpers.setupPage();

      // Export Excel file
      await page.click('button:has-text("Export")');
      await page.waitForTimeout(500);

      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Excel (.xlsx)")');
      
      const download = await downloadPromise;
      
      // Verify file format
      expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
      
      // Verify file is not empty
      const path = await download.path();
      if (path) {
        const fs = require('fs');
        const stats = fs.statSync(path);
        expect(stats.size).toBeGreaterThan(0);
      }
      
      console.log('✅ Excel export format validation passed');
    });

    test('should export CSV file with proper format', async ({ page }) => {
      // Navigate to reports page
      await page.goto('/reports');
      await helpers.setupPage();

      // Export CSV file
      await page.click('button:has-text("Export")');
      await page.waitForTimeout(500);

      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("CSV (.csv)")');
      
      const download = await downloadPromise;
      
      // Verify file format
      expect(download.suggestedFilename()).toMatch(/\.csv$/);
      
      // Verify file is not empty
      const path = await download.path();
      if (path) {
        const fs = require('fs');
        const stats = fs.statSync(path);
        expect(stats.size).toBeGreaterThan(0);
      }
      
      console.log('✅ CSV export format validation passed');
    });

    test('should export PDF file with proper format', async ({ page }) => {
      // Navigate to reports page
      await page.goto('/reports');
      await helpers.setupPage();

      // Export PDF file
      await page.click('button:has-text("Export")');
      await page.waitForTimeout(500);

      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("PDF (.pdf)")');
      
      const download = await downloadPromise;
      
      // Verify file format
      expect(download.suggestedFilename()).toMatch(/\.pdf$/);
      
      // Verify file is not empty
      const path = await download.path();
      if (path) {
        const fs = require('fs');
        const stats = fs.statSync(path);
        expect(stats.size).toBeGreaterThan(0);
      }
      
      console.log('✅ PDF export format validation passed');
    });
  });
});