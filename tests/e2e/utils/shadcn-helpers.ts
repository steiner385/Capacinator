/**
 * Helper utilities for shadcn component testing
 * Maps old modal selectors to new shadcn Dialog selectors
 */

export const SHADCN_SELECTORS = {
  // Dialog (Modal) selectors
  dialog: '[role="dialog"]',
  dialogOverlay: '[data-radix-dialog-overlay]',
  dialogContent: '[role="dialog"] > div',
  dialogTitle: '[role="dialog"] h2',
  dialogDescription: '[role="dialog"] p',
  dialogClose: '[role="dialog"] button[aria-label="Close"]',
  
  // Form selectors
  input: 'input',
  textarea: 'textarea',
  select: '[role="combobox"]',
  selectTrigger: 'button[role="combobox"]',
  selectContent: '[role="listbox"]',
  selectItem: '[role="option"]',
  
  // Button selectors
  button: 'button',
  primaryButton: 'button:not([class*="outline"]):not([class*="ghost"]):not([class*="secondary"])',
  secondaryButton: 'button[class*="outline"], button[class*="secondary"]',
  
  // Table selectors
  table: 'table',
  tableRow: 'tbody tr',
  tableHeader: 'thead th',
  
  // Alert/Error selectors
  alert: '[role="alert"]',
  errorMessage: '[role="alert"][class*="destructive"], .text-destructive',
  
  // Loading selectors
  spinner: 'svg[class*="animate-spin"]',
  loadingState: '[class*="animate-pulse"], svg[class*="animate-spin"]',
};

/**
 * Maps old modal/dialog selectors to new shadcn selectors
 */
export function mapToShadcnSelector(oldSelector: string): string {
  const selectorMap: Record<string, string> = {
    '.modal': SHADCN_SELECTORS.dialog,
    '.modal-content': SHADCN_SELECTORS.dialogContent,
    '.modal-overlay': SHADCN_SELECTORS.dialogOverlay,
    '.modal-header': `${SHADCN_SELECTORS.dialog} > div > div:first-child`,
    '.modal-footer': `${SHADCN_SELECTORS.dialog} > div > div:last-child`,
    '.modal-close': SHADCN_SELECTORS.dialogClose,
    '.dialog': SHADCN_SELECTORS.dialog,
    '.form-container': SHADCN_SELECTORS.dialog,
    '.error': SHADCN_SELECTORS.errorMessage,
    '.invalid': SHADCN_SELECTORS.errorMessage,
    '.field-error': SHADCN_SELECTORS.errorMessage,
    '.loading-spinner': SHADCN_SELECTORS.spinner,
    '.btn-primary': SHADCN_SELECTORS.primaryButton,
    '.btn-secondary': SHADCN_SELECTORS.secondaryButton,
  };

  // Check if we have a direct mapping
  for (const [old, newSelector] of Object.entries(selectorMap)) {
    if (oldSelector.includes(old)) {
      return oldSelector.replace(old, newSelector);
    }
  }

  // If no direct mapping, return a combined selector for backward compatibility
  if (oldSelector.includes('.modal') || oldSelector.includes('.dialog')) {
    return `${oldSelector}, ${SHADCN_SELECTORS.dialog}`;
  }

  return oldSelector;
}

/**
 * Helper to wait for shadcn dialog to be visible
 */
export async function waitForDialog(page: any, timeout = 5000) {
  await page.waitForSelector(SHADCN_SELECTORS.dialog, { 
    state: 'visible', 
    timeout 
  });
  // Wait a bit for animations to complete
  await page.waitForTimeout(300);
}

/**
 * Helper to close shadcn dialog
 */
export async function closeDialog(page: any) {
  // Try multiple methods to close the dialog
  const closeButton = page.locator(SHADCN_SELECTORS.dialogClose);
  if (await closeButton.isVisible()) {
    await closeButton.click();
  } else {
    // Try clicking outside the dialog
    await page.locator(SHADCN_SELECTORS.dialogOverlay).click({ position: { x: 10, y: 10 } });
  }
  
  // Wait for dialog to disappear
  await page.waitForSelector(SHADCN_SELECTORS.dialog, { 
    state: 'hidden', 
    timeout: 5000 
  });
}

/**
 * Helper to interact with shadcn select components
 */
export async function selectOption(page: any, selectSelector: string, optionText: string) {
  // Click the select trigger
  const trigger = page.locator(selectSelector).locator(SHADCN_SELECTORS.selectTrigger);
  await trigger.click();
  
  // Wait for options to appear
  await page.waitForSelector(SHADCN_SELECTORS.selectContent, { state: 'visible' });
  
  // Click the option
  await page.locator(SHADCN_SELECTORS.selectItem).filter({ hasText: optionText }).click();
  
  // Wait for select to close
  await page.waitForSelector(SHADCN_SELECTORS.selectContent, { state: 'hidden' });
}