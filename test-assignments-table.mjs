import puppeteer from 'puppeteer';

async function testAssignmentsTable() {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  try {
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Navigate directly to a project detail page - using the project ID from the screenshot
    await page.goto('http://localhost:3121/projects/987fcdeb-51a2-4b3c-d4e5-f6a7b8c9d0e1', { waitUntil: 'networkidle0' });
    
    // Wait for the page to load
    await page.waitForSelector('.page-container', { timeout: 10000 });
    
    // Handle the profile modal if it appears
    try {
      await page.waitForSelector('button', { timeout: 2000 });
      
      // Check if Continue button exists
      const continueButton = await page.$('button::-p-text(Continue)');
      if (continueButton) {
        // Select a user from dropdown
        await page.click('select');
        const options = await page.$$('select option');
        if (options.length > 1) {
          await page.select('select', await page.evaluate(el => el.value, options[1]));
        }
        
        // Click Continue
        await continueButton.click();
        
        // Wait for modal to close
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (e) {
      // Modal might not appear if profile is already selected
      console.log('No profile modal found, continuing...');
    }
    
    // Scroll to and expand the Team Assignments section
    await page.evaluate(() => {
      const headers = document.querySelectorAll('.section-header');
      headers.forEach(header => {
        if (header.textContent.includes('Team Assignments')) {
          // Scroll to the section
          header.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Check if section is collapsed
          const chevronDown = header.querySelector('svg[class*="ChevronDown"]');
          if (chevronDown) {
            header.click();
          }
        }
      });
    });
    
    // Wait a bit for any animations and scrolling
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Take a screenshot of the full page
    await page.screenshot({ 
      path: 'test-assignments-table.png',
      fullPage: true 
    });
    
    console.log('Screenshot saved as test-assignments-table.png');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testAssignmentsTable();