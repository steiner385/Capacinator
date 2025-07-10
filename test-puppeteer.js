import puppeteer from 'puppeteer-core';

async function testResourceTemplatesPage() {
  let browser;
  
  try {
    console.log('Starting browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: '/usr/bin/google-chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Capture console logs
    const consoleLogs = [];
    page.on('console', async msg => {
      const logMessage = `${msg.type()}: ${msg.text()}`;
      consoleLogs.push(logMessage);
      console.log('Browser console:', logMessage);
      
      // Try to get the actual values for JSHandle objects
      if (msg.text().includes('JSHandle@')) {
        try {
          const args = msg.args();
          if (args.length > 0) {
            const value = await args[0].jsonValue();
            console.log('  Actual value:', JSON.stringify(value, null, 2));
          }
        } catch (e) {
          // Ignore errors when trying to get values
        }
      }
    });
    
    // Capture page errors
    page.on('pageerror', error => {
      console.log('Page error:', error.message);
    });
    
    // Set mobile viewport to test mobile layout
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    
    // Navigate to the page
    console.log('Navigating to allocations page...');
    await page.goto('http://localhost:8090/allocations', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for the page to load
    console.log('Waiting for page to load...');
    
    // Take a screenshot immediately
    await page.screenshot({ path: '/tmp/allocations-initial.png', fullPage: true });
    console.log('Initial screenshot saved to /tmp/allocations-initial.png');
    
    // Get page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check for the main heading
    const heading = await page.$eval('h1', el => el.textContent).catch(() => 'No h1 found');
    console.log('Main heading:', heading);
    
    // Get current URL
    const url = await page.url();
    console.log('Current URL:', url);
    
    // Get page HTML
    const html = await page.content();
    console.log('Page HTML length:', html.length);
    console.log('Page HTML first 1000 chars:', html.substring(0, 1000));
    
    // Check if the grid is present
    const hasGrid = await page.$('.allocation-matrix-table') !== null;
    console.log('Has allocation matrix table:', hasGrid);
    
    // Count table rows
    const rowCount = await page.$$eval('.allocation-matrix-table tbody tr', rows => rows.length);
    console.log('Number of data rows:', rowCount);
    
    // Check if data is loading
    const isLoading = await page.$('.loading') !== null;
    console.log('Is loading:', isLoading);
    
    // Check for any error messages
    const errorMessages = await page.$$eval('[class*="error"]', elements => 
      elements.map(el => el.textContent)
    );
    console.log('Error messages:', errorMessages);
    
    // Get console logs captured earlier
    
    // Wait a bit more for any async operations
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Print all console logs
    console.log('Console logs:');
    consoleLogs.forEach(log => console.log('  ' + log));
    
    // Take a screenshot
    await page.screenshot({ path: '/tmp/allocations-page.png', fullPage: true });
    console.log('Screenshot saved to /tmp/allocations-page.png');
    
    // Check for specific elements
    const elementsToCheck = [
      '.grid-container',
      '.allocation-matrix-table',
      '.sticky-col',
      '.phase-col',
      '.allocation-cell'
    ];
    
    for (const selector of elementsToCheck) {
      const exists = await page.$(selector) !== null;
      console.log(`Element ${selector} exists:`, exists);
    }
    
    // Get the table HTML to see the structure
    const tableHTML = await page.$eval('.allocation-matrix-table', el => el.outerHTML);
    console.log('Table HTML length:', tableHTML.length);
    
    // Check the table header structure
    const headerCells = await page.$$eval('.allocation-matrix-table thead th', cells => 
      cells.map(cell => cell.textContent.trim())
    );
    console.log('Header cells:', headerCells);
    
    // Check the first data row cell count vs header count
    const firstRowCells = await page.$$eval('.allocation-matrix-table tbody tr:first-child td', cells => 
      cells.map(cell => cell.textContent.trim())
    );
    console.log('First row cells:', firstRowCells);
    console.log('Header count:', headerCells.length, 'vs First row count:', firstRowCells.length);
    
    // Get the first few rows of the table to see the structure
    const rowsHTML = await page.$$eval('.allocation-matrix-table tbody tr', rows => 
      rows.slice(0, 3).map(row => row.outerHTML)
    );
    console.log('First 3 rows HTML:');
    rowsHTML.forEach((row, i) => {
      console.log(`Row ${i}:`, row);
    });
    
    // Get network requests
    const responses = [];
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        contentType: response.headers()['content-type']
      });
    });
    
    // Reload to capture network requests
    await page.reload({ waitUntil: 'networkidle2' });
    
    console.log('Network responses:');
    responses.forEach(resp => {
      if (resp.url.includes('api/')) {
        console.log(`  ${resp.status} - ${resp.url}`);
      }
    });
    
    // Get the final HTML content
    const bodyHTML = await page.$eval('body', el => el.innerHTML.substring(0, 1000));
    console.log('Body HTML (first 1000 chars):', bodyHTML);
    
    console.log('Test completed successfully!');
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testResourceTemplatesPage();