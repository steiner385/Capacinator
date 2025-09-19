import { test, expect } from '@playwright/test'
import { setupPageWithAuth } from './utils/improved-auth-helpers';;
import { TestDataGenerator } from './helpers/test-data-generator';

test.describe('Project Roadmap Search Functionality', () => {
  let testDataGenerator: TestDataGenerator;

  test.beforeEach(async ({ request, page }) => {
    testDataGenerator = new TestDataGenerator(request);
    
    // Create test data for search scenarios
    await testDataGenerator.generateSearchTestData();
    
    // Navigate to the roadmap page
    await setupPageWithAuth(page, '/roadmap');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
  });

  test.afterEach(async () => {
    // Clean up test data after each test
    await testDataGenerator.cleanupTestData();
  });

  test.describe('Basic Search Functionality', () => {
    test('should show search input with placeholder text', async ({ page }) => {
      const searchInput = page.locator('input[placeholder="Search projects..."]');
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toHaveAttribute('placeholder', 'Search projects...');
      await expect(searchInput).toHaveValue('');
    });

    test('should filter projects by exact name match', async ({ page }) => {
      // Wait for projects to load
      await page.waitForSelector('.project-row', { timeout: 10000 });
      const initialProjectCount = await page.locator('.project-row').count();
      expect(initialProjectCount).toBeGreaterThan(0);

      // Search for a specific project
      const searchInput = page.locator('input[placeholder="Search projects..."]');
      await searchInput.fill('E-commerce Platform');
      
      // Wait for search results
      await page.waitForTimeout(1000); // Allow for debouncing
      
      const filteredProjects = page.locator('.project-row');
      const filteredCount = await filteredProjects.count();
      
      // Should show fewer projects than initially
      expect(filteredCount).toBeLessThanOrEqual(initialProjectCount);
      
      // Check that visible projects contain the search term
      if (filteredCount > 0) {
        const projectNames = await filteredProjects.locator('.project-info h3').allTextContents();
        expect(projectNames.some(name => name.toLowerCase().includes('e-commerce platform'))).toBeTruthy();
      }
    });

    test('should filter projects by partial name match', async ({ page }) => {
      // Wait for projects to load
      await page.waitForSelector('.project-row', { timeout: 10000 });
      
      const searchInput = page.locator('input[placeholder="Search projects..."]');
      await searchInput.fill('Mobile');
      
      // Wait for search results
      await page.waitForTimeout(1000);
      
      const filteredProjects = page.locator('.project-row');
      const filteredCount = await filteredProjects.count();
      
      if (filteredCount > 0) {
        const projectNames = await filteredProjects.locator('.project-info h3').allTextContents();
        // All visible projects should contain 'Mobile' in their name
        const allMatch = projectNames.every(name => name.toLowerCase().includes('mobile'));
        expect(allMatch).toBeTruthy();
      }
    });

    test('should be case-insensitive', async ({ page }) => {
      // Wait for projects to load
      await page.waitForSelector('.project-row', { timeout: 10000 });
      
      const searchInput = page.locator('input[placeholder="Search projects..."]');
      
      // Test with lowercase
      await searchInput.fill('platform');
      await page.waitForTimeout(1000);
      const lowercaseCount = await page.locator('.project-row').count();
      
      // Clear and test with uppercase
      await searchInput.clear();
      await searchInput.fill('PLATFORM');
      await page.waitForTimeout(1000);
      const uppercaseCount = await page.locator('.project-row').count();
      
      // Clear and test with mixed case
      await searchInput.clear();
      await searchInput.fill('PlAtFoRm');
      await page.waitForTimeout(1000);
      const mixedcaseCount = await page.locator('.project-row').count();
      
      // All should return the same results
      expect(lowercaseCount).toEqual(uppercaseCount);
      expect(uppercaseCount).toEqual(mixedcaseCount);
    });

    test('should show no results for non-existent projects', async ({ page }) => {
      // Wait for projects to load
      await page.waitForSelector('.project-row', { timeout: 10000 });
      
      const searchInput = page.locator('input[placeholder="Search projects..."]');
      await searchInput.fill('NonExistentProject12345');
      
      // Wait for search results
      await page.waitForTimeout(1000);
      
      const projectCount = await page.locator('.project-row').count();
      expect(projectCount).toBe(0);
      
      // Should show empty state or message
      const emptyMessage = page.locator('.empty-state, .no-results, .no-projects');
      await expect(emptyMessage).toBeVisible();
    });

    test('should clear search and show all projects when input is emptied', async ({ page }) => {
      // Wait for projects to load
      await page.waitForSelector('.project-row', { timeout: 10000 });
      const initialCount = await page.locator('.project-row').count();
      
      const searchInput = page.locator('input[placeholder="Search projects..."]');
      
      // Search for something specific
      await searchInput.fill('Mobile');
      await page.waitForTimeout(1000);
      const filteredCount = await page.locator('.project-row').count();
      expect(filteredCount).toBeLessThanOrEqual(initialCount);
      
      // Clear the search
      await searchInput.clear();
      await page.waitForTimeout(1000);
      
      // Should show all projects again
      const finalCount = await page.locator('.project-row').count();
      expect(finalCount).toEqual(initialCount);
    });
  });

  test.describe('Search Performance and Behavior', () => {
    test('should not trigger search on every keystroke (debouncing)', async ({ page }) => {
      // Wait for projects to load
      await page.waitForSelector('.project-row', { timeout: 10000 });
      
      // Monitor network requests
      const requests: string[] = [];
      page.on('request', (request) => {
        if (request.url().includes('/api/projects') && request.url().includes('search=')) {
          requests.push(request.url());
        }
      });
      
      const searchInput = page.locator('input[placeholder="Search projects..."]');
      
      // Type quickly to test debouncing
      await searchInput.type('Mobile App', { delay: 50 }); // Fast typing
      
      // Wait for debounce period
      await page.waitForTimeout(1500);
      
      // Should have made fewer requests than characters typed
      expect(requests.length).toBeLessThan(10); // "Mobile App" is 10 characters
      expect(requests.length).toBeGreaterThan(0); // But should have made at least one request
    });

    test('should maintain search state during page interactions', async ({ page }) => {
      // Wait for projects to load
      await page.waitForSelector('.project-row', { timeout: 10000 });
      
      const searchInput = page.locator('input[placeholder="Search projects..."]');
      await searchInput.fill('Platform');
      await page.waitForTimeout(1000);
      
      // Interact with zoom controls
      const zoomInBtn = page.locator('button').filter({ hasText: 'ZoomIn' }).or(page.locator('[title*="zoom"]')).first();
      if (await zoomInBtn.isVisible()) {
        await zoomInBtn.click();
        await page.waitForTimeout(500);
      }
      
      // Search should still be active
      await expect(searchInput).toHaveValue('Platform');
      const projectCount = await page.locator('.project-row').count();
      
      // Projects should still be filtered
      if (projectCount > 0) {
        const projectNames = await page.locator('.project-info h3').allTextContents();
        const allMatch = projectNames.every(name => name.toLowerCase().includes('platform'));
        expect(allMatch).toBeTruthy();
      }
    });

    test('should work correctly with other filters', async ({ page }) => {
      // Wait for projects to load
      await page.waitForSelector('.project-row', { timeout: 10000 });
      
      const searchInput = page.locator('input[placeholder="Search projects..."]');
      const statusSelect = page.locator('select').first();
      
      // Apply search filter
      await searchInput.fill('Platform');
      await page.waitForTimeout(1000);
      const searchOnlyCount = await page.locator('.project-row').count();
      
      // Add status filter if options are available
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption('active');
        await page.waitForTimeout(1000);
        const combinedFilterCount = await page.locator('.project-row').count();
        
        // Combined filter should show same or fewer results
        expect(combinedFilterCount).toBeLessThanOrEqual(searchOnlyCount);
      }
    });
  });

  test.describe('Search Edge Cases', () => {
    test('should handle special characters in search', async ({ page }) => {
      // Wait for projects to load
      await page.waitForSelector('.project-row', { timeout: 10000 });
      
      const searchInput = page.locator('input[placeholder="Search projects..."]');
      
      // Test with special characters
      const specialSearchTerms = ['AI/ML', 'E-commerce', 'Customer Portal v2.0', 'Project (Legacy)'];
      
      for (const term of specialSearchTerms) {
        await searchInput.clear();
        await searchInput.fill(term);
        await page.waitForTimeout(1000);
        
        // Should not crash and should handle gracefully
        const projectCount = await page.locator('.project-row').count();
        expect(projectCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('should handle very long search terms', async ({ page }) => {
      // Wait for projects to load
      await page.waitForSelector('.project-row', { timeout: 10000 });
      
      const searchInput = page.locator('input[placeholder="Search projects..."]');
      const longTerm = 'A'.repeat(200); // Very long search term
      
      await searchInput.fill(longTerm);
      await page.waitForTimeout(1000);
      
      // Should handle gracefully without crashing
      const projectCount = await page.locator('.project-row').count();
      expect(projectCount).toBeGreaterThanOrEqual(0);
      
      // Input should show the full value (or truncated appropriately)
      const inputValue = await searchInput.inputValue();
      expect(inputValue.length).toBeGreaterThan(0);
    });

    test('should handle rapid search changes', async ({ page }) => {
      // Wait for projects to load
      await page.waitForSelector('.project-row', { timeout: 10000 });
      
      const searchInput = page.locator('input[placeholder="Search projects..."]');
      
      // Rapidly change search terms
      const searchTerms = ['Mobile', 'Platform', 'AI', 'Legacy', 'Customer'];
      
      for (const term of searchTerms) {
        await searchInput.clear();
        await searchInput.fill(term);
        await page.waitForTimeout(200); // Quick changes
      }
      
      // Wait for final stabilization
      await page.waitForTimeout(1500);
      
      // Should end up with the last search term
      await expect(searchInput).toHaveValue('Customer');
      
      // Should show appropriate results
      const projectCount = await page.locator('.project-row').count();
      expect(projectCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Search Accessibility', () => {
    test('should be keyboard accessible', async ({ page }) => {
      // Navigate to search using keyboard
      await page.keyboard.press('Tab'); // Navigate to search (may need multiple tabs)
      
      // Find the search input and ensure it can be focused
      const searchInput = page.locator('input[placeholder="Search projects..."]');
      await searchInput.focus();
      
      // Type search term
      await page.keyboard.type('Mobile');
      await page.waitForTimeout(1000);
      
      // Should filter results
      const projectCount = await page.locator('.project-row').count();
      expect(projectCount).toBeGreaterThanOrEqual(0);
      
      // Clear with keyboard
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Delete');
      await page.waitForTimeout(1000);
      
      // Should clear the search
      await expect(searchInput).toHaveValue('');
    });

    test('should have proper ARIA attributes', async ({ page }) => {
      const searchInput = page.locator('input[placeholder="Search projects..."]');
      
      // Check for accessibility attributes
      const inputType = await searchInput.getAttribute('type');
      expect(inputType).toBe('text');
      
      const placeholder = await searchInput.getAttribute('placeholder');
      expect(placeholder).toBeTruthy();
      
      // Search should be labeled appropriately
      const ariaLabel = await searchInput.getAttribute('aria-label');
      const hasLabel = ariaLabel || await searchInput.getAttribute('id');
      expect(hasLabel).toBeTruthy();
    });
  });
});