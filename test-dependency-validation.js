const puppeteer = require('puppeteer');

async function testDependencyValidation() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--window-size=1920,1080']
  });

  const page = await browser.newPage();
  
  console.log('🔍 Testing dependency validation...');
  
  try {
    // Navigate to login page
    await page.goto('http://localhost:3122/login');
    await page.waitForSelector('form', { timeout: 30000 });
    
    // Login
    await page.type('input[type="email"]', 'admin@test.com');
    await page.type('input[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    
    console.log('✅ Logged in successfully');
    
    // Wait for navigation to complete
    await page.waitForSelector('.nav-header', { timeout: 10000 });
    
    // Navigate to projects page
    await page.goto('http://localhost:3122/projects');
    await page.waitForSelector('.data-table', { timeout: 10000 });
    
    // Click on a project with phases
    console.log('📋 Looking for a project with phases...');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const projectLink = links.find(link => link.textContent?.includes('Phase'));
      if (projectLink) {
        projectLink.click();
      }
    });
    
    // Wait for project detail page
    await page.waitForSelector('.phase-timeline', { timeout: 10000 });
    console.log('✅ On project detail page');
    
    // Wait a bit for phases to load
    await page.waitForTimeout(2000);
    
    // Check for validation errors in the timeline
    const validationErrors = await page.evaluate(() => {
      const errorIndicators = document.querySelectorAll('.validation-error');
      return errorIndicators.length;
    });
    
    console.log(`🔍 Found ${validationErrors} validation error indicators`);
    
    // Check if Fix All button is present
    const fixAllButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const fixAll = buttons.find(btn => btn.textContent?.includes('Fix All'));
      return fixAll ? fixAll.textContent : null;
    });
    
    if (fixAllButton) {
      console.log(`⚠️  Fix All button found: ${fixAllButton}`);
      console.log('✅ Dependency validation is working - conflicts detected!');
    } else {
      console.log('❌ No Fix All button found - checking phase dates...');
      
      // Try to create a conflict by editing a phase date
      const phaseData = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('.data-table tbody tr'));
        const phases = rows.map(row => {
          const cells = row.querySelectorAll('td');
          return {
            name: cells[0]?.textContent?.trim(),
            startDate: cells[1]?.textContent?.trim(),
            endDate: cells[2]?.textContent?.trim(),
            dependencies: cells[3]?.textContent?.trim()
          };
        });
        return phases;
      });
      
      console.log('📊 Current phases:', phaseData);
    }
    
    // Try to trigger a validation error by editing a phase
    console.log('🔧 Attempting to create a dependency conflict...');
    
    // Find a phase with FS dependency and try to make it overlap
    const hasConflict = await page.evaluate(async () => {
      const rows = Array.from(document.querySelectorAll('.data-table tbody tr'));
      
      for (const row of rows) {
        const depCell = row.querySelector('td:nth-child(4)');
        if (depCell?.textContent?.includes('FS')) {
          // This phase has a FS dependency, try to edit its start date
          const startDateCell = row.querySelector('td:nth-child(2) .inline-editable');
          if (startDateCell) {
            startDateCell.click();
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Try to set an invalid date
            const input = row.querySelector('td:nth-child(2) input[type="date"]');
            if (input) {
              // Set date to something early that should conflict
              input.value = '2024-01-01';
              input.dispatchEvent(new Event('change', { bubbles: true }));
              input.blur();
              await new Promise(resolve => setTimeout(resolve, 1000));
              return true;
            }
          }
        }
      }
      return false;
    });
    
    if (hasConflict) {
      console.log('✅ Attempted to create conflict - checking for validation...');
      await page.waitForTimeout(2000);
      
      // Check for alert or validation popup
      const alertDetected = await page.evaluate(() => {
        // Check if validation popup appeared
        const popup = document.querySelector('.validation-popup');
        return popup !== null;
      });
      
      if (alertDetected) {
        console.log('✅ Validation popup detected!');
      }
    }
    
    console.log('✅ Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  // Keep browser open for inspection
  console.log('Press Ctrl+C to close browser...');
}

testDependencyValidation();