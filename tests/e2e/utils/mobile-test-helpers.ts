/**
 * Mobile Test Helpers
 * Utilities for handling mobile viewport differences in tests
 */

import { Page } from '@playwright/test';

export class MobileTestHelpers {
  constructor(private page: Page) {}

  /**
   * Check if current test is running in mobile viewport
   */
  async isMobile(): Promise<boolean> {
    const viewport = this.page.viewportSize();
    return viewport ? viewport.width < 768 : false;
  }

  /**
   * Navigate to a page handling mobile layout differences
   */
  async navigateTo(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: 'networkidle' });
    
    // In mobile, the sidebar might be hidden or behave differently
    // Wait for either sidebar or main content to be visible
    await Promise.race([
      this.page.waitForSelector('.sidebar', { timeout: 5000 }).catch(() => null),
      this.page.waitForSelector('.main-content', { timeout: 5000 }).catch(() => null),
      this.page.waitForSelector('[data-testid="navigation"]', { timeout: 5000 }).catch(() => null)
    ]);
  }

  /**
   * Click navigation item handling mobile differences
   * In mobile, might need to open hamburger menu first
   */
  async clickNavItem(itemText: string): Promise<void> {
    const isMobile = await this.isMobile();
    
    if (isMobile) {
      // Check if hamburger menu exists and is visible
      const hamburger = await this.page.$('[data-testid="mobile-menu-toggle"], .menu-toggle, .hamburger');
      if (hamburger && await hamburger.isVisible()) {
        await hamburger.click();
        // Wait for menu animation by checking for menu visibility
        await this.page.waitForSelector('nav, .sidebar, [role="navigation"]', { state: 'visible', timeout: 3000 }).catch(() => {});
      }
    }
    
    // Try multiple selectors for navigation items
    const selectors = [
      `nav a:has-text("${itemText}")`,
      `.sidebar a:has-text("${itemText}")`,
      `.nav-link:has-text("${itemText}")`,
      `[role="navigation"] a:has-text("${itemText}")`,
      `a[href*="${itemText.toLowerCase()}"]`
    ];
    
    let clicked = false;
    for (const selector of selectors) {
      try {
        const element = await this.page.waitForSelector(selector, { timeout: 2000 });
        if (element && await element.isVisible()) {
          await element.click();
          clicked = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!clicked) {
      throw new Error(`Could not find navigation item: ${itemText}`);
    }
    
    // Wait for navigation to complete
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Handle form inputs on mobile
   * Mobile keyboards can cause layout shifts
   */
  async fillInput(selector: string, value: string): Promise<void> {
    const input = await this.page.waitForSelector(selector);
    
    if (await this.isMobile()) {
      // Scroll element into view on mobile
      await input.scrollIntoViewIfNeeded();
    }
    
    await input.click();
    await input.fill(value);
    
    if (await this.isMobile()) {
      // Dismiss keyboard by clicking outside
      await this.page.click('body', { position: { x: 10, y: 10 } });
    }
  }

  /**
   * Wait for and click button, handling mobile layout
   */
  async clickButton(buttonText: string): Promise<void> {
    const selectors = [
      `button:has-text("${buttonText}")`,
      `[role="button"]:has-text("${buttonText}")`,
      `input[type="submit"][value="${buttonText}"]`,
      `a.button:has-text("${buttonText}")`
    ];
    
    let clicked = false;
    for (const selector of selectors) {
      try {
        const button = await this.page.waitForSelector(selector, { timeout: 2000 });
        if (button && await button.isVisible()) {
          if (await this.isMobile()) {
            await button.scrollIntoViewIfNeeded();
          }
          await button.click();
          clicked = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!clicked) {
      throw new Error(`Could not find button: ${buttonText}`);
    }
  }

  /**
   * Handle table interactions on mobile
   * Tables might be scrollable or have different layout
   */
  async interactWithTable(rowText: string, actionText?: string): Promise<void> {
    const row = await this.page.locator(`tr:has-text("${rowText}")`).first();
    
    if (await this.isMobile()) {
      // Scroll row into view
      await row.scrollIntoViewIfNeeded();

      // Mobile tables might have horizontal scroll
      const table = await this.page.locator('table, [role="table"]').first();
      await table.evaluate(el => {
        // Scroll to show action buttons if needed
        el.scrollLeft = el.scrollWidth;
      });
    }
    
    if (actionText) {
      await row.locator(`button:has-text("${actionText}")`).click();
    } else {
      await row.click();
    }
  }

  /**
   * Wait for page to be ready on mobile
   */
  async waitForPageReady(): Promise<void> {
    // Wait for common indicators that page is ready
    await Promise.race([
      this.page.waitForSelector('.main-content', { state: 'visible' }),
      this.page.waitForSelector('[data-testid="page-content"]', { state: 'visible' }),
      this.page.waitForSelector('main', { state: 'visible' })
    ]);
    
    // Extra wait on mobile for layout shifts
    if (await this.isMobile()) {
      await this.page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => {});
    }
  }
}

/**
 * Create mobile test helper for a page
 */
export function createMobileHelper(page: Page): MobileTestHelpers {
  return new MobileTestHelpers(page);
}