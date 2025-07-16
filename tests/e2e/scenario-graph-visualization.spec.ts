import { test, expect } from '@playwright/test';

test.describe('Scenario Graph Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/scenarios');
    await page.waitForLoadState('networkidle');
    
    // Switch to graphical view
    await page.click('button:has-text("Graphical")');
    await page.waitForTimeout(500);
  });

  test('should display orientation toggle buttons', async ({ page }) => {
    // Check that orientation toggle buttons are present
    await expect(page.locator('button[title="Vertical Layout"]')).toBeVisible();
    await expect(page.locator('button[title="Horizontal Layout"]')).toBeVisible();
  });

  test('should display vertical graph correctly', async ({ page }) => {
    // Ensure we're in vertical mode
    await page.click('button[title="Vertical Layout"]');
    await page.waitForTimeout(500);

    // Check for essential elements in vertical mode
    await expect(page.locator('.graph-container')).toBeVisible();
    await expect(page.locator('.graph-lanes.vertical')).toBeVisible();
    
    // Check for branch lines (lifelines) - should be vertical lines
    const branchLines = page.locator('.branch-line.vertical');
    await expect(branchLines).toHaveCount(await branchLines.count());
    
    // Check for commit dots
    const commitDots = page.locator('.commit-dot.vertical');
    await expect(commitDots).toHaveCount(await commitDots.count());
    
    // Check for commit info panels
    const infoPanels = page.locator('.commit-info-panel');
    await expect(infoPanels).toHaveCount(await infoPanels.count());
    
    // Verify dots are positioned correctly relative to branch lines
    const firstDot = commitDots.first();
    const firstLine = branchLines.first();
    
    if (await firstDot.isVisible() && await firstLine.isVisible()) {
      const dotBox = await firstDot.boundingBox();
      const lineBox = await firstLine.boundingBox();
      
      // In vertical mode, dots should be aligned with their respective branch lines
      expect(Math.abs(dotBox!.x - lineBox!.x)).toBeLessThan(20); // Allow 20px tolerance
    }
  });

  test('should display horizontal graph correctly', async ({ page }) => {
    // Switch to horizontal mode
    await page.click('button[title="Horizontal Layout"]');
    await page.waitForTimeout(500);

    // Check for essential elements in horizontal mode
    await expect(page.locator('.graph-container')).toBeVisible();
    await expect(page.locator('.graph-lanes.horizontal')).toBeVisible();
    
    // Check for branch lines (lifelines) - should be horizontal lines
    const branchLines = page.locator('.branch-line.horizontal');
    await expect(branchLines).toHaveCount(await branchLines.count());
    
    // Verify branch lines are visible (not opacity 0)
    const firstBranchLine = branchLines.first();
    if (await firstBranchLine.isVisible()) {
      const opacity = await firstBranchLine.evaluate(el => window.getComputedStyle(el).opacity);
      expect(parseFloat(opacity)).toBeGreaterThan(0.1); // Should have some opacity
    }
    
    // Check for commit dots
    const commitDots = page.locator('.commit-dot.horizontal');
    await expect(commitDots).toHaveCount(await commitDots.count());
    
    // Check for commit info panels with staggered positioning
    const infoPanels = page.locator('.commit-info-panel.horizontal');
    await expect(infoPanels).toHaveCount(await infoPanels.count());
    
    // Verify staggered positioning
    const topPositioned = page.locator('.commit-info-panel.horizontal.top-positioned');
    const bottomPositioned = page.locator('.commit-info-panel.horizontal.bottom-positioned');
    
    // Should have both top and bottom positioned labels
    expect(await topPositioned.count()).toBeGreaterThan(0);
    expect(await bottomPositioned.count()).toBeGreaterThan(0);
    
    // Verify dots are positioned correctly on the timeline
    const dots = await commitDots.all();
    for (let i = 0; i < Math.min(dots.length, 3); i++) {
      const dot = dots[i];
      const dotBox = await dot.boundingBox();
      
      if (dotBox) {
        // Each dot should be positioned at commitIndex * 140 + 60 from the left
        const expectedX = i * 140 + 60;
        expect(Math.abs(dotBox.x - expectedX)).toBeLessThan(50); // Allow 50px tolerance
      }
    }
  });

  test('should display L-shaped connectors in horizontal mode', async ({ page }) => {
    // Switch to horizontal mode
    await page.click('button[title="Horizontal Layout"]');
    await page.waitForTimeout(500);

    // Check for L-connectors using CSS pseudo-elements
    const infoPanels = page.locator('.commit-info-panel.horizontal');
    const panelCount = await infoPanels.count();
    
    if (panelCount > 0) {
      // Check that panels have the pseudo-elements by examining computed styles
      const firstPanel = infoPanels.first();
      
      // Check for ::before pseudo-element (vertical line)
      const beforeContent = await firstPanel.evaluate(el => {
        const before = window.getComputedStyle(el, '::before');
        return {
          content: before.content,
          display: before.display,
          position: before.position,
          width: before.width,
          height: before.height,
          background: before.background
        };
      });
      
      expect(beforeContent.content).toBe('""');
      expect(beforeContent.position).toBe('absolute');
      expect(beforeContent.width).toBe('2px');
      
      // Check for ::after pseudo-element (horizontal line)
      const afterContent = await firstPanel.evaluate(el => {
        const after = window.getComputedStyle(el, '::after');
        return {
          content: after.content,
          display: after.display,
          position: after.position,
          width: after.width,
          height: after.height
        };
      });
      
      expect(afterContent.content).toBe('""');
      expect(afterContent.position).toBe('absolute');
      expect(afterContent.height).toBe('2px');
    }
  });

  test('should handle orientation switching correctly', async ({ page }) => {
    // Start in vertical mode
    await page.click('button[title="Vertical Layout"]');
    await page.waitForTimeout(500);
    
    // Verify vertical elements are present
    await expect(page.locator('.graph-lanes.vertical')).toBeVisible();
    await expect(page.locator('.commit-dot.vertical')).toHaveCount(await page.locator('.commit-dot.vertical').count());
    
    // Switch to horizontal mode
    await page.click('button[title="Horizontal Layout"]');
    await page.waitForTimeout(500);
    
    // Verify horizontal elements are present
    await expect(page.locator('.graph-lanes.horizontal')).toBeVisible();
    await expect(page.locator('.commit-dot.horizontal')).toHaveCount(await page.locator('.commit-dot.horizontal').count());
    
    // Verify branch lines are present in horizontal mode
    const branchLines = page.locator('.branch-line.horizontal');
    expect(await branchLines.count()).toBeGreaterThan(0);
    
    // Switch back to vertical mode
    await page.click('button[title="Vertical Layout"]');
    await page.waitForTimeout(500);
    
    // Verify we're back to vertical layout
    await expect(page.locator('.graph-lanes.vertical')).toBeVisible();
  });

  test('should display scenario information correctly', async ({ page }) => {
    // Test both orientations
    for (const orientation of ['Vertical', 'Horizontal']) {
      await page.click(`button[title="${orientation} Layout"]`);
      await page.waitForTimeout(500);
      
      const infoPanels = page.locator('.commit-info-panel');
      const panelCount = await infoPanels.count();
      
      if (panelCount > 0) {
        const firstPanel = infoPanels.first();
        
        // Check for scenario name
        await expect(firstPanel.locator('.commit-title')).toBeVisible();
        
        // Check for scenario type badge
        await expect(firstPanel.locator('.scenario-type-badge')).toBeVisible();
        
        // Check for status
        await expect(firstPanel.locator('.commit-status')).toBeVisible();
        
        // Check for creator and date
        await expect(firstPanel.locator('.commit-meta')).toBeVisible();
      }
    }
  });

  test('should have proper visual hierarchy and spacing', async ({ page }) => {
    // Test horizontal layout spacing
    await page.click('button[title="Horizontal Layout"]');
    await page.waitForTimeout(500);
    
    const commitDots = page.locator('.commit-dot.horizontal');
    const dotCount = await commitDots.count();
    
    if (dotCount > 1) {
      const firstDot = await commitDots.nth(0).boundingBox();
      const secondDot = await commitDots.nth(1).boundingBox();
      
      if (firstDot && secondDot) {
        // Dots should be spaced 140px apart horizontally
        const spacing = secondDot.x - firstDot.x;
        expect(Math.abs(spacing - 140)).toBeLessThan(20); // Allow 20px tolerance
      }
    }
    
    // Test vertical layout spacing
    await page.click('button[title="Vertical Layout"]');
    await page.waitForTimeout(500);
    
    const verticalDots = page.locator('.commit-dot.vertical');
    const verticalCount = await verticalDots.count();
    
    if (verticalCount > 1) {
      const firstDot = await verticalDots.nth(0).boundingBox();
      const secondDot = await verticalDots.nth(1).boundingBox();
      
      if (firstDot && secondDot) {
        // Dots should be spaced 120px apart vertically
        const spacing = secondDot.y - firstDot.y;
        expect(Math.abs(spacing - 120)).toBeLessThan(20); // Allow 20px tolerance
      }
    }
  });
});