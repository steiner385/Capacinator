import { Page, Locator } from '@playwright/test';

/**
 * Helper functions for interacting with Radix UI components (shadcn/ui)
 * These components have different DOM structures than standard HTML elements
 */

export class RadixUIHelpers {
  constructor(private page: Page) {}

  /**
   * Select an option from a Radix UI Select component
   *
   * @param triggerSelector - Selector for the Select trigger button (can use label, test-id, etc.)
   * @param optionText - The text of the option to select
   * @param options - Additional options
   *
   * Example usage:
   *   await radixHelpers.selectOption('Project *', 'Project Alpha');
   *   await radixHelpers.selectOption('[id="project_id"]', 'Project Alpha');
   */
  async selectOption(
    triggerSelector: string,
    optionText: string,
    options: {
      timeout?: number;
      exact?: boolean;
    } = {}
  ): Promise<void> {
    const { timeout = 10000, exact = false } = options;

    // Find the Select trigger button
    // Try multiple strategies to find the trigger
    let trigger: Locator;

    // Strategy 1: Direct ID selector
    if (triggerSelector.startsWith('#') || triggerSelector.startsWith('[')) {
      trigger = this.page.locator(triggerSelector);
    }
    // Strategy 2: Find by label text (common pattern: "Project *", "Person *", etc.)
    else {
      // Look for a Select trigger button near a label with this text
      const labelLocator = this.page.locator(`label:has-text("${triggerSelector}")`);
      const labelId = await labelLocator.getAttribute('for').catch(() => null);

      if (labelId) {
        trigger = this.page.locator(`#${labelId}`);
      } else {
        // Fallback: find SelectTrigger button near the label
        trigger = labelLocator.locator('..').locator('[role="combobox"]').first();
      }
    }

    // Wait for trigger to be visible and clickable
    await trigger.waitFor({ state: 'visible', timeout });

    // Click the trigger to open the dropdown
    await trigger.click();

    // Wait for the dropdown content to appear
    await this.page.waitForSelector('[role="listbox"], [role="option"]', {
      state: 'visible',
      timeout: 5000
    });

    // Find and click the option
    const optionSelector = exact
      ? `[role="option"]:has-text("${optionText}")`
      : `[role="option"]:text-is("${optionText}")`;

    const option = this.page.locator(optionSelector).first();
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();

    // Wait for the dropdown to close (selection registered)
    await this.page.waitForSelector('[role="listbox"]', { state: 'hidden', timeout: 3000 }).catch(() => {});
  }

  /**
   * Get all available options from a Radix UI Select component
   *
   * @param triggerSelector - Selector for the Select trigger button
   * @returns Array of option texts
   */
  async getSelectOptions(triggerSelector: string): Promise<string[]> {
    // Find and click the trigger to open dropdown
    let trigger: Locator;

    if (triggerSelector.startsWith('#') || triggerSelector.startsWith('[')) {
      trigger = this.page.locator(triggerSelector);
    } else {
      const labelLocator = this.page.locator(`label:has-text("${triggerSelector}")`);
      const labelId = await labelLocator.getAttribute('for').catch(() => null);

      if (labelId) {
        trigger = this.page.locator(`#${labelId}`);
      } else {
        trigger = labelLocator.locator('..').locator('[role="combobox"]').first();
      }
    }

    await trigger.click();
    await this.page.waitForSelector('[role="listbox"], [role="option"]', {
      state: 'visible',
      timeout: 5000
    });

    // Get all option texts
    const options = await this.page.locator('[role="option"]').allTextContents();

    // Close the dropdown by clicking the trigger again or pressing Escape
    await this.page.keyboard.press('Escape');
    // Wait for dropdown to close
    await this.page.waitForSelector('[role="listbox"]', { state: 'hidden', timeout: 3000 }).catch(() => {});

    return options;
  }

  /**
   * Get the currently selected value from a Radix UI Select
   *
   * @param triggerSelector - Selector for the Select trigger button
   * @returns The currently selected option text
   */
  async getSelectedOption(triggerSelector: string): Promise<string> {
    let trigger: Locator;

    if (triggerSelector.startsWith('#') || triggerSelector.startsWith('[')) {
      trigger = this.page.locator(triggerSelector);
    } else {
      const labelLocator = this.page.locator(`label:has-text("${triggerSelector}")`);
      const labelId = await labelLocator.getAttribute('for').catch(() => null);

      if (labelId) {
        trigger = this.page.locator(`#${labelId}`);
      } else {
        trigger = labelLocator.locator('..').locator('[role="combobox"]').first();
      }
    }

    // The selected value is usually shown in the trigger button's text
    const selectedText = await trigger.textContent();
    return selectedText?.trim() || '';
  }

  /**
   * Open a Radix UI Dialog/Modal
   *
   * @param triggerSelector - Selector for the button that opens the dialog
   */
  async openDialog(triggerSelector: string): Promise<void> {
    const trigger = this.page.locator(triggerSelector);
    await trigger.click();

    // Wait for dialog to open
    await this.page.waitForSelector('[role="dialog"]', {
      state: 'visible',
      timeout: 5000
    });
  }

