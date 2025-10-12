#!/usr/bin/env node

/**
 * Quick test to check if our debug elements are visible
 */

import puppeteer from 'puppeteer';

async function checkButtonVisibility() {
  console.log('🔍 Checking button visibility with debug elements...');

  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    console.log('📍 Navigating to import page...');
    await page.goto('http://localhost:3120/import', { waitUntil: 'networkidle0' });
    
    console.log('⏳ Waiting for scenarios to load...');
    await page.waitForResponse(response => 
      response.url().includes('/api/scenarios') && response.status() === 200,
      { timeout: 10000 }
    );
    
    // Wait for React to update
    await page.waitForTimeout(2000);
    
    // Check for our debug elements
    const debugResults = await page.evaluate(() => {
      const results = {
        limeTestButton: false,
        cyanDebugText: false,
        yellowExportButton: false,
        orangeDebugText: false,
        exportButtonText: '',
        allButtons: []
      };
      
      // Check for lime test button
      const limeButton = document.querySelector('button[style*="lime"]');
      results.limeTestButton = !!limeButton;
      
      // Check for cyan debug text
      const cyanText = Array.from(document.querySelectorAll('div')).find(div => 
        div.style.backgroundColor === 'cyan'
      );
      results.cyanDebugText = !!cyanText;
      
      // Check for yellow export button
      const yellowButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.style.backgroundColor === 'yellow'
      );
      results.yellowExportButton = !!yellowButton;
      if (yellowButton) {
        results.exportButtonText = yellowButton.textContent.trim();
      }
      
      // Check for orange debug text
      const orangeText = Array.from(document.querySelectorAll('div')).find(div => 
        div.style.backgroundColor === 'orange'
      );
      results.orangeDebugText = !!orangeText;
      
      // List all buttons for debugging
      results.allButtons = Array.from(document.querySelectorAll('button')).map(btn => ({
        text: btn.textContent.trim().substring(0, 50),
        className: btn.className,
        disabled: btn.disabled,
        visible: btn.offsetParent !== null,
        style: btn.style.cssText
      }));
      
      return results;
    });
    
    console.log('🎯 Debug Results:');
    console.log('================');
    console.log(`🟢 Lime test button: ${debugResults.limeTestButton ? 'VISIBLE' : 'NOT FOUND'}`);
    console.log(`🔵 Cyan debug text: ${debugResults.cyanDebugText ? 'VISIBLE' : 'NOT FOUND'}`);
    console.log(`🟡 Yellow export button: ${debugResults.yellowExportButton ? 'VISIBLE' : 'NOT FOUND'}`);
    console.log(`🟠 Orange debug text: ${debugResults.orangeDebugText ? 'VISIBLE' : 'NOT FOUND'}`);
    
    if (debugResults.exportButtonText) {
      console.log(`📝 Export button text: "${debugResults.exportButtonText}"`);
    }
    
    console.log('\n🔍 All buttons found:');
    debugResults.allButtons.forEach((btn, i) => {
      console.log(`  ${i + 1}. "${btn.text}" - ${btn.visible ? 'VISIBLE' : 'HIDDEN'} - ${btn.disabled ? 'DISABLED' : 'ENABLED'}`);
    });
    
    // Analysis
    console.log('\n📊 Analysis:');
    if (debugResults.limeTestButton && debugResults.yellowExportButton) {
      console.log('✅ SUCCESS: Both test buttons are visible! The button was there but had styling issues.');
      console.log('💡 The original issue was likely CSS-related, now fixed with debug styling.');
    } else if (debugResults.limeTestButton && !debugResults.yellowExportButton) {
      console.log('⚠️  PARTIAL: Test button visible but export button missing.');
      console.log('💡 There may be a specific issue with the export button container or conditional rendering.');
    } else if (!debugResults.limeTestButton && !debugResults.yellowExportButton) {
      console.log('❌ ISSUE: Neither button is visible.');
      console.log('💡 There may be a broader rendering issue with the export section.');
    }
    
    return debugResults;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return null;
  } finally {
    await browser.close();
  }
}

checkButtonVisibility()
  .then((results) => {
    if (results) {
      console.log('\n🎉 Button visibility test completed!');
    } else {
      console.log('\n💥 Button visibility test failed!');
    }
  })
  .catch((error) => {
    console.error('💥 Test error:', error.message);
  });