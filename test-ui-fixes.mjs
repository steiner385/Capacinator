import puppeteer from 'puppeteer';

async function captureUIElements() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    // Navigate to the application
    await page.goto('http://localhost:3121', { waitUntil: 'networkidle2' });

    // Wait for login form
    await page.waitForSelector('[data-testid="profile-select"]', { timeout: 10000 });

    // Select a profile
    await page.click('[data-testid="profile-select"]');
    await page.waitForSelector('.profile-option', { timeout: 5000 });
    const profiles = await page.$$('.profile-option');
    if (profiles.length > 0) {
      await profiles[0].click();
    }

    // Click login
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Wait for the app to load
    await page.waitForSelector('.app-header', { timeout: 10000 });

    // 1. Capture scenario dropdown
    console.log('Opening scenario dropdown...');
    await page.waitForSelector('.scenario-button', { timeout: 5000 });
    await page.click('.scenario-button');
    await page.waitForSelector('.scenario-dropdown', { timeout: 5000 });
    
    // Take screenshot of scenario dropdown
    await page.screenshot({ 
      path: 'scenario-dropdown-current.png',
      fullPage: false,
      clip: {
        x: 0,
        y: 0,
        width: 1920,
        height: 400
      }
    });
    console.log('✓ Scenario dropdown screenshot saved');

    // Close dropdown
    await page.click('.scenario-button');

    // 2. Navigate to a project to access phase management
    await page.goto('http://localhost:3121/projects', { waitUntil: 'networkidle2' });
    await page.waitForSelector('.project-card', { timeout: 10000 });
    
    // Click on first project
    const projectLinks = await page.$$('.project-link');
    if (projectLinks.length > 0) {
      await projectLinks[0].click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
    }

    // Wait for project details page
    await page.waitForSelector('.visual-phase-manager', { timeout: 10000 });

    // Find and click "Add Phase" button
    console.log('Looking for Add Phase button...');
    const addPhaseButton = await page.$('button:has-text("Add Phase")') || 
                          await page.$('.phase-actions button') ||
                          await page.$('button[title*="Add"]');
    
    if (addPhaseButton) {
      await addPhaseButton.click();
      
      // Wait for modal to appear
      await page.waitForSelector('.modal-overlay', { timeout: 5000 });
      
      // Take screenshot of Add Phase modal
      await page.screenshot({ 
        path: 'add-phase-modal-current.png',
        fullPage: true
      });
      console.log('✓ Add Phase modal screenshot saved');
    } else {
      console.log('Could not find Add Phase button');
    }

    // Also check theme switching
    console.log('Testing dark mode...');
    
    // Find theme toggle button
    const themeToggle = await page.$('.theme-toggle');
    if (themeToggle) {
      await themeToggle.click();
      await page.waitForTimeout(1000); // Wait for theme transition
      
      // Open scenario dropdown in dark mode
      await page.click('.scenario-button');
      await page.waitForSelector('.scenario-dropdown', { timeout: 5000 });
      
      await page.screenshot({ 
        path: 'scenario-dropdown-dark-mode.png',
        fullPage: false,
        clip: {
          x: 0,
          y: 0,
          width: 1920,
          height: 400
        }
      });
      console.log('✓ Dark mode scenario dropdown screenshot saved');
    }

  } catch (error) {
    console.error('Error during screenshot capture:', error);
    
    // Take a screenshot of current state for debugging
    await page.screenshot({ path: 'error-state.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

captureUIElements().catch(console.error);