import { Page, Locator, expect } from '@playwright/test';

/**
 * Standardized test helpers for E2E tests
 * Provides consistent patterns for common operations
 */

export class StandardTestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for an element with smart retry and timeout
   */
  async waitForElement(
    selector: string,
    options: {
      state?: 'visible' | 'hidden' | 'attached' | 'detached';
      timeout?: number;
      retries?: number;
    } = {}
  ): Promise<Locator> {
    const { state = 'visible', timeout = 30000, retries = 3 } = options;
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      try {
        const element = this.page.locator(selector);
        await element.waitFor({ state, timeout: timeout / retries });
        return element;
      } catch (error) {
        lastError = error as Error;
        if (i < retries - 1) {
          // Wait for DOM to settle before retry using networkidle
          await this.page.waitForLoadState('domcontentloaded', { timeout: 2000 }).catch(() => {});
        }
      }
    }

    throw new Error(`Failed to find element "${selector}" after ${retries} attempts: ${lastError?.message}`);
  }

  /**
   * Wait for network idle with timeout
   */
  async waitForNetworkIdle(timeout: number = 10000): Promise<void> {
    try {
      await this.page.waitForLoadState('networkidle', { timeout });
    } catch (error) {
      console.warn('Network did not reach idle state within timeout, continuing...');
    }
  }

  /**
   * Smart wait that combines multiple strategies
   */
  async waitForPageReady(options: {
    selector?: string;
    networkIdle?: boolean;
    timeout?: number;
  } = {}): Promise<void> {
    const { selector, networkIdle = true, timeout = 30000 } = options;
    
    const promises: Promise<any>[] = [
      this.page.waitForLoadState('domcontentloaded', { timeout })
    ];

    if (networkIdle) {
      promises.push(this.waitForNetworkIdle(timeout));
    }

    if (selector) {
      promises.push(this.waitForElement(selector, { timeout }));
    }

    await Promise.all(promises);
  }

  /**
   * Click with retry logic and wait for navigation if needed
   */
  async clickAndWait(
    selector: string,
    options: {
      waitForNavigation?: boolean;
      waitForSelector?: string;
      timeout?: number;
    } = {}
  ): Promise<void> {
    const { waitForNavigation = false, waitForSelector, timeout = 30000 } = options;
    
    const element = await this.waitForElement(selector);
    
    if (waitForNavigation) {
      await Promise.all([
        this.page.waitForNavigation({ timeout }),
        element.click()
      ]);
    } else {
      await element.click();
    }

    if (waitForSelector) {
      await this.waitForElement(waitForSelector, { timeout });
    }
  }

  /**
   * Handle modal interactions consistently
   */
  async waitForModal(options: {
    timeout?: number;
    selector?: string;
  } = {}): Promise<Locator> {
    const { timeout = 10000, selector = '[role="dialog"], .modal, [data-testid*="modal"]' } = options;
    return this.waitForElement(selector, { timeout });
  }

  async closeModal(options: {
    strategy?: 'button' | 'escape' | 'outside';
    buttonText?: string;
  } = {}): Promise<void> {
    const { strategy = 'button', buttonText = 'Close' } = options;

    switch (strategy) {
      case 'escape':
        await this.page.keyboard.press('Escape');
        break;
      case 'outside':
        await this.page.mouse.click(10, 10); // Click in top-left corner
        break;
      case 'button':
      default:
        const closeSelectors = [
          `button:has-text("${buttonText}")`,
          'button:has-text("Cancel")',
          'button[aria-label="Close"]',
          '[data-testid="modal-close"]'
        ];
        
        for (const selector of closeSelectors) {
          try {
            const button = this.page.locator(`[role="dialog"] ${selector}, .modal ${selector}`);
            if (await button.count() > 0) {
              await button.first().click();
              break;
            }
          } catch {
            // Try next selector
          }
        }
    }

    // Wait for modal to disappear
    await this.page.waitForSelector('[role="dialog"], .modal', { state: 'detached', timeout: 5000 });
  }

  /**
   * Fill form with proper wait and validation
   */
  async fillForm(fields: Record<string, string | number | boolean>): Promise<void> {
    for (const [selector, value] of Object.entries(fields)) {
      const element = await this.waitForElement(selector);
      
      if (typeof value === 'boolean') {
        const isChecked = await element.isChecked();
        if (isChecked !== value) {
          await element.click();
        }
      } else {
        await element.fill(String(value));
      }
    }
  }

  /**
   * Select from dropdown with retry logic
   */
  async selectOption(
    selector: string,
    option: string | { label?: string; value?: string; index?: number }
  ): Promise<void> {
    const element = await this.waitForElement(selector);
    
    if (typeof option === 'string') {
      await element.selectOption({ label: option });
    } else {
      await element.selectOption(option);
    }
  }

  /**
   * Handle table operations
   */
  async waitForTable(selector: string = 'table'): Promise<Locator> {
    const table = await this.waitForElement(selector);
    // Wait for at least one row
    await this.page.waitForSelector(`${selector} tbody tr`, { timeout: 10000 });
    return table;
  }

  async getTableRowCount(tableSelector: string = 'table'): Promise<number> {
    await this.waitForTable(tableSelector);
    return this.page.locator(`${tableSelector} tbody tr`).count();
  }

  async clickTableRow(
    rowIdentifier: string | number,
    options: {
      columnSelector?: string;
      action?: 'click' | 'dblclick' | 'rightclick';
    } = {}
  ): Promise<void> {
    const { columnSelector = 'td:first-child', action = 'click' } = options;
    
    let row: Locator;
    if (typeof rowIdentifier === 'number') {
      row = this.page.locator(`table tbody tr`).nth(rowIdentifier);
    } else {
      row = this.page.locator(`table tbody tr:has-text("${rowIdentifier}")`);
    }

    const cell = row.locator(columnSelector);
    await cell[action]();
  }

  /**
   * Assert with retry for dynamic content
   */
  async assertWithRetry(
    assertion: () => Promise<void>,
    options: {
      retries?: number;
      delay?: number;
      message?: string;
    } = {}
  ): Promise<void> {
    const { retries = 3, delay = 1000, message = 'Assertion failed' } = options;
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      try {
        await assertion();
        return;
      } catch (error) {
        lastError = error as Error;
        if (i < retries - 1) {
          // Wait for state to settle before retry
          await this.page.waitForLoadState('domcontentloaded', { timeout: delay }).catch(() => {});
        }
      }
    }

    throw new Error(`${message}: ${lastError?.message}`);
  }

  /**
   * Handle API errors gracefully
   */
  async interceptAPIErrors(): Promise<{ errors: any[], cleanup: () => void }> {
    const errors: any[] = [];
    
    const responseHandler = (response: any) => {
      if (!response.ok() && response.status() !== 304) {
        errors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    };

    this.page.on('response', responseHandler);

    return {
      errors,
      cleanup: () => this.page.off('response', responseHandler)
    };
  }

  /**
   * Handle console errors
   */
  async interceptConsoleErrors(): Promise<{ errors: string[], cleanup: () => void }> {
    const errors: string[] = [];
    
    const consoleHandler = (msg: any) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    };

    this.page.on('console', consoleHandler);

    return {
      errors,
      cleanup: () => this.page.off('console', consoleHandler)
    };
  }

  /**
   * Take screenshot on failure
   */
  async captureFailureContext(testName: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = `test-results/failures/${testName}-${timestamp}.png`;
    
    try {
      await this.page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      });
      console.log(`Screenshot saved: ${screenshotPath}`);
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
    }
  }

  /**
   * Wait for specific text to appear/disappear
   */
  async waitForText(
    text: string,
    options: {
      state?: 'visible' | 'hidden';
      timeout?: number;
      exact?: boolean;
    } = {}
  ): Promise<void> {
    const { state = 'visible', timeout = 30000, exact = false } = options;
    const selector = exact ? `text="${text}"` : `text=${text}`;
    
    await this.page.waitForSelector(selector, { state, timeout });
  }

  /**
   * Handle dynamic loading states
   */
  async waitForLoadingToComplete(
    loadingSelector: string = '[data-testid="loading"], .loading, .spinner',
    options: {
      timeout?: number;
      allowNotFound?: boolean;
    } = {}
  ): Promise<void> {
    const { timeout = 30000, allowNotFound = true } = options;
    
    try {
      // First wait for loading to appear (if it's going to)
      await this.page.waitForSelector(loadingSelector, { 
        state: 'visible', 
        timeout: allowNotFound ? 1000 : timeout 
      });
      
      // Then wait for it to disappear
      await this.page.waitForSelector(loadingSelector, { 
        state: 'hidden', 
        timeout 
      });
    } catch (error) {
      if (!allowNotFound) {
        throw error;
      }
      // Loading indicator never appeared, which is fine
    }
  }
}