  /**
   * Close a Radix UI Dialog/Modal
   *
   * @param strategy - How to close the dialog
   */
  async closeDialog(strategy: 'escape' | 'cancel' | 'close-button' = 'escape'): Promise<void> {
    if (strategy === 'escape') {
      await this.page.keyboard.press('Escape');
    } else if (strategy === 'cancel') {
      const cancelButton = this.page.locator('[role="dialog"] button:has-text("Cancel")');
      await cancelButton.click();
    } else if (strategy === 'close-button') {
      // Look for common close button patterns
      const closeButton = this.page.locator('[role="dialog"] button[aria-label="Close"], [role="dialog"] [data-testid="dialog-close"]');
      await closeButton.first().click();
    }

    // Wait for dialog to close
    await this.page.waitForSelector('[role="dialog"]', {
      state: 'detached',
      timeout: 5000
    });
  }

  /**
   * Fill a field within a Radix UI Dialog
   *
   * @param labelText - The label text of the field
   * @param value - The value to fill
   */
  async fillDialogField(labelText: string, value: string): Promise<void> {
    // Find the input associated with this label within the dialog
    const dialog = this.page.locator('[role="dialog"]');
    const label = dialog.locator(`label:has-text("${labelText}")`);
    const labelFor = await label.getAttribute('for').catch(() => null);

    let input: Locator;
    if (labelFor) {
      input = dialog.locator(`#${labelFor}`);
    } else {
      // Fallback: find input near the label
      input = label.locator('..').locator('input, textarea').first();
    }

    await input.fill(value);
  }

  /**
   * Click a checkbox within a Radix UI component
   *
   * @param labelText - The label text of the checkbox
   * @param checked - Whether to check or uncheck
   */
  async setCheckbox(labelText: string, checked: boolean): Promise<void> {
    const checkbox = this.page.locator(`label:has-text("${labelText}")`).locator('..').locator('[type="checkbox"], [role="checkbox"]').first();

    const isCurrentlyChecked = await checkbox.isChecked().catch(() => false);

    if (isCurrentlyChecked !== checked) {
      await checkbox.click();
    }
  }

  /**
   * Select an option from a Radix UI Select by index
   *
   * @param triggerSelector - Selector for the Select trigger button
   * @param index - The index of the option to select (0-based)
   */
  async selectOptionByIndex(triggerSelector: string, index: number): Promise<void> {
    let trigger: Locator;

    if (triggerSelector.startsWith('#') || triggerSelector.startsWith('[')) {
      trigger = this.page.locator(triggerSelector);
    } else {
      const labelLocator = this.page.locator(`label:has-text("${triggerSelector}")`);
      const labelId = await labelLocator.getAttribute('for').catch(() => null);

      if (labelId) {
        trigger = this.page.locator(`#${labelId}`);
      } else {
        trigger = labelLocator.locator('..').locator('[role="combobox"]').first();
      }
    }

    await trigger.click();
    await this.page.waitForSelector('[role="listbox"], [role="option"]', {
      state: 'visible',
      timeout: 5000
    });

    const option = this.page.locator('[role="option"]').nth(index);
    await option.click();
    // Wait for dropdown to close
    await this.page.waitForSelector('[role="listbox"]', { state: 'hidden', timeout: 3000 }).catch(() => {});
  }

  /**
   * Wait for a Radix UI Select to be populated with options
   *
   * @param triggerSelector - Selector for the Select trigger button
   * @param minOptions - Minimum number of options expected
   */
  async waitForSelectOptions(
    triggerSelector: string,
    minOptions: number = 1
  ): Promise<void> {
    let trigger: Locator;

    if (triggerSelector.startsWith('#') || triggerSelector.startsWith('[')) {
      trigger = this.page.locator(triggerSelector);
    } else {
      const labelLocator = this.page.locator(`label:has-text("${triggerSelector}")`);
      const labelId = await labelLocator.getAttribute('for').catch(() => null);

      if (labelId) {
        trigger = this.page.locator(`#${labelId}`);
      } else {
        trigger = labelLocator.locator('..').locator('[role="combobox"]').first();
      }
    }

    // Open the select
    await trigger.click();
    await this.page.waitForSelector('[role="option"]', {
      state: 'visible',
      timeout: 5000
    });

    // Wait for minimum number of options
    await this.page.waitForFunction(
      (min) => document.querySelectorAll('[role="option"]').length >= min,
      minOptions,
      { timeout: 5000 }
    );

    // Close the select
    await this.page.keyboard.press('Escape');
    // Wait for dropdown to close
    await this.page.waitForSelector('[role="listbox"]', { state: 'hidden', timeout: 3000 }).catch(() => {});
  }
}

/**
 * Create a RadixUIHelpers instance for a given page
 */
export function createRadixUIHelpers(page: Page): RadixUIHelpers {
  return new RadixUIHelpers(page);
}
