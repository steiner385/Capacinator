#!/usr/bin/env node

/**
 * Script to update E2E test selectors from old modal/dialog classes to shadcn selectors
 * This updates common patterns to use the new shadcn component selectors
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Mapping of old selectors to new ones
const selectorMappings = [
  // Modal/Dialog selectors
  { 
    old: /\.modal-overlay/g, 
    new: '[data-radix-dialog-overlay]' 
  },
  { 
    old: /\.modal-content/g, 
    new: '[role="dialog"] > div' 
  },
  { 
    old: /\.modal-header/g, 
    new: '[role="dialog"] > div > div:first-child' 
  },
  { 
    old: /\.modal-footer/g, 
    new: '[role="dialog"] > div > div:last-child' 
  },
  { 
    old: /\.modal-close/g, 
    new: '[role="dialog"] button[aria-label="Close"]' 
  },
  {
    old: /page\.locator\(['"]\.modal, \.dialog, \.form-container['"]\)/g,
    new: 'page.locator(\'[role="dialog"]\')'
  },
  {
    old: /page\.locator\(['"]\.modal['"]\)/g,
    new: 'page.locator(\'[role="dialog"]\')'
  },
  {
    old: /page\.locator\(['"]\.dialog['"]\)/g,
    new: 'page.locator(\'[role="dialog"]\')'
  },
  // Error selectors
  {
    old: /\.error, \.invalid, \.field-error/g,
    new: '[role="alert"][class*="destructive"], .text-destructive'
  },
  {
    old: /\.error-message/g,
    new: '.text-destructive'
  },
  // Loading selectors
  {
    old: /\.loading-spinner/g,
    new: 'svg[class*="animate-spin"]'
  },
  // Button selectors
  {
    old: /\.btn-primary/g,
    new: 'button:not([class*="outline"]):not([class*="ghost"]):not([class*="secondary"])'
  },
  {
    old: /\.btn-secondary/g,
    new: 'button[class*="outline"], button[class*="secondary"]'
  },
  // Wait for selector patterns
  {
    old: /waitForSelector\(['"]\.modal-content['"]/g,
    new: 'waitForSelector(\'[role="dialog"]\''
  },
  {
    old: /waitForSelector\(['"]\.modal['"]/g,
    new: 'waitForSelector(\'[role="dialog"]\''
  },
];

// Files to update
const testFiles = await glob('tests/e2e/**/*.spec.ts');

console.log(`Found ${testFiles.length} E2E test files to update`);

let totalReplacements = 0;

testFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let replacements = 0;
  
  // Check if file already imports shadcn helpers
  const hasShadcnImport = content.includes('shadcn-helpers');
  
  // Apply all selector mappings
  selectorMappings.forEach(mapping => {
    const matches = content.match(mapping.old);
    if (matches) {
      content = content.replace(mapping.old, mapping.new);
      replacements += matches.length;
    }
  });
  
  // Add import for shadcn helpers if needed and replacements were made
  if (replacements > 0 && !hasShadcnImport) {
    // Check if it uses waitForDialog or closeDialog patterns
    if (content.includes('waitForSelector(\'[role="dialog"]\'')) {
      // Add import after other imports
      const importMatch = content.match(/import .* from ['"].*['"]/g);
      if (importMatch) {
        const lastImport = importMatch[importMatch.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        content = content.slice(0, lastImportIndex + lastImport.length) + 
          '\nimport { SHADCN_SELECTORS, waitForDialog, closeDialog } from \'./utils/shadcn-helpers\';' +
          content.slice(lastImportIndex + lastImport.length);
          
        // Replace waitForSelector patterns with waitForDialog
        content = content.replace(
          /await page\.waitForSelector\('[role="dialog"]', { timeout: \d+ }\)/g,
          'await waitForDialog(page)'
        );
        content = content.replace(
          /await page\.waitForSelector\('[role="dialog"]'\)/g,
          'await waitForDialog(page)'
        );
      }
    }
  }
  
  if (replacements > 0) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file} - ${replacements} replacements`);
    totalReplacements += replacements;
  }
});

console.log(`\nTotal replacements made: ${totalReplacements}`);
console.log('\nNext steps:');
console.log('1. Review the changes made to the test files');
console.log('2. Run the E2E tests to verify they still work');
console.log('3. Fix any tests that may need manual adjustment');