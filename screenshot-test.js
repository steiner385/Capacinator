import { chromium } from 'playwright';

(async () => {
  console.log('🚀 Starting screenshot test...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('📍 Navigating to roadmap...');
    await page.goto('http://localhost:3120/projects', { waitUntil: 'networkidle' });
    
    // Wait a bit for page to load
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    console.log('📸 Taking initial screenshot...');
    await page.screenshot({ 
      path: '/home/tony/Pictures/Screenshots/roadmap-current-state.png',
      fullPage: true 
    });
    
    // Try to click roadmap tab if it exists
    try {
      await page.click('text=Roadmap', { timeout: 5000 });
      console.log('✅ Clicked Roadmap tab');
      
      // Wait for roadmap to load
      await page.waitForTimeout(3000);
      
      // Take roadmap screenshot
      console.log('📸 Taking roadmap screenshot...');
      await page.screenshot({ 
        path: '/home/tony/Pictures/Screenshots/roadmap-after-fixes.png',
        fullPage: true 
      });
      
      // Check for specific elements to validate fixes
      const quarterMarkers = await page.locator('.quarter-marker').count();
      console.log(`✅ Quarter markers found: ${quarterMarkers} (should be 0)`);
      
      const timelineHeader = page.locator('.timeline-header');
      if (await timelineHeader.count() > 0) {
        console.log('✅ Timeline header found');
        
        // Take close-up of timeline header
        await timelineHeader.screenshot({ 
          path: '/home/tony/Pictures/Screenshots/timeline-header-closeup.png' 
        });
      }
      
      const projectInfo = page.locator('.project-info').first();
      if (await projectInfo.count() > 0) {
        console.log('✅ Project info panel found');
        
        // Take close-up of project panel
        await projectInfo.screenshot({ 
          path: '/home/tony/Pictures/Screenshots/project-panel-closeup.png' 
        });
      }
      
    } catch (tabError) {
      console.log('⚠️ Could not click Roadmap tab, taking screenshot of current state');
      await page.screenshot({ 
        path: '/home/tony/Pictures/Screenshots/roadmap-tab-error.png',
        fullPage: true 
      });
    }
    
    console.log('✅ Screenshot test completed successfully');
    
  } catch (error) {
    console.error('❌ Screenshot test failed:', error);
    await page.screenshot({ 
      path: '/home/tony/Pictures/Screenshots/roadmap-error.png',
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
})();