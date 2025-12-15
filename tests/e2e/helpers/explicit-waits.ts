import { Page, Locator, expect } from '@playwright/test';

/**
 * Explicit Wait Utilities for E2E Tests
 *
 * This module provides explicit wait functions to replace hardcoded waitForTimeout calls.
 * All waits are based on explicit conditions (element visibility, network state, etc.)
 * rather than arbitrary time delays.
 *
 * Usage:
 *   import { ExplicitWaits } from '../helpers/explicit-waits';
 *   const waits = new ExplicitWaits(page);
 *   await waits.forElementVisible('[data-testid="modal"]');
 */

export class ExplicitWaits {
  constructor(private page: Page) {}

  // ============================================================================
  // ELEMENT STATE WAITS
  // ============================================================================

  /**
   * Wait for an element to be visible
   */
  async forElementVisible(
    selector: string | Locator,
    options: { timeout?: number } = {}
  ): Promise<Locator> {
    const { timeout = 10000 } = options;
    const locator = typeof selector === 'string'
      ? this.page.locator(selector)
      : selector;
    await locator.waitFor({ state: 'visible', timeout });
    return locator;
  }

  /**
   * Wait for an element to be hidden/detached
   */
  async forElementHidden(
    selector: string | Locator,
    options: { timeout?: number } = {}
  ): Promise<void> {
    const { timeout = 10000 } = options;
    const locator = typeof selector === 'string'
      ? this.page.locator(selector)
      : selector;
    await locator.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Wait for an element to be detached from DOM
   */
  async forElementDetached(
    selector: string | Locator,
    options: { timeout?: number } = {}
  ): Promise<void> {
    const { timeout = 10000 } = options;
    const locator = typeof selector === 'string'
      ? this.page.locator(selector)
      : selector;
    await locator.waitFor({ state: 'detached', timeout });
  }

  /**
   * Wait for an element to be attached to DOM
   */
  async forElementAttached(
    selector: string | Locator,
    options: { timeout?: number } = {}
  ): Promise<Locator> {
    const { timeout = 10000 } = options;
    const locator = typeof selector === 'string'
      ? this.page.locator(selector)
      : selector;
    await locator.waitFor({ state: 'attached', timeout });
    return locator;
  }

  /**
   * Wait for element to contain specific text
   */
  async forElementText(
    selector: string | Locator,
    text: string,
    options: { timeout?: number; exact?: boolean } = {}
  ): Promise<void> {
    const { timeout = 10000, exact = false } = options;
    const locator = typeof selector === 'string'
      ? this.page.locator(selector)
      : selector;

    if (exact) {
      await expect(locator).toHaveText(text, { timeout });
    } else {
      await expect(locator).toContainText(text, { timeout });
    }
  }

  /**
   * Wait for element count to match expected value
   */
  async forElementCount(
    selector: string,
    count: number,
    options: { timeout?: number } = {}
  ): Promise<void> {
    const { timeout = 10000 } = options;
    const locator = this.page.locator(selector);
    await expect(locator).toHaveCount(count, { timeout });
  }

  /**
   * Wait for at least N elements to be present
   */
  async forMinElementCount(
    selector: string,
    minCount: number,
    options: { timeout?: number } = {}
  ): Promise<void> {
    const { timeout = 10000 } = options;
    await this.page.waitForFunction(
      ({ sel, min }) => document.querySelectorAll(sel).length >= min,
      { sel: selector, min: minCount },
      { timeout }
    );
  }

  // ============================================================================
  // NETWORK STATE WAITS
  // ============================================================================

  /**
   * Wait for network to be idle (no pending requests for 500ms)
   */
  async forNetworkIdle(options: { timeout?: number } = {}): Promise<void> {
    const { timeout = 10000 } = options;
    try {
      await this.page.waitForLoadState('networkidle', { timeout });
    } catch (error) {
      // Network idle might not be reached in some cases, log but don't fail
      console.log('Network did not reach idle state within timeout, continuing...');
    }
  }

  /**
   * Wait for DOM content to be loaded
   */
  async forDOMContentLoaded(options: { timeout?: number } = {}): Promise<void> {
    const { timeout = 10000 } = options;
    await this.page.waitForLoadState('domcontentloaded', { timeout });
  }

  /**
   * Wait for page to be fully loaded
   */
  async forPageLoad(options: { timeout?: number } = {}): Promise<void> {
    const { timeout = 30000 } = options;
    await this.page.waitForLoadState('load', { timeout });
  }

  /**
   * Wait for a specific API response
   */
  async forApiResponse(
    urlPattern: string | RegExp,
    options: { timeout?: number; status?: number } = {}
  ): Promise<void> {
    const { timeout = 10000, status } = options;
    await this.page.waitForResponse(
      (response) => {
        const matchesUrl = typeof urlPattern === 'string'
          ? response.url().includes(urlPattern)
          : urlPattern.test(response.url());
        const matchesStatus = status === undefined || response.status() === status;
        return matchesUrl && matchesStatus;
      },
      { timeout }
    );
  }

  // ============================================================================
  // MODAL/DIALOG WAITS
  // ============================================================================

  /**
   * Wait for modal/dialog to be visible
   */
  async forModalVisible(options: { timeout?: number; selector?: string } = {}): Promise<Locator> {
    const { timeout = 10000, selector } = options;
    const modalSelectors = selector
      ? [selector]
      : ['[role="dialog"]', '[data-radix-dialog-content]', '.modal'];

    for (const sel of modalSelectors) {
      try {
        const modal = this.page.locator(sel).first();
        await modal.waitFor({ state: 'visible', timeout: timeout / modalSelectors.length });
        return modal;
      } catch {
        // Try next selector
      }
    }

    // If no specific selector worked, wait for any dialog
    const fallbackModal = this.page.locator('[role="dialog"], .modal').first();
    await fallbackModal.waitFor({ state: 'visible', timeout });
    return fallbackModal;
  }

  /**
   * Wait for modal/dialog to be closed
   */
  async forModalClosed(options: { timeout?: number; selector?: string } = {}): Promise<void> {
    const { timeout = 10000, selector } = options;
    const modalSelector = selector || '[role="dialog"], [data-radix-dialog-content], .modal';

    // Check if modal exists first
    const count = await this.page.locator(modalSelector).count();
    if (count === 0) {
      return; // Modal already gone
    }

    await this.page.locator(modalSelector).first().waitFor({ state: 'hidden', timeout });
  }

  // ============================================================================
  // FORM/INPUT WAITS
  // ============================================================================

  /**
   * Wait for input/form field to be enabled and ready
   */
  async forInputEnabled(
    selector: string | Locator,
    options: { timeout?: number } = {}
  ): Promise<Locator> {
    const { timeout = 10000 } = options;
    const locator = typeof selector === 'string'
      ? this.page.locator(selector)
      : selector;
    await locator.waitFor({ state: 'visible', timeout });
    await expect(locator).toBeEnabled({ timeout });
    return locator;
  }

  /**
   * Wait for button to be enabled
   */
  async forButtonEnabled(
    selector: string | Locator,
    options: { timeout?: number } = {}
  ): Promise<Locator> {
    const { timeout = 10000 } = options;
    const locator = typeof selector === 'string'
      ? this.page.locator(selector)
      : selector;
    await locator.waitFor({ state: 'visible', timeout });
    await expect(locator).toBeEnabled({ timeout });
    return locator;
  }

  /**
   * Wait for dropdown/select options to be populated
   */
  async forSelectPopulated(
    triggerSelector: string,
    options: { timeout?: number; minOptions?: number } = {}
  ): Promise<void> {
    const { timeout = 10000, minOptions = 1 } = options;

    // Click to open the select
    const trigger = this.page.locator(triggerSelector);
    await trigger.click();

    // Wait for options to appear
    await this.page.waitForSelector('[role="option"]', { state: 'visible', timeout });

    // Wait for minimum number of options
    if (minOptions > 1) {
      await this.forMinElementCount('[role="option"]', minOptions, { timeout });
    }

    // Close the select
    await this.page.keyboard.press('Escape');
  }

  // ============================================================================
  // TABLE WAITS
  // ============================================================================

  /**
   * Wait for table to have rows
   */
  async forTableRows(
    options: {
      timeout?: number;
      minRows?: number;
      tableSelector?: string;
    } = {}
  ): Promise<void> {
    const { timeout = 10000, minRows = 1, tableSelector = 'table' } = options;
    const rowSelector = `${tableSelector} tbody tr`;

    await this.page.waitForSelector(rowSelector, { state: 'visible', timeout });

    if (minRows > 1) {
      await this.forMinElementCount(rowSelector, minRows, { timeout });
    }
  }

  /**
   * Wait for table to be empty
   */
  async forTableEmpty(
    options: { timeout?: number; tableSelector?: string } = {}
  ): Promise<void> {
    const { timeout = 10000, tableSelector = 'table' } = options;
    const rowSelector = `${tableSelector} tbody tr`;
    await this.forElementCount(rowSelector, 0, { timeout });
  }

  // ============================================================================
  // LOADING STATE WAITS
  // ============================================================================

  /**
   * Wait for loading indicator to disappear
   */
  async forLoadingComplete(options: { timeout?: number; loadingSelector?: string } = {}): Promise<void> {
    const { timeout = 15000 } = options;
    const loadingSelectors = options.loadingSelector
      ? [options.loadingSelector]
      : [
          '.loading',
          '.spinner',
          '[data-loading="true"]',
          '[data-testid="loading"]',
          'svg[class*="animate-spin"]',
          '[class*="animate-pulse"]'
        ];

    for (const selector of loadingSelectors) {
      const count = await this.page.locator(selector).count();
      if (count > 0) {
        try {
          await this.page.locator(selector).first().waitFor({
            state: 'hidden',
            timeout
          });
        } catch {
          // Loading indicator might have disappeared quickly, continue
        }
      }
    }
  }

  /**
   * Wait for content to be ready (loading complete + content visible)
   */
  async forContentReady(
    contentSelector: string,
    options: { timeout?: number } = {}
  ): Promise<Locator> {
    const { timeout = 15000 } = options;

    // Wait for any loading to complete
    await this.forLoadingComplete({ timeout: timeout / 2 });

    // Wait for content to be visible
    return await this.forElementVisible(contentSelector, { timeout: timeout / 2 });
  }

  // ============================================================================
  // ANIMATION WAITS
  // ============================================================================

  /**
   * Wait for CSS animations/transitions to complete on an element
   * Uses requestAnimationFrame and checks for animation state
   */
  async forAnimationComplete(
    selector: string | Locator,
    options: { timeout?: number } = {}
  ): Promise<void> {
    const { timeout = 5000 } = options;
    const locator = typeof selector === 'string'
      ? this.page.locator(selector)
      : selector;

    await locator.evaluate((el) => {
      return new Promise<void>((resolve) => {
        const animations = el.getAnimations();
        if (animations.length === 0) {
          resolve();
          return;
        }
        Promise.all(animations.map(a => a.finished)).then(() => resolve());
      });
    });
  }

  /**
   * Wait for element to be stable (not moving/resizing)
   */
  async forElementStable(
    selector: string | Locator,
    options: { timeout?: number } = {}
  ): Promise<void> {
    const { timeout = 5000 } = options;
    const locator = typeof selector === 'string'
      ? this.page.locator(selector)
      : selector;

    // Get initial bounding box
    let prevBox = await locator.boundingBox();
    let stableCount = 0;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout && stableCount < 3) {
      await new Promise(r => setTimeout(r, 100));
      const currentBox = await locator.boundingBox();

      if (prevBox && currentBox &&
          prevBox.x === currentBox.x &&
          prevBox.y === currentBox.y &&
          prevBox.width === currentBox.width &&
          prevBox.height === currentBox.height) {
        stableCount++;
      } else {
        stableCount = 0;
      }
      prevBox = currentBox;
    }
  }

