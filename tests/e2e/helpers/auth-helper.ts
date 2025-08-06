/**
 * Authentication helper for E2E tests
 * Provides consistent login functionality across all tests
 */

import { Page, expect } from '@playwright/test';

export class AuthHelper {
  private page: Page;
  private profileSelected: boolean = false;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Handle the profile selection modal that appears after initial page load
   * This is optimized to handle the shadcn select component
   */
  async handleProfileSelection(timeout: number = 30000): Promise<void> {
    try {
      console.log('🔍 Checking for profile selection modal...');
      
      // Wait for the profile modal to appear
      const profileModal = this.page.locator('[role="dialog"]').filter({ hasText: 'Select Profile' });
      
      try {
        await profileModal.waitFor({ state: 'visible', timeout: 5000 });
        console.log('📋 Profile modal detected, proceeding with selection...');
      } catch {
        // No profile modal, user might already be logged in
        console.log('✅ No profile modal found, continuing...');
        return;
      }

      // Find the select component
      const selectComponent = this.page.locator('#person-select');
      
      if (await selectComponent.isVisible()) {
        console.log('📝 Shadcn Select component found');
        
        // Click to open dropdown
        await selectComponent.click();
        console.log('📂 Opened shadcn Select dropdown');
        
        // Wait for options to appear
        await this.page.waitForSelector('[role="option"]', { state: 'visible', timeout: 5000 });
        
        // Select first option
        await this.page.locator('[role="option"]').first().click();
        console.log('✅ Profile selected using shadcn Select');
        
        // Wait for Continue button to be enabled
        const continueButton = this.page.getByRole('button', { name: 'Continue' });
        await expect(continueButton).toBeEnabled({ timeout: 5000 });
        console.log('✅ Continue button is now enabled');
        
        // Click Continue
        await continueButton.click();
        console.log('✅ Continue button clicked successfully');
        
        // Wait for modal to close
        await profileModal.waitFor({ state: 'hidden', timeout: 10000 });
        console.log('✅ Profile modal successfully closed');
        
        // Wait for navigation to stabilize
        await this.page.waitForLoadState('networkidle', { timeout: 10000 });
        console.log('✅ Network activity settled');
        
        // Wait for dashboard redirect
        await this.page.waitForURL('**/dashboard', { timeout: 10000 });
        console.log('✅ Redirected to dashboard');
        
        this.profileSelected = true;
        console.log('🎉 Profile selection process completed');
      }
    } catch (error) {
      console.error('❌ Error during profile selection:', error);
      throw error;
    }
  }

  /**
   * Quick login for tests that just need to get past authentication
   * Navigates to home and handles profile selection
   */
  async quickLogin(): Promise<void> {
    if (!this.profileSelected) {
      await this.page.goto('/', { waitUntil: 'domcontentloaded' });
      
      // Check if we're already on a logged-in page (no profile modal)
      const currentUrl = this.page.url();
      const isOnProfilePage = currentUrl.includes('profile') || 
                              currentUrl.endsWith('/') ||
                              currentUrl.endsWith('/dashboard');
      
      if (isOnProfilePage && !currentUrl.endsWith('/dashboard')) {
        await this.handleProfileSelection();
      } else {
        // We might already be logged in, just verify
        this.profileSelected = true;
      }
    }
  }

  /**
   * Login and navigate to a specific page
   */
  async loginAndNavigateTo(path: string): Promise<void> {
    await this.quickLogin();
    
    // Navigate to the desired path if not already there
    if (!this.page.url().includes(path)) {
      await this.page.goto(path);
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Check if user is logged in by looking for common authenticated elements
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      // Check for common elements that appear when logged in
      const sidebar = this.page.locator('.sidebar, nav').first();
      await sidebar.waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure user is logged in before proceeding
   */
  async ensureLoggedIn(): Promise<void> {
    if (!await this.isLoggedIn()) {
      await this.quickLogin();
    }
  }

  /**
   * Get the current user's name from the UI (if displayed)
   */
  async getCurrentUser(): Promise<string | null> {
    try {
      // Look for user name in common locations
      const userElement = this.page.locator('[data-testid="current-user"], .user-name, .profile-name').first();
      if (await userElement.isVisible()) {
        return await userElement.textContent();
      }
      return null;
    } catch {
      return null;
    }
  }
}