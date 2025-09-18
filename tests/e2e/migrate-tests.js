#!/usr/bin/env node

/**
 * Script to migrate and reorganize e2e tests
 * Archives duplicate tests and moves tests to appropriate suites
 */

const fs = require('fs');
const path = require('path');

const e2eDir = __dirname;
const archiveDir = path.join(e2eDir, 'archive');
const suitesDir = path.join(e2eDir, 'suites');

// Ensure directories exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDir(archiveDir);
ensureDir(path.join(suitesDir, 'smoke'));
ensureDir(path.join(suitesDir, 'crud'));
ensureDir(path.join(suitesDir, 'reports'));
ensureDir(path.join(suitesDir, 'scenarios'));
ensureDir(path.join(suitesDir, 'integration'));

// Tests to archive (duplicates)
const toArchive = [
  // Assignment duplicates
  'assignment-crud-complete.spec.ts',
  'assignment-crud-comprehensive.spec.ts',
  'assignment-crud-final.spec.ts',
  'assignment-crud-fixed.spec.ts',
  'assignment-crud-working.spec.ts',
  'assignment-edge-cases.spec.ts',
  'assignment-integration.spec.ts',
  'assignment-minimal.spec.ts',
  'assignment-simple-crud.spec.ts',
  
  // Reports duplicates  
  'reports-adaptive.spec.ts',
  'reports-comprehensive.spec.ts',
  'reports-debug.spec.ts',
  'reports-filter-testing.spec.ts',
  'reports-final-validation.spec.ts',
  'reports-live-test.spec.ts',
  'reports-navigation.spec.ts',
  'reports-quick-check.spec.ts',
  'reports-simple.spec.ts',
  'reports-tables.spec.ts',
  'reports-validation.spec.ts',
  
  // Scenario duplicates
  'scenario-basic.spec.ts',
  'scenario-comparison-demo.spec.ts',
  'scenario-concurrent-operations.spec.ts',
  'scenario-detailed-workflows.spec.ts',
  'scenario-dropdown-simple.spec.ts',
  'scenario-dropdown.spec.ts',
  'scenario-edge-cases.spec.ts',
  'scenario-graph-visualization.spec.ts',
  'scenario-merge-corruption-prevention.spec.ts',
  'scenario-planning.spec.ts',
  'scenario-ui-demonstration.spec.ts',
  'scenario-view-modes.spec.ts',
  'scenario-visual-regression.spec.ts',
  'scenario-workflow-integration.spec.ts',
];

// Tests to move to specific suites
const toMove = {
  smoke: [
    'smoke-test.spec.ts',
    '25-quick-smoke-test.spec.ts',
  ],
  crud: [
    'people.spec.ts',
    'projects.spec.ts',
  ],
  reports: [
    'capacity-report-accuracy.spec.ts',
    'demand-report-accuracy.spec.ts',
    'gaps-analysis-accuracy.spec.ts',
    'utilization-report-accuracy.spec.ts',
  ],
  scenarios: [
    'full-scenario-ui-test.spec.ts',
    'test-simple-scenario.spec.ts',
  ],
  integration: [
    'api-integration-external-systems.spec.ts',
    'database-transaction-safety.spec.ts',
  ],
};

// Archive duplicates
console.log('🗄️  Archiving duplicate tests...');
let archivedCount = 0;

toArchive.forEach(file => {
  const srcPath = path.join(e2eDir, file);
  const destPath = path.join(archiveDir, file);
  
  if (fs.existsSync(srcPath)) {
    fs.renameSync(srcPath, destPath);
    console.log(`  ✓ Archived ${file}`);
    archivedCount++;
  }
});

console.log(`✅ Archived ${archivedCount} duplicate test files`);

// Move tests to appropriate suites
console.log('\n📦 Moving tests to suites...');
let movedCount = 0;

Object.entries(toMove).forEach(([suite, files]) => {
  files.forEach(file => {
    const srcPath = path.join(e2eDir, file);
    const destPath = path.join(suitesDir, suite, file);
    
    if (fs.existsSync(srcPath)) {
      fs.renameSync(srcPath, destPath);
      console.log(`  ✓ Moved ${file} to ${suite}/`);
      movedCount++;
    }
  });
});

console.log(`✅ Moved ${movedCount} test files to suites`);

// List remaining tests that need manual review
console.log('\n⚠️  Remaining tests that need manual review:');
const remainingTests = fs.readdirSync(e2eDir)
  .filter(file => file.endsWith('.spec.ts'))
  .filter(file => !file.includes('verify-setup'))
  .filter(file => !file.includes('simple-table-tests'));

remainingTests.forEach(file => {
  console.log(`  - ${file}`);
});

console.log(`\n📊 Summary:`);
console.log(`  - Archived: ${archivedCount} files`);
console.log(`  - Moved to suites: ${movedCount} files`);
console.log(`  - Need review: ${remainingTests.length} files`);
console.log('\n✅ Migration complete!');