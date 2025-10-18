#!/usr/bin/env node

/**
 * Automated screenshot script for Project Detail page
 * Takes a screenshot of the project detail page and saves it to ~/Pictures/Screenshots/
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ID = '987fcdeb-51a2-4b3c-d4e5-f6a7b8c9d0e1';
const BASE_URL = 'http://localhost:3120'; // Vite dev server port
const SCREENSHOT_DIR = path.join(process.env.HOME, 'Pictures', 'Screenshots');

async function takeScreenshot() {
  let browser;

  try {
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set viewport to standard desktop size
    await page.setViewport({ width: 1920, height: 1080 });

    console.log(`📄 Navigating to project detail page...`);
    const url = `${BASE_URL}/projects/${PROJECT_ID}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Handle profile selection modal if it appears
    console.log('⏳ Checking for profile selection modal...');
    try {
      const profileSelect = await page.waitForSelector('select', { timeout: 3000 });
      if (profileSelect) {
        console.log('🔧 Profile modal detected, selecting first option...');
        // Get all options and select the first valid one
        const options = await page.$$eval('select option', opts => opts.map(o => o.value).filter(v => v));
        if (options.length > 0) {
          await page.select('select', options[0]);
        }
        // Wait a moment for the selection to register
        await new Promise(resolve => setTimeout(resolve, 500));
        // Click continue button using evaluate to ensure it fires
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const continueBtn = buttons.find(btn => btn.textContent.includes('Continue'));
          if (continueBtn) {
            continueBtn.click();
          }
        });
        // Wait for modal to disappear by checking if chart container appears
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✅ Profile selected and modal closed');
      }
    } catch (e) {
      console.log('ℹ️  No profile modal detected');
    }

    // Wait for the chart to render
    console.log('⏳ Waiting for chart to render...');
    await page.waitForSelector('.chart-container', { timeout: 10000 });

    // Wait an additional moment for data to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Scroll to show the chart and timeline brush - need to scroll past the header
    await page.evaluate(() => {
      // Find the chart container and scroll so it's well visible
      const chartContainer = document.querySelector('.chart-container');
      if (chartContainer) {
        chartContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo(0, 600); // Fallback scroll further down
      }
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '').replace('T', '_');
    const filename = `project-detail-auto-${timestamp}.png`;
    const filepath = path.join(SCREENSHOT_DIR, filename);

    // Ensure screenshot directory exists
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    // Take screenshot
    console.log(`📸 Taking screenshot...`);
    await page.screenshot({
      path: filepath,
      fullPage: true
    });

    console.log(`✅ Screenshot saved to: ${filepath}`);

    // Get console logs from the page
    console.log('\n📊 Browser console logs (last 20):');
    const logs = await page.evaluate(() => {
      // This won't work as console logs are not accessible this way
      // We need to listen to console events during page load
      return [];
    });

    return filepath;

  } catch (error) {
    console.error('❌ Error taking screenshot:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Enhanced version that captures console logs
async function takeScreenshotWithLogs() {
  let browser;
  const consoleLogs = [];

  try {
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Capture console logs
    page.on('console', async msg => {
      const text = msg.text();

      // Try to get actual values from JSHandles
      let expandedText = text;
      if (text.includes('JSHandle@object')) {
        try {
          const args = msg.args();
          const values = await Promise.all(args.map(arg => arg.jsonValue().catch(() => 'COMPLEX')));
          expandedText = values.map(v =>
            typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)
          ).join(' ');
        } catch (e) {
          // Fallback to text if expansion fails
        }
      }

      consoleLogs.push(expandedText);

      // Print relevant logs (smart brush initialization, etc.)
      if (expandedText.includes('🎯') || expandedText.includes('🔍') || expandedText.includes('📊') || expandedText.includes('🗓️') || expandedText.includes('🔎')) {
        console.log(`  ${expandedText}`);
      }
    });

    // Set viewport to standard desktop size
    await page.setViewport({ width: 1920, height: 1080 });

    console.log(`📄 Navigating to project detail page...`);
    const url = `${BASE_URL}/projects/${PROJECT_ID}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Handle profile selection modal if it appears
    console.log('⏳ Checking for profile selection modal...');
    try {
      const profileSelect = await page.waitForSelector('select', { timeout: 3000 });
      if (profileSelect) {
        console.log('🔧 Profile modal detected, selecting first option...');
        // Get all options and select the first valid one
        const options = await page.$$eval('select option', opts => opts.map(o => o.value).filter(v => v));
        if (options.length > 0) {
          await page.select('select', options[0]);
        }
        // Wait a moment for the selection to register
        await new Promise(resolve => setTimeout(resolve, 500));
        // Click continue button using evaluate to ensure it fires
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const continueBtn = buttons.find(btn => btn.textContent.includes('Continue'));
          if (continueBtn) {
            continueBtn.click();
          }
        });
        // Wait for modal to disappear by checking if chart container appears
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✅ Profile selected and modal closed');
      }
    } catch (e) {
      console.log('ℹ️  No profile modal detected');
    }

    // Wait for the chart to render
    console.log('⏳ Waiting for chart to render...');
    await page.waitForSelector('.chart-container', { timeout: 10000 });

    // Wait for data to load and render
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Scroll to show the chart and timeline brush - need to scroll past the header
    await page.evaluate(() => {
      // Find the chart container and scroll so it's well visible
      const chartContainer = document.querySelector('.chart-container');
      if (chartContainer) {
        chartContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo(0, 600); // Fallback scroll further down
      }
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '').replace('T', '_');
    const filename = `project-detail-auto-${timestamp}.png`;
    const filepath = path.join(SCREENSHOT_DIR, filename);

    // Ensure screenshot directory exists
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    // Take screenshot
    console.log(`📸 Taking screenshot...`);
    await page.screenshot({
      path: filepath,
      fullPage: true
    });

    console.log(`✅ Screenshot saved to: ${filepath}`);

    // Save console logs to file
    const logsFilepath = filepath.replace('.png', '-console.log');
    fs.writeFileSync(logsFilepath, consoleLogs.join('\n'));
    console.log(`📝 Console logs saved to: ${logsFilepath}`);

    return { filepath, logsFilepath, consoleLogs };

  } catch (error) {
    console.error('❌ Error taking screenshot:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the script
takeScreenshotWithLogs()
  .then(({ filepath, logsFilepath }) => {
    console.log('\n✨ Done!');
    console.log(`Screenshot: ${filepath}`);
    console.log(`Logs: ${logsFilepath}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Failed:', error);
    process.exit(1);
  });

export { takeScreenshot, takeScreenshotWithLogs };
