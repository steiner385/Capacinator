import { Page } from '@playwright/test';

export async function setupTestUser(page: Page) {
  // Navigate to the application
  await page.goto('http://localhost:3121');
  
  // Handle profile selection modal if it appears
  try {
    // Check if profile modal is visible
    const profileModalVisible = await page.locator('text="Select Your Profile"').isVisible();
    
    if (profileModalVisible) {
      console.log('Profile modal detected, selecting user...');
      
      // Click on the dropdown to open it
      await page.locator('select').click();
      
      // Get all options
      const optionValues = await page.locator('select option').evaluateAll(
        options => options.map(option => ({
          value: (option as HTMLOptionElement).value,
          text: (option as HTMLOptionElement).text
        }))
      );
      
      console.log('Available profiles:', optionValues);
      
      // Select the first non-empty option, preferably Alice Johnson for consistency
      const validOption = optionValues.find(opt => opt.text === 'Alice Johnson') || 
                         optionValues.find(opt => opt.value && opt.text !== 'Select your name...');
      if (validOption) {
        await page.locator('select').selectOption(validOption.value);
        console.log('Selected profile:', validOption.text);
      } else {
        throw new Error('No valid profile options found');
      }
      
      // Click Continue button
      await page.locator('button:has-text("Continue")').click();
      
      // Wait for modal to disappear
      await page.waitForSelector('text="Select Your Profile"', { state: 'detached', timeout: 10000 });
      console.log('Profile selection completed');
    }
  } catch (error) {
    console.log('No profile selection needed or error:', error);
  }
  
  // Wait for the main app to load with longer timeout
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  
  // Take screenshot after profile selection
  await page.screenshot({ path: 'after-setup.png' });
  
  // Try multiple selectors for navigation
  const navSelectors = [
    'nav',
    '[role="navigation"]',
    '.navbar',
    'header',
    '.navigation',
    '.header',
    '[data-testid="navigation"]',
    'a[href="/people"]',
    'text=People'
  ];
  
  let navFound = false;
  for (const selector of navSelectors) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      console.log(`Found navigation using selector: ${selector}`);
      navFound = true;
      break;
    }
  }
  
  if (!navFound) {
    // Take screenshot for debugging
    await page.screenshot({ path: 'navigation-not-found.png' });
    const pageContent = await page.content();
    console.error('Page content sample:', pageContent.substring(0, 1000));
    throw new Error('Main navigation not found after setup');
  }
  
  console.log('Test setup completed');
}