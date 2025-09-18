#!/usr/bin/env node

/**
 * E2E Test Setup Verification Script
 * Checks that all test files and configurations are in place
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verifying E2E Test Setup...\n');

// Check for required files
const requiredFiles = [
  'playwright.config.ts',
  'tests/e2e/fixtures/index.ts',
  'tests/e2e/helpers/e2e-global-setup.ts',
  'tests/e2e/helpers/e2e-global-teardown.ts',
  'tests/e2e/utils/test-helpers.ts',
  'tests/e2e/suites/smoke/smoke-tests.spec.ts',
  'tests/e2e/suites/crud/assignments.spec.ts',
  'tests/e2e/suites/crud/people.spec.ts',
  'tests/e2e/suites/crud/projects.spec.ts',
  'tests/e2e/suites/reports/reports-comprehensive.spec.ts',
  'tests/e2e/suites/tables/people-availability.spec.ts',
  'tests/e2e/suites/tables/settings-permissions.spec.ts',
  'tests/e2e/suites/tables/project-phase-manager.spec.ts',
];

let allFilesExist = true;

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

console.log('\n📊 Test Suite Summary:');

// Count test files in each suite
const suitesDir = path.join(__dirname, 'tests/e2e/suites');
if (fs.existsSync(suitesDir)) {
  const suites = fs.readdirSync(suitesDir).filter(f => fs.statSync(path.join(suitesDir, f)).isDirectory());
  
  suites.forEach(suite => {
    const suiteDir = path.join(suitesDir, suite);
    const testFiles = fs.readdirSync(suiteDir).filter(f => f.endsWith('.spec.ts'));
    console.log(`  📂 ${suite}: ${testFiles.length} test file(s)`);
    testFiles.forEach(file => {
      console.log(`     - ${file}`);
    });
  });
}

// Check Playwright config
console.log('\n⚙️  Configuration:');
const configPath = path.join(__dirname, 'playwright.config.ts');
if (fs.existsSync(configPath)) {
  const config = fs.readFileSync(configPath, 'utf8');
  console.log('  ✅ Playwright config exists');
  
  // Check for global setup
  if (config.includes('globalSetup')) {
    console.log('  ✅ Global setup configured');
  } else {
    console.log('  ⚠️  Global setup not configured');
  }
  
  // Check for projects
  const projectMatch = config.match(/projects:\s*\[/);
  if (projectMatch) {
    console.log('  ✅ Test projects configured');
  }
}

// Check package.json scripts
console.log('\n📜 NPM Scripts:');
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const e2eScripts = Object.keys(packageJson.scripts || {})
    .filter(key => key.includes('e2e'))
    .sort();
    
  e2eScripts.forEach(script => {
    console.log(`  npm run ${script}`);
  });
}

// Summary
console.log('\n' + '='.repeat(50));
if (allFilesExist) {
  console.log('✅ E2E test setup is complete and ready to run!');
  console.log('\n🚀 Quick Start Commands:');
  console.log('  npm run test:e2e:smoke    # Run smoke tests');
  console.log('  npm run test:e2e          # Run all tests');
  console.log('  npx playwright test --ui  # Open UI mode');
} else {
  console.log('❌ Some required files are missing. Please check the setup.');
}

// Check if server is running
console.log('\n🌐 Checking if development server is running...');

const checkServer = (port, name) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: '/',
      method: 'GET',
      timeout: 2000
    };

    const req = http.request(options, (res) => {
      console.log(`  ✅ ${name} is running on port ${port}`);
      resolve(true);
    });

    req.on('error', () => {
      console.log(`  ❌ ${name} is not running on port ${port}`);
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      console.log(`  ❌ ${name} is not responding on port ${port}`);
      resolve(false);
    });

    req.end();
  });
};

// Check both possible API ports
Promise.all([
  checkServer(3120, 'Frontend server'),
  checkServer(3110, 'API server (dev)'),
  checkServer(3111, 'API server (e2e)')
]).then(([frontend, apiDev, apiE2e]) => {
  const apiRunning = apiDev || apiE2e;
  
  if (apiDev) {
    console.log('\n📌 Note: API is running in dev mode (port 3110)');
  } else if (apiE2e) {
    console.log('\n📌 Note: API is running in e2e mode (port 3111)');
  }
  
  if (!frontend || !apiRunning) {
    console.log('\n⚠️  Make sure to start the development servers before running tests:');
    console.log('  npm run dev        # For development mode');
    console.log('  npm run e2e:start  # For e2e mode with separate API');
  } else {
    console.log('\n✅ All required servers are running!');
  }
  
  console.log('\n✨ Setup verification complete!');
});