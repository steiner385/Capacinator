import { test, expect } from '@playwright/test';

test.describe('Debug Modal', () => {
  test('check for modals', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check for any modal overlays
    const modalOverlay = await page.locator('.modal-overlay, [data-state="open"], .dialog-overlay').isVisible().catch(() => false);
    console.log('Modal overlay visible:', modalOverlay);
    
    // Check for profile selection modal
    const profileModal = await page.locator('.profile-selection-modal, [data-testid="profile-selection"]').isVisible().catch(() => false);
    console.log('Profile modal visible:', profileModal);
    
    // Check for any dialog
    const dialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);
    console.log('Dialog visible:', dialog);
    
    // Get text content of any visible modal
    if (modalOverlay || dialog) {
      const modalText = await page.locator('[role="dialog"], .modal-content').first().innerText().catch(() => 'No text found');
      console.log('Modal text:', modalText);
    }
    
    // Try to close any modals
    const closeButton = await page.locator('[aria-label="Close"], .modal-close, button:has-text("Close"), button:has-text("Cancel")').first();
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
      console.log('Clicked close button');
      await page.waitForTimeout(1000);
    }
    
    // Now try to navigate
    await page.click('a[href="/scenarios"]');
    await page.waitForLoadState('networkidle');
    
    // Check if we made it
    const onScenariosPage = await page.url().includes('/scenarios');
    console.log('On scenarios page:', onScenariosPage);
  });
});