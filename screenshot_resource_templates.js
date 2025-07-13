import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 800 });
    
    // Navigate directly to allocations page
    console.log('Navigating to allocations page...');
    await page.goto('http://localhost:8090/allocations', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check what's actually on the page
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        h1: document.querySelector('h1')?.textContent,
        hasTable: !!document.querySelector('.allocation-matrix-table'),
        hasAllocationsGrid: !!document.querySelector('.allocations-grid'),
        bodyText: document.body?.textContent?.substring(0, 200)
      };
    });
    console.log('Page content:', pageContent);
    
    // Try to wait for the allocations grid instead
    try {
      await page.waitForSelector('.allocations-grid', { timeout: 5000 });
    } catch (e) {
      console.log('Could not find allocations grid, taking screenshot anyway');
    }
    
    // Take screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = `/tmp/resource_templates_${timestamp}.png`;
    
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    
    console.log(`Screenshot saved to: ${screenshotPath}`);
    
    // Also check if there's any data in the table
    const tableContent = await page.evaluate(() => {
      const table = document.querySelector('.allocation-matrix-table');
      if (!table) return 'No table found';
      
      const rows = table.querySelectorAll('tbody tr');
      return `Found ${rows.length} data rows in table`;
    });
    
    console.log('Table content:', tableContent);
    
  } catch (error) {
    console.error('Error taking screenshot:', error);
  } finally {
    await browser.close();
  }
})();