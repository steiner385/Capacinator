import { chromium, FullConfig, Browser, BrowserContext, Page, request } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { E2EProcessManager } from './process-manager';
import { waitForHealthy, checkPortsAvailable } from './health-check';
import { initializeE2EDatabase, cleanupE2EDatabase } from '../../../src/server/database/init-e2e';
import { preTestCleanup } from './test-data-cleanup';

// Use consistent ports for E2E tests
const E2E_PORTS = {
  server: parseInt(process.env.E2E_SERVER_PORT || '3111', 10),
  client: parseInt(process.env.E2E_CLIENT_PORT || '3121', 10)
};

const processManager = new E2EProcessManager();

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E global setup v2...');
  
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  
  try {
    // Step 1: Acquire lock to prevent concurrent test runs
    const lockAcquired = await processManager.acquireLock();
    if (!lockAcquired) {
      throw new Error('Failed to acquire E2E test lock. Another test run may be in progress.');
    }
    
    // Step 2: Check port availability
    console.log('🔍 Checking port availability...');
    const portStatus = await checkPortsAvailable([E2E_PORTS.server, E2E_PORTS.client]);
    
    for (const [port, available] of portStatus) {
      if (!available) {
        console.log(`⚠️ Port ${port} is in use, cleaning up...`);
        await processManager.killProcessOnPort(port);
      }
    }
    
    // Step 3: Initialize E2E Database
    console.log('🗄️ Initializing E2E database...');
    await initializeE2EDatabase();
    
    // Step 4: Generate test run ID for this session
    const testRunId = `e2e-${Date.now()}`;
    process.env.TEST_RUN_ID = testRunId;
    
    // Step 5: Start server
    console.log('🚀 Starting E2E server...');
    await processManager.startProcess('e2e-server', ['npx', 'tsx', 'src/server/index.ts'], {
      env: {
        NODE_ENV: 'e2e',
        DATABASE_URL: ':memory:',
        PORT: E2E_PORTS.server.toString(),
        FORCE_COLOR: '0',
        DB_FILENAME: ':memory:'
      },
      port: E2E_PORTS.server,
      waitForOutput: /Server running.*on port \d+|Listening on port \d+/i,
      timeout: 30000
    });
    
    // Step 6: Wait for server health
    await waitForHealthy(`http://localhost:${E2E_PORTS.server}/api/health`, {
      maxRetries: 30,
      retryDelay: 1000
    });

    // Step 6.5: Clean up orphaned test data from previous runs
    console.log('🧹 Cleaning up orphaned test data...');
    try {
      const cleanupApiContext = await request.newContext({
        baseURL: `http://localhost:${E2E_PORTS.server}`,
      });
      await preTestCleanup(cleanupApiContext, `http://localhost:${E2E_PORTS.server}`);
      await cleanupApiContext.dispose();
    } catch (cleanupError) {
      console.warn('⚠️ Pre-test cleanup warning:', cleanupError);
      // Don't fail setup if cleanup fails
    }

    // Step 7: Start client
    console.log('🚀 Starting E2E client...');
    await processManager.startProcess('e2e-client', ['npx', 'vite', '--config', 'client-vite.config.ts', '--host', '0.0.0.0'], {
      env: {
        NODE_ENV: 'e2e',
        PORT: E2E_PORTS.server.toString(), // For proxy
        VITE_PORT: E2E_PORTS.client.toString(), // For Vite server
        CLIENT_PORT: E2E_PORTS.client.toString(),
        FORCE_COLOR: '0',
        DEBUG_E2E: '1' // Enable debug output
      },
      port: E2E_PORTS.client,
      waitForOutput: /VITE.*ready|Local.*http|ready in.*ms/i,
      timeout: 60000
    });
    
    // Step 8: Wait for client to be ready
    // Don't check health on client, just give it a moment to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 9: Launch browser for setup
    console.log('🌐 Launching browser for profile setup...');
    browser = await chromium.launch({
      headless: process.env.HEADED !== 'true',
      args: ['--disable-blink-features=AutomationControlled']
    });
    
    context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1280, height: 720 },
      baseURL: `http://localhost:${E2E_PORTS.client}`
    });
    
    page = await context.newPage();
    
    // Enable console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error' && process.env.DEBUG_E2E) {
        console.log(`Browser console error: ${msg.text()}`);
      }
    });
    
    // Step 10: Navigate and handle profile selection
    console.log('📋 Handling profile selection...');
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Check if profile selection is needed
    const needsProfileSelection = await page.locator('text="Select Your Profile"').isVisible({ timeout: 5000 })
      .catch(() => false);
    
    if (needsProfileSelection) {
      await handleProfileSelection(page);
    } else {
      console.log('✅ Profile already selected');
    }
    
    // Step 11: Save authentication state
    await saveAuthState(context);
    
    // Step 12: Store configuration for tests
    const configPath = path.join(process.cwd(), 'test-results', 'e2e-config.json');
    await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
    await fs.promises.writeFile(configPath, JSON.stringify({
      baseURL: `http://localhost:${E2E_PORTS.client}`,
      apiURL: `http://localhost:${E2E_PORTS.server}`,
      testRunId,
      timestamp: Date.now()
    }, null, 2));
    
    console.log('✅ E2E global setup completed successfully');
    console.log(`📌 Test servers running on:
    - Client: http://localhost:${E2E_PORTS.client}
    - Server: http://localhost:${E2E_PORTS.server}`);
    
    // Store process manager in global for teardown
    (global as any).__E2E_PROCESS_MANAGER__ = processManager;
    
  } catch (error) {
    console.error('❌ E2E global setup failed:', error);
    
    // Clean up on failure
    await processManager.stopAll();
    await processManager.releaseLock();
    
    throw error;
  } finally {
    // Clean up browser resources
    await page?.close();
    await context?.close();
    await browser?.close();
  }
}

