// Quick test script to check utilization tab functionality
const { chromium } = require('playwright');

async function testUtilizationTab() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  
  try {
    // Navigate to reports
    await page.goto('https://localhost:3121/reports', { 
      waitUntil: 'networkidle'
    });
    
    console.log('Navigated to reports page');
    
    // Handle profile modal by waiting and then dismissing it
    try {
      await page.waitForSelector('text="Select Your Profile"', { timeout: 3000 });
      console.log('Profile modal detected');
      
      // Find and click the first available option in select
      await page.evaluate(() => {
        const select = document.querySelector('select');
        if (select && select.options.length > 1) {
          select.selectedIndex = 1;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      
      await page.waitForTimeout(1000);
      
      // Click continue
      await page.click('button:has-text("Continue")');
      await page.waitForSelector('text="Select Your Profile"', { state: 'hidden', timeout: 5000 });
      console.log('Profile modal handled');
    } catch (e) {
      console.log('No profile modal or already handled');
    }
    
    // Wait for reports page to load
    await page.waitForSelector('button:has-text("Utilization Report")', { timeout: 10000 });
    console.log('Reports page loaded, utilization button found');
    
    // Check current tab state
    const demandTabActive = await page.locator('button:has-text("Demand Report").active').count();
    const utilizationTabActive = await page.locator('button:has-text("Utilization Report").active').count();
    console.log(`Before click - Demand active: ${demandTabActive}, Utilization active: ${utilizationTabActive}`);
    
    // Check current content
    const demandContent = await page.locator('text="Total Demand"').count();
    console.log(`Before click - Demand content visible: ${demandContent}`);
    
    // Click utilization tab
    console.log('Clicking Utilization Report tab...');
    await page.click('button:has-text("Utilization Report")');
    await page.waitForTimeout(2000);
    
    // Check tab state after click
    const demandTabActiveAfter = await page.locator('button:has-text("Demand Report").active').count();
    const utilizationTabActiveAfter = await page.locator('button:has-text("Utilization Report").active').count();
    console.log(`After click - Demand active: ${demandTabActiveAfter}, Utilization active: ${utilizationTabActiveAfter}`);
    
    // Check content after click
    const demandContentAfter = await page.locator('text="Total Demand"').count();
    const utilizationContent = await page.locator('text="Utilization %", text="Team Member"').count();
    console.log(`After click - Demand content: ${demandContentAfter}, Utilization content: ${utilizationContent}`);
    
    // Check for utilization-specific content
    const hasUtilizationHeading = await page.locator('text="Utilization %"').count();
    const hasTeamMemberTable = await page.locator('th:has-text("Team Member")').count();
    
    console.log(`Utilization content check:`);
    console.log(`- Has "Utilization %" heading: ${hasUtilizationHeading}`);
    console.log(`- Has "Team Member" table header: ${hasTeamMemberTable}`);
    
    // Take a screenshot
    await page.screenshot({ path: '/tmp/utilization-test-result.png' });
    console.log('Screenshot saved to /tmp/utilization-test-result.png');
    
    if (hasUtilizationHeading > 0 && hasTeamMemberTable > 0) {
      console.log('✅ SUCCESS: Utilization tab is working correctly!');
    } else {
      console.log('❌ ISSUE: Utilization tab is not showing correct content');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: '/tmp/utilization-test-error.png' });
  } finally {
    await browser.close();
  }
}

testUtilizationTab();