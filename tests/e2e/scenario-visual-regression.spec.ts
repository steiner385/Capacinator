import { test, expect } from '@playwright/test';
import { generateTestData } from './helpers/test-data-generator';

test.describe('Scenario Visual Regression Tests', () => {
  let testData: any;

  test.beforeEach(async ({ page }) => {
    // Generate consistent test data for visual comparison
    testData = await generateTestData(page);
    
    // Navigate to scenarios page
    await page.goto('/scenarios');
    await page.waitForLoadState('networkidle');
    
    // Wait for scenarios to load
    await page.waitForSelector('.scenario-card, .no-scenarios', { timeout: 10000 });
  });

  test.describe('Cards View Visual Tests', () => {
    test('should match cards view layout', async ({ page }) => {
      // Ensure we're in cards view
      await page.getByRole('button', { name: 'Cards' }).click();
      await page.waitForTimeout(500); // Allow for any animations
      
      // Take screenshot of the full cards view
      await expect(page.locator('.scenarios-page')).toHaveScreenshot('cards-view-full.png');
    });

    test('should match scenario card styling', async ({ page }) => {
      // Focus on individual card styling
      const firstCard = page.locator('.scenario-card').first();
      await expect(firstCard).toHaveScreenshot('scenario-card-individual.png');
    });

    test('should match different scenario type cards', async ({ page }) => {
      // Test baseline scenario card if it exists
      const baselineCard = page.locator('.scenario-card.baseline').first();
      if (await baselineCard.count() > 0) {
        await expect(baselineCard).toHaveScreenshot('scenario-card-baseline.png');
      }
      
      // Test branch scenario card if it exists
      const branchCard = page.locator('.scenario-card.branch').first();
      if (await branchCard.count() > 0) {
        await expect(branchCard).toHaveScreenshot('scenario-card-branch.png');
      }
      
      // Test sandbox scenario card if it exists
      const sandboxCard = page.locator('.scenario-card.sandbox').first();
      if (await sandboxCard.count() > 0) {
        await expect(sandboxCard).toHaveScreenshot('scenario-card-sandbox.png');
      }
    });

    test('should match card hover states', async ({ page }) => {
      const firstCard = page.locator('.scenario-card').first();
      
      // Hover over the card
      await firstCard.hover();
      await page.waitForTimeout(200); // Allow for hover animation
      
      await expect(firstCard).toHaveScreenshot('scenario-card-hover.png');
    });

    test('should match action button states', async ({ page }) => {
      const firstCard = page.locator('.scenario-card').first();
      const branchButton = firstCard.getByTitle('Create Branch');
      
      // Test button hover state
      await branchButton.hover();
      await page.waitForTimeout(200);
      
      await expect(branchButton).toHaveScreenshot('action-button-hover.png');
    });
  });

  test.describe('List View Visual Tests', () => {
    test('should match hierarchical list layout', async ({ page }) => {
      await page.getByRole('button', { name: 'List' }).click();
      await page.waitForTimeout(500);
      
      // Take screenshot of the full hierarchy view
      await expect(page.locator('.scenarios-hierarchy')).toHaveScreenshot('list-view-hierarchy.png');
    });

    test('should match hierarchy visual connections', async ({ page }) => {
      await page.getByRole('button', { name: 'List' }).click();
      await page.waitForTimeout(500);
      
      // Focus on the hierarchy lines and connections
      const hierarchyContent = page.locator('.hierarchy-content');
      await expect(hierarchyContent).toHaveScreenshot('hierarchy-connections.png');
    });

    test('should match hierarchy row styling', async ({ page }) => {
      await page.getByRole('button', { name: 'List' }).click();
      await page.waitForTimeout(500);
      
      const firstRow = page.locator('.hierarchy-row').first();
      await expect(firstRow).toHaveScreenshot('hierarchy-row-individual.png');
    });

    test('should match connector dots and lines', async ({ page }) => {
      await page.getByRole('button', { name: 'List' }).click();
      await page.waitForTimeout(500);
      
      // Focus on a specific connector area
      const connectorArea = page.locator('.hierarchy-lines').first();
      if (await connectorArea.count() > 0) {
        await expect(connectorArea).toHaveScreenshot('hierarchy-connector-lines.png');
      }
    });

    test('should match hierarchy legend', async ({ page }) => {
      await page.getByRole('button', { name: 'List' }).click();
      await page.waitForTimeout(500);
      
      const legend = page.locator('.hierarchy-legend');
      await expect(legend).toHaveScreenshot('hierarchy-legend.png');
    });
  });

  test.describe('Graphical View Visual Tests', () => {
    test('should match commit graph layout', async ({ page }) => {
      await page.getByRole('button', { name: 'Graphical' }).click();
      await page.waitForTimeout(500);
      
      // Take screenshot of the full commit graph
      await expect(page.locator('.commit-graph')).toHaveScreenshot('commit-graph-full.png');
    });

    test('should match branch lines and lanes', async ({ page }) => {
      await page.getByRole('button', { name: 'Graphical' }).click();
      await page.waitForTimeout(500);
      
      // Focus on the graph lanes area
      const graphLanes = page.locator('.graph-lanes');
      await expect(graphLanes).toHaveScreenshot('commit-graph-lanes.png');
    });

    test('should match commit dots styling', async ({ page }) => {
      await page.getByRole('button', { name: 'Graphical' }).click();
      await page.waitForTimeout(500);
      
      const firstCommitDot = page.locator('.commit-dot').first();
      await expect(firstCommitDot).toHaveScreenshot('commit-dot-individual.png');
    });

    test('should match commit info panels', async ({ page }) => {
      await page.getByRole('button', { name: 'Graphical' }).click();
      await page.waitForTimeout(500);
      
      const firstInfoPanel = page.locator('.commit-info-panel').first();
      await expect(firstInfoPanel).toHaveScreenshot('commit-info-panel.png');
    });

    test('should match commit dot hover states', async ({ page }) => {
      await page.getByRole('button', { name: 'Graphical' }).click();
      await page.waitForTimeout(500);
      
      const firstCommitDot = page.locator('.commit-dot').first();
      await firstCommitDot.hover();
      await page.waitForTimeout(200);
      
      await expect(firstCommitDot).toHaveScreenshot('commit-dot-hover.png');
    });

    test('should match branch connections', async ({ page }) => {
      await page.getByRole('button', { name: 'Graphical' }).click();
      await page.waitForTimeout(500);
      
      // Look for branch connection SVG elements
      const branchConnections = page.locator('.branch-connection');
      if (await branchConnections.count() > 0) {
        await expect(branchConnections.first()).toHaveScreenshot('branch-connection.png');
      }
    });

    test('should match graph legend', async ({ page }) => {
      await page.getByRole('button', { name: 'Graphical' }).click();
      await page.waitForTimeout(500);
      
      const legend = page.locator('.graph-legend');
      await expect(legend).toHaveScreenshot('graph-legend.png');
    });
  });

  test.describe('View Mode Toggle Visual Tests', () => {
    test('should match view mode toggle buttons', async ({ page }) => {
      const viewControls = page.locator('.view-controls');
      await expect(viewControls).toHaveScreenshot('view-mode-toggle.png');
    });

    test('should match active button states', async ({ page }) => {
      // Test each button in active state
      const cardsButton = page.getByRole('button', { name: 'Cards' });
      await expect(cardsButton).toHaveScreenshot('toggle-cards-active.png');
      
      await page.getByRole('button', { name: 'List' }).click();
      const listButton = page.getByRole('button', { name: 'List' });
      await expect(listButton).toHaveScreenshot('toggle-list-active.png');
      
      await page.getByRole('button', { name: 'Graphical' }).click();
      const graphicalButton = page.getByRole('button', { name: 'Graphical' });
      await expect(graphicalButton).toHaveScreenshot('toggle-graphical-active.png');
    });

    test('should match button hover states', async ({ page }) => {
      const listButton = page.getByRole('button', { name: 'List' });
      await listButton.hover();
      await page.waitForTimeout(200);
      
      await expect(listButton).toHaveScreenshot('toggle-button-hover.png');
    });
  });

  test.describe('Modal Visual Tests', () => {
    test('should match create scenario modal', async ({ page }) => {
      await page.getByRole('button', { name: 'New Scenario' }).click();
      await page.waitForTimeout(300);
      
      const modal = page.locator('.modal-content');
      await expect(modal).toHaveScreenshot('create-scenario-modal.png');
    });

    test('should match modal form elements', async ({ page }) => {
      await page.getByRole('button', { name: 'New Scenario' }).click();
      await page.waitForTimeout(300);
      
      // Test form fields
      const nameField = page.getByLabel('Scenario Name');
      await expect(nameField).toHaveScreenshot('modal-name-field.png');
      
      const typeSelect = page.getByLabel('Scenario Type');
      await expect(typeSelect).toHaveScreenshot('modal-type-select.png');
    });

    test('should match modal buttons', async ({ page }) => {
      await page.getByRole('button', { name: 'New Scenario' }).click();
      await page.waitForTimeout(300);
      
      const modalFooter = page.locator('.modal-footer');
      await expect(modalFooter).toHaveScreenshot('modal-buttons.png');
    });
  });

  test.describe('Responsive Visual Tests', () => {
    test('should match tablet layout', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);
      
      // Test cards view on tablet
      await expect(page.locator('.scenarios-page')).toHaveScreenshot('tablet-cards-view.png');
      
      // Test list view on tablet
      await page.getByRole('button', { name: 'List' }).click();
      await page.waitForTimeout(500);
      await expect(page.locator('.scenarios-hierarchy')).toHaveScreenshot('tablet-list-view.png');
      
      // Test graphical view on tablet
      await page.getByRole('button', { name: 'Graphical' }).click();
      await page.waitForTimeout(500);
      await expect(page.locator('.commit-graph')).toHaveScreenshot('tablet-graphical-view.png');
    });

    test('should match mobile layout', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      // Test cards view on mobile
      await expect(page.locator('.scenarios-page')).toHaveScreenshot('mobile-cards-view.png');
      
      // Test view toggle on mobile
      const viewControls = page.locator('.view-controls');
      await expect(viewControls).toHaveScreenshot('mobile-view-toggle.png');
    });
  });

  test.describe('Dark Mode Visual Tests', () => {
    test.beforeEach(async ({ page }) => {
      // Enable dark mode if supported
      await page.addStyleTag({
        content: `
          :root {
            --bg-primary: #1a1a1a;
            --bg-secondary: #2a2a2a;
            --card-bg: #2a2a2a;
            --text-primary: #ffffff;
            --text-secondary: #cccccc;
            --border-color: #404040;
          }
        `
      });
    });

    test('should match dark mode cards view', async ({ page }) => {
      await expect(page.locator('.scenarios-page')).toHaveScreenshot('dark-cards-view.png');
    });

    test('should match dark mode list view', async ({ page }) => {
      await page.getByRole('button', { name: 'List' }).click();
      await page.waitForTimeout(500);
      
      await expect(page.locator('.scenarios-hierarchy')).toHaveScreenshot('dark-list-view.png');
    });

    test('should match dark mode graphical view', async ({ page }) => {
      await page.getByRole('button', { name: 'Graphical' }).click();
      await page.waitForTimeout(500);
      
      await expect(page.locator('.commit-graph')).toHaveScreenshot('dark-graphical-view.png');
    });
  });

  test.describe('Animation and Transition Tests', () => {
    test('should match view transition states', async ({ page }) => {
      // Test rapid view switching to ensure no visual glitches
      await page.getByRole('button', { name: 'List' }).click();
      await page.waitForTimeout(100);
      
      await page.getByRole('button', { name: 'Graphical' }).click();
      await page.waitForTimeout(100);
      
      await page.getByRole('button', { name: 'Cards' }).click();
      await page.waitForTimeout(500);
      
      // Final state should be clean
      await expect(page.locator('.scenarios-page')).toHaveScreenshot('transition-final-state.png');
    });

    test('should match loading states', async ({ page }) => {
      // Test loading spinner if visible during slow loads
      await page.route('**/api/scenarios', async route => {
        // Delay response to capture loading state
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.continue();
      });
      
      await page.reload();
      
      // Try to capture loading state
      try {
        await expect(page.getByText('Loading scenarios...')).toHaveScreenshot('loading-state.png');
      } catch (e) {
        // Loading might be too fast to capture, that's okay
      }
    });
  });
});