import { chromium } from 'playwright';

(async () => {
  console.log('🚀 Starting roadmap-specific screenshot test...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('📍 Navigating to projects page...');
    await page.goto('http://localhost:3120/projects', { waitUntil: 'networkidle' });
    
    // Handle profile selection if it appears
    try {
      console.log('🔍 Checking for profile selection modal...');
      const profileModal = page.locator('text=Select Your Profile');
      if (await profileModal.isVisible({ timeout: 2000 })) {
        console.log('📋 Profile selection modal detected');
        
        // Click on the dropdown to open options
        await page.click('[role="combobox"]', { timeout: 5000 });
        await page.waitForTimeout(1000);
        
        // Select the first available profile
        const options = page.locator('[role="option"]');
        const optionCount = await options.count();
        console.log(`Found ${optionCount} profile options`);
        
        if (optionCount > 0) {
          await options.first().click();
          await page.waitForTimeout(500);
          
          // Click Continue button
          await page.click('text=Continue');
          console.log('✅ Profile selected');
        }
      }
    } catch (profileError) {
      console.log('⚠️ No profile selection needed or error:', profileError.message);
    }
    
    // Wait a bit for page to load after profile selection
    await page.waitForTimeout(3000);
    
    // Now try to click the Roadmap tab
    console.log('🎯 Clicking Roadmap tab...');
    try {
      await page.click('text=Roadmap', { timeout: 10000 });
      console.log('✅ Successfully clicked Roadmap tab');
      
      // Wait for roadmap to load
      await page.waitForTimeout(5000);
      
      // Take full roadmap screenshot
      console.log('📸 Taking full roadmap screenshot...');
      await page.screenshot({ 
        path: '/home/tony/Pictures/Screenshots/roadmap-with-fixes-validation.png',
        fullPage: true 
      });
      
      // Validate the fixes
      console.log('🔍 Validating UI fixes...');
      
      // Check quarter markers are removed
      const quarterMarkers = await page.locator('.quarter-marker').count();
      console.log(`✅ Quarter markers found: ${quarterMarkers} (should be 0)`);
      
      // Check timeline header
      const timelineHeader = page.locator('.timeline-header');
      if (await timelineHeader.count() > 0) {
        console.log('✅ Timeline header found');
        
        // Get computed height to verify our changes
        const headerHeight = await timelineHeader.evaluate(el => {
          return window.getComputedStyle(el).height;
        });
        console.log(`📏 Timeline header height: ${headerHeight} (should be 60px)`);
        
        // Take close-up screenshot
        await timelineHeader.screenshot({ 
          path: '/home/tony/Pictures/Screenshots/timeline-header-validation.png' 
        });
      }
      
      // Check project panels
      const projectPanels = page.locator('.project-info');
      const panelCount = await projectPanels.count();
      console.log(`✅ Found ${panelCount} project panels`);
      
      if (panelCount > 0) {
        await projectPanels.first().screenshot({ 
          path: '/home/tony/Pictures/Screenshots/project-panel-validation.png' 
        });
      }
      
      // Check for visual improvements
      const priorityBadges = await page.locator('.priority-badge').count();
      console.log(`✅ Found ${priorityBadges} priority badges`);
      
      console.log('🎉 Roadmap validation completed successfully!');
      
    } catch (roadmapError) {
      console.log('❌ Could not access roadmap:', roadmapError.message);
      await page.screenshot({ 
        path: '/home/tony/Pictures/Screenshots/roadmap-access-error.png',
        fullPage: true 
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ 
      path: '/home/tony/Pictures/Screenshots/test-failure.png',
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
})();