import { Page } from '@playwright/test';

export async function navigateToPage(page: Page, pageName: string) {
  // Click on the navigation link
  await page.locator(`nav a:has-text("${pageName}")`).click();
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
}