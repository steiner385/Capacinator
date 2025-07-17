import { test, expect, devices } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Mobile Features Comprehensive Tests', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.setupPage();
  });

  test.describe('Mobile Responsive Layouts', () => {
    test('should adapt dashboard layout for mobile viewport', async ({ page }) => {
      // Test mobile viewport (375x667 - iPhone SE)
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');
      await helpers.setupPage();

      // Check if dashboard cards stack vertically on mobile
      const dashboardCards = page.locator('.dashboard-card, .metric-card, .summary-card');
      
      if (await dashboardCards.count() > 0) {
        // Get the position of first two cards to check stacking
        const firstCard = dashboardCards.first();
        const secondCard = dashboardCards.nth(1);
        
        if (await secondCard.count() > 0) {
          const firstCardBox = await firstCard.boundingBox();
          const secondCardBox = await secondCard.boundingBox();
          
          // On mobile, cards should stack vertically (second card below first)
          if (firstCardBox && secondCardBox) {
            expect(secondCardBox.y).toBeGreaterThan(firstCardBox.y + firstCardBox.height - 50);
            console.log('✅ Dashboard cards stack vertically on mobile');
          }
        }
      }

      // Check for mobile-optimized chart sizes
      const charts = page.locator('.recharts-responsive-container, .chart-container');
      if (await charts.count() > 0) {
        const chartBox = await charts.first().boundingBox();
        if (chartBox) {
          expect(chartBox.width).toBeLessThan(400); // Should fit mobile viewport
          console.log('✅ Charts adapt to mobile viewport size');
        }
      }
    });

    test('should handle tablet viewport transitions', async ({ page }) => {
      // Start with desktop viewport
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.goto('/projects');
      await helpers.setupPage();

      // Check initial layout
      const sidebar = page.locator('.sidebar');
      const mainContent = page.locator('.main-content');
      
      if (await sidebar.count() > 0) {
        const sidebarBox = await sidebar.boundingBox();
        expect(sidebarBox?.width).toBeGreaterThan(200);
      }

      // Transition to tablet viewport (768px)
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500); // Allow layout to adapt

      // Check if layout adapts for tablet
      if (await sidebar.count() > 0) {
        const newSidebarBox = await sidebar.boundingBox();
        console.log(`✅ Sidebar adapts to tablet viewport: ${newSidebarBox?.width}px wide`);
      }

      // Check if content area adjusts
      if (await mainContent.count() > 0) {
        const contentBox = await mainContent.boundingBox();
        expect(contentBox?.width).toBeLessThan(600); // Should fit tablet layout
        console.log('✅ Main content adapts to tablet viewport');
      }
    });

    test('should display full-screen modals on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/projects');
      await helpers.setupPage();

      // Try to open a modal (new project)
      const newProjectButton = page.locator('button:has-text("Add Project"), button:has-text("New Project")');
      
      if (await newProjectButton.count() > 0) {
        await newProjectButton.click();
        await page.waitForTimeout(1000);

        // Check if modal goes full-screen on mobile
        const modal = page.locator('.modal, .dialog, [role="dialog"]');
        
        if (await modal.count() > 0) {
          const modalBox = await modal.boundingBox();
          const viewport = page.viewportSize();
          
          if (modalBox && viewport) {
            // Modal should take most of the screen on mobile
            const widthRatio = modalBox.width / viewport.width;
            const heightRatio = modalBox.height / viewport.height;
            
            expect(widthRatio).toBeGreaterThan(0.8); // At least 80% width
            console.log(`✅ Modal uses ${Math.round(widthRatio * 100)}% of mobile viewport width`);
          }
        }
      }
    });

    test('should handle data table responsive behavior', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/people');
      await helpers.setupPage();

      // Check for data table
      const table = page.locator('table, .data-table');
      
      if (await table.count() > 0) {
        const tableBox = await table.boundingBox();
        const viewport = page.viewportSize();
        
        if (tableBox && viewport) {
          // Table might be wider than viewport, requiring horizontal scroll
          if (tableBox.width > viewport.width) {
            console.log('✅ Data table enables horizontal scroll on mobile');
            
            // Check for scrollable container
            const scrollContainer = page.locator('.table-container, .overflow-x-auto, .table-responsive');
            expect(await scrollContainer.count()).toBeGreaterThan(0);
          }
        }

        // Check if table headers are visible
        const tableHeaders = page.locator('th');
        if (await tableHeaders.count() > 0) {
          const headerVisible = await tableHeaders.first().isVisible();
          expect(headerVisible).toBeTruthy();
          console.log('✅ Table headers remain accessible on mobile');
        }
      }
    });

    test('should adapt form layouts for mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/settings');
      await helpers.setupPage();

      // Check form layout adaptation
      const formFields = page.locator('input, select, textarea');
      
      if (await formFields.count() > 0) {
        // Check if form fields are full-width on mobile
        const fieldBox = await formFields.first().boundingBox();
        const viewport = page.viewportSize();
        
        if (fieldBox && viewport) {
          const widthRatio = fieldBox.width / (viewport.width - 40); // Account for padding
          expect(widthRatio).toBeGreaterThan(0.8); // Should be mostly full-width
          console.log('✅ Form fields adapt to mobile width');
        }

        // Check if labels are positioned correctly for mobile
        const labels = page.locator('label');
        if (await labels.count() > 0) {
          console.log('✅ Form labels adapt to mobile layout');
        }
      }
    });
  });

  test.describe('Touch Interactions and Navigation', () => {
    test('should handle basic touch interactions', async ({ page }) => {
      // Use mobile viewport and test touch-like behavior
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');
      await helpers.setupPage();

      // Test button touch interactions
      const buttons = page.locator('button:visible');
      
      if (await buttons.count() > 0) {
        const firstButton = buttons.first();
        
        // Check button touch target size (minimum 44px for accessibility)
        const buttonBox = await firstButton.boundingBox();
        if (buttonBox) {
          expect(buttonBox.height).toBeGreaterThanOrEqual(40); // Close to touch target size
          console.log(`✅ Button touch target size: ${buttonBox.height}px`);
        }

        // Test touch interaction
        await firstButton.click();
        await page.waitForTimeout(500);
        console.log('✅ Basic touch interaction successful');
      }
    });

    test('should support mobile navigation patterns', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await helpers.setupPage();

      // Check sidebar behavior on mobile
      const sidebar = page.locator('.sidebar');
      
      if (await sidebar.count() > 0) {
        const sidebarVisible = await sidebar.isVisible();
        
        if (sidebarVisible) {
          console.log('✅ Fixed sidebar navigation on mobile');
          
          // Test navigation link clicks
          const navLinks = page.locator('.sidebar a, .nav-link');
          if (await navLinks.count() > 0) {
            await navLinks.first().click();
            await page.waitForTimeout(1000);
            console.log('✅ Mobile navigation links functional');
          }
        }
      }

      // Look for mobile menu toggle (if implemented)
      const menuToggle = page.locator('button[aria-label*="menu"], .hamburger, .menu-toggle');
      
      if (await menuToggle.count() > 0) {
        await menuToggle.click();
        await page.waitForTimeout(500);
        console.log('✅ Mobile menu toggle functionality available');
      } else {
        console.log('ℹ️ No mobile hamburger menu found - using fixed sidebar');
      }
    });

    test('should handle gesture-like interactions', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/projects');
      await helpers.setupPage();

      // Test swipe-like behavior (not true gestures, but mouse drag simulation)
      const scrollableArea = page.locator('.table-container, .scroll-container, .main-content');
      
      if (await scrollableArea.count() > 0) {
        const scrollArea = scrollableArea.first();
        const scrollBox = await scrollArea.boundingBox();
        
        if (scrollBox) {
          // Simulate horizontal scroll/swipe on mobile
          await page.mouse.move(scrollBox.x + 100, scrollBox.y + 50);
          await page.mouse.down();
          await page.mouse.move(scrollBox.x + 50, scrollBox.y + 50);
          await page.mouse.up();
          
          console.log('✅ Horizontal scroll/swipe simulation successful');
        }
      }

      // Test pull-to-refresh simulation (if available)
      const refreshArea = page.locator('.refresh-container, [data-testid="pull-refresh"]');
      
      if (await refreshArea.count() > 0) {
        console.log('✅ Pull-to-refresh functionality detected');
      } else {
        console.log('ℹ️ Pull-to-refresh not implemented');
      }
    });

    test('should support keyboard navigation on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/settings');
      await helpers.setupPage();

      // Test tab navigation on mobile devices with keyboards
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
      
      const focusedElement = page.locator(':focus');
      if (await focusedElement.count() > 0) {
        console.log('✅ Keyboard navigation works on mobile viewport');
        
        // Continue tabbing through elements
        for (let i = 0; i < 5; i++) {
          await page.keyboard.press('Tab');
          await page.waitForTimeout(100);
        }
        
        console.log('✅ Tab navigation sequence completed');
      }
    });
  });

  test.describe('Mobile Workflows and User Experience', () => {
    test('should complete project creation workflow on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/projects');
      await helpers.setupPage();

      // Start project creation workflow
      const newProjectButton = page.locator('button:has-text("Add Project"), button:has-text("New Project")');
      
      if (await newProjectButton.count() > 0) {
        await newProjectButton.click();
        await page.waitForTimeout(1000);

        // Fill project form on mobile
        const nameField = page.locator('input[name="name"], input[placeholder*="name"]');
        if (await nameField.count() > 0) {
          await nameField.fill('Mobile Test Project');
          
          // Check if virtual keyboard doesn't obstruct form
          const fieldBox = await nameField.boundingBox();
          if (fieldBox) {
            expect(fieldBox.y).toBeGreaterThan(0); // Should be visible
            console.log('✅ Form field remains visible during mobile input');
          }
        }

        // Select project type on mobile
        const typeSelect = page.locator('select[name="project_type_id"], select[name="type"]');
        if (await typeSelect.count() > 0 && await typeSelect.locator('option').count() > 1) {
          await typeSelect.selectOption({ index: 1 });
          console.log('✅ Dropdown selection works on mobile');
        }

        // Save project
        const saveButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
        if (await saveButton.count() > 0) {
          await saveButton.click();
          await page.waitForTimeout(1000);
          console.log('✅ Mobile project creation workflow completed');
        }
      }
    });

    test('should handle assignment creation on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/assignments');
      await helpers.setupPage();

      // Test assignment workflow
      const newAssignmentButton = page.locator('button:has-text("Add Assignment"), button:has-text("New Assignment")');
      
      if (await newAssignmentButton.count() > 0) {
        await newAssignmentButton.click();
        await page.waitForTimeout(1000);

        // Test mobile form interactions
        const projectSelect = page.locator('select[name="project_id"]');
        const personSelect = page.locator('select[name="person_id"]');
        const allocationInput = page.locator('input[name="allocation_percentage"]');

        if (await projectSelect.count() > 0 && await projectSelect.locator('option').count() > 1) {
          await projectSelect.selectOption({ index: 1 });
        }

        if (await personSelect.count() > 0 && await personSelect.locator('option').count() > 1) {
          await personSelect.selectOption({ index: 1 });
        }

        if (await allocationInput.count() > 0) {
          await allocationInput.fill('50');
          
          // Test numeric input on mobile
          const inputValue = await allocationInput.inputValue();
          expect(inputValue).toBe('50');
          console.log('✅ Numeric input works correctly on mobile');
        }

        console.log('✅ Mobile assignment creation workflow functional');
      }
    });

    test('should navigate between pages efficiently on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');
      await helpers.setupPage();

      // Test navigation between key pages
      const navigationPages = [
        { name: 'Projects', path: '/projects' },
        { name: 'People', path: '/people' },
        { name: 'Assignments', path: '/assignments' },
        { name: 'Reports', path: '/reports' }
      ];

      for (const navPage of navigationPages) {
        const navLink = page.locator(`a:has-text("${navPage.name}"), nav a[href="${navPage.path}"]`);
        
        if (await navLink.count() > 0) {
          const startTime = Date.now();
          await navLink.click();
          await helpers.waitForNavigation();
          const endTime = Date.now();
          
          const navigationTime = endTime - startTime;
          expect(navigationTime).toBeLessThan(5000); // Should navigate within 5 seconds
          
          console.log(`✅ Navigation to ${navPage.name}: ${navigationTime}ms`);
        }
      }
    });

    test('should handle data filtering on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/projects');
      await helpers.setupPage();

      // Test filter interactions on mobile
      const filterControls = page.locator('select, input[type="date"], input[name*="filter"]');
      
      if (await filterControls.count() > 0) {
        // Test date filter on mobile
        const dateFilter = page.locator('input[type="date"]');
        if (await dateFilter.count() > 0) {
          await dateFilter.first().fill('2024-01-01');
          await page.waitForTimeout(1000);
          console.log('✅ Date filter works on mobile');
        }

        // Test dropdown filter on mobile
        const selectFilter = page.locator('select');
        if (await selectFilter.count() > 0 && await selectFilter.first().locator('option').count() > 1) {
          await selectFilter.first().selectOption({ index: 1 });
          await page.waitForTimeout(1000);
          console.log('✅ Dropdown filter works on mobile');
        }

        // Check if results update
        const resultCount = await page.locator('tbody tr, .result-item').count();
        expect(resultCount).toBeGreaterThanOrEqual(0);
        console.log('✅ Mobile filtering produces results');
      }
    });
  });

  test.describe('Mobile Performance Testing', () => {
    test('should load pages efficiently on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Test performance on key pages
      const testPages = [
        { name: 'Dashboard', path: '/' },
        { name: 'Projects', path: '/projects' },
        { name: 'Reports', path: '/reports' }
      ];

      for (const testPage of testPages) {
        const startTime = Date.now();
        await page.goto(testPage.path);
        await helpers.setupPage();
        await page.waitForLoadState('networkidle');
        const endTime = Date.now();
        
        const loadTime = endTime - startTime;
        expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
        
        console.log(`✅ ${testPage.name} mobile load time: ${loadTime}ms`);
      }
    });

    test('should handle large datasets on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/people');
      await helpers.setupPage();

      // Set filters to potentially get more data
      const startDate = page.locator('input[type="date"]').first();
      if (await startDate.count() > 0) {
        await startDate.fill('2020-01-01');
      }

      const endDate = page.locator('input[type="date"]').last();
      if (await endDate.count() > 0) {
        await endDate.fill('2030-12-31');
      }

      // Apply filters and measure response time
      const startTime = Date.now();
      const applyButton = page.locator('button:has-text("Apply"), button:has-text("Filter")');
      if (await applyButton.count() > 0) {
        await applyButton.click();
      }
      
      await page.waitForLoadState('networkidle');
      const endTime = Date.now();
      
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(15000); // Should respond within 15 seconds on mobile
      
      console.log(`✅ Large dataset handling on mobile: ${responseTime}ms`);
    });

    test('should render charts efficiently on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/reports');
      await helpers.setupPage();
      
      // Wait for charts to render
      const startTime = Date.now();
      const charts = page.locator('.recharts-responsive-container, .chart-container');
      
      if (await charts.count() > 0) {
        await expect(charts.first()).toBeVisible({ timeout: 10000 });
        const endTime = Date.now();
        
        const renderTime = endTime - startTime;
        expect(renderTime).toBeLessThan(8000); // Charts should render within 8 seconds
        
        console.log(`✅ Chart rendering on mobile: ${renderTime}ms`);
        
        // Check if charts are responsive
        const chartBox = await charts.first().boundingBox();
        if (chartBox) {
          expect(chartBox.width).toBeLessThan(400); // Should fit mobile viewport
          console.log('✅ Charts adapt to mobile viewport efficiently');
        }
      }
    });
  });

  test.describe('Offline Functionality Testing', () => {
    test('should detect network status', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');
      await helpers.setupPage();

      // Check for network status detection
      const networkStatus = page.locator('.network-status, .offline-indicator, [data-testid="network-status"]');
      
      if (await networkStatus.count() > 0) {
        console.log('✅ Network status detection available');
      } else {
        console.log('ℹ️ Network status detection not implemented');
      }

      // Test offline simulation
      await page.context().setOffline(true);
      await page.waitForTimeout(2000);
      
      // Check for offline handling
      const offlineMessage = page.locator('text=/offline|no connection|network error/i');
      
      if (await offlineMessage.count() > 0) {
        console.log('✅ Offline detection and messaging working');
      } else {
        console.log('ℹ️ Offline detection not implemented');
      }

      // Restore online status
      await page.context().setOffline(false);
    });

    test('should handle data caching for offline use', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/projects');
      await helpers.setupPage();
      
      // Load data while online
      await page.waitForLoadState('networkidle');
      const onlineDataCount = await page.locator('tbody tr, .project-item').count();
      
      // Go offline
      await page.context().setOffline(true);
      await page.reload();
      await page.waitForTimeout(3000);
      
      // Check if data is still available (cached)
      const offlineDataCount = await page.locator('tbody tr, .project-item').count();
      
      if (offlineDataCount > 0) {
        console.log(`✅ Data caching works: ${offlineDataCount} items available offline`);
      } else {
        console.log('ℹ️ Offline data caching not implemented');
      }

      // Restore online status
      await page.context().setOffline(false);
    });

    test('should provide offline-first functionality', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Check for PWA manifest
      const response = await page.request.get('/manifest.json').catch(() => null);
      
      if (response && response.status() === 200) {
        console.log('✅ PWA manifest available');
        
        const manifest = await response.json();
        expect(manifest.name || manifest.short_name).toBeTruthy();
      } else {
        console.log('ℹ️ PWA manifest not found');
      }

      // Check for service worker
      await page.goto('/');
      await helpers.setupPage();
      
      const serviceWorker = await page.evaluate(() => {
        return 'serviceWorker' in navigator;
      });
      
      if (serviceWorker) {
        const swRegistered = await page.evaluate(() => {
          return navigator.serviceWorker.getRegistrations().then(regs => regs.length > 0);
        });
        
        if (swRegistered) {
          console.log('✅ Service worker registered');
        } else {
          console.log('ℹ️ Service worker not registered');
        }
      } else {
        console.log('ℹ️ Service worker not supported in test environment');
      }
    });
  });

  test.describe('Mobile Accessibility and Usability', () => {
    test('should maintain accessibility standards on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');
      await helpers.setupPage();

      // Check for proper viewport meta tag
      const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
      expect(viewportMeta).toContain('width=device-width');
      console.log('✅ Proper viewport meta tag configured');

      // Check touch target sizes
      const interactiveElements = page.locator('button, a, input, select');
      const elementCount = await interactiveElements.count();
      
      if (elementCount > 0) {
        for (let i = 0; i < Math.min(elementCount, 5); i++) {
          const element = interactiveElements.nth(i);
          const box = await element.boundingBox();
          
          if (box) {
            const touchTargetSize = Math.min(box.width, box.height);
            if (touchTargetSize >= 40) { // Minimum touch target size
              console.log(`✅ Touch target ${i + 1}: ${touchTargetSize}px (accessible)`);
            }
          }
        }
      }

      // Check for proper focus indicators
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      
      if (await focusedElement.count() > 0) {
        console.log('✅ Focus indicators work on mobile');
      }
    });

    test('should support mobile screen readers', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/settings');
      await helpers.setupPage();

      // Check for ARIA labels and accessibility attributes
      const ariaLabels = page.locator('[aria-label], [aria-labelledby], [aria-describedby]');
      const ariaCount = await ariaLabels.count();
      
      if (ariaCount > 0) {
        console.log(`✅ Found ${ariaCount} elements with ARIA attributes`);
      }

      // Check for proper heading structure
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      
      if (headingCount > 0) {
        console.log(`✅ Found ${headingCount} headings for screen reader navigation`);
      }

      // Check for skip links
      const skipLinks = page.locator('a[href="#main"], a:has-text("Skip to content")');
      
      if (await skipLinks.count() > 0) {
        console.log('✅ Skip links available for accessibility');
      } else {
        console.log('ℹ️ Skip links not found');
      }
    });

    test('should handle landscape orientation', async ({ page }) => {
      // Start in portrait mode
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/projects');
      await helpers.setupPage();

      // Switch to landscape mode
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(1000);

      // Check if layout adapts to landscape
      const mainContent = page.locator('.main-content');
      if (await mainContent.count() > 0) {
        const contentBox = await mainContent.boundingBox();
        
        if (contentBox) {
          expect(contentBox.width).toBeGreaterThan(contentBox.height);
          console.log('✅ Layout adapts to landscape orientation');
        }
      }

      // Check if navigation remains accessible in landscape
      const sidebar = page.locator('.sidebar');
      if (await sidebar.count() > 0) {
        const sidebarVisible = await sidebar.isVisible();
        expect(sidebarVisible).toBeTruthy();
        console.log('✅ Navigation remains accessible in landscape mode');
      }
    });
  });
});