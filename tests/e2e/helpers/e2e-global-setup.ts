import { chromium, FullConfig, Browser, BrowserContext, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { initializeE2EDatabase, cleanupE2EDatabase } from '../../../src/server/database/init-e2e.js';

let serverProcess: ChildProcess | null = null;

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E global setup...');
  
  // Generate test run ID for this session
  const testRunId = `e2e-${Date.now()}`;
  process.env.TEST_RUN_ID = testRunId;
  
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  
  try {
    // Step 1: Initialize E2E Database
    console.log('🗄️ Initializing E2E database...');
    await initializeE2EDatabase();
    
    // Step 2: Start development server if not already running
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3120';
    const serverRunning = await checkServerRunning(baseURL);
    
    if (!serverRunning) {
      console.log('🚀 Starting development server for E2E tests...');
      await startDevServer();
      
      // Wait for server to be ready
      await waitForServer(baseURL, 60); // 60 second timeout
    } else {
      console.log('✅ Development server already running');
    }
    
    // Step 3: Launch browser for setup
    browser = await chromium.launch({ 
      headless: process.env.HEADED !== 'true',
      args: ['--disable-blink-features=AutomationControlled']
    });
    
    context = await browser.newContext({ 
      ignoreHTTPSErrors: true,
      viewport: { width: 1280, height: 720 }
    });
    
    page = await context.newPage();
    
    // Enable console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Browser console error: ${msg.text()}`);
      }
    });
    
    // Step 4: Wait for application to be ready
    await waitForApplication(page, baseURL);
    
    // Step 5: Verify test data
    await verifyTestData(page, baseURL);
    
    // Step 6: Handle initial profile selection
    await handleInitialProfileSelection(page, baseURL);
    
    // Step 7: Save authentication state
    await saveAuthState(context);
    
    console.log('✅ E2E global setup completed successfully');
    
    // Store server process reference for teardown
    if (serverProcess) {
      (global as any).__SERVER_PROCESS__ = serverProcess;
    }
    
  } catch (error) {
    console.error('❌ E2E global setup failed:', error);
    
    // Clean up on failure
    if (serverProcess) {
      console.log('🛑 Stopping server due to setup failure...');
      serverProcess.kill('SIGTERM');
    }
    
    throw error;
  } finally {
    // Clean up browser resources
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

async function checkServerRunning(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${url}/api/health`, { 
      signal: controller.signal 
    });
    
    clearTimeout(timeout);
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function startDevServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      NODE_ENV: 'e2e',
      DATABASE_URL: ':memory:', // Use in-memory database for tests
      PORT: '3110',
      CLIENT_PORT: '3120',
      FORCE_COLOR: '0',
      // Force the server to re-read the database config
      DB_FILENAME: ':memory:'
    };
    
    // Start the dev server directly with tsx
    serverProcess = spawn('npx', ['tsx', 'src/server/index.ts'], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      cwd: process.cwd()
    });
    
    // Capture server output for debugging
    let serverOutput = '';
    
    serverProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      serverOutput += output;
      
      // Look for successful startup messages
      if (output.includes('ready in') || output.includes('Server running')) {
        console.log('✅ Server started successfully');
        resolve();
      }
    });
    
    serverProcess.stderr?.on('data', (data) => {
      const error = data.toString();
      console.error('Server error:', error);
      
      // Ignore certain warnings
      if (!error.includes('WARNING') && !error.includes('Duplicate key')) {
        serverOutput += error;
      }
    });
    
    serverProcess.on('error', (err) => {
      console.error('Failed to start server:', err);
      reject(err);
    });
    
    serverProcess.on('exit', (code, signal) => {
      if (code !== 0 && !signal) {
        console.error('Server exited with code:', code);
        console.error('Server output:', serverOutput);
        reject(new Error(`Server exited with code ${code}`));
      }
    });
    
    // Timeout if server doesn't start
    setTimeout(() => {
      if (serverProcess) {
        serverProcess.kill('SIGTERM');
        reject(new Error('Server startup timeout'));
      }
    }, 30000); // 30 second timeout
  });
}

async function waitForServer(url: string, maxSeconds: number): Promise<void> {
  console.log(`⏳ Waiting for server at ${url}...`);
  
  const startTime = Date.now();
  const maxTime = maxSeconds * 1000;
  
  while (Date.now() - startTime < maxTime) {
    if (await checkServerRunning(url)) {
      console.log('✅ Server is ready');
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`Server failed to start within ${maxSeconds} seconds`);
}

async function waitForApplication(page: Page, baseURL: string) {
  console.log('⏳ Waiting for application to be ready...');
  
  const maxAttempts = 30;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      // Try to load the application
      await page.goto(baseURL, { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });
      
      // Check if React app is loaded
      const hasReactRoot = await page.evaluate(() => {
        return document.querySelector('#root') !== null || 
               document.querySelector('[data-reactroot]') !== null;
      });
      
      if (hasReactRoot) {
        console.log('✅ Application is ready');
        return;
      }
      
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error(`Application failed to start after ${maxAttempts} attempts: ${error}`);
      }
      console.log(`⏳ Attempt ${attempts}/${maxAttempts} failed, retrying in 1s...`);
      await page.waitForTimeout(1000);
    }
  }
}

async function verifyTestData(page: Page, baseURL: string) {
  console.log('🔍 Verifying test data...');
  
  try {
    // Test API connectivity using same port (Vite proxies /api)
    const healthResponse = await page.request.get(`${baseURL}/api/health`);
    if (!healthResponse.ok()) {
      throw new Error(`API health check failed: ${healthResponse.status()}`);
    }
    console.log('✅ API health check passed');
    
    // Verify essential test data
    const endpoints = ['/api/roles'];
    
    for (const endpoint of endpoints) {
      try {
        const response = await page.request.get(`${baseURL}${endpoint}`);
        if (!response.ok()) {
          console.warn(`⚠️ ${endpoint} returned ${response.status()}`);
        } else {
          const data = await response.json();
          console.log(`✅ ${endpoint}: ${Array.isArray(data) ? data.length : 'OK'} items`);
        }
      } catch (err) {
        console.warn(`⚠️ ${endpoint} request failed:`, err);
      }
    }
    
  } catch (error) {
    console.error('⚠️ Test data verification failed:', error);
    // Don't fail setup for data issues
  }
}

async function handleInitialProfileSelection(page: Page, baseURL: string) {
  console.log('🔍 Handling initial profile selection...');
  
  try {
    // Navigate to the application
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    
    // Wait for either profile modal or main app
    const profileModalSelector = 'text=Select Your Profile';
    const mainAppSelector = '.sidebar, nav, [data-testid="navigation"]';
    
    // Race to see what appears first
    const result = await Promise.race([
      page.waitForSelector(profileModalSelector, { timeout: 5000 })
        .then(() => 'profile-modal'),
      page.waitForSelector(mainAppSelector, { timeout: 5000 })
        .then(() => 'main-app')
    ]).catch(() => null);
    
    if (result === 'profile-modal') {
      console.log('📋 Profile selection modal detected');
      
      // Handle profile selection
      await selectProfile(page);
      
      console.log('✅ Profile selected and saved');
    } else if (result === 'main-app') {
      console.log('✅ Already authenticated, skipping profile selection');
    } else {
      console.warn('⚠️ Neither profile modal nor main app detected');
    }
    
  } catch (error) {
    console.error('⚠️ Profile selection handling failed:', error);
    // Don't fail setup for profile selection issues
  }
}

async function selectProfile(page: Page) {
  console.log('🎯 Starting profile selection...');
  
  // Wait for the Select trigger button using id
  const selectTrigger = page.locator('#person-select');
  await selectTrigger.waitFor({ state: 'visible', timeout: 10000 });
  
  // Click the select trigger to open dropdown
  console.log('📂 Opening profile dropdown...');
  await selectTrigger.click();
  
  // Wait for dropdown content to appear - shadcn uses data-radix attributes
  await page.waitForTimeout(500); // Give dropdown time to render
  
  // Get all options - look for divs with role="option" or within the dropdown content
  const optionElements = page.locator('[role="option"], [data-radix-collection-item]');
  await optionElements.first().waitFor({ state: 'visible', timeout: 5000 });
  
  const optionCount = await optionElements.count();
  console.log(`Found ${optionCount} profile options`);
  
  if (optionCount > 0) {
    // Click the first option
    const firstOption = optionElements.first();
    const optionText = await firstOption.textContent();
    console.log(`Selecting profile: ${optionText}`);
    await firstOption.click();
    
    // Wait a moment for the selection to register
    await page.waitForTimeout(1000);
    
    // Wait for Continue button to be visible
    const continueButton = page.locator('button:has-text("Continue")');
    await continueButton.waitFor({ state: 'visible', timeout: 10000 });
    
    // The button should now be enabled since we selected a profile
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent?.includes('Continue')) {
          return !btn.disabled && !btn.hasAttribute('disabled');
        }
      }
      return false;
    }, { timeout: 30000 });
    
    // Click Continue
    console.log('👆 Clicking Continue button...');
    await continueButton.click();
    
    // Wait for modal to close
    await page.waitForSelector('text=Select Your Profile', { 
      state: 'detached',
      timeout: 10000 
    });
    
    console.log('✅ Profile selected successfully');
    
    // Wait for navigation
    await page.waitForLoadState('networkidle');
  } else {
    throw new Error('No profile options found');
  }
}

async function saveAuthState(context: BrowserContext) {
  try {
    // Create test-results directory if it doesn't exist
    const authDir = path.resolve('test-results');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    
    // Save the storage state
    const authPath = path.join(authDir, 'e2e-auth.json');
    await context.storageState({ path: authPath });
    
    console.log(`💾 Authentication state saved to ${authPath}`);
  } catch (error) {
    console.warn('⚠️ Failed to save authentication state:', error);
  }
}

export default globalSetup;