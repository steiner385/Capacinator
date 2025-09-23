#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all spec files that need fixing from command line or find them
const filesToFix = process.argv.slice(2).length > 0 
  ? process.argv.slice(2)
  : fs.readdirSync(__dirname)
      .filter(f => f.endsWith('.spec.ts'))
      .filter(f => {
        const content = fs.readFileSync(path.join(__dirname, f), 'utf8');
        return content.includes('setupPageWithAuth') || content.includes('ImprovedAuthHelper');
      });

console.log(`Found ${filesToFix.length} files to fix`);

function fixTestFile(filePath) {
  const fileName = path.basename(filePath);
  console.log(`\nFixing ${fileName}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Replace imports
  content = content.replace(
    /import\s*{\s*test\s*,\s*expect\s*}\s*from\s*['"]@playwright\/test['"]/g,
    "import { test, expect } from './fixtures'"
  );
  
  // Remove improved auth helper imports
  content = content.replace(
    /import\s*{\s*setupPageWithAuth.*}\s*from\s*['"].*improved-auth-helpers['"]\s*;?/g,
    ''
  );
  
  // Remove ImprovedAuthHelper imports
  content = content.replace(
    /import\s*{\s*ImprovedAuthHelper.*}\s*from\s*['"].*improved-auth-helpers['"]\s*;?/g,
    ''
  );
  
  // Remove test helper imports
  content = content.replace(
    /import\s*{\s*TestHelpers.*}\s*from\s*['"].*test-helpers['"]\s*;?/g,
    ''
  );
  
  // Remove helper variable declarations
  content = content.replace(/let\s+authHelper\s*:\s*ImprovedAuthHelper\s*;?\s*/g, '');
  content = content.replace(/let\s+helpers\s*:\s*TestHelpers\s*;?\s*/g, '');
  
  // Replace test function signatures
  content = content.replace(
    /test\(['"]([^'"]+)['"]\s*,\s*async\s*\(\s*{\s*page\s*}\s*\)\s*=>\s*{/g,
    'test(\'$1\', async ({ authenticatedPage, testHelpers }) => {'
  );
  
  // Replace setupPageWithAuth calls
  content = content.replace(
    /await\s+setupPageWithAuth\(page,?\s*['"]?([^'")]+?)['"]?\s*\);?/g,
    'await testHelpers.navigateTo(\'$1\');'
  );
  
  // Replace page references
  content = content.replace(/\bpage\./g, 'authenticatedPage.');
  
  // Fix helper method calls
  content = content.replace(/authHelper\./g, 'testHelpers.');
  content = content.replace(/helpers\./g, 'testHelpers.');
  
  // Remove beforeEach hooks that setup auth
  content = content.replace(
    /test\.beforeEach\(async\s*\(\s*{\s*page\s*}\s*\)\s*=>\s*{[\s\S]*?authHelper\s*=\s*new\s*ImprovedAuthHelper[\s\S]*?}\);?/g,
    ''
  );
  
  // Remove simple beforeEach hooks
  content = content.replace(
    /test\.beforeEach\(async\s*\(\s*{\s*page\s*}\s*\)\s*=>\s*{[\s\S]*?}\);?/g,
    ''
  );
  
  // Fix navigateViaSidebar calls
  content = content.replace(
    /await\s+testHelpers\.navigateViaSidebar\(['"]([^'"]+)['"]\);?/g,
    (match, linkText) => {
      const path = '/' + linkText.toLowerCase().replace(/\s+/g, '-');
      return `await testHelpers.navigateTo('${path}');`;
    }
  );
  
  // Fix waitForReactHydration
  content = content.replace(
    /await\s+testHelpers\.waitForReactHydration\(\);?/g,
    'await testHelpers.waitForPageContent();'
  );
  
  // Clean up double line breaks
  content = content.replace(/\n\n\n+/g, '\n\n');
  
  // Remove trailing semicolons after imports
  content = content.replace(/from\s+['"]\.\/(fixtures|utils)['"]\s*;+/g, "from './$1'");
  
  // Only write if changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${fileName}`);
  } else {
    console.log(`⏭️  No changes needed for ${fileName}`);
  }
}

// Fix all files
for (const file of filesToFix) {
  const filePath = path.isAbsolute(file) ? file : path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    try {
      fixTestFile(filePath);
    } catch (error) {
      console.error(`❌ Error fixing ${file}:`, error.message);
    }
  } else {
    console.log(`⚠️ File not found: ${file}`);
  }
}

console.log('\n✅ Processing complete!');
console.log(`Fixed ${filesToFix.length} test files.`);