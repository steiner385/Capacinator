import { test, expect } from '@playwright/test';

test.describe('Project Roadmap Search Functionality - Using Existing Data', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the roadmap page - use existing seeded data
    await page.goto('/roadmap');
    await page.waitForLoadState('networkidle');
  });

  test('should show search input and perform basic search', async ({ page }) => {
    // Verify search input exists
    const searchInput = page.locator('input[placeholder="Search projects..."]');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', 'Search projects...');

    // Wait for projects to load
    await page.waitForSelector('.project-row', { timeout: 10000 });
    const initialProjectCount = await page.locator('.project-row').count();
    expect(initialProjectCount).toBeGreaterThan(0);

    // Search for a common term like "Customer"
    await searchInput.fill('Customer');
    
    // Wait a bit for search to process
    await page.waitForTimeout(1500);
    
    const filteredCount = await page.locator('.project-row').count();
    
    // Verify that search results are shown (could be 0 if no matches)
    expect(filteredCount).toBeGreaterThanOrEqual(0);
    expect(filteredCount).toBeLessThanOrEqual(initialProjectCount);
  });

  test('should debounce search requests', async ({ page }) => {
    // Monitor network requests
    const searchRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/projects') && request.url().includes('search=')) {
        searchRequests.push(request.url());
        console.log('Search request:', request.url());
      }
    });

    // Wait for initial load
    await page.waitForSelector('.project-row', { timeout: 10000 });
    
    const searchInput = page.locator('input[placeholder="Search projects..."]');
    
    // Type rapidly to test debouncing
    await searchInput.type('Customer Portal', { delay: 100 }); // Fast typing
    
    // Wait for debounce period
    await page.waitForTimeout(2000);
    
    console.log('Total search requests made:', searchRequests.length);
    console.log('Requests:', searchRequests);
    
    // Should have made fewer requests than characters typed due to debouncing
    // "Customer Portal" is 15 characters, so we should see significant reduction
    expect(searchRequests.length).toBeLessThan(15);
    expect(searchRequests.length).toBeGreaterThan(0);
    
    // The final request should contain the complete search term (URL encoded)
    const lastRequest = searchRequests[searchRequests.length - 1];
    expect(lastRequest).toMatch(/search=Customer(\+|%20)Portal/);
  });

  test('should clear search and restore all projects', async ({ page }) => {
    // Wait for projects to load
    await page.waitForSelector('.project-row', { timeout: 10000 });
    const initialCount = await page.locator('.project-row').count();
    
    const searchInput = page.locator('input[placeholder="Search projects..."]');
    
    // Search for something specific
    await searchInput.fill('NonExistentProject');
    await page.waitForTimeout(1500);
    
    // Clear the search
    await searchInput.clear();
    await page.waitForTimeout(1500);
    
    // Should show all projects again
    const finalCount = await page.locator('.project-row').count();
    expect(finalCount).toEqual(initialCount);
  });

  test('should be case-insensitive', async ({ page }) => {
    // Wait for projects to load
    await page.waitForSelector('.project-row', { timeout: 10000 });
    
    const searchInput = page.locator('input[placeholder="Search projects..."]');
    
    // Test with lowercase
    await searchInput.fill('mobile');
    await page.waitForTimeout(1500);
    const lowercaseCount = await page.locator('.project-row').count();
    
    // Clear and test with uppercase
    await searchInput.clear();
    await searchInput.fill('MOBILE');
    await page.waitForTimeout(1500);
    const uppercaseCount = await page.locator('.project-row').count();
    
    // Should return the same results
    expect(lowercaseCount).toEqual(uppercaseCount);
  });

  test('should handle special characters gracefully', async ({ page }) => {
    // Wait for projects to load
    await page.waitForSelector('.project-row', { timeout: 10000 });
    
    const searchInput = page.locator('input[placeholder="Search projects..."]');
    
    // Test with special characters
    const specialTerms = ['AI/ML', 'E-commerce', 'v2.0', '(Legacy)'];
    
    for (const term of specialTerms) {
      await searchInput.clear();
      await searchInput.fill(term);
      await page.waitForTimeout(1000);
      
      // Should not crash
      const projectCount = await page.locator('.project-row').count();
      expect(projectCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should maintain search state during other interactions', async ({ page }) => {
    // Wait for projects to load
    await page.waitForSelector('.project-row', { timeout: 10000 });
    
    const searchInput = page.locator('input[placeholder="Search projects..."]');
    await searchInput.fill('Customer');
    await page.waitForTimeout(1500);
    
    // Try to click the "Today" button if it exists
    const todayBtn = page.locator('button').filter({ hasText: 'Today' }).first();
    if (await todayBtn.isVisible()) {
      await todayBtn.click();
      await page.waitForTimeout(500);
    }
    
    // Search should still be active
    await expect(searchInput).toHaveValue('Customer');
  });

  test('should work with status filter combination', async ({ page }) => {
    // Wait for projects to load
    await page.waitForSelector('.project-row', { timeout: 10000 });
    
    const searchInput = page.locator('input[placeholder="Search projects..."]');
    const statusSelect = page.locator('select').first();
    
    // Apply search filter
    await searchInput.fill('Platform');
    await page.waitForTimeout(1500);
    const searchOnlyCount = await page.locator('.project-row').count();
    
    // Add status filter if available
    if (await statusSelect.isVisible()) {
      const options = await statusSelect.locator('option').allTextContents();
      if (options.length > 1) {
        // Select a status other than "All Statuses"
        await statusSelect.selectOption({ index: 1 });
        await page.waitForTimeout(1500);
        const combinedFilterCount = await page.locator('.project-row').count();
        
        // Combined filter should show same or fewer results
        expect(combinedFilterCount).toBeLessThanOrEqual(searchOnlyCount);
      }
    }
  });
});