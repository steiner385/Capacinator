#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

async function fixTestImports() {
  console.log('Fixing test imports...');
  
  // Find all test files
  const testFiles = await glob('**/*.test.ts', {
    ignore: ['node_modules/**', 'dist/**', 'build/**']
  });
  
  console.log(`Found ${testFiles.length} test files`);
  
  let fixedCount = 0;
  
  for (const file of testFiles) {
    let content = readFileSync(file, 'utf8');
    let modified = false;
    
    // Fix imports that end with .js
    const jsImportRegex = /from\s+['"]([^'"]+)\.js['"]/g;
    if (jsImportRegex.test(content)) {
      content = content.replace(jsImportRegex, (match, importPath) => {
        modified = true;
        return `from '${importPath}'`;
      });
    }
    
    // Fix relative imports to add proper extensions or remove them
    const relativeImportRegex = /from\s+['"](\.\.?\/[^'"]+)['"]/g;
    content = content.replace(relativeImportRegex, (match, importPath) => {
      // Skip if it already has an extension
      if (importPath.endsWith('.ts') || importPath.endsWith('.tsx') || importPath.endsWith('.json')) {
        return match;
      }
      
      // For relative imports, don't add extension (let TypeScript resolve)
      return `from '${importPath}'`;
    });
    
    if (modified) {
      writeFileSync(file, content);
      fixedCount++;
      console.log(`Fixed: ${file}`);
    }
  }
  
  console.log(`\nFixed ${fixedCount} files`);
}

fixTestImports().catch(console.error);