import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';

// Find all test files
const testFiles = globSync('tests/**/*.test.{ts,tsx}', {
  ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
});

console.log(`Found ${testFiles.length} test files to check`);

const importMappings = [
  { from: '../../../../src/server/ProjectsController', to: '../../../../src/server/api/controllers/ProjectsController' },
  { from: '../../../../src/server/PeopleController', to: '../../../../src/server/api/controllers/PeopleController' },
  { from: '../../../../src/server/AssignmentsController', to: '../../../../src/server/api/controllers/AssignmentsController' },
  { from: '../../../../src/server/ScenariosController', to: '../../../../src/server/api/controllers/ScenariosController' },
  { from: '../../../../src/server/AuditController', to: '../../../../src/server/api/controllers/AuditController' },
  { from: '../../../../src/server/NotificationsController', to: '../../../../src/server/api/controllers/NotificationsController' },
  { from: '../../../../src/server/SettingsController', to: '../../../../src/server/api/controllers/SettingsController' },
  { from: '../../../../src/server/UserPermissionsController', to: '../../../../src/server/api/controllers/UserPermissionsController' },
  { from: '../../../../src/server/ProjectPhaseDependenciesController', to: '../../../../src/server/api/controllers/ProjectPhaseDependenciesController' },
  { from: '../../../../src/server/AssignmentBusinessRules', to: '../../../../src/server/api/controllers/AssignmentBusinessRules' },
  { from: '../services/audit/AuditService', to: '../../../../src/server/services/AuditService' },
  { from: '../../../../src/server/../services/audit/AuditService', to: '../../../../src/server/services/AuditService' },
  { from: '../../../../src/server/../__tests__/setup', to: '../../../../tests/setup' },
  { from: '../../src/server/database/index', to: '../../../../src/server/database/index' },
  { from: '../../src/server/index', to: '../../../../src/server/index' },
  { from: '../../../../src/server/routes/audit', to: '../../../../src/server/api/routes/audit' }
];

let totalFixed = 0;

testFiles.forEach(file => {
  let content = readFileSync(file, 'utf-8');
  let modified = false;

  importMappings.forEach(mapping => {
    if (content.includes(mapping.from)) {
      content = content.replace(new RegExp(mapping.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), mapping.to);
      modified = true;
      console.log(`Fixed import in ${file}: ${mapping.from} -> ${mapping.to}`);
    }
  });

  // Also fix database imports
  const dbImportRegex = /from ['"]\.\.\/\.\.\/database\/index['"]/g;
  if (dbImportRegex.test(content)) {
    content = content.replace(dbImportRegex, "from '../../../../src/server/database/index'");
    modified = true;
    console.log(`Fixed database import in ${file}`);
  }

  // Fix any remaining broken test-helpers imports
  const testHelperRegex = /from ['"].*test-helpers.*['"]/g;
  if (testHelperRegex.test(content)) {
    content = content.replace(testHelperRegex, "from '../../../../tests/helpers/test-helpers'");
    modified = true;
    console.log(`Fixed test-helpers import in ${file}`);
  }

  if (modified) {
    writeFileSync(file, content);
    totalFixed++;
  }
});

console.log(`\nFixed imports in ${totalFixed} files`);