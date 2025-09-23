import { Page, Locator } from '@playwright/test';
import { StandardTestHelpers } from '../helpers/standard-test-helpers';

/**
 * Base Page Object that all page objects should extend
 * Provides common functionality and patterns
 */
export abstract class BasePage {
  protected helpers: StandardTestHelpers;

  constructor(protected page: Page) {
    this.helpers = new StandardTestHelpers(page);
  }

  // Common selectors
  protected selectors = {
    sidebar: '.sidebar, [data-testid="sidebar"]',
    mainContent: 'main, .main-content, [data-testid="main-content"]',
    pageTitle: 'h1, [data-testid="page-title"]',
    loadingIndicator: '[data-testid="loading"], .loading, .spinner',
    errorMessage: '[role="alert"], .error-message, [data-testid="error"]',
    successMessage: '.success-message, [data-testid="success"]',
    modal: '[role="dialog"], .modal, [data-testid*="modal"]',
    table: 'table, [data-testid="data-table"]',
    form: 'form, [data-testid*="form"]'
  };

  /**
   * Navigate to the page
   */
  abstract navigate(): Promise<void>;

  /**
   * Wait for the page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.helpers.waitForPageReady({
      selector: this.selectors.mainContent,
      networkIdle: true
    });
    await this.helpers.waitForLoadingToComplete();
  }

  /**
   * Get page title
   */
  async getPageTitle(): Promise<string> {
    const title = await this.helpers.waitForElement(this.selectors.pageTitle);
    return title.textContent() || '';
  }

  /**
   * Check if page has error
   */
  async hasError(): Promise<boolean> {
    try {
      await this.page.waitForSelector(this.selectors.errorMessage, { 
        state: 'visible', 
        timeout: 1000 
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get error message
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.hasError()) {
      const error = this.page.locator(this.selectors.errorMessage).first();
      return error.textContent();
    }
    return null;
  }

  /**
   * Check if page has success message
   */
  async hasSuccessMessage(): Promise<boolean> {
    try {
      await this.page.waitForSelector(this.selectors.successMessage, { 
        state: 'visible', 
        timeout: 1000 
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Navigate using sidebar
   */
  async navigateViaSidebar(linkText: string): Promise<void> {
    const sidebar = await this.helpers.waitForElement(this.selectors.sidebar);
    const link = sidebar.locator(`a:has-text("${linkText}"), button:has-text("${linkText}")`);
    await this.helpers.clickAndWait(link, { waitForNavigation: true });
  }

  /**
   * Wait for modal to appear
   */
  async waitForModal(): Promise<Locator> {
    return this.helpers.waitForModal();
  }

  /**
   * Close current modal
   */
  async closeModal(strategy?: 'button' | 'escape' | 'outside'): Promise<void> {
    await this.helpers.closeModal({ strategy });
  }

  /**
   * Submit form
   */
  async submitForm(): Promise<void> {
    const submitButton = this.page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Save")');
    await submitButton.click();
    await this.helpers.waitForLoadingToComplete();
  }

  /**
   * Cancel form
   */
  async cancelForm(): Promise<void> {
    const cancelButton = this.page.locator('button:has-text("Cancel"), button[type="button"]:has-text("Close")');
    await cancelButton.click();
  }

  /**
   * Get table data
   */
  async getTableData(): Promise<string[][]> {
    await this.helpers.waitForTable(this.selectors.table);
    const rows = await this.page.locator(`${this.selectors.table} tbody tr`).all();
    const data: string[][] = [];

    for (const row of rows) {
      const cells = await row.locator('td').all();
      const rowData: string[] = [];
      
      for (const cell of cells) {
        const text = await cell.textContent();
        rowData.push(text?.trim() || '');
      }
      
      data.push(rowData);
    }

    return data;
  }

  /**
   * Get table row count
   */
  async getTableRowCount(): Promise<number> {
    return this.helpers.getTableRowCount(this.selectors.table);
  }

  /**
   * Click row in table
   */
  async clickTableRow(identifier: string | number): Promise<void> {
    await this.helpers.clickTableRow(identifier);
  }

  /**
   * Search in page
   */
  async search(query: string): Promise<void> {
    const searchInput = this.page.locator('input[type="search"], input[placeholder*="Search"], [data-testid="search-input"]');
    await searchInput.fill(query);
    await this.page.keyboard.press('Enter');
    await this.helpers.waitForLoadingToComplete();
  }

  /**
   * Clear search
   */
  async clearSearch(): Promise<void> {
    const searchInput = this.page.locator('input[type="search"], input[placeholder*="Search"], [data-testid="search-input"]');
    await searchInput.clear();
    await this.page.keyboard.press('Enter');
    await this.helpers.waitForLoadingToComplete();
  }

  /**
   * Take screenshot of current state
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.helpers.captureFailureContext(name);
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Reload page
   */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForPageLoad();
  }
}