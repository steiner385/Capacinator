import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('API Endpoints Health Check', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.gotoWithRetry('/');
    await helpers.waitForReactApp();
  });

  test.describe('Critical API Endpoints', () => {
    test('should return 200 for all critical reporting endpoints', async ({ page }) => {
      // Test critical API endpoints directly to catch 500 errors
      const criticalEndpoints = [
        '/api/reporting/dashboard',
        '/api/reporting/capacity?startDate=2024-01-01&endDate=2024-12-31',
        '/api/people',
        '/api/projects',
        '/api/roles',
        '/api/scenarios',
        '/api/health'
      ];

      for (const endpoint of criticalEndpoints) {
        console.log(`Testing endpoint: ${endpoint}`);
        
        const response = await page.request.get(`http://localhost:3111${endpoint}`);
        
        expect(response.status()).toBe(200);
        
        // Verify response is valid JSON
        const responseText = await response.text();
        expect(() => JSON.parse(responseText)).not.toThrow();
        
        // For reporting endpoints, verify they have expected structure
        if (endpoint.includes('/reporting/dashboard')) {
          const data = JSON.parse(responseText);
          expect(data).toHaveProperty('summary');
          expect(data).toHaveProperty('projectHealth');
          expect(data).toHaveProperty('capacityGaps');
          expect(data).toHaveProperty('utilization');
          expect(data).toHaveProperty('availability');
        }
        
        if (endpoint.includes('/reporting/capacity')) {
          const data = JSON.parse(responseText);
          expect(data).toHaveProperty('capacityGaps');
          expect(data).toHaveProperty('personUtilization');
          expect(data).toHaveProperty('projectDemands');
          expect(data).toHaveProperty('summary');
        }
      }
    });

    test('should return 200 for person utilization endpoint', async ({ page }) => {
      // Test the specific endpoint that was failing
      const response = await page.request.get('http://localhost:3111/api/people/utilization');
      
      expect(response.status()).toBe(200);
      
      const responseText = await response.text();
      expect(() => JSON.parse(responseText)).not.toThrow();
      
      const data = JSON.parse(responseText);
      expect(Array.isArray(data)).toBe(true);
      
      // Verify person utilization data structure
      if (data.length > 0) {
        const firstPerson = data[0];
        expect(firstPerson).toHaveProperty('person_id');
        expect(firstPerson).toHaveProperty('person_name');
        expect(firstPerson).toHaveProperty('allocation_status');
        expect(firstPerson).toHaveProperty('total_allocation_percentage');
      }
    });

    test('should handle database views correctly', async ({ page }) => {
      // Test endpoints that use database views
      const viewEndpoints = [
        '/api/reporting/capacity?startDate=2024-01-01&endDate=2024-12-31',
        '/api/people/utilization'
      ];

      for (const endpoint of viewEndpoints) {
        console.log(`Testing database view endpoint: ${endpoint}`);
        
        const response = await page.request.get(`http://localhost:3111${endpoint}`);
        
        // Should not return 500 errors (database view missing)
        expect(response.status()).not.toBe(500);
        expect(response.status()).toBe(200);
        
        const responseText = await response.text();
        
        // Should not contain error messages about missing views
        expect(responseText).not.toContain('no such table');
        expect(responseText).not.toContain('no such view');
        expect(responseText).not.toContain('person_utilization_view');
        expect(responseText).not.toContain('project_demands_view');
        expect(responseText).not.toContain('SqliteError');
      }
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // Test endpoints with invalid parameters
      const errorEndpoints = [
        '/api/reporting/capacity?startDate=invalid&endDate=2024-12-31',
        '/api/people?page=invalid',
        '/api/projects?limit=invalid'
      ];

      for (const endpoint of errorEndpoints) {
        console.log(`Testing error handling for: ${endpoint}`);
        
        const response = await page.request.get(`http://localhost:3111${endpoint}`);
        
        // Should return either 400 (bad request) or 200 (with validation handling)
        expect([200, 400].includes(response.status())).toBe(true);
        
        // Should not return 500 (internal server error)
        expect(response.status()).not.toBe(500);
        
        const responseText = await response.text();
        expect(() => JSON.parse(responseText)).not.toThrow();
      }
    });

    test('should verify all required database views exist', async ({ page }) => {
      // Test that all required database views are accessible
      const viewQueries = [
        '/api/reporting/capacity?startDate=2024-01-01&endDate=2024-12-31',
        '/api/people/utilization'
      ];

      for (const endpoint of viewQueries) {
        console.log(`Verifying database views for: ${endpoint}`);
        
        const response = await page.request.get(`http://localhost:3111${endpoint}`);
        
        expect(response.status()).toBe(200);
        
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        
        // Verify the response structure indicates views are working
        if (endpoint.includes('/reporting/capacity')) {
          expect(data).toHaveProperty('capacityGaps');
          expect(data).toHaveProperty('personUtilization');
          expect(data).toHaveProperty('projectDemands');
          expect(Array.isArray(data.capacityGaps)).toBe(true);
          expect(Array.isArray(data.personUtilization)).toBe(true);
          expect(Array.isArray(data.projectDemands)).toBe(true);
        }
        
        if (endpoint.includes('/people/utilization')) {
          expect(Array.isArray(data)).toBe(true);
        }
      }
    });
  });

  test.describe('Reporting Frontend Integration', () => {
    test('should load Reports page without 500 errors', async ({ page }) => {
      // Navigate to Reports page
      await helpers.clickAndNavigate('nav a:has-text("Reports")', '/reports');
      
      // Wait for page to load
      await page.waitForLoadState('networkidle');
      
      // Check that page loaded successfully (no 500 error page)
      const pageTitle = await page.locator('h1').first().textContent();
      expect(pageTitle).toBeTruthy();
      expect(pageTitle).not.toContain('500');
      expect(pageTitle).not.toContain('Internal Server Error');
      
      // Verify that API calls in the page don't return 500
      const apiCalls = [];
      page.on('response', response => {
        if (response.url().includes('/api/')) {
          apiCalls.push({ url: response.url(), status: response.status() });
        }
      });
      
      // Wait for API calls to complete
      await page.waitForTimeout(2000);
      
      // Check that no API calls returned 500
      const serverErrors = apiCalls.filter(call => call.status >= 500);
      expect(serverErrors).toHaveLength(0);
    });

    test('should display capacity report data correctly', async ({ page }) => {
      // Navigate to Reports page
      await helpers.clickAndNavigate('nav a:has-text("Reports")', '/reports');
      
      // Wait for capacity report to load
      await page.waitForLoadState('networkidle');
      
      // Look for capacity report elements
      const reportElements = [
        'text=Capacity Overview',
        'text=Person Utilization',
        'text=Project Demands'
      ];
      
      for (const element of reportElements) {
        await expect(page.locator(element).first()).toBeVisible({ timeout: 10000 });
      }
      
      // Verify no error messages are displayed
      const errorMessages = [
        'Internal Server Error',
        'Failed to fetch',
        'no such table',
        'no such view'
      ];
      
      for (const errorMsg of errorMessages) {
        await expect(page.locator(`text=${errorMsg}`)).not.toBeVisible();
      }
    });
  });
});