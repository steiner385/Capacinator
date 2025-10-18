#!/usr/bin/env node

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ID = '987fcdeb-51a2-4b3c-d4e5-f6a7b8c9d0e1';
const BASE_URL = 'http://localhost:3120';
const SCREENSHOT_DIR = path.join(process.env.HOME, 'Pictures', 'Screenshots');

async function verifyTimelineAlignment() {
  let browser;
  const consoleLogs = [];

  try {
    console.log('🚀 Launching browser for alignment verification...');
    browser = await puppeteer.launch({
      headless: false, // Show browser for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Capture console logs
    page.on('console', async msg => {
      const text = msg.text();
      let expandedText = text;

      if (text.includes('JSHandle@object')) {
        try {
          const args = msg.args();
          const values = await Promise.all(args.map(arg => arg.jsonValue().catch(() => 'COMPLEX')));
          expandedText = values.map(v =>
            typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)
          ).join(' ');
        } catch (e) {
          // Fallback
        }
      }

      consoleLogs.push(expandedText);
    });

    await page.setViewport({ width: 1920, height: 1080 });

    console.log(`📄 Navigating to project detail page...`);
    const url = `${BASE_URL}/projects/${PROJECT_ID}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Handle profile selection modal
    console.log('⏳ Checking for profile selection modal...');
    try {
      const profileSelect = await page.waitForSelector('select', { timeout: 3000 });
      if (profileSelect) {
        console.log('🔧 Profile modal detected, selecting first option...');
        const options = await page.$$eval('select option', opts => opts.map(o => o.value).filter(v => v));
        if (options.length > 0) {
          await page.select('select', options[0]);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const continueBtn = buttons.find(btn => btn.textContent.includes('Continue'));
          if (continueBtn) {
            continueBtn.click();
          }
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✅ Profile selected and modal closed');
      }
    } catch (e) {
      console.log('ℹ️  No profile modal detected');
    }

    console.log('⏳ Waiting for chart to render...');
    await page.waitForSelector('.chart-container', { timeout: 10000 });
    // Wait longer for chart to fully render and measure dimensions
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('📏 Measuring alignment...');

    // Extract alignment measurements
    const alignmentData = await page.evaluate(() => {
      const results = {
        success: false,
        measurements: {},
        errors: []
      };

      try {
        // Find the phase diagram container
        const phaseDiagram = document.querySelector('.visual-phase-manager');
        if (!phaseDiagram) {
          results.errors.push('Phase diagram not found');
          return results;
        }

        // Find the InteractiveTimeline container (the actual timeline, not SVG)
        const timelineContainer = phaseDiagram.querySelector('.timeline-container');
        if (!timelineContainer) {
          results.errors.push('Timeline container not found');
          return results;
        }

        // Get phase diagram bounding box from the timeline container
        const phaseBounds = timelineContainer.getBoundingClientRect();
        results.measurements.phaseDiagram = {
          left: phaseBounds.left,
          right: phaseBounds.right,
          width: phaseBounds.width,
          top: phaseBounds.top,
          bottom: phaseBounds.bottom
        };

        // Find the Recharts container
        const rechartsContainer = document.querySelector('.recharts-wrapper');
        if (!rechartsContainer) {
          results.errors.push('Recharts container not found');
          return results;
        }

        // Get the main chart SVG
        const chartSvg = rechartsContainer.querySelector('svg');
        if (!chartSvg) {
          results.errors.push('Chart SVG not found');
          return results;
        }

        const chartBounds = chartSvg.getBoundingClientRect();
        results.measurements.chart = {
          left: chartBounds.left,
          right: chartBounds.right,
          width: chartBounds.width,
          top: chartBounds.top,
          bottom: chartBounds.bottom
        };

        // Find the X-axis specifically
        const xAxis = chartSvg.querySelector('.recharts-xAxis');
        if (xAxis) {
          const xAxisBounds = xAxis.getBoundingClientRect();
          results.measurements.xAxis = {
            left: xAxisBounds.left,
            right: xAxisBounds.right,
            width: xAxisBounds.width,
            top: xAxisBounds.top,
            bottom: xAxisBounds.bottom
          };

          // Get X-axis tick positions
          const xAxisTicks = Array.from(xAxis.querySelectorAll('.recharts-cartesian-axis-tick'));
          results.measurements.xAxisTicks = xAxisTicks.map(tick => {
            const bounds = tick.getBoundingClientRect();
            const text = tick.querySelector('text')?.textContent || '';
            return {
              text,
              x: bounds.left,
              centerX: bounds.left + bounds.width / 2
            };
          });
        }

        // Find the CartesianGrid to get the actual plotting area
        const cartesianGrid = chartSvg.querySelector('.recharts-cartesian-grid');
        if (cartesianGrid) {
          const gridBounds = cartesianGrid.getBoundingClientRect();
          results.measurements.plottingArea = {
            left: gridBounds.left,
            right: gridBounds.right,
            width: gridBounds.width,
            top: gridBounds.top,
            bottom: gridBounds.bottom
          };
        }

        // Get phase bars and their positions (phase bars are div elements, not SVG rects)
        // Look for divs inside the timeline container that have phase styling
        const phaseBars = Array.from(timelineContainer.querySelectorAll('div[style*="position: absolute"]')).filter(div => {
          const style = div.style;
          return style.backgroundColor && style.left && style.width && parseInt(style.width) > 10;
        });
        results.measurements.phaseBars = phaseBars.map(bar => {
          const bounds = bar.getBoundingClientRect();
          return {
            phaseId: bar.getAttribute('data-phase-id') || 'unknown',
            phaseName: bar.textContent || 'unknown',
            left: bounds.left,
            right: bounds.right,
            width: bounds.width,
            centerX: bounds.left + bounds.width / 2
          };
        });

        // Calculate alignment differences
        results.measurements.alignment = {
          leftEdgeDiff: Math.abs(
            (results.measurements.plottingArea?.left || results.measurements.chart.left) -
            results.measurements.phaseDiagram.left
          ),
          rightEdgeDiff: Math.abs(
            (results.measurements.plottingArea?.right || results.measurements.chart.right) -
            results.measurements.phaseDiagram.right
          ),
          widthDiff: Math.abs(
            (results.measurements.plottingArea?.width || results.measurements.chart.width) -
            results.measurements.phaseDiagram.width
          )
        };

        results.success = true;
        return results;

      } catch (error) {
        results.errors.push(`Error during measurement: ${error.message}`);
        return results;
      }
    });

    console.log('\n📊 ALIGNMENT MEASUREMENT RESULTS:\n');
    console.log('════════════════════════════════════════════════════════════════');

    if (!alignmentData.success) {
      console.log('❌ MEASUREMENT FAILED');
      console.log('Errors:', alignmentData.errors);
      return { success: false, alignmentData, consoleLogs };
    }

    const { measurements } = alignmentData;

    console.log('\n📐 PHASE DIAGRAM:');
    console.log(`   Left:  ${measurements.phaseDiagram.left.toFixed(2)}px`);
    console.log(`   Right: ${measurements.phaseDiagram.right.toFixed(2)}px`);
    console.log(`   Width: ${measurements.phaseDiagram.width.toFixed(2)}px`);

    console.log('\n📊 CHART PLOTTING AREA:');
    const plottingArea = measurements.plottingArea || measurements.chart;
    console.log(`   Left:  ${plottingArea.left.toFixed(2)}px`);
    console.log(`   Right: ${plottingArea.right.toFixed(2)}px`);
    console.log(`   Width: ${plottingArea.width.toFixed(2)}px`);

    console.log('\n🎯 ALIGNMENT DIFFERENCES:');
    console.log(`   Left Edge:  ${measurements.alignment.leftEdgeDiff.toFixed(2)}px`);
    console.log(`   Right Edge: ${measurements.alignment.rightEdgeDiff.toFixed(2)}px`);
    console.log(`   Width:      ${measurements.alignment.widthDiff.toFixed(2)}px`);

    // Define acceptable tolerance (1px is reasonable for sub-pixel rendering)
    const TOLERANCE = 1.0;

    const leftAligned = measurements.alignment.leftEdgeDiff <= TOLERANCE;
    const rightAligned = measurements.alignment.rightEdgeDiff <= TOLERANCE;
    const widthAligned = measurements.alignment.widthDiff <= TOLERANCE;
    const perfectlyAligned = leftAligned && rightAligned && widthAligned;

    console.log('\n✅ ALIGNMENT STATUS (tolerance: ±1px):');
    console.log(`   Left Edge:  ${leftAligned ? '✅ ALIGNED' : '❌ MISALIGNED'}`);
    console.log(`   Right Edge: ${rightAligned ? '✅ ALIGNED' : '❌ MISALIGNED'}`);
    console.log(`   Width:      ${widthAligned ? '✅ ALIGNED' : '❌ MISALIGNED'}`);

    console.log('\n════════════════════════════════════════════════════════════════');

    if (perfectlyAligned) {
      console.log('\n🎉 SUCCESS! Timelines are PERFECTLY ALIGNED within tolerance!');
    } else {
      console.log('\n⚠️  WARNING! Timelines are NOT perfectly aligned!');
      console.log('\nRequired fixes:');
      if (!leftAligned) {
        console.log(`   - Adjust left edge by ${measurements.alignment.leftEdgeDiff.toFixed(2)}px`);
      }
      if (!rightAligned) {
        console.log(`   - Adjust right edge by ${measurements.alignment.rightEdgeDiff.toFixed(2)}px`);
      }
      if (!widthAligned) {
        console.log(`   - Adjust width by ${measurements.alignment.widthDiff.toFixed(2)}px`);
      }
    }

    // Take annotated screenshot
    await page.evaluate((measurements) => {
      // Add visual alignment markers
      const createMarker = (x, y, label, color) => {
        const marker = document.createElement('div');
        marker.style.position = 'fixed';
        marker.style.left = `${x}px`;
        marker.style.top = `${y}px`;
        marker.style.width = '2px';
        marker.style.height = '100vh';
        marker.style.backgroundColor = color;
        marker.style.zIndex = '10000';
        marker.style.pointerEvents = 'none';

        const labelDiv = document.createElement('div');
        labelDiv.textContent = label;
        labelDiv.style.position = 'fixed';
        labelDiv.style.left = `${x + 5}px`;
        labelDiv.style.top = `${y}px`;
        labelDiv.style.backgroundColor = color;
        labelDiv.style.color = 'white';
        labelDiv.style.padding = '2px 4px';
        labelDiv.style.fontSize = '10px';
        labelDiv.style.fontWeight = 'bold';
        labelDiv.style.zIndex = '10000';
        labelDiv.style.pointerEvents = 'none';

        document.body.appendChild(marker);
        document.body.appendChild(labelDiv);
      };

      const plottingArea = measurements.plottingArea || measurements.chart;

      // Left edges
      createMarker(measurements.phaseDiagram.left, measurements.phaseDiagram.top - 50,
        `Phase Left: ${measurements.phaseDiagram.left.toFixed(1)}`, 'rgba(255, 0, 0, 0.8)');
      createMarker(plottingArea.left, plottingArea.top - 50,
        `Chart Left: ${plottingArea.left.toFixed(1)}`, 'rgba(0, 0, 255, 0.8)');

      // Right edges
      createMarker(measurements.phaseDiagram.right, measurements.phaseDiagram.top - 50,
        `Phase Right: ${measurements.phaseDiagram.right.toFixed(1)}`, 'rgba(255, 0, 0, 0.8)');
      createMarker(plottingArea.right, plottingArea.top - 50,
        `Chart Right: ${plottingArea.right.toFixed(1)}`, 'rgba(0, 0, 255, 0.8)');

    }, measurements);

    await new Promise(resolve => setTimeout(resolve, 500));

    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '').replace('T', '_');
    const filename = `alignment-verification-${timestamp}.png`;
    const filepath = path.join(SCREENSHOT_DIR, filename);

    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    console.log(`\n📸 Taking annotated screenshot...`);
    await page.screenshot({
      path: filepath,
      fullPage: true
    });

    console.log(`✅ Screenshot saved to: ${filepath}`);

    // Save detailed report
    const reportPath = filepath.replace('.png', '-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      perfectlyAligned,
      tolerance: TOLERANCE,
      measurements,
      alignmentData,
      consoleLogs
    }, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}`);

    return {
      success: true,
      perfectlyAligned,
      alignmentData,
      measurements,
      filepath,
      reportPath,
      consoleLogs
    };

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

verifyTimelineAlignment()
  .then((result) => {
    console.log('\n✨ Verification complete!');
    if (result.perfectlyAligned) {
      console.log('🎉 PROOF: Timelines are perfectly aligned!');
      process.exit(0);
    } else {
      console.log('⚠️  Timelines need adjustment');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Verification failed:', error);
    process.exit(1);
  });

export { verifyTimelineAlignment };
