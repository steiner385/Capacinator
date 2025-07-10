import { test, expect } from '@playwright/test';

test.describe('Theme Consistency - Light Mode', () => {
  // Define expected light mode colors
  const lightTheme = {
    primary: 'rgb(79, 70, 229)',        // #4f46e5
    primaryHover: 'rgb(67, 56, 202)',   // #4338ca
    success: 'rgb(5, 150, 105)',        // #059669
    warning: 'rgb(217, 119, 6)',        // #d97706
    danger: 'rgb(220, 38, 38)',         // #dc2626
    bgPrimary: 'rgb(255, 255, 255)',    // #ffffff
    bgSecondary: 'rgb(249, 250, 251)',  // #f9fafb
    bgTertiary: 'rgb(243, 244, 246)',   // #f3f4f6
    textPrimary: 'rgb(17, 24, 39)',     // #111827
    textSecondary: 'rgb(75, 85, 99)',   // #4b5563
    borderColor: 'rgb(229, 231, 235)',   // #e5e7eb
    sidebarBg: 'rgb(31, 41, 55)',       // #1f2937
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have correct background colors on all pages', async ({ page }) => {
    const pagesToCheck = [
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/projects', name: 'Projects' },
      { path: '/people', name: 'People' },
      { path: '/roles', name: 'Roles' },
      { path: '/assignments', name: 'Assignments' },
      { path: '/reports', name: 'Reports' },
      { path: '/settings', name: 'Settings' },
    ];

    for (const pageInfo of pagesToCheck) {
      await page.goto(pageInfo.path);
      await page.waitForTimeout(500);

      // Check main background
      const mainContent = page.locator('.main-content');
      await expect(mainContent).toHaveCSS('background-color', lightTheme.bgPrimary);

      // Check page container background
      const pageContainer = page.locator('.page-container');
      if (await pageContainer.count() > 0) {
        const bgColor = await pageContainer.evaluate(el => 
          window.getComputedStyle(el).backgroundColor
        );
        expect(bgColor).toBe(lightTheme.bgPrimary);
      }
    }
  });

  test('should have correct sidebar styling', async ({ page }) => {
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toHaveCSS('background-color', lightTheme.sidebarBg);

    // Check sidebar text is light colored for contrast
    const sidebarText = page.locator('.nav-link').first();
    const textColor = await sidebarText.evaluate(el => 
      window.getComputedStyle(el).color
    );
    // Should be light text on dark sidebar
    expect(textColor).toMatch(/rgba?\(255,\s*255,\s*255/);
  });

  test('should have correct table styling and hover states', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForSelector('.table');

    // Check table header background
    const tableHeader = page.locator('.table th').first();
    await expect(tableHeader).toHaveCSS('background-color', lightTheme.bgSecondary);

    // Check table row hover state
    const tableRow = page.locator('.table tbody tr').first();
    await tableRow.hover();
    await page.waitForTimeout(300);
    
    const hoverBg = await tableRow.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(hoverBg).toBe(lightTheme.bgTertiary);
  });

  test('should have correct button colors and hover states', async ({ page }) => {
    await page.goto('/projects');

    // Primary button
    const primaryBtn = page.locator('.btn-primary').first();
    await expect(primaryBtn).toHaveCSS('background-color', lightTheme.primary);
    
    await primaryBtn.hover();
    await page.waitForTimeout(300);
    await expect(primaryBtn).toHaveCSS('background-color', lightTheme.primaryHover);

    // Secondary button
    const secondaryBtn = page.locator('.btn-secondary').first();
    if (await secondaryBtn.count() > 0) {
      await expect(secondaryBtn).toHaveCSS('background-color', lightTheme.bgTertiary);
    }
  });

  test('should have correct form input styling', async ({ page }) => {
    await page.goto('/projects/new');
    await page.waitForSelector('.form-input');

    const input = page.locator('.form-input').first();
    await expect(input).toHaveCSS('background-color', lightTheme.bgPrimary);
    await expect(input).toHaveCSS('border-color', lightTheme.borderColor);

    // Check focus state
    await input.focus();
    await expect(input).toHaveCSS('border-color', lightTheme.primary);
  });

  test('should have correct badge colors', async ({ page }) => {
    await page.goto('/people');
    
    // Check various badge types if they exist
    const badgeSelectors = [
      { selector: '.badge-success', property: 'background-color', expected: 'rgb(209, 250, 229)' },
      { selector: '.badge-warning', property: 'background-color', expected: 'rgb(254, 215, 170)' },
      { selector: '.badge-danger', property: 'background-color', expected: 'rgb(254, 226, 226)' },
    ];

    for (const badge of badgeSelectors) {
      const element = page.locator(badge.selector).first();
      if (await element.count() > 0) {
        await expect(element).toHaveCSS(badge.property, badge.expected);
      }
    }
  });

  test('should have correct text colors and contrast', async ({ page }) => {
    await page.goto('/dashboard');

    // Primary text
    const heading = page.locator('h1').first();
    await expect(heading).toHaveCSS('color', lightTheme.textPrimary);

    // Secondary text
    const secondaryText = page.locator('.text-secondary').first();
    if (await secondaryText.count() > 0) {
      await expect(secondaryText).toHaveCSS('color', lightTheme.textSecondary);
    }
  });

  test('should have correct chart colors', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(2000);

    // Check if charts are rendered with correct colors
    const chartBars = page.locator('.recharts-bar-rectangle');
    if (await chartBars.count() > 0) {
      const barColor = await chartBars.first().getAttribute('fill');
      expect(barColor).toMatch(/#4f46e5|#10b981|#f59e0b/); // Should be one of our chart colors
    }
  });

  test('should have consistent card and modal styling', async ({ page }) => {
    await page.goto('/reports');

    // Check summary cards
    const summaryCard = page.locator('.summary-card').first();
    if (await summaryCard.count() > 0) {
      await expect(summaryCard).toHaveCSS('background-color', lightTheme.bgPrimary);
      await expect(summaryCard).toHaveCSS('border-color', lightTheme.borderColor);
    }

    // Check modal if we can trigger one
    await page.goto('/people');
    const deleteBtn = page.locator('.btn-icon.btn-danger').first();
    if (await deleteBtn.count() > 0) {
      await deleteBtn.click();
      await page.waitForSelector('.modal-content');
      
      const modal = page.locator('.modal-content');
      await expect(modal).toHaveCSS('background-color', lightTheme.bgSecondary);
    }
  });

  test('should have no dark mode artifacts', async ({ page }) => {
    // Check that no dark mode colors are present
    const darkColors = [
      'rgb(15, 15, 15)',    // Dark bg-primary
      'rgb(26, 26, 26)',    // Dark bg-secondary
      'rgb(38, 38, 38)',    // Dark bg-tertiary
    ];

    const pagesToCheck = ['/dashboard', '/projects', '/people', '/reports'];
    
    for (const path of pagesToCheck) {
      await page.goto(path);
      await page.waitForTimeout(500);

      // Check various elements don't have dark backgrounds
      const elements = await page.locator('div, section, main, table').all();
      for (const element of elements.slice(0, 10)) { // Check first 10 elements
        const bgColor = await element.evaluate(el => 
          window.getComputedStyle(el).backgroundColor
        );
        
        // Skip transparent backgrounds
        if (bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
          expect(darkColors).not.toContain(bgColor);
        }
      }
    }
  });

  test('should have proper contrast ratios', async ({ page }) => {
    await page.goto('/projects');

    // Check text on background contrast
    const textElement = page.locator('.page-header h1').first();
    const containerElement = page.locator('.page-container').first();

    const textColor = await textElement.evaluate(el => 
      window.getComputedStyle(el).color
    );
    const bgColor = await containerElement.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );

    // Primary text should be dark on light background
    expect(textColor).toBe(lightTheme.textPrimary);
    expect(bgColor).toBe(lightTheme.bgPrimary);
  });
});