#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all test files
const testFiles = [
  ...glob.sync('tests/**/*.test.{ts,tsx}', { cwd: process.cwd() }),
  ...glob.sync('src/**/*.test.{ts,tsx}', { cwd: process.cwd() }),
];

console.log(`Found ${testFiles.length} test files to process`);

testFiles.forEach((file) => {
  const filePath = path.join(process.cwd(), file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Replace @jest/globals imports with vitest
  if (content.includes('@jest/globals')) {
    content = content.replace(
      /import\s*{([^}]+)}\s*from\s*['"]@jest\/globals['"]/g,
      (match, imports) => {
        // Parse the imports
        const importList = imports.split(',').map(i => i.trim());
        const vitestImports = [];
        const otherImports = [];

        importList.forEach(imp => {
          // Common vitest imports
          if (['describe', 'it', 'test', 'expect', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll', 'vi'].includes(imp)) {
            vitestImports.push(imp);
          } else if (imp === 'jest') {
            // Replace jest with vi
            vitestImports.push('vi');
          } else {
            otherImports.push(imp);
          }
        });

        modified = true;
        return `import { ${vitestImports.join(', ')} } from 'vitest'`;
      }
    );
  }

  // Replace jest.mock() with vi.mock()
  if (content.includes('jest.mock(')) {
    content = content.replace(/\bjest\.mock\(/g, 'vi.mock(');
    modified = true;
  }

  // Replace jest.fn() with vi.fn()
  if (content.includes('jest.fn(')) {
    content = content.replace(/\bjest\.fn\(/g, 'vi.fn(');
    modified = true;
  }

  // Replace jest.spyOn() with vi.spyOn()
  if (content.includes('jest.spyOn(')) {
    content = content.replace(/\bjest\.spyOn\(/g, 'vi.spyOn(');
    modified = true;
  }

  // Replace jest.clearAllMocks() with vi.clearAllMocks()
  if (content.includes('jest.clearAllMocks(')) {
    content = content.replace(/\bjest\.clearAllMocks\(/g, 'vi.clearAllMocks(');
    modified = true;
  }

  // Replace jest.resetAllMocks() with vi.resetAllMocks()
  if (content.includes('jest.resetAllMocks(')) {
    content = content.replace(/\bjest\.resetAllMocks\(/g, 'vi.resetAllMocks(');
    modified = true;
  }

  // Replace jest.restoreAllMocks() with vi.restoreAllMocks()
  if (content.includes('jest.restoreAllMocks(')) {
    content = content.replace(/\bjest\.restoreAllMocks\(/g, 'vi.restoreAllMocks(');
    modified = true;
  }

  // Add vi import if needed and not already present
  if (modified && !content.includes("from 'vitest'") && !content.includes('from "vitest"')) {
    // Check if there are any imports
    const importMatch = content.match(/^import\s+/m);
    if (importMatch) {
      // Add vitest import after the first import
      const firstImportIndex = content.indexOf(importMatch[0]);
      const lineEnd = content.indexOf('\n', firstImportIndex);
      content = content.slice(0, lineEnd + 1) + "import { vi } from 'vitest';\n" + content.slice(lineEnd + 1);
    } else {
      // Add at the beginning
      content = "import { vi } from 'vitest';\n" + content;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ Updated ${file}`);
  }
});

console.log('Done!');