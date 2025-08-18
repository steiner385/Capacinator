const { chromium } = require('@playwright/test');

(async () => {
  console.log('🚀 Starting Playwright test...');
  const browser = await chromium.launch({ 
    headless: true,
    ignoreHTTPSErrors: true 
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', error => console.log('Page error:', error.message));

    console.log('📍 Navigating to https://local.capacinator.com/');
    await page.goto('https://local.capacinator.com/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    console.log('⏳ Waiting for content to load...');
    
    // Wait a bit for React to render
    await page.waitForTimeout(2000);

    // Check for login dialog
    const dialogExists = await page.locator('div[role="dialog"]').count() > 0;
    console.log('🔍 Login dialog present:', dialogExists);

    if (dialogExists) {
      // Check dialog content
      const dialogText = await page.locator('div[role="dialog"]').textContent();
      console.log('📝 Dialog content preview:', dialogText.substring(0, 100) + '...');

      // Check for dropdown
      const dropdownExists = await page.locator('button[role="combobox"]').count() > 0;
      console.log('📋 Dropdown present:', dropdownExists);

      if (dropdownExists) {
        // Click dropdown
        await page.locator('button[role="combobox"]').click();
        await page.waitForTimeout(500);

        // Check for options
        const optionCount = await page.locator('div[role="option"]').count();
        console.log('👥 Number of employees:', optionCount);

        if (optionCount > 0) {
          // Get first option text
          const firstOption = await page.locator('div[role="option"]').first().textContent();
          console.log('👤 First employee:', firstOption);
        }
      }
    } else {
      // Check if already logged in
      const headerExists = await page.locator('header').count() > 0;
      console.log('🔐 Header present (logged in):', headerExists);
    }

    // Take a screenshot
    await page.screenshot({ path: 'capacinator-test.png' });
    console.log('📸 Screenshot saved to capacinator-test.png');

    // Check theme
    const isDarkMode = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark') || 
             document.documentElement.getAttribute('data-theme') === 'dark';
    });
    console.log('🌙 Dark mode active:', isDarkMode);

    // Check for any error messages
    const errorElements = await page.locator('.error, [role="alert"], .text-danger').count();
    console.log('⚠️ Error elements found:', errorElements);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
    console.log('✅ Test completed');
  }
})();
