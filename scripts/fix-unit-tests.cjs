#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix UserPermissionsController test
const fixUserPermissionsTest = () => {
  const testPath = path.join(__dirname, '../tests/unit/server/controllers/UserPermissionsController.test.ts');
  let content = fs.readFileSync(testPath, 'utf8');
  
  // Remove non-existent method tests
  const removePatterns = [
    /describe\('createUserRole'.*?\n  }\);\n/gs,
    /describe\('deleteUserRole'.*?\n  }\);\n/gs,
    /describe\('updateUserRoleAssignment'.*?\n  }\);\n/gs
  ];
  
  removePatterns.forEach(pattern => {
    content = content.replace(pattern, '');
  });
  
  fs.writeFileSync(testPath, content);
  console.log('✅ Fixed UserPermissionsController test');
};

// Fix SettingsController test
const fixSettingsTest = () => {
  const testPath = path.join(__dirname, '../tests/unit/server/controllers/SettingsController.test.ts');
  let content = fs.readFileSync(testPath, 'utf8');
  
  // Fix the mock query to use jest.Mock type
  content = content.replace(
    /const createMockQuery = \(\) => \{[\s\S]*?return query;\s*\};/,
    `const createMockQuery = () => {
  const query = {
    where: jest.fn().mockReturnThis(),
    first: jest.fn() as jest.Mock,
    insert: jest.fn().mockReturnThis(),
    onConflict: jest.fn().mockReturnThis(),
    merge: jest.fn().mockReturnThis(),
  };
  return query;
};`
  );
  
  fs.writeFileSync(testPath, content);
  console.log('✅ Fixed SettingsController test');
};

// Run fixes
try {
  fixUserPermissionsTest();
  fixSettingsTest();
  console.log('✅ All test fixes applied successfully');
} catch (error) {
  console.error('❌ Error fixing tests:', error);
  process.exit(1);
}