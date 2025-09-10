#!/usr/bin/env node
import { spawn } from 'child_process';
import { globSync } from 'glob';

// Find test files
const testFiles = globSync('tests/**/*.test.{ts,tsx}', {
  ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/e2e/**']
});

console.log(`Found ${testFiles.length} test files`);

// Run each test file with tsx
let passed = 0;
let failed = 0;

async function runTest(file: string) {
  return new Promise((resolve) => {
    const proc = spawn('npx', ['tsx', file], {
      stdio: 'pipe'
    });
    
    let output = '';
    proc.stdout.on('data', (data) => { output += data; });
    proc.stderr.on('data', (data) => { output += data; });
    
    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ ${file}`);
        passed++;
      } else {
        console.log(`✗ ${file}`);
        if (output.includes('Cannot find module')) {
          console.log('  → Module not found error');
        } else if (output.includes('SyntaxError')) {
          console.log('  → Syntax error');
        } else {
          console.log(`  → Exit code: ${code}`);
        }
        failed++;
      }
      resolve(null);
    });
  });
}

// Run tests sequentially
async function runAllTests() {
  for (const file of testFiles) {
    await runTest(file);
  }
  
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
}

runAllTests();