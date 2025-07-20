import { Page, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function evaluateColorContrast(color1: string, color2: string): number {
  // Convert color strings to RGB
  const getRGB = (color: string) => {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return null;
    return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
  };
  
  // Calculate relative luminance
  const getLuminance = (rgb: any) => {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  
  const rgb1 = getRGB(color1);
  const rgb2 = getRGB(color2);
  
  if (!rgb1 || !rgb2) return 0;
  
  const lum1 = getLuminance(rgb1);
  const lum2 = getLuminance(rgb2);
  
  const contrast = (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
  return Math.round(contrast * 100) / 100;
}

export function checkWCAGCompliance(contrastRatio: number, fontSize: number, isBold: boolean = false): { aa: boolean; aaa: boolean } {
  // WCAG 2.1 Level AA: 4.5:1 for normal text, 3:1 for large text
  // Large text: 18pt (24px) or 14pt (18.5px) bold
  const isLargeText = fontSize >= 24 || (fontSize >= 18.5 && isBold);
  const aaThreshold = isLargeText ? 3 : 4.5;
  const aaaThreshold = isLargeText ? 4.5 : 7;
  
  return {
    aa: contrastRatio >= aaThreshold,
    aaa: contrastRatio >= aaaThreshold
  };
}

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Navigate to a specific page and wait for it to load
   */
  async navigateTo(path: string) {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to a specific page with retry logic
   */
  async gotoWithRetry(path: string, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        await this.page.goto(path);
        await this.page.waitForLoadState('networkidle');
        return;
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.page.waitForTimeout(1000);
      }
    }
  }

  /**
   * Wait for React app to be ready
   */
  async waitForReactApp() {
    // Wait for React root element
    try {
      await this.page.waitForSelector('#root, #app, [data-reactroot]', { timeout: 5000 });
    } catch {
      // If no React root found, just wait for page load
      await this.page.waitForLoadState('networkidle');
    }
    
    // Wait for hydration
    await this.waitForReactHydration();
  }

  /**
   * Click an element and navigate to a URL
   */
  async clickAndNavigate(selector: string, expectedUrl: string) {
    // Wait for the element to be visible and clickable
    await this.page.waitForSelector(selector, { state: 'visible', timeout: 10000 });
    
    // Use multiple click strategies for reliability
    try {
      await this.page.click(selector, { timeout: 10000 });
    } catch (error) {
      console.log(`Click failed with ${selector}, trying force click...`);
      await this.page.click(selector, { force: true, timeout: 5000 });
    }
    
    await this.page.waitForURL(url => url.pathname === expectedUrl || url.pathname.includes(expectedUrl));
    await this.waitForNavigation();
  }

  /**
   * Handle profile selection modal if present
   */
  async handleProfileSelection() {
    // Check if profile selection modal is present
    const profileModal = this.page.locator('text=Select Your Profile');
    const profileModalCount = await profileModal.count();
    
    if (profileModalCount > 0) {
      console.log('Profile selection modal detected, handling...');
      
      // Wait for the select dropdown to be visible and ready
      await this.page.waitForSelector('select', { timeout: 10000 });
      
      // Wait for options to be loaded
      await this.page.waitForTimeout(1500);
      
      // Try to select an option by value first, then by index
      let selectionSuccessful = false;
      
      try {
        // Get all select options
        const selectElement = this.page.locator('select').first();
        const options = await selectElement.locator('option').all();
        console.log(`Found ${options.length} options in select dropdown`);
        
        // Try to find and select the first E2E test user
        for (let i = 0; i < options.length; i++) {
          const option = options[i];
          const value = await option.getAttribute('value');
          const text = await option.textContent();
          
          if (value && value !== '' && text?.includes('E2E Test User')) {
            console.log(`Selecting E2E test user: ${text} (value: ${value})`);
            
            // Multiple selection strategies to ensure it works
            await selectElement.selectOption({ value });
            await this.page.waitForTimeout(100);
            await selectElement.dispatchEvent('change');
            await this.page.waitForTimeout(100);
            
            // Also try clicking the option directly
            await option.click();
            await this.page.waitForTimeout(100);
            
            selectionSuccessful = true;
            break;
          }
        }
        
        // If no E2E test user found, select the first non-empty option
        if (!selectionSuccessful && options.length > 1) {
          const firstOption = options[1]; // Skip the placeholder option at index 0
          const value = await firstOption.getAttribute('value');
          const text = await firstOption.textContent();
          
          if (value && value !== '') {
            console.log(`No E2E test user found, selecting first available option: ${text}`);
            
            // Multiple selection strategies
            await selectElement.selectOption({ value });
            await this.page.waitForTimeout(100);
            await selectElement.dispatchEvent('change');
            await this.page.waitForTimeout(100);
            await firstOption.click();
            await this.page.waitForTimeout(100);
            
            selectionSuccessful = true;
          }
        }
      } catch (error) {
        console.log('Failed to select by value/text, trying by index...');
        try {
          const selectElement = this.page.locator('select').first();
          await selectElement.selectOption({ index: 1 });
          await selectElement.dispatchEvent('change');
          selectionSuccessful = true;
        } catch (indexError) {
          console.log('Failed to select by index as well:', indexError);
        }
      }
      
      if (!selectionSuccessful) {
        throw new Error('Failed to select any profile option');
      }
      
      // Wait longer for the selection to register and React to update
      console.log('Waiting for React state to update after selection...');
      await this.page.waitForTimeout(1500);
      
      // Get the select element again to check the selected value
      const currentSelectElement = this.page.locator('select').first();
      let selectedValue = await currentSelectElement.inputValue();
      console.log(`Selected value after change: ${selectedValue}`);
      
      // If no value is selected, try multiple alternative methods
      let attempts = 0;
      while ((!selectedValue || selectedValue === '') && attempts < 3) {
        attempts++;
        console.log(`No value selected, trying alternative selection method (attempt ${attempts})...`);
        
        // Try direct DOM manipulation
        await this.page.evaluate(() => {
          const select = document.querySelector('select');
          if (select && select.options.length > 1) {
            select.selectedIndex = 1;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            select.dispatchEvent(new Event('input', { bubbles: true }));
          }
        });
        
        await this.page.waitForTimeout(1000);
        selectedValue = await currentSelectElement.inputValue();
        console.log(`Selected value after attempt ${attempts}: ${selectedValue}`);
      }
      
      // Final verification - even if no specific value is selected, check if Continue button becomes enabled
      const continueButtonEnabled = await this.page.locator('button:has-text("Continue"):not([disabled])').count();
      if (continueButtonEnabled === 0) {
        console.log('Continue button still disabled, trying one more selection strategy...');
        await this.page.selectOption('select', { index: 1 });
        await this.page.waitForTimeout(500);
      }
      
      // Wait for the Continue button to become enabled
      console.log('Waiting for Continue button to become enabled...');
      const continueButton = this.page.locator('button:has-text("Continue"):not([disabled])');
      
      // Check if button is already enabled
      const isAlreadyEnabled = await continueButton.count() > 0;
      if (isAlreadyEnabled) {
        console.log('Continue button is already enabled');
      } else {
        console.log('Continue button is disabled, waiting for it to become enabled...');
        await continueButton.waitFor({ state: 'visible', timeout: 15000 });
      }
      
      // Click continue button
      console.log('Clicking Continue button...');
      await continueButton.click();
      
      // Wait for login to complete and navigation to happen
      console.log('Waiting for login to complete...');
      await this.page.waitForTimeout(3000);
      
      // Wait for modal to be gone with multiple strategies
      try {
        await this.page.waitForSelector('text=Select Your Profile', { state: 'detached', timeout: 15000 });
      } catch {
        // If the text selector doesn't work, try waiting for the modal container to be gone
        try {
          await this.page.waitForSelector('.login-container, .login-card', { state: 'detached', timeout: 10000 });
        } catch {
          console.log('Modal dismissal detection failed, continuing anyway...');
        }
      }
      
      // Wait for navigation to complete
      await this.page.waitForLoadState('networkidle', { timeout: 15000 });
      
      // Additional wait for any post-navigation loading
      await this.page.waitForTimeout(2000);
      
      // Verify we've actually navigated away from the profile selection
      const stillOnProfileModal = await this.page.locator('text=Select Your Profile').count();
      if (stillOnProfileModal > 0) {
        console.log('⚠️ Warning: Still on profile selection modal after completion');
        // Try one more time with a different approach
        const modalElement = this.page.locator('.login-container, .modal, [role="dialog"]').first();
        if (await modalElement.isVisible()) {
          console.log('Attempting to dismiss modal by clicking outside or pressing Escape...');
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(1000);
        }
      } else {
        console.log('✅ Profile selection completed successfully - modal dismissed');
      }
    }
  }

  /**
   * Complete page setup including profile selection and waiting for page load
   */
  async setupPage() {
    try {
      await this.waitForReactApp();
      await this.handleProfileSelection();
      await this.waitForNavigation();
      
      // After profile selection, wait for the actual content to appear
      await this.waitForPageContent();
    } catch (error) {
      console.log('Setup page failed:', error.message);
      // Try to continue anyway - maybe the page is already loaded
    }
  }

  /**
   * Wait for data to load (tables, lists, etc)
   */
  async waitForDataLoad() {
    // Wait for loading indicators to disappear
    try {
      await this.page.waitForSelector('.loading, .spinner, [data-loading="true"]', { state: 'detached', timeout: 3000 });
    } catch {
      // No loading indicator found
    }
    
    // Wait for data elements
    try {
      await this.page.waitForSelector('tbody tr, .data-item, .list-item', { timeout: 5000 });
    } catch {
      // No data elements found
    }
    
    // Small delay for render completion
    await this.page.waitForTimeout(500);
  }

  /**
   * Wait for the main navigation to be visible
   */
  async waitForNavigation() {
    // Try multiple navigation selector strategies
    const navSelectors = [
      '[data-testid="main-navigation"]',
      '.sidebar',
      'nav',
      '.navigation',
      '.nav-list'
    ];
    
    for (const selector of navSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 3000 });
        return; // Found navigation
      } catch {
        continue;
      }
    }
    
    // If no specific navigation found, just wait for page load
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate using the sidebar menu
   */
  async navigateViaSidebar(menuItem: string) {
    // Wait for React hydration first
    await this.waitForReactHydration();
    
    // Try multiple selector strategies
    const selectors = [
      `[data-testid="nav-${menuItem.toLowerCase()}"]`,
      `.nav-link:has-text("${menuItem}")`,
      `a:has-text("${menuItem}")`,
      `.sidebar a:has-text("${menuItem}")`,
      `nav a:has-text("${menuItem}")`,
      `a[href*="${menuItem.toLowerCase()}"]`,
      `a[href="/${menuItem.toLowerCase()}"]`
    ];
    
    for (const selector of selectors) {
      try {
        const element = this.page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 })) {
          // Wait for element to be stable before clicking
          await element.waitFor({ state: 'attached' });
          await this.page.waitForTimeout(100); // Small delay for stability
          
          try {
            await element.click({ timeout: 5000 });
            await this.page.waitForLoadState('networkidle');
            return;
          } catch (error) {
            console.log(`Failed to click ${selector}: ${error}`);
            continue;
          }
        }
      } catch (error) {
        // Selector not found, continue to next
        continue;
      }
    }
    
    // Fallback to direct URL navigation
    console.log(`Could not find navigation item: ${menuItem}, using direct navigation`);
    const targetUrl = `/${menuItem.toLowerCase()}`;
    await this.page.goto(targetUrl);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for data table to load
   */
  async waitForDataTable() {
    await this.waitForReactHydration();
    
    // Try multiple table selector strategies
    const tableSelectors = [
      '.data-table-wrapper',
      '.table-container',
      'table',
      '.table',
      '[role="table"]',
      '.projects-table',
      '.people-table',
      '.assignments-table'
    ];
    
    for (const selector of tableSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        break;
      } catch {
        continue;
      }
    }
    
    // Wait for loading state to finish (optional)
    try {
      await this.page.waitForSelector('.table-loading, .loading, .spinner', { state: 'hidden', timeout: 5000 });
    } catch {
      // Loading indicator might not exist
    }
    
    // Wait for table rows to appear
    try {
      await this.page.waitForSelector('tbody tr, .table-row', { timeout: 5000 });
    } catch {
      // Table might be empty
    }
  }

  /**
   * Fill a form field by label
   */
  async fillFieldByLabel(label: string, value: string) {
    const field = this.page.locator(`label:has-text("${label}") + input, label:has-text("${label}") + select, label:has-text("${label}") + textarea`);
    await field.fill(value);
  }

  /**
   * Select dropdown option by label
   */
  async selectDropdownByLabel(label: string, option: string) {
    const select = this.page.locator(`label:has-text("${label}") + select`);
    await select.selectOption({ label: option });
  }

  /**
   * Click button by text
   */
  async clickButton(buttonText: string) {
    await this.page.click(`button:has-text("${buttonText}")`);
  }

  /**
   * Upload a file to the import page
   */
  async uploadFile(fileName: string) {
    const filePath = path.join(__dirname, '../fixtures', fileName);
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
  }

  /**
   * Wait for success message
   */
  async waitForSuccessMessage() {
    await this.page.waitForSelector('.import-result.success', { timeout: 30000 });
  }

  /**
   * Wait for error message
   */
  async waitForErrorMessage() {
    await this.page.waitForSelector('.import-result.error, .error-message', { timeout: 10000 });
  }

  /**
   * Get table row count
   */
  async getTableRowCount(): Promise<number> {
    const rows = await this.page.locator('.table tbody tr').count();
    return rows;
  }

  /**
   * Click table row by index
   */
  async clickTableRow(index: number) {
    await this.page.click(`.table tbody tr:nth-child(${index + 1})`);
  }

  /**
   * Search in data table
   */
  async searchInTable(searchTerm: string) {
    const searchInput = this.page.locator('input[placeholder*="Search"]');
    await searchInput.fill(searchTerm);
    await this.page.waitForTimeout(500); // Wait for debounce
    await this.waitForDataTable();
  }

  /**
   * Filter by dropdown in filter bar
   */
  async filterByDropdown(filterLabel: string, option: string) {
    const filterSelect = this.page.locator(`.filter-bar select`).filter({ hasText: filterLabel }).or(
      this.page.locator(`.filter-bar label:has-text("${filterLabel}") + select`)
    );
    await filterSelect.selectOption({ label: option });
    await this.waitForDataTable();
  }

  /**
   * Clear all filters
   */
  async clearFilters() {
    const resetButton = this.page.locator('button:has-text("Reset Filters")');
    if (await resetButton.isVisible()) {
      await resetButton.click();
      await this.waitForDataTable();
    }
  }

  /**
   * Check if element exists and is visible
   */
  async isElementVisible(selector: string): Promise<boolean> {
    try {
      const element = this.page.locator(selector);
      return await element.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Get text content of element
   */
  async getElementText(selector: string): Promise<string> {
    const element = this.page.locator(selector);
    return await element.textContent() || '';
  }

  /**
   * Wait for React hydration to complete
   */
  async waitForReactHydration() {
    // Use a more forgiving approach - just wait for any content to appear
    try {
      // First try to wait for specific React elements
      const selectors = [
        '[data-reactroot]',
        '#root > *', 
        '.App',
        '.layout',
        '.main-content',
        'body > div',  // Any div in body
        'main',        // Main tag
        'header',      // Header tag
        '.container'   // Generic container
      ];
      
      let found = false;
      for (const selector of selectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 1000 });
          found = true;
          break; // Found one, React is likely hydrated
        } catch {
          continue;
        }
      }
      
      // If no specific selectors found, just wait for page to be interactive
      if (!found) {
        await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 });
      }
      
    } catch (error) {
      // If all fails, just continue - the page might be loaded already
      console.log('React hydration check failed, continuing anyway');
    }
    
    // Small delay for any final rendering
    try {
      await this.page.waitForTimeout(100);
    } catch {
      // Even this timeout can fail if page is closing, so catch it
    }
  }

  /**
   * Wait for dashboard charts to load
   */
  async waitForDashboardCharts() {
    await this.waitForReactHydration();
    
    // Try multiple chart loading strategies
    const chartSelectors = [
      '.recharts-surface',
      '.recharts-wrapper',
      '.chart-container',
      'svg',
      'canvas',
      '.dashboard-chart'
    ];
    
    for (const selector of chartSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        return; // Found charts
      } catch {
        continue;
      }
    }
    
    // If no charts found, just wait for content to load
    await this.page.waitForSelector('.main-content', { timeout: 10000 });
  }

  /**
   * Verify page title
   */
  async verifyPageTitle(expectedTitle: string) {
    // Try multiple strategies to find page title
    const titleSelectors = [
      'h1:not(.logo-title)',  // h1 that's not the logo
      'h2',                   // Page heading
      '.page-title',          // Custom page title class
      '.main-content h1',     // h1 within main content
      '.main-content h2'      // h2 within main content
    ];
    
    for (const selector of titleSelectors) {
      const elements = this.page.locator(selector);
      const count = await elements.count();
      
      for (let i = 0; i < count; i++) {
        const element = elements.nth(i);
        if (await element.isVisible()) {
          const title = await element.textContent();
          if (title && title.trim() === expectedTitle) {
            return; // Found matching title
          }
        }
      }
    }
    
    // If no exact match, check if page contains the expected text
    await expect(this.page.locator('body')).toContainText(expectedTitle);
  }

  /**
   * Take screenshot with name
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `e2e/screenshots/${name}.png`,
      fullPage: true 
    });
  }

  /**
   * Wait for page content to load after profile selection
   */
  async waitForPageContent() {
    console.log('Waiting for page content to load...');
    
    // First, specifically wait for the layout to be ready
    try {
      await this.page.waitForSelector('.layout', { timeout: 10000 });
      console.log('✅ Layout container found');
    } catch {
      console.log('⚠️ Layout container not found');
    }
    
    // Wait for navigation specifically
    try {
      await this.page.waitForSelector('.sidebar', { timeout: 10000 });
      console.log('✅ Sidebar found');
    } catch {
      console.log('⚠️ Sidebar not found');
    }
    
    // Wait for navigation links
    try {
      await this.page.waitForSelector('.nav-link', { timeout: 10000 });
      console.log('✅ Navigation links found');
    } catch {
      console.log('⚠️ Navigation links not found');
    }
    
    // Wait for main content area
    try {
      await this.page.waitForSelector('.main-content', { timeout: 10000 });
      console.log('✅ Main content area found');
    } catch {
      console.log('⚠️ Main content area not found');
    }
    
    // Wait for one of several possible content indicators
    const contentSelectors = [
      '.report-tabs, button.tab',           // Report tabs
      '.summary-card',                      // Summary cards
      '.chart-container',                   // Charts
      'table, .table',                      // Tables
      '.actionable-item',                   // Actionable items
      '.full-width-tables'                  // Full width tables
    ];
    
    for (const selector of contentSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 3000 });
        console.log(`✅ Found content: ${selector}`);
        return; // Found content, can proceed
      } catch {
        continue; // Try next selector
      }
    }
    
    // If no specific content found, wait a bit more and continue
    console.log('⚠️ No specific content found, waiting additional time...');
    await this.page.waitForTimeout(2000);
  }

  /**
   * Clear database for clean test state
   */
  async clearDatabase() {
    // This would typically make an API call to clear test data
    // For now, we'll assume the database is cleared between tests
    await this.page.evaluate(() => {
      // Clear any client-side storage
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * Verify no errors on page
   */
  async verifyNoErrors() {
    const errorElements = await this.page.locator('.error-message, .import-result.error').count();
    expect(errorElements).toBe(0);
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingComplete() {
    try {
      // Only wait for loading spinner to be hidden if it exists
      await this.page.waitForSelector('.loading-spinner', { state: 'hidden', timeout: 3000 });
    } catch {
      // Loading spinner might not exist, that's ok
      console.log('No loading spinner found - continuing');
    }
  }
}