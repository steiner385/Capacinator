import { test, expect } from '@playwright/test';

/**
 * Performance and Load Testing Suite
 * 
 * This test suite validates the application's performance under various load conditions:
 * - API response time benchmarks
 * - Concurrent user simulation
 * - Memory usage monitoring
 * - Database query performance
 * - Frontend rendering performance
 * - Resource utilization limits
 * 
 * These tests ensure the application can handle production load and scale appropriately.
 */

// Helper function to login as a user
async function loginAsUser(page: any, personId: string = '123e4567-e89b-12d3-a456-426614174000') {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  const loginSelect = page.locator('#person-select');
  if (await loginSelect.count() > 0) {
    await loginSelect.selectOption(personId);
    await page.click('.login-button');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  }
}

// Performance measurement helper
async function measureApiResponse(page: any, endpoint: string, method: string = 'GET', data?: any) {
  const startTime = Date.now();
  
  try {
    const response = await page.request.fetch(endpoint, {
      method,
      data: data ? JSON.stringify(data) : undefined,
      headers: data ? { 'Content-Type': 'application/json' } : undefined
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    return {
      duration,
      status: response.status(),
      success: response.ok(),
      size: (await response.text()).length
    };
  } catch (error) {
    const endTime = Date.now();
    return {
      duration: endTime - startTime,
      status: 0,
      success: false,
      error: error.message
    };
  }
}

test.describe('Performance and Load Testing', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test.describe('API Response Time Benchmarks', () => {
    
    test('should meet response time SLAs for critical APIs', async ({ page }) => {
      console.log('⚡ Testing API response time benchmarks');

      const criticalEndpoints = [
        { endpoint: '/api/people', name: 'People List', maxTime: 500 },
        { endpoint: '/api/projects', name: 'Projects List', maxTime: 500 },
        { endpoint: '/api/assignments', name: 'Assignments List', maxTime: 750 },
        { endpoint: '/api/reporting/dashboard', name: 'Dashboard Data', maxTime: 1000 },
        { endpoint: '/api/roles', name: 'Roles List', maxTime: 300 },
        { endpoint: '/api/project-types', name: 'Project Types', maxTime: 300 }
      ];

      const performanceResults = [];

      for (const api of criticalEndpoints) {
        console.log(`Testing ${api.name} performance...`);
        
        // Warm up with one request
        await measureApiResponse(page, api.endpoint);
        
        // Measure multiple requests
        const measurements = [];
        for (let i = 0; i < 5; i++) {
          const result = await measureApiResponse(page, api.endpoint);
          measurements.push(result.duration);
          await page.waitForTimeout(100); // Small delay between requests
        }

        const avgTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
        const maxTime = Math.max(...measurements);
        const minTime = Math.min(...measurements);

        performanceResults.push({
          endpoint: api.name,
          avgTime,
          maxTime,
          minTime,
          sla: api.maxTime,
          passes: avgTime <= api.maxTime
        });

        console.log(`${api.name}: avg=${avgTime}ms, max=${maxTime}ms, SLA=${api.maxTime}ms`);
        expect(avgTime).toBeLessThan(api.maxTime);
        
        if (avgTime <= api.maxTime) {
          console.log(`✅ ${api.name} meets performance SLA`);
        } else {
          console.log(`⚠️ ${api.name} exceeds performance SLA`);
        }
      }

      // Summary report
      const passedSLAs = performanceResults.filter(r => r.passes).length;
      console.log(`\n📊 Performance Summary: ${passedSLAs}/${performanceResults.length} APIs meet SLA`);
    });

    test('should handle complex dashboard queries efficiently', async ({ page }) => {
      console.log('⚡ Testing complex dashboard query performance');

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Measure dashboard load time
      const startTime = Date.now();
      
      // Force dashboard refresh
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Wait for all dashboard data to load
      await page.waitForSelector('h1, h2, .dashboard', { timeout: 10000 });
      
      const loadTime = Date.now() - startTime;
      console.log(`Dashboard load time: ${loadTime}ms`);
      
      // Dashboard should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
      
      // Test dashboard API performance specifically
      const dashboardApiResult = await measureApiResponse(page, '/api/reporting/dashboard');
      console.log(`Dashboard API response time: ${dashboardApiResult.duration}ms`);
      
      expect(dashboardApiResult.duration).toBeLessThan(1000);
      expect(dashboardApiResult.success).toBe(true);
      
      console.log('✅ Dashboard performance within acceptable limits');
    });

    test('should handle large dataset pagination efficiently', async ({ page }) => {
      console.log('⚡ Testing pagination performance with large datasets');

      const paginationTests = [
        { page: 1, limit: 50, endpoint: '/api/people' },
        { page: 1, limit: 100, endpoint: '/api/assignments' },
        { page: 2, limit: 50, endpoint: '/api/projects' },
        { page: 1, limit: 25, endpoint: '/api/people' }
      ];

      for (const test of paginationTests) {
        const endpoint = `${test.endpoint}?page=${test.page}&limit=${test.limit}`;
        console.log(`Testing pagination: ${endpoint}`);
        
        const result = await measureApiResponse(page, endpoint);
        
        console.log(`Pagination query (page=${test.page}, limit=${test.limit}): ${result.duration}ms`);
        
        // Pagination should be fast regardless of page size
        expect(result.duration).toBeLessThan(800);
        expect(result.success).toBe(true);
      }
      
      console.log('✅ Pagination performance verified');
    });
  });

  test.describe('Concurrent User Simulation', () => {
    
    test('should handle multiple concurrent users without degradation', async ({ browser }) => {
      console.log('⚡ Testing concurrent user performance');

      const numUsers = 5; // Simulate 5 concurrent users
      const contexts = await Promise.all(
        Array.from({ length: numUsers }, () => browser.newContext())
      );
      const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));

      // Login all users concurrently
      console.log(`Logging in ${numUsers} concurrent users...`);
      const loginPromises = pages.map((page, index) => 
        loginAsUser(page, index === 0 
          ? '123e4567-e89b-12d3-a456-426614174000' 
          : '123e4567-e89b-12d3-a456-426614174001'
        )
      );
      
      const loginStartTime = Date.now();
      await Promise.all(loginPromises);
      const loginDuration = Date.now() - loginStartTime;
      
      console.log(`Concurrent login completed in ${loginDuration}ms`);
      expect(loginDuration).toBeLessThan(10000); // Should complete within 10 seconds

      // Simulate concurrent browsing activity
      const browsingActivities = pages.map(async (page, userIndex) => {
        const activities = [
          () => page.goto('/dashboard'),
          () => page.goto('/people'),
          () => page.goto('/projects'),
          () => page.goto('/assignments'),
          () => page.goto('/reports')
        ];

        const userStartTime = Date.now();
        
        for (const activity of activities) {
          await activity();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(200); // Brief pause between actions
        }
        
        return {
          user: userIndex,
          duration: Date.now() - userStartTime
        };
      });

      console.log('Executing concurrent browsing activities...');
      const browsingResults = await Promise.all(browsingActivities);
      
      // Analyze results
      const avgBrowsingTime = browsingResults.reduce((sum, r) => sum + r.duration, 0) / browsingResults.length;
      const maxBrowsingTime = Math.max(...browsingResults.map(r => r.duration));
      
      console.log(`Concurrent browsing - avg: ${avgBrowsingTime}ms, max: ${maxBrowsingTime}ms`);
      
      // Performance shouldn't degrade significantly under concurrent load
      expect(maxBrowsingTime).toBeLessThan(15000); // 15 seconds max for full browsing sequence
      expect(avgBrowsingTime).toBeLessThan(10000); // 10 seconds average
      
      // Cleanup
      await Promise.all(contexts.map(ctx => ctx.close()));
      
      console.log('✅ Concurrent user performance acceptable');
    });

    test('should maintain API response times under concurrent load', async ({ browser }) => {
      console.log('⚡ Testing API performance under concurrent load');

      const numConcurrentRequests = 10;
      const contexts = await Promise.all(
        Array.from({ length: numConcurrentRequests }, () => browser.newContext())
      );
      const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));

      // Login all pages
      await Promise.all(pages.map(page => loginAsUser(page)));

      // Test concurrent API calls
      const apiEndpoints = [
        '/api/people',
        '/api/projects', 
        '/api/assignments',
        '/api/roles',
        '/api/reporting/dashboard'
      ];

      for (const endpoint of apiEndpoints) {
        console.log(`Testing concurrent load on ${endpoint}...`);
        
        const concurrentRequests = pages.map(page => 
          measureApiResponse(page, endpoint)
        );
        
        const startTime = Date.now();
        const results = await Promise.all(concurrentRequests);
        const totalTime = Date.now() - startTime;
        
        const successfulRequests = results.filter(r => r.success);
        const avgResponseTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
        const maxResponseTime = Math.max(...results.map(r => r.duration));
        
        console.log(`${endpoint} concurrent results:`);
        console.log(`  - Total time: ${totalTime}ms`);
        console.log(`  - Successful: ${successfulRequests.length}/${results.length}`);
        console.log(`  - Avg response: ${avgResponseTime}ms`);
        console.log(`  - Max response: ${maxResponseTime}ms`);
        
        // All requests should succeed
        expect(successfulRequests.length).toBe(results.length);
        
        // Response times shouldn't degrade too much under load
        expect(avgResponseTime).toBeLessThan(2000); // 2 second average max
        expect(maxResponseTime).toBeLessThan(5000); // 5 second absolute max
        
        console.log(`✅ ${endpoint} handles concurrent load well`);
      }

      // Cleanup
      await Promise.all(contexts.map(ctx => ctx.close()));
    });
  });

  test.describe('Memory and Resource Usage', () => {
    
    test('should not have memory leaks during extended usage', async ({ page }) => {
      console.log('⚡ Testing for memory leaks');

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        if (performance.memory) {
          return {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
          };
        }
        return null;
      });

      if (initialMemory) {
        console.log(`Initial memory usage: ${(initialMemory.used / 1024 / 1024).toFixed(2)} MB`);

        // Simulate extended usage
        const navigationSequence = [
          '/dashboard', '/people', '/projects', '/assignments', 
          '/reports', '/scenarios', '/dashboard', '/people'
        ];

        for (let cycle = 0; cycle < 3; cycle++) {
          console.log(`Memory test cycle ${cycle + 1}/3`);
          
          for (const path of navigationSequence) {
            await page.goto(path);
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(500);
          }
        }

        // Force garbage collection if possible
        await page.evaluate(() => {
          if (window.gc) {
            window.gc();
          }
        });

        // Check final memory usage
        const finalMemory = await page.evaluate(() => {
          if (performance.memory) {
            return {
              used: performance.memory.usedJSHeapSize,
              total: performance.memory.totalJSHeapSize,
              limit: performance.memory.jsHeapSizeLimit
            };
          }
          return null;
        });

        if (finalMemory) {
          const memoryIncrease = finalMemory.used - initialMemory.used;
          const memoryIncreasePercent = (memoryIncrease / initialMemory.used) * 100;
          
          console.log(`Final memory usage: ${(finalMemory.used / 1024 / 1024).toFixed(2)} MB`);
          console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB (${memoryIncreasePercent.toFixed(1)}%)`);
          
          // Memory increase should be reasonable (less than 50% increase)
          expect(memoryIncreasePercent).toBeLessThan(50);
          
          console.log('✅ No significant memory leaks detected');
        }
      } else {
        console.log('ℹ️ Memory API not available in this browser');
      }
    });

    test('should handle large datasets without performance degradation', async ({ page }) => {
      console.log('⚡ Testing performance with large datasets');

      // Test with different dataset sizes
      const datasetTests = [
        { endpoint: '/api/people', expectedSize: 'small', maxTime: 1000 },
        { endpoint: '/api/assignments', expectedSize: 'medium', maxTime: 1500 },
        { endpoint: '/api/projects', expectedSize: 'small', maxTime: 800 }
      ];

      for (const test of datasetTests) {
        console.log(`Testing ${test.endpoint} with ${test.expectedSize} dataset...`);
        
        const result = await measureApiResponse(page, test.endpoint);
        const responseText = await page.request.get(test.endpoint).then(r => r.text());
        
        let itemCount = 0;
        try {
          const data = JSON.parse(responseText);
          if (data.data && Array.isArray(data.data)) {
            itemCount = data.data.length;
          } else if (Array.isArray(data)) {
            itemCount = data.length;
          }
        } catch (e) {
          console.log('Could not parse response as JSON');
        }

        console.log(`${test.endpoint}: ${itemCount} items, ${result.duration}ms, ${result.size} bytes`);
        
        expect(result.success).toBe(true);
        expect(result.duration).toBeLessThan(test.maxTime);
        
        // Check for reasonable data transfer size
        if (itemCount > 0) {
          const bytesPerItem = result.size / itemCount;
          console.log(`Bytes per item: ${bytesPerItem.toFixed(0)}`);
          
          // Each item should be reasonably sized (not excessive)
          expect(bytesPerItem).toBeLessThan(5000); // 5KB per item max
        }
        
        console.log(`✅ ${test.endpoint} performs well with dataset of ${itemCount} items`);
      }
    });
  });

  test.describe('Frontend Rendering Performance', () => {
    
    test('should render pages efficiently', async ({ page }) => {
      console.log('⚡ Testing frontend rendering performance');

      const pageTests = [
        { path: '/dashboard', name: 'Dashboard', maxRenderTime: 3000 },
        { path: '/people', name: 'People List', maxRenderTime: 2000 },
        { path: '/projects', name: 'Projects List', maxRenderTime: 2000 },
        { path: '/assignments', name: 'Assignments List', maxRenderTime: 2500 }
      ];

      for (const pageTest of pageTests) {
        console.log(`Testing ${pageTest.name} rendering performance...`);
        
        const startTime = Date.now();
        
        await page.goto(pageTest.path);
        await page.waitForLoadState('networkidle');
        
        // Wait for main content to be visible
        await page.waitForSelector('h1, h2, .main-content, main', { timeout: 10000 });
        
        const renderTime = Date.now() - startTime;
        
        console.log(`${pageTest.name} render time: ${renderTime}ms`);
        expect(renderTime).toBeLessThan(pageTest.maxRenderTime);
        
        // Check for layout shifts or rendering issues
        const hasContentElements = await page.locator('h1, h2, table, .card, .list-item').count();
        expect(hasContentElements).toBeGreaterThan(0);
        
        console.log(`✅ ${pageTest.name} renders efficiently`);
      }
    });

    test('should handle large tables and lists efficiently', async ({ page }) => {
      console.log('⚡ Testing large table rendering performance');

      await page.goto('/assignments');
      await page.waitForLoadState('networkidle');

      const startTime = Date.now();
      
      // Check if there's a table or list with data
      const tableRows = await page.locator('tr, .list-item, .card').count();
      const renderTime = Date.now() - startTime;
      
      console.log(`Table with ${tableRows} rows rendered in ${renderTime}ms`);
      
      if (tableRows > 0) {
        // Large tables should still render quickly
        expect(renderTime).toBeLessThan(2000);
        
        // Test scrolling performance if there are many items
        if (tableRows > 10) {
          const scrollStartTime = Date.now();
          
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });
          await page.waitForTimeout(100);
          
          await page.evaluate(() => {
            window.scrollTo(0, 0);
          });
          
          const scrollTime = Date.now() - scrollStartTime;
          console.log(`Scroll performance: ${scrollTime}ms`);
          
          expect(scrollTime).toBeLessThan(1000);
        }
        
        console.log('✅ Large table/list renders and scrolls efficiently');
      } else {
        console.log('ℹ️ No large datasets found to test');
      }
    });
  });

  test.describe('Database Performance', () => {
    
    test('should execute complex queries within time limits', async ({ page }) => {
      console.log('⚡ Testing database query performance');

      const complexQueries = [
        {
          endpoint: '/api/reporting/dashboard',
          name: 'Dashboard Aggregations',
          maxTime: 1000,
          description: 'Multiple aggregation queries for dashboard'
        },
        {
          endpoint: '/api/assignments?include=project,person,role',
          name: 'Assignments with Joins',
          maxTime: 800,
          description: 'Assignments with related data joins'
        },
        {
          endpoint: '/api/people?include=roles,assignments',
          name: 'People with Relations',
          maxTime: 600,
          description: 'People with related roles and assignments'
        }
      ];

      for (const query of complexQueries) {
        console.log(`Testing ${query.name}...`);
        
        // Run query multiple times to get average
        const measurements = [];
        for (let i = 0; i < 3; i++) {
          const result = await measureApiResponse(page, query.endpoint);
          measurements.push(result.duration);
          expect(result.success).toBe(true);
        }

        const avgTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
        const maxTime = Math.max(...measurements);
        
        console.log(`${query.name}: avg=${avgTime}ms, max=${maxTime}ms (limit: ${query.maxTime}ms)`);
        
        expect(avgTime).toBeLessThan(query.maxTime);
        
        console.log(`✅ ${query.name} performs within limits`);
      }
    });
  });

  test.describe('Performance Monitoring and Alerting', () => {
    
    test('should track performance metrics for monitoring', async ({ page }) => {
      console.log('⚡ Collecting performance metrics for monitoring');

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Collect browser performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        return {
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
          firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime,
          firstContentfulPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime,
          totalLoadTime: perfData.loadEventEnd - perfData.fetchStart
        };
      });

      console.log('Performance Metrics:');
      console.log(`  - DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
      console.log(`  - Load Complete: ${performanceMetrics.loadComplete}ms`);
      console.log(`  - First Paint: ${performanceMetrics.firstPaint}ms`);
      console.log(`  - First Contentful Paint: ${performanceMetrics.firstContentfulPaint}ms`);
      console.log(`  - Total Load Time: ${performanceMetrics.totalLoadTime}ms`);

      // Validate performance thresholds
      expect(performanceMetrics.totalLoadTime).toBeLessThan(5000); // 5 seconds total
      if (performanceMetrics.firstContentfulPaint) {
        expect(performanceMetrics.firstContentfulPaint).toBeLessThan(2000); // 2 seconds FCP
      }

      console.log('✅ Performance metrics collected and validated');
    });
  });
});