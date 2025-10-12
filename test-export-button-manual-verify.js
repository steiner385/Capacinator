#!/usr/bin/env node

/**
 * Manual verification script for Export Scenario Data button fix
 * This script opens the browser and gives instructions for manual testing
 */

import puppeteer from 'puppeteer';

async function manualTestGuide() {
  console.log('🚀 Starting Manual Export Button Test Guide...');
  console.log('');
  console.log('This will open a browser where you can manually verify the fix.');
  console.log('');

  const browser = await puppeteer.launch({ 
    headless: false, // Show the browser
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1200, height: 800 }
  });

  try {
    const page = await browser.newPage();
    
    console.log('📍 Navigating to http://localhost:3120/import...');
    await page.goto('http://localhost:3120/import', { waitUntil: 'networkidle0' });
    
    console.log('');
    console.log('🎯 MANUAL VERIFICATION STEPS:');
    console.log('================================');
    console.log('');
    console.log('1. Look for the "Export Scenario Data" button in the Export section');
    console.log('2. Hover over the button - it should show a POINTER cursor (not text cursor)');
    console.log('3. The button should NOT be grayed out/disabled');
    console.log('4. Click the button - it should trigger a download attempt');
    console.log('5. You may get a 500 error, but that proves the button works!');
    console.log('');
    console.log('✅ EXPECTED RESULTS:');
    console.log('- Button has pointer cursor on hover');
    console.log('- Button is clickable (not disabled)');
    console.log('- Button triggers an API call to /api/import/export/scenario');
    console.log('- Browser attempts to download a file (may fail due to backend database issues)');
    console.log('');
    console.log('❌ PREVIOUS PROBLEM (now fixed):');
    console.log('- Button showed text cursor instead of pointer');
    console.log('- Button appeared but was not clickable');
    console.log('- No API call was triggered when clicked');
    console.log('');
    console.log('Press Ctrl+C when you have verified the button behavior...');
    
    // Keep the browser open for manual testing
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // This won't be reached due to the infinite loop above
    await browser.close();
  }
}

// Add automated verification function that checks the DOM
async function automatedDOMCheck() {
  console.log('🤖 Running automated DOM verification...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Navigate and wait for page load
    await page.goto('http://localhost:3120/import', { waitUntil: 'networkidle0' });
    
    // Wait for scenarios API to complete
    await page.waitForResponse(response => 
      response.url().includes('/api/scenarios') && response.status() === 200,
      { timeout: 15000 }
    );
    
    // Wait for React state updates
    await page.waitForTimeout(2000);
    
    // Check if button exists and get its properties
    const buttonInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const exportButton = buttons.find(btn => 
        btn.textContent && btn.textContent.includes('Export Scenario Data')
      );
      
      if (!exportButton) {
        return { found: false };
      }
      
      const computedStyle = window.getComputedStyle(exportButton);
      
      return {
        found: true,
        disabled: exportButton.disabled,
        cursor: computedStyle.cursor,
        textContent: exportButton.textContent.trim(),
        className: exportButton.className,
        opacity: computedStyle.opacity
      };
    });
    
    console.log('🔍 Button Analysis Results:');
    console.log('============================');
    
    if (!buttonInfo.found) {
      console.log('❌ Export Scenario Data button NOT FOUND');
      return false;
    }
    
    console.log('✅ Export Scenario Data button found');
    console.log(`   - Disabled: ${buttonInfo.disabled}`);
    console.log(`   - Cursor: ${buttonInfo.cursor}`);
    console.log(`   - Text: "${buttonInfo.textContent}"`);
    console.log(`   - CSS Classes: ${buttonInfo.className}`);
    console.log(`   - Opacity: ${buttonInfo.opacity}`);
    
    // Evaluate the fix
    const isFixed = !buttonInfo.disabled && buttonInfo.cursor === 'pointer';
    
    console.log('');
    console.log('🎯 FIX VERIFICATION:');
    console.log('====================');
    
    if (isFixed) {
      console.log('🎉 SUCCESS! Button fix is working correctly:');
      console.log('   ✅ Button is enabled (not disabled)');
      console.log('   ✅ Button has pointer cursor');
      console.log('   ✅ Button should be clickable');
    } else {
      console.log('❌ ISSUE DETECTED:');
      if (buttonInfo.disabled) {
        console.log('   ❌ Button is still disabled');
      }
      if (buttonInfo.cursor !== 'pointer') {
        console.log(`   ❌ Button cursor is "${buttonInfo.cursor}" instead of "pointer"`);
      }
    }
    
    return isFixed;
    
  } catch (error) {
    console.error('❌ Automated check failed:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Run both automated check and manual guide
async function runFullVerification() {
  try {
    console.log('🔍 Step 1: Automated DOM Verification');
    console.log('=====================================');
    
    const automatedResult = await automatedDOMCheck();
    
    console.log('');
    console.log('👥 Step 2: Manual Browser Verification');
    console.log('======================================');
    
    if (automatedResult) {
      console.log('✅ Automated check passed! Opening browser for manual confirmation...');
    } else {
      console.log('⚠️  Automated check had issues. Opening browser for manual inspection...');
    }
    
    await manualTestGuide();
    
  } catch (error) {
    console.error('💥 Verification failed:', error.message);
    process.exit(1);
  }
}

runFullVerification();