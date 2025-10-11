const puppeteer = require('puppeteer');
const fs = require('fs');

async function debugAllocationZeros() {
  console.log('🔍 Starting allocation zeros debug...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: false,
    args: ['--no-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Capture console logs
    page.on('console', msg => {
      if (msg.text().includes('Cell ') || msg.text().includes('templates')) {
        console.log('🔍 Browser Console:', msg.text());
      }
    });
    
    console.log('📍 Navigating to localhost:3120...');
    await page.goto('http://localhost:3120', { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait a bit for React to hydrate
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if there's a profile selection modal
    try {
      await page.waitForSelector('[data-testid="profile-select"], .modal', { timeout: 5000 });
      console.log('📋 Profile selection modal found, handling...');
      
      // Try to select a profile
      const selectTrigger = await page.$('[data-testid="profile-select"]');
      if (selectTrigger) {
        await selectTrigger.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Select first option
        const firstOption = await page.$('[role="option"]');
        if (firstOption) {
          await firstOption.click();
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Click continue
        const continueBtn = await page.$('button:has-text("Continue")');
        if (continueBtn) {
          await continueBtn.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (e) {
      console.log('⏭️ No profile modal, continuing...');
    }
    
    console.log('🧭 Navigating to project types...');
    // Try multiple ways to get to project types
    try {
      // Method 1: Click on Settings in sidebar
      await page.click('nav a:has-text("Settings"), .sidebar a:has-text("Settings")');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (e) {
      // Method 2: Direct navigation
      console.log('📍 Direct navigation to settings...');
      await page.goto('http://localhost:3120/settings', { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Navigate directly to a known project type from server logs
    const projectTypeId = '3d4e5f6a-7b8c-9d0e-1f2a-3b4c5d6e7f8a';
    const projectTypeUrl = `http://localhost:3120/project-types/${projectTypeId}`;
    console.log(`🔗 Navigating directly to project type: ${projectTypeUrl}`);
    
    await page.goto(projectTypeUrl, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🔍 Looking for allocation table...');
    await page.waitForSelector('.resource-templates-table', { timeout: 15000 });
    console.log('✅ Allocation table found');
    
    // Wait for data to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take a screenshot
    const screenshotPath = '/home/tony/GitHub/Capacinator/debug-allocation-screenshot.png';
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
    
    // Get all table cells and analyze them
    const cellAnalysis = await page.evaluate(() => {
      const cells = document.querySelectorAll('.resource-templates-table td');
      const results = [];
      
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const input = cell.querySelector('input[type="number"]');
        
        if (input) {
          const inputValue = input.value;
          const cellText = cell.textContent.trim();
          const cellHTML = cell.innerHTML;
          
          // Look for standalone "0" text nodes
          const walker = document.createTreeWalker(
            cell,
            NodeFilter.SHOW_TEXT,
            null,
            false
          );
          
          const textNodes = [];
          let node;
          while (node = walker.nextNode()) {
            const text = node.textContent.trim();
            if (text === '0' && node.parentElement.tagName !== 'INPUT') {
              textNodes.push({
                text: text,
                parent: node.parentElement.tagName,
                parentClass: node.parentElement.className
              });
            }
          }
          
          if (inputValue && inputValue !== '0' && textNodes.length > 0) {
            results.push({
              cellIndex: i,
              inputValue: inputValue,
              cellText: cellText,
              unwantedZeros: textNodes,
              hasZeroProblem: true
            });
          } else if (inputValue && inputValue !== '0') {
            results.push({
              cellIndex: i,
              inputValue: inputValue,
              cellText: cellText,
              unwantedZeros: [],
              hasZeroProblem: false
            });
          }
        }
      }
      
      return results;
    });
    
    console.log('📊 Cell Analysis Results:');
    cellAnalysis.forEach(result => {
      if (result.hasZeroProblem) {
        console.log(`❌ Cell ${result.cellIndex}: Input="${result.inputValue}" has unwanted zeros:`, result.unwantedZeros);
      } else {
        console.log(`✅ Cell ${result.cellIndex}: Input="${result.inputValue}" - no unwanted zeros`);
      }
    });
    
    const problemCells = cellAnalysis.filter(r => r.hasZeroProblem);
    const report = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      totalInputCells: cellAnalysis.length,
      problemCells: problemCells.length,
      details: cellAnalysis,
      screenshotPath: screenshotPath
    };
    
    fs.writeFileSync('/home/tony/GitHub/Capacinator/debug-allocation-report.json', JSON.stringify(report, null, 2));
    console.log('📝 Report saved: debug-allocation-report.json');
    
    if (problemCells.length > 0) {
      console.log(`❌ FOUND ${problemCells.length} CELLS WITH UNWANTED ZEROS!`);
      return false;
    } else {
      console.log('✅ NO UNWANTED ZEROS FOUND');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
    return false;
  } finally {
    await browser.close();
  }
}

debugAllocationZeros().then(success => {
  console.log(success ? '✅ Debug completed successfully' : '❌ Debug found issues');
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('💥 Debug failed:', err);
  process.exit(1);
});