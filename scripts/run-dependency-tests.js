#!/usr/bin/env node

/**
 * Test runner for phase dependencies system
 * Runs all dependency-related tests in the correct order
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Test configurations
const testSuites = [
  {
    name: 'Unit Tests - Backend Controllers',
    command: 'npm',
    args: ['run', 'test:unit', '--', 'tests/unit/server/controllers/ProjectPhaseDependenciesController.test.ts'],
    timeout: 30000
  },
  {
    name: 'Unit Tests - Backend Services', 
    command: 'npm',
    args: ['run', 'test:unit', '--', 'tests/unit/server/services/ProjectPhaseCascadeService.test.ts'],
    timeout: 30000
  },
  {
    name: 'Unit Tests - Frontend Components',
    command: 'npm',
    args: ['run', 'test:client', '--', 'tests/unit/client/components/VisualPhaseManager.dependencies.test.tsx'],
    timeout: 45000
  },
  {
    name: 'Integration Tests - API',
    command: 'npm',
    args: ['run', 'test:integration', '--', 'tests/integration/phase-dependencies-api.test.ts'],
    timeout: 60000
  },
  {
    name: 'Performance Tests',
    command: 'npm',
    args: ['run', 'test:integration', '--', 'tests/integration/phase-dependencies-performance.test.ts'],
    timeout: 120000
  },
  {
    name: 'E2E Tests',
    command: 'npm',
    args: ['run', 'test:e2e', '--', 'tests/e2e/phase-dependencies.spec.ts'],
    timeout: 180000
  }
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runTest(testSuite) {
  return new Promise((resolve, reject) => {
    log(`\n${colors.cyan}Running: ${testSuite.name}${colors.reset}`);
    log(`${colors.yellow}Command: ${testSuite.command} ${testSuite.args.join(' ')}${colors.reset}`);
    
    const child = spawn(testSuite.command, testSuite.args, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true
    });

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Test timed out after ${testSuite.timeout}ms`));
    }, testSuite.timeout);

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        log(`${colors.green}✅ ${testSuite.name} - PASSED${colors.reset}`);
        resolve();
      } else {
        log(`${colors.red}❌ ${testSuite.name} - FAILED (exit code ${code})${colors.reset}`);
        reject(new Error(`Test failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      log(`${colors.red}❌ ${testSuite.name} - ERROR: ${error.message}${colors.reset}`);
      reject(error);
    });
  });
}

async function runAllTests() {
  const startTime = Date.now();
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  log(`${colors.bright}${colors.blue}🧪 Phase Dependencies Test Suite${colors.reset}`);
  log(`${colors.blue}Running ${testSuites.length} test suites...${colors.reset}\n`);

  // Check if required test files exist
  log(`${colors.yellow}Checking test files...${colors.reset}`);
  const missingFiles = [];
  
  const testFiles = [
    'tests/unit/server/controllers/ProjectPhaseDependenciesController.test.ts',
    'tests/unit/server/services/ProjectPhaseCascadeService.test.ts',
    'tests/unit/client/components/VisualPhaseManager.dependencies.test.tsx',
    'tests/integration/phase-dependencies-api.test.ts',
    'tests/integration/phase-dependencies-performance.test.ts',
    'tests/e2e/phase-dependencies.spec.ts'
  ];

  testFiles.forEach(testFile => {
    const fullPath = path.join(rootDir, testFile);
    if (!existsSync(fullPath)) {
      missingFiles.push(testFile);
    }
  });

  if (missingFiles.length > 0) {
    log(`${colors.red}❌ Missing test files:${colors.reset}`);
    missingFiles.forEach(file => log(`  - ${file}`));
    process.exit(1);
  }

  log(`${colors.green}✅ All test files found${colors.reset}\n`);

  // Run each test suite
  for (const testSuite of testSuites) {
    try {
      await runTest(testSuite);
      results.passed++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        suite: testSuite.name,
        error: error.message
      });
      
      // Continue with other tests unless it's a critical failure
      if (testSuite.critical) {
        log(`${colors.red}Critical test failed. Stopping execution.${colors.reset}`);
        break;
      }
    }
  }

  // Summary
  const endTime = Date.now();
  const totalTime = Math.round((endTime - startTime) / 1000);
  
  log(`\n${colors.bright}${colors.blue}📊 Test Results Summary${colors.reset}`);
  log(`${colors.green}✅ Passed: ${results.passed}${colors.reset}`);
  log(`${colors.red}❌ Failed: ${results.failed}${colors.reset}`);
  log(`⏱️  Total time: ${totalTime}s\n`);

  if (results.errors.length > 0) {
    log(`${colors.red}${colors.bright}Failed Test Details:${colors.reset}`);
    results.errors.forEach(error => {
      log(`${colors.red}• ${error.suite}: ${error.error}${colors.reset}`);
    });
    log('');
  }

  // Generate test report
  const report = {
    timestamp: new Date().toISOString(),
    totalSuites: testSuites.length,
    passed: results.passed,
    failed: results.failed,
    duration: totalTime,
    errors: results.errors
  };

  // Write report to file
  const reportPath = path.join(rootDir, 'test-reports', 'phase-dependencies-test-report.json');
  try {
    const fs = await import('fs/promises');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    log(`📄 Test report saved to: ${reportPath}`);
  } catch (error) {
    log(`${colors.yellow}⚠️  Could not save test report: ${error.message}${colors.reset}`);
  }

  // Exit with appropriate code
  if (results.failed > 0) {
    log(`\n${colors.red}${colors.bright}Some tests failed. Please review and fix before deployment.${colors.reset}`);
    process.exit(1);
  } else {
    log(`\n${colors.green}${colors.bright}🎉 All tests passed! Phase dependencies system is ready.${colors.reset}`);
    process.exit(0);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  log(`\n${colors.yellow}Test execution interrupted by user.${colors.reset}`);
  process.exit(1);
});

process.on('SIGTERM', () => {
  log(`\n${colors.yellow}Test execution terminated.${colors.reset}`);
  process.exit(1);
});

// Run tests
runAllTests().catch(error => {
  log(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});