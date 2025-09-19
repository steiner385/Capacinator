import { chromium, FullConfig, Browser, BrowserContext, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { initializeE2EDatabase, cleanupE2EDatabase } from '../../../src/server/database/init-e2e.js';

let serverProcess: ChildProcess | null = null;
let clientProcess: ChildProcess | null = null;

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
    
    // Store server and client process references for teardown
    if (serverProcess) {
      (global as any).__SERVER_PROCESS__ = serverProcess;
    }
    if (clientProcess) {
      (global as any).__CLIENT_PROCESS__ = clientProcess;
    }
    
  } catch (error) {
    console.error('❌ E2E global setup failed:', error);
    
    // Clean up on failure
    if (serverProcess) {
      console.log('🛑 Stopping server due to setup failure...');
      serverProcess.kill('SIGTERM');
    }
    if (clientProcess) {
      console.log('🛑 Stopping client due to setup failure...');
      clientProcess.kill('SIGTERM');
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
    
    // Check the API health endpoint directly on server port
    const serverUrl = url.includes(':3120') ? url.replace(':3120', ':3110') : url;
    const response = await fetch(`${serverUrl}/api/health`, { 
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
    
    // Start both server and client
    console.log('🚀 Starting server...');
    
    // Start the server directly with tsx
    serverProcess = spawn('npx', ['tsx', 'src/server/index.ts'], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      cwd: process.cwd()
    });
    
    // Capture server output for debugging
    let serverStarted = false;
    
    serverProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      if (!serverStarted && (output.includes('Server running') || output.includes('on port 3110'))) {
        serverStarted = true;
        console.log('✅ Server started successfully');
        
        // Now start the client
        console.log('🚀 Starting client...');
        clientProcess = spawn('npx', ['vite', '--config', 'client-vite.config.ts'], {
          env,
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: false,
          cwd: process.cwd()
        });
        
        clientProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          if (output.includes('ready in') || output.includes('Local:')) {
            console.log('✅ Client started successfully');
            resolve();
          }
        });
        
        clientProcess.stderr?.on('data', (data) => {
          const error = data.toString();
          if (!error.includes('WARNING')) {
            console.error('Client error:', error);
          }
        });
        
        clientProcess.on('error', (err) => {
          console.error('Failed to start client:', err);
          reject(err);
        });
      }
    });
    
    serverProcess.stderr?.on('data', (data) => {
      const error = data.toString();
      // Ignore certain warnings
      if (!error.includes('WARNING') && !error.includes('Duplicate key')) {
        console.error('Server error:', error);
      }
    });
    
    serverProcess.on('error', (err) => {
      console.error('Failed to start server:', err);
      reject(err);
    });
    
    serverProcess.on('exit', (code, signal) => {
      if (code !== 0 && !signal) {
        console.error('Server exited with code:', code);
        reject(new Error(`Server exited with code ${code}`));
      }
    });
    
    // Timeout if server doesn't start
    setTimeout(() => {
      if (!serverStarted) {
        if (serverProcess) serverProcess.kill('SIGTERM');
        if (clientProcess) clientProcess.kill('SIGTERM');
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
    // checkServerRunning now handles the port conversion
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
  
  const maxAttempts = 3;
  let attemptCount = 0;
  let profileSelected = false;
  
  while (attemptCount < maxAttempts && !profileSelected) {
    attemptCount++;
    console.log(`\n📍 Attempt ${attemptCount}/${maxAttempts} to select profile...`);
    
    try {
      // Wait for the Select trigger button using id
      const selectTrigger = page.locator('#person-select');
      await selectTrigger.waitFor({ state: 'visible', timeout: 10000 });
      
      // Log current page state
      const triggerText = await selectTrigger.textContent();
      console.log(`Select trigger text: "${triggerText}"`);
      
      // Take screenshot before clicking
      await page.screenshot({ 
        path: `/tmp/profile-before-click-attempt-${attemptCount}.png`,
        fullPage: true 
      });
      
      // Click the select trigger to open dropdown
      console.log('📂 Opening profile dropdown...');
      await selectTrigger.click();
      
      // Wait for dropdown animation
      await page.waitForTimeout(1000);
      
      // Try multiple strategies to find dropdown options
      let options = null;
      let optionCount = 0;
      const strategies = [
        {
          name: 'Standard role="option"',
          selector: '[role="option"]:visible',
          timeout: 3000
        },
        {
          name: 'Radix collection items',
          selector: '[data-radix-collection-item]:visible',
          timeout: 2000
        },
        {
          name: 'Portal with role="option"',
          selector: '[data-radix-popper-content-wrapper] [role="option"]:visible',
          timeout: 2000
        },
        {
          name: 'Any SelectItem in portal',
          selector: '[data-radix-portal] [role="option"]:visible',
          timeout: 2000
        },
        {
          name: 'Direct SelectContent children',
          selector: '[role="listbox"] [role="option"]:visible',
          timeout: 2000
        }
      ];
      
      for (const strategy of strategies) {
        try {
          console.log(`🔍 Trying strategy: ${strategy.name}`);
          options = page.locator(strategy.selector);
          await options.first().waitFor({ state: 'visible', timeout: strategy.timeout });
          optionCount = await options.count();
          console.log(`✅ ${strategy.name}: Found ${optionCount} options`);
          if (optionCount > 0) break;
        } catch (e) {
          console.log(`⚠️ ${strategy.name}: No visible options`);
        }
      }
      
      // If still no options, try keyboard navigation
      if (optionCount === 0) {
        console.log('🎹 Trying keyboard navigation...');
        await selectTrigger.focus();
        await page.keyboard.press('Space');
        await page.waitForTimeout(500);
        
        // Check again for options
        options = page.locator('[role="option"]:visible');
        optionCount = await options.count();
        console.log(`📊 After keyboard activation: ${optionCount} options`);
      }
      
      // Take screenshot of dropdown state
      await page.screenshot({ 
        path: `/tmp/profile-dropdown-state-attempt-${attemptCount}.png`,
        fullPage: true 
      });
      
      // Log DOM structure for debugging
      const portalCount = await page.locator('[data-radix-portal]').count();
      const popperCount = await page.locator('[data-radix-popper-content-wrapper]').count();
      console.log(`DOM state: ${portalCount} portals, ${popperCount} popper wrappers`);
      
      if (optionCount > 0) {
        // Get all option texts
        const optionTexts = await options.evaluateAll(elements => 
          elements.map(el => el.textContent?.trim() || '')
        );
        console.log('Available profiles:', optionTexts);
        
        // Select the first valid option
        const targetOption = optionTexts.findIndex(text => text.length > 0);
        const optionToSelect = targetOption >= 0 ? targetOption : 0;
        const selectedText = optionTexts[optionToSelect];
        
        console.log(`Selecting profile: "${selectedText}"`);
        await options.nth(optionToSelect).click({ force: true });
        
        // Wait for selection to register
        await page.waitForTimeout(500);
        
        // Verify selection was made
        const currentValue = await selectTrigger.textContent();
        console.log(`Select value after click: "${currentValue}"`);
        
        // Wait for Continue button
        const continueButton = page.locator('button:has-text("Continue")');
        await continueButton.waitFor({ state: 'visible', timeout: 5000 });
        
        // Wait for button to be enabled
        await page.waitForFunction(
          () => {
            const btn = document.querySelector('button[type="submit"]');
            return btn && !btn.disabled && !btn.hasAttribute('disabled');
          },
          { timeout: 5000 }
        );
        
        // Click Continue
        console.log('👆 Clicking Continue button...');
        await continueButton.click();
        
        // Wait for modal to close
        await page.waitForSelector('text="Select Your Profile"', { 
          state: 'detached',
          timeout: 10000 
        });
        
        console.log('✅ Profile selected successfully');
        profileSelected = true;
        
        // Wait for navigation to complete
        await page.waitForLoadState('networkidle');
        
        // Save user data to auth state
        const userData = { name: selectedText, profileSelected: true };
        await page.evaluate((data) => {
          localStorage.setItem('selectedProfile', JSON.stringify(data));
        }, userData);
        
      } else {
        throw new Error(`No profile options found on attempt ${attemptCount}`);
      }
      
    } catch (error) {
      console.error(`❌ Attempt ${attemptCount} failed:`, error);
      
      if (attemptCount < maxAttempts) {
        console.log('🔄 Retrying...');
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
      } else {
        // Final attempt failed, try API fallback
        console.log('🔌 All UI attempts failed, trying API fallback...');
        await handleProfileSelectionViaAPI(page);
        profileSelected = true;
      }
    }
  }
  
  if (!profileSelected) {
    throw new Error('Failed to select profile after all attempts');
  }
}

async function handleProfileSelectionViaAPI(page: Page) {
  console.log('🔌 Using API fallback for profile selection...');
  
  try {
    // Fetch people list via API
    const baseURL = page.url().split('/')[0] + '//' + page.url().split('/')[2];
    const peopleResponse = await page.request.get(`${baseURL}/api/people`);
    
    if (!peopleResponse.ok()) {
      throw new Error(`Failed to fetch people: ${peopleResponse.status()}`);
    }
    
    const peopleData = await peopleResponse.json();
    const people = peopleData.data || peopleData;
    
    if (!Array.isArray(people) || people.length === 0) {
      throw new Error('No people found in API response');
    }
    
    // Select the first person
    const selectedPerson = people[0];
    console.log(`API fallback: Selecting ${selectedPerson.name}`);
    
    // Set auth data directly in localStorage
    await page.evaluate((person) => {
      localStorage.setItem('capacinator_current_user', JSON.stringify(person));
      localStorage.setItem('selectedProfile', JSON.stringify({
        name: person.name,
        id: person.id,
        profileSelected: true
      }));
      // Trigger storage event for any listeners
      window.dispatchEvent(new Event('storage'));
    }, selectedPerson);
    
    // Reload page to apply the selection
    await page.reload({ waitUntil: 'networkidle' });
    
    console.log('✅ Profile selected via API fallback');
  } catch (error) {
    console.error('❌ API fallback failed:', error);
    throw error;
  }
}

async function saveAuthState(context: BrowserContext) {
  try {
    // Create test-results directory if it doesn't exist
    const authDir = path.resolve('test-results');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    
    // Get the current page from context
    const pages = context.pages();
    if (pages.length > 0) {
      const page = pages[0];
      
      // Ensure user data is in localStorage before saving
      const userData = await page.evaluate(() => {
        const currentUser = localStorage.getItem('capacinator_current_user');
        const selectedProfile = localStorage.getItem('selectedProfile');
        return { currentUser, selectedProfile };
      });
      
      console.log('💾 Current auth data:', {
        hasCurrentUser: !!userData.currentUser,
        hasSelectedProfile: !!userData.selectedProfile
      });
    }
    
    // Save the storage state
    const authPath = path.join(authDir, 'e2e-auth.json');
    await context.storageState({ path: authPath });
    
    console.log(`💾 Authentication state saved to ${authPath}`);
    
    // Verify the saved state
    const savedState = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
    const hasLocalStorage = savedState.origins?.some((origin: any) => 
      origin.localStorage?.length > 0
    );
    console.log(`✅ Saved state verification: ${hasLocalStorage ? 'Contains localStorage data' : 'No localStorage data'}`);
    
  } catch (error) {
    console.warn('⚠️ Failed to save authentication state:', error);
  }
}

export default globalSetup;