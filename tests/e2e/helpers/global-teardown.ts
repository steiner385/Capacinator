/**
 * Global Teardown for E2E Tests
 * Ensures proper cleanup of test environment after all tests complete
 */

import { FullConfig, chromium } from '@playwright/test';
// E2E database cleanup removed - server handles it
import { ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E global teardown...');
  
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3120';
  const testRunId = process.env.TEST_RUN_ID;
  
  try {
    // Step 1: Clean up test data if we have a test run ID
    if (testRunId) {
      console.log(`🗑️ Cleaning up test data for run: ${testRunId}`);
      await cleanupTestData(baseURL, testRunId);
    }
    
    // Step 2: E2E database cleanup handled by server shutdown
    console.log('🗄️ E2E database will be cleaned up with server...');
    
    // Step 3: Stop development servers if we started them
    const serverProcess = (global as any).__SERVER_PROCESS__ as ChildProcess | undefined;
    const clientProcess = (global as any).__CLIENT_PROCESS__ as ChildProcess | undefined;
    
    // Stop client process first
    if (clientProcess && !clientProcess.killed) {
      console.log('🛑 Stopping development client...');
      
      clientProcess.kill('SIGTERM');
      
      // Wait up to 3 seconds for client shutdown
      let clientShutdown = false;
      const clientTimeout = setTimeout(() => {
        if (!clientShutdown) {
          console.log('⚠️ Client did not shut down gracefully, forcing...');
          clientProcess.kill('SIGKILL');
        }
      }, 3000);
      
      await new Promise<void>((resolve) => {
        clientProcess.on('exit', () => {
          clientShutdown = true;
          clearTimeout(clientTimeout);
          console.log('✅ Client stopped');
          resolve();
        });
      });
      
      delete (global as any).__CLIENT_PROCESS__;
    }
    
    // Then stop server process
    if (serverProcess && !serverProcess.killed) {
      console.log('🛑 Stopping development server...');
      
      // Try graceful shutdown first
      serverProcess.kill('SIGTERM');
      
      // Wait up to 5 seconds for graceful shutdown
      let shutdownComplete = false;
      const shutdownTimeout = setTimeout(() => {
        if (!shutdownComplete) {
          console.log('⚠️ Server did not shut down gracefully, forcing...');
          serverProcess.kill('SIGKILL');
        }
      }, 5000);
      
      await new Promise<void>((resolve) => {
        serverProcess.on('exit', () => {
          shutdownComplete = true;
          clearTimeout(shutdownTimeout);
          console.log('✅ Server stopped');
          resolve();
        });
      });
      
      // Clear the global reference
      delete (global as any).__SERVER_PROCESS__;
    }
    
    // Step 4: Clean up authentication state
    const authPath = path.resolve('test-results/e2e-auth.json');
    if (fs.existsSync(authPath)) {
      console.log('🗑️ Cleaning up authentication state...');
      fs.unlinkSync(authPath);
    }
    
    // Step 5: Clear environment variables
    delete process.env.TEST_BASE_URL;
    delete process.env.TEST_RUN_ID;
    delete process.env.TEST_SETUP_COMPLETE;
    delete process.env.NODE_ENV;
    delete process.env.DATABASE_URL;
    
    console.log('✅ E2E global teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Error during E2E global teardown:', error);
    // Don't fail the test run due to cleanup issues
  }
}

async function cleanupTestData(baseURL: string, testRunId: string) {
  let browser;
  let context;
  let page;
  
  try {
    // Launch browser for API cleanup
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    page = await context.newPage();
    
    // Define test data patterns to clean up
    const testPatterns = [
      'Test_',
      'E2E_',
      'e2e-',
      'test-',
      testRunId,
    ];
    
    // Clean up in reverse order of dependencies
    const endpoints = [
      { path: '/api/assignments', name: 'assignments' },
      { path: '/api/scenario-assignments', name: 'scenario assignments' },
      { path: '/api/projects', name: 'projects' },
      { path: '/api/people', name: 'people' },
      { path: '/api/scenarios', name: 'scenarios' },
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await page.request.get(`${baseURL}${endpoint.path}`);
        if (!response.ok()) {
          console.log(`⚠️ ${endpoint.name} endpoint not available, skipping cleanup`);
          continue;
        }
        
        const data = await response.json();
        const items = Array.isArray(data) ? data : (data.data || []);
        
        // Find items that match test patterns
        const testItems = items.filter((item: any) => {
          const searchableText = [
            item.name,
            item.project_name,
            item.person_name,
            item.title,
            item.description
          ].filter(Boolean).join(' ');
          
          return testPatterns.some(pattern => 
            searchableText.toLowerCase().includes(pattern.toLowerCase())
          );
        });
        
        if (testItems.length > 0) {
          console.log(`🗑️ Cleaning ${testItems.length} test ${endpoint.name}`);
          
          // Delete each test item
          for (const item of testItems) {
            try {
              const deleteResponse = await page.request.delete(
                `${baseURL}${endpoint.path}/${item.id}`
              );
              
              if (!deleteResponse.ok()) {
                console.warn(`⚠️ Failed to delete ${endpoint.name} ${item.id}: ${deleteResponse.status()}`);
              }
            } catch (error) {
              console.warn(`⚠️ Error deleting ${endpoint.name} ${item.id}:`, error.message);
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to clean ${endpoint.name}:`, error.message);
      }
    }
    
  } catch (error) {
    console.warn('⚠️ Test data cleanup encountered issues:', error);
  } finally {
    // Clean up browser resources
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

export default globalTeardown;