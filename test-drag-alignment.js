import puppeteer from 'puppeteer';

async function testCurrentInterface() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Clear cache and cookies
    await page.setCacheEnabled(false);
    
    // Navigate to the project page via localhost with cache busting
    await page.goto('http://localhost:3120/projects/987fcdeb-51a2-4b3c-d4e5-f6a7b8c9d0e1', {
      waitUntil: 'networkidle0',
      timeout: 10000
    });
    
    // Handle profile selection if it appears
    console.log('🔍 Checking for profile selection...');
    const profileTitle = await page.$('text=Select Your Profile');
    if (profileTitle || await page.$('h1, h2, h3')) {
      console.log('📝 Profile selection page detected...');
      
      // Try to open the dropdown and select an option
      const dropdown = await page.$('select');
      if (dropdown) {
        console.log('🔽 Opening dropdown...');
        await dropdown.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get available options
        const options = await page.$$eval('select option', options => 
          options.map(option => ({ value: option.value, text: option.textContent }))
        );
        console.log('📋 Available options:', options);
        
        // Select the first non-empty option
        const validOption = options.find(opt => opt.value && opt.value !== '');
        if (validOption) {
          console.log('✅ Selecting option:', validOption);
          await page.select('select', validOption.value);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Click continue button
      const continueButton = await page.$('button');
      if (continueButton) {
        console.log('🔄 Clicking continue...');
        await continueButton.click();
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
        console.log('✅ Navigation completed');
      }
    }
    
    // Wait for the page to load
    console.log('🔍 Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take a screenshot to see what's actually displayed
    await page.screenshot({ path: '/tmp/current-interface.png', fullPage: true });
    console.log('📸 Screenshot saved to /tmp/current-interface.png');
    
    // Check what timeline interface elements are present
    const timelineElements = await page.evaluate(() => {
      const elements = {
        // Check for the new sections
        phasesSection: document.querySelector('[data-section="phases"], .detail-section') ? 'Found' : 'Missing',
        phasesHeader: document.querySelector('h2') && Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Project Timeline')) ? 'Found' : 'Missing',
        visualPhaseManager: document.querySelector('.visual-phase-manager') ? 'Found' : 'Missing',
        
        // Check for InteractiveTimeline components
        interactiveTimeline: document.querySelector('.interactive-timeline') ? 'Found' : 'Missing',
        timelineContainer: document.querySelector('.timeline-container') ? 'Found' : 'Missing', 
        timelineItems: document.querySelectorAll('.timeline-item').length,
        projectPhaseTimeline: document.querySelector('.project-phase-timeline') ? 'Found' : 'Missing',
        
        // Check for phase-related elements
        phaseHandles: document.querySelectorAll('[style*="top: 5px"]').length,
        dependencyLines: document.querySelectorAll('[class*="dependency"]').length,
        
        // Check for any canvas or SVG elements (often used for timelines)
        canvasElements: document.querySelectorAll('canvas').length,
        svgElements: document.querySelectorAll('svg').length,
        
        // Check all section headers to see what's loaded
        allSectionHeaders: Array.from(document.querySelectorAll('h2')).map(h => h.textContent.trim())
      };
      
      return elements;
    });
    
    console.log('🔍 Timeline interface elements found:');
    console.log(JSON.stringify(timelineElements, null, 2));
    
    // Check what's actually in the page title to confirm we're on the right page
    const pageTitle = await page.title();
    const currentUrl = page.url();
    console.log(`📄 Page: ${pageTitle}`);
    console.log(`🌐 URL: ${currentUrl}`);
    
    // Look for any drag and drop functionality
    const dragElements = await page.evaluate(() => {
      const draggable = document.querySelectorAll('[draggable="true"], [style*="cursor: grab"], [style*="cursor: move"]');
      return {
        draggableElements: draggable.length,
        dragCursors: Array.from(draggable).map(el => ({
          tag: el.tagName,
          class: el.className,
          style: el.style.cursor
        }))
      };
    });
    
    console.log('🖱️ Drag elements found:', dragElements);
    
    // Keep browser open for manual inspection
    console.log('\n🎯 Browser opened showing current interface state');
    console.log('📸 Screenshot saved to /tmp/current-interface.png');
    console.log('🔍 Check the browser to see what interface is currently displayed');
    console.log('Press Ctrl+C to close when done inspecting...');
    await new Promise(() => {}); // Keep running for manual inspection
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCurrentInterface().catch(console.error);