  // ============================================================================
  // NAVIGATION WAITS
  // ============================================================================

  /**
   * Wait for URL to match pattern
   */
  async forUrl(
    pattern: string | RegExp,
    options: { timeout?: number } = {}
  ): Promise<void> {
    const { timeout = 10000 } = options;

    if (typeof pattern === 'string') {
      await this.page.waitForURL(`**${pattern}*`, { timeout });
    } else {
      await this.page.waitForURL(pattern, { timeout });
    }
  }

  /**
   * Wait for navigation to complete
   */
  async forNavigation(options: { timeout?: number } = {}): Promise<void> {
    const { timeout = 10000 } = options;
    const navSelectors = [
      '.sidebar',
      'nav',
      '[role="navigation"]',
      '.navigation'
    ];

    for (const selector of navSelectors) {
      const count = await this.page.locator(selector).count();
      if (count > 0) {
        await this.forElementVisible(selector, { timeout });
        return;
      }
    }

    // Fallback to network idle if no nav found
    await this.forNetworkIdle({ timeout });
  }

  // ============================================================================
  // REACT-SPECIFIC WAITS
  // ============================================================================

  /**
   * Wait for React hydration to complete
   */
  async forReactHydration(options: { timeout?: number } = {}): Promise<void> {
    const { timeout = 10000 } = options;

    const reactSelectors = [
      '[data-reactroot]',
      '#root > *',
      '.App',
      '.layout'
    ];

    for (const selector of reactSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: timeout / reactSelectors.length });
        return;
      } catch {
        // Try next selector
      }
    }

    // Fallback to DOM content loaded
    await this.forDOMContentLoaded({ timeout });
  }

  /**
   * Wait for React Query data to load
   */
  async forDataFetch(options: { timeout?: number } = {}): Promise<void> {
    const { timeout = 15000 } = options;

    // Wait for loading to complete
    await this.forLoadingComplete({ timeout });

    // Wait for network to settle
    await this.forNetworkIdle({ timeout: timeout / 2 });
  }

  // ============================================================================
  // COMPOSITE WAITS
  // ============================================================================

  /**
   * Wait for page to be fully ready for interaction
   */
  async forPageReady(options: {
    timeout?: number;
    requireNetwork?: boolean;
  } = {}): Promise<void> {
    const { timeout = 15000, requireNetwork = true } = options;

    await this.forDOMContentLoaded({ timeout: timeout / 3 });
    await this.forLoadingComplete({ timeout: timeout / 3 });

    if (requireNetwork) {
      await this.forNetworkIdle({ timeout: timeout / 3 });
    }
  }

  /**
   * Wait for form to be ready for input
   */
  async forFormReady(
    formSelector: string,
    options: { timeout?: number } = {}
  ): Promise<Locator> {
    const { timeout = 10000 } = options;

    // Wait for form to be visible
    const form = await this.forElementVisible(formSelector, { timeout });

    // Wait for any loading in form to complete
    await this.forLoadingComplete({ timeout: timeout / 2 });

    return form;
  }

  /**
   * Wait after action for UI to update
   * This is the replacement for arbitrary waitForTimeout after user actions
   */
  async forActionComplete(options: {
    expectElement?: string;
    expectElementGone?: string;
    expectNetworkIdle?: boolean;
    timeout?: number;
  } = {}): Promise<void> {
    const {
      expectElement,
      expectElementGone,
      expectNetworkIdle = false,
      timeout = 5000
    } = options;

    const promises: Promise<void>[] = [];

    if (expectElement) {
      promises.push(this.forElementVisible(expectElement, { timeout }).then(() => {}));
    }

    if (expectElementGone) {
      promises.push(this.forElementHidden(expectElementGone, { timeout }));
    }

    if (expectNetworkIdle) {
      promises.push(this.forNetworkIdle({ timeout }));
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }
}