async function handleProfileSelection(page: Page) {
  console.log('🎯 Starting profile selection...');
  
  try {
    // Click the select trigger
    const selectTrigger = page.locator('#person-select');
    await selectTrigger.waitFor({ state: 'visible', timeout: 10000 });
    await selectTrigger.click();
    
    // Wait for dropdown animation
    await page.waitForTimeout(500);
    
    // Find and click the first option
    const options = page.locator('[role="option"]');
    const optionCount = await options.count();
    
    if (optionCount === 0) {
      throw new Error('No profile options found');
    }
    
    console.log(`📊 Found ${optionCount} profile options`);
    
    const firstOption = options.first();
    const optionText = await firstOption.textContent();
    console.log(`Selecting profile: ${optionText}`);
    
    await firstOption.click();
    await page.waitForTimeout(500);
    
    // Click Continue button
    const continueButton = page.locator('button:has-text("Continue")');
    await continueButton.waitFor({ state: 'visible', timeout: 5000 });
    await continueButton.click();
    
    // Wait for modal to close
    await page.waitForSelector('text="Select Your Profile"', {
      state: 'detached',
      timeout: 10000
    });
    
    console.log('✅ Profile selected successfully');
    
  } catch (error) {
    console.error('❌ Profile selection failed:', error);
    
    // Try API fallback
    console.log('🔌 Attempting API fallback...');
    await handleProfileSelectionViaAPI(page);
  }
}

async function handleProfileSelectionViaAPI(page: Page) {
  try {
    const apiUrl = `http://localhost:${E2E_PORTS.server}`;
    const response = await page.request.get(`${apiUrl}/api/people`);
    
    if (!response.ok()) {
      throw new Error(`Failed to fetch people: ${response.status()}`);
    }
    
    const data = await response.json();
    const people = data.data || data;
    
    if (!Array.isArray(people) || people.length === 0) {
      throw new Error('No people found');
    }
    
    const selectedPerson = people[0];
    console.log(`API fallback: Selecting ${selectedPerson.name}`);
    
    // Set user data in localStorage
    await page.evaluate((person) => {
      localStorage.setItem('capacinator_current_user', JSON.stringify(person));
      window.dispatchEvent(new Event('storage'));
    }, selectedPerson);
    
    // Reload to apply selection
    await page.reload({ waitUntil: 'networkidle' });
    
    console.log('✅ Profile selected via API fallback');
  } catch (error) {
    console.error('❌ API fallback failed:', error);
    throw error;
  }
}

async function saveAuthState(context: BrowserContext) {
  try {
    const authDir = path.resolve('test-results');
    await fs.promises.mkdir(authDir, { recursive: true });
    
    const authPath = path.join(authDir, 'e2e-auth.json');
    await context.storageState({ path: authPath });
    
    console.log(`💾 Authentication state saved to ${authPath}`);
  } catch (error) {
    console.warn('⚠️ Failed to save authentication state:', error);
  }
}

export default globalSetup;