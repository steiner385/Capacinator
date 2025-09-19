import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Script to automatically update test files to use improved auth helpers
 */

interface TestUpdate {
  pattern: RegExp;
  replacement: string | ((match: string, ...args: any[]) => string);
  description: string;
}

const TEST_UPDATES: TestUpdate[] = [
  // Update simple page.goto calls
  {
    pattern: /await page\.goto\('\/'\);/g,
    replacement: `await setupPageWithAuth(page, '/');`,
    description: 'Replace page.goto(\'/\') with setupPageWithAuth'
  },
  {
    pattern: /await page\.goto\('([^']+)'\);/g,
    replacement: (match, url) => {
      // Skip if it's already using setupPageWithAuth or has special parameters
      if (url.includes('http://') || url.includes('https://')) {
        return match;
      }
      return `await setupPageWithAuth(page, '${url}');`;
    },
    description: 'Replace page.goto with setupPageWithAuth for relative URLs'
  },
  {
    pattern: /await page\.goto\(`([^`]+)`\);/g,
    replacement: (match, url) => {
      // Skip if it's already using setupPageWithAuth or has special parameters
      if (url.includes('http://') || url.includes('https://') || url.includes('${')) {
        return match;
      }
      return `await setupPageWithAuth(page, \`${url}\`);`;
    },
    description: 'Replace page.goto with template literals'
  }
];

async function addImportIfNeeded(content: string, filePath: string): Promise<string> {
  // Check if already has the import
  if (content.includes('setupPageWithAuth') || 
      content.includes('ImprovedAuthHelper') ||
      content.includes('improved-auth-helpers')) {
    return content;
  }

  // Check if file uses page.goto
  if (!content.includes('page.goto(')) {
    return content;
  }

  // Add import after playwright imports
  const playwrightImportMatch = content.match(/import .* from ['"]@playwright\/test['"]/);
  if (playwrightImportMatch) {
    const importLine = playwrightImportMatch[0];
    const importIndex = content.indexOf(importLine) + importLine.length;
    
    // Check if it already has other test helper imports
    const hasTestHelpers = content.includes('./utils/test-helpers');
    
    if (hasTestHelpers) {
      // Add to existing test-helpers import
      const testHelperImport = content.match(/import \{([^}]+)\} from ['"]\.\/utils\/test-helpers['"]/);
      if (testHelperImport) {
        const currentImports = testHelperImport[1];
        const newImports = `${currentImports}, setupPageWithAuth`;
        content = content.replace(testHelperImport[0], `import {${newImports}} from './utils/test-helpers'`);
        
        // Also need to re-export from test-helpers
        console.log(`  ℹ️  Note: Need to add setupPageWithAuth export to test-helpers.ts`);
      }
    } else {
      // Add new import
      const newImport = `\nimport { setupPageWithAuth } from './utils/improved-auth-helpers';`;
      content = content.substring(0, importIndex) + newImport + content.substring(importIndex);
    }
  }
  
  return content;
}

async function updateTestFile(filePath: string): Promise<number> {
  let content = await fs.readFile(filePath, 'utf-8');
  let updateCount = 0;
  
  // Skip files that are already updated or are the auth helpers themselves
  if (filePath.includes('improved-auth-helpers') || 
      filePath.includes('test-connection.spec') || // This one uses special localhost URL
      filePath.includes('fix-common-test-issues')) {
    return 0;
  }
  
  // First add import if needed
  const originalContent = content;
  content = await addImportIfNeeded(content, filePath);
  
  if (content !== originalContent) {
    updateCount++;
    console.log(`  ✅ Added auth helper import`);
  }
  
  // Apply updates
  for (const update of TEST_UPDATES) {
    const matches = content.match(update.pattern);
    if (matches) {
      if (typeof update.replacement === 'string') {
        content = content.replace(update.pattern, update.replacement);
      } else {
        content = content.replace(update.pattern, update.replacement);
      }
      updateCount += matches.length;
      console.log(`  ✅ Applied: ${update.description} (${matches.length} occurrences)`);
    }
  }
  
  if (updateCount > 0) {
    await fs.writeFile(filePath, content, 'utf-8');
  }
  
  return updateCount;
}

async function updateAllTestFiles(directory: string): Promise<void> {
  console.log('🔧 Updating test files with improved auth helpers...\n');
  
  const entries = await fs.readdir(directory, { withFileTypes: true });
  let totalUpdates = 0;
  let filesUpdated = 0;
  
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    
    if (entry.isDirectory() && !entry.name.includes('node_modules') && !entry.name.includes('utils')) {
      await updateAllTestFiles(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
      console.log(`📄 Checking ${entry.name}...`);
      const updateCount = await updateTestFile(fullPath);
      
      if (updateCount > 0) {
        totalUpdates += updateCount;
        filesUpdated++;
        console.log(`  📝 Updated ${updateCount} items\n`);
      } else {
        console.log(`  ✅ No updates needed\n`);
      }
    }
  }
  
  if (directory.endsWith('/e2e')) {
    console.log(`\n✨ Updated ${totalUpdates} items in ${filesUpdated} files`);
    
    if (filesUpdated > 0) {
      console.log(`\n⚠️  Remember to also update test-helpers.ts to re-export setupPageWithAuth if any tests use that file`);
    }
  }
}

// Check if test-helpers.ts needs updating
async function checkTestHelpersExport(): Promise<void> {
  const testHelpersPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../utils/test-helpers.ts');
  
  try {
    const content = await fs.readFile(testHelpersPath, 'utf-8');
    if (!content.includes('setupPageWithAuth')) {
      console.log('\n📝 Adding setupPageWithAuth export to test-helpers.ts...');
      
      // Add import at the top
      const importStatement = `import { setupPageWithAuth } from './improved-auth-helpers';\n`;
      
      // Add export at the end
      const exportStatement = `\n// Re-export auth helpers for convenience\nexport { setupPageWithAuth };\n`;
      
      const newContent = importStatement + content + exportStatement;
      await fs.writeFile(testHelpersPath, newContent, 'utf-8');
      
      console.log('✅ Updated test-helpers.ts with auth helper exports');
    }
  } catch (error) {
    console.log('ℹ️  Could not check test-helpers.ts, skipping...');
  }
}

// Main execution
const testDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
updateAllTestFiles(testDir)
  .then(() => checkTestHelpersExport())
  .catch(console.error);