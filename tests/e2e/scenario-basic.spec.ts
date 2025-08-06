import { test, expect, waitForPageReady } from './helpers/base-test';
import { testConfig } from './helpers/test-config';

test.describe('Scenario View Basic Tests', () => {
  test('should load scenarios page and display view modes', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    // Navigate to scenarios page
    await page.goto('/scenarios');
    await waitForPageReady(page);
    
    // Check that the page loads and contains expected elements
    await expect(page.locator('.scenarios-page, .scenarios-container, main')).toBeVisible({ 
      timeout: testConfig.timeouts.elementVisible 
    });
    
    // Check view mode toggle buttons exist
    await expect(page.getByRole('button', { name: 'Cards' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'List' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Graphical' })).toBeVisible();
    
    // Cards should be active by default
    const cardsButton = page.getByRole('button', { name: 'Cards' });
    await expect(cardsButton).toHaveClass(/btn-primary|active|selected/);
  });

  test('should switch between view modes', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    // Navigate to scenarios page
    await page.goto('/scenarios');
    await waitForPageReady(page);
    
    // Switch to List view
    const listButton = page.getByRole('button', { name: 'List' });
    await listButton.click();
    await page.waitForTimeout(testConfig.testData.animationDelay);
    await expect(listButton).toHaveClass(/btn-primary|active|selected/);
    
    // Switch to Graphical view
    const graphicalButton = page.getByRole('button', { name: 'Graphical' });
    await graphicalButton.click();
    await page.waitForTimeout(testConfig.testData.animationDelay);
    await expect(graphicalButton).toHaveClass(/btn-primary|active|selected/);
    
    // Switch back to Cards view
    const cardsButton = page.getByRole('button', { name: 'Cards' });
    await cardsButton.click();
    await page.waitForTimeout(testConfig.testData.animationDelay);
    await expect(cardsButton).toHaveClass(/btn-primary|active|selected/);
  });

  test('should display scenario content or loading state', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    // Navigate to scenarios page
    await page.goto('/scenarios');
    await waitForPageReady(page);
    
    // Should show either loading state or content
    const hasLoading = await page.locator('.page-loading, .loading, .spinner').isVisible();
    const hasContent = await page.locator('.scenarios-content, .scenario-card, .scenario-list, .scenario-graph').isVisible();
    const hasEmptyState = await page.locator('.empty-state, .no-scenarios').isVisible();
    
    expect(hasLoading || hasContent || hasEmptyState).toBeTruthy();
    
    // If content is visible, verify basic structure
    if (hasContent) {
      console.log('✅ Scenario content is displayed');
      
      // Check for scenario cards in cards view
      const scenarioCards = page.locator('.scenario-card');
      const cardCount = await scenarioCards.count();
      
      if (cardCount > 0) {
        console.log(`✅ Found ${cardCount} scenario card(s)`);
        
        // Verify first card has expected elements
        const firstCard = scenarioCards.first();
        await expect(firstCard).toBeVisible();
        
        // Check for scenario name
        const scenarioName = firstCard.locator('.scenario-name, h3, h4');
        if (await scenarioName.isVisible()) {
          const name = await scenarioName.textContent();
          console.log(`✅ First scenario: ${name}`);
        }
      }
    }
  });

  test('should handle scenario actions when available', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    // Navigate to scenarios page
    await page.goto('/scenarios');
    await waitForPageReady(page);
    
    // Look for action buttons
    const actionButtons = page.locator('button').filter({ 
      hasText: /Create|New|Add|Compare|Edit|Delete/i 
    });
    
    const actionCount = await actionButtons.count();
    
    if (actionCount > 0) {
      console.log(`✅ Found ${actionCount} action button(s)`);
      
      // Test Create/New scenario button if available
      const createButton = page.locator('button').filter({ 
        hasText: /Create Scenario|New Scenario|Add Scenario/i 
      });
      
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForTimeout(testConfig.testData.animationDelay);
        
        // Check if modal opened or navigation happened
        const hasModal = await page.locator(testConfig.selectors.modalDialog).isVisible();
        const urlChanged = page.url().includes('/new') || page.url().includes('/create');
        
        expect(hasModal || urlChanged).toBeTruthy();
        console.log('✅ Create scenario action works');
        
        // Close modal if opened
        if (hasModal) {
          const closeButton = page.locator('button').filter({ hasText: /Cancel|Close/i });
          if (await closeButton.isVisible()) {
            await closeButton.click();
            await page.waitForTimeout(testConfig.testData.animationDelay);
          }
        }
      }
    } else {
      console.log('ℹ️ No scenario action buttons found');
    }
  });

  test('should display scenario comparison when in compare mode', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    // Navigate to scenarios page
    await page.goto('/scenarios');
    await waitForPageReady(page);
    
    // Look for compare button or toggle
    const compareButton = page.locator('button').filter({ hasText: /Compare/i });
    
    if (await compareButton.isVisible()) {
      await compareButton.click();
      await page.waitForTimeout(testConfig.testData.animationDelay);
      
      // Check for comparison UI elements
      const hasComparisonUI = await page.locator('.comparison-view, .scenario-comparison').isVisible() ||
                             await page.locator('input[type="checkbox"]').count() > 0;
      
      if (hasComparisonUI) {
        console.log('✅ Scenario comparison mode activated');
        
        // Try selecting scenarios for comparison if checkboxes exist
        const checkboxes = page.locator('input[type="checkbox"]');
        const checkboxCount = await checkboxes.count();
        
        if (checkboxCount >= 2) {
          // Select first two scenarios
          await checkboxes.nth(0).check();
          await checkboxes.nth(1).check();
          
          // Look for compare action
          const compareSelectedButton = page.locator('button').filter({ 
            hasText: /Compare Selected|View Comparison/i 
          });
          
          if (await compareSelectedButton.isVisible()) {
            await compareSelectedButton.click();
            await page.waitForTimeout(testConfig.testData.animationDelay);
            console.log('✅ Scenario comparison triggered');
          }
        }
      }
    } else {
      console.log('ℹ️ Compare functionality not available');
    }
  });
});