/**
 * Create an ExplicitWaits instance for a given page
 */
export function createExplicitWaits(page: Page): ExplicitWaits {
  return new ExplicitWaits(page);
}

/**
 * Convenience functions for common waits (can be used without creating class instance)
 */
export async function waitForElement(
  page: Page,
  selector: string,
  state: 'visible' | 'hidden' | 'detached' | 'attached' = 'visible',
  timeout: number = 10000
): Promise<Locator> {
  const locator = page.locator(selector);
  await locator.waitFor({ state, timeout });
  return locator;
}

export async function waitForNetworkIdle(page: Page, timeout: number = 10000): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch {
    console.log('Network did not reach idle state within timeout');
  }
}

export async function waitForModal(
  page: Page,
  state: 'visible' | 'hidden' = 'visible',
  timeout: number = 10000
): Promise<void> {
  const modalSelector = '[role="dialog"], [data-radix-dialog-content], .modal';
  await page.locator(modalSelector).first().waitFor({
    state: state === 'visible' ? 'visible' : 'hidden',
    timeout
  });
}

export async function waitForLoadingComplete(page: Page, timeout: number = 15000): Promise<void> {
  const waits = new ExplicitWaits(page);
  await waits.forLoadingComplete({ timeout });
}

export async function waitForTableData(
  page: Page,
  tableSelector: string = 'table',
  timeout: number = 10000
): Promise<void> {
  const waits = new ExplicitWaits(page);
  await waits.forTableRows({ tableSelector, timeout });
}
