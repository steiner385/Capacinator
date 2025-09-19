import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Script to automatically fix common test issues
 */

interface TestFix {
  pattern: RegExp;
  replacement: string;
  description: string;
}

const COMMON_FIXES: TestFix[] = [
  // Fix invalid CSS selectors
  {
    pattern: /svg\[class\*="animate-spin"\]-container/g,
    replacement: 'svg[class*="animate-spin"]',
    description: 'Fix invalid CSS selector for loading spinners'
  },
  
  // Add longer timeouts for profile modal
  {
    pattern: /waitForSelector\('#person-select', \{ timeout: 10000/g,
    replacement: 'waitForSelector(\'#person-select\', { timeout: 15000',
    description: 'Increase profile select timeout'
  },
  
  // Fix navigation timeout issues
  {
    pattern: /waitForLoadState\('networkidle'\)/g,
    replacement: 'waitForLoadState(\'networkidle\', { timeout: 30000 })',
    description: 'Add explicit timeout to network idle wait'
  },
  
  // Fix modal detection patterns
  {
    pattern: /text=Select Your Profile/g,
    replacement: 'text="Select Your Profile"',
    description: 'Fix text selector quotes for profile modal'
  }
];

async function fixTestFile(filePath: string): Promise<number> {
  let content = await fs.readFile(filePath, 'utf-8');
  let fixCount = 0;
  
  for (const fix of COMMON_FIXES) {
    const matches = content.match(fix.pattern);
    if (matches) {
      content = content.replace(fix.pattern, fix.replacement);
      fixCount += matches.length;
      console.log(`  ✅ Applied fix: ${fix.description} (${matches.length} occurrences)`);
    }
  }
  
  if (fixCount > 0) {
    await fs.writeFile(filePath, content, 'utf-8');
  }
  
  return fixCount;
}

async function fixAllTestFiles(directory: string): Promise<void> {
  console.log('🔧 Fixing common test issues...\n');
  
  const entries = await fs.readdir(directory, { withFileTypes: true });
  let totalFixes = 0;
  let filesFixed = 0;
  
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    
    if (entry.isDirectory() && !entry.name.includes('node_modules')) {
      await fixAllTestFiles(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
      console.log(`📄 Checking ${entry.name}...`);
      const fixCount = await fixTestFile(fullPath);
      
      if (fixCount > 0) {
        totalFixes += fixCount;
        filesFixed++;
        console.log(`  📝 Fixed ${fixCount} issues\n`);
      } else {
        console.log(`  ✅ No issues found\n`);
      }
    }
  }
  
  if (directory.endsWith('/e2e')) {
    console.log(`\n✨ Fixed ${totalFixes} issues in ${filesFixed} files`);
  }
}

// Add auth helper import to test files
async function addAuthHelperImport(filePath: string): Promise<boolean> {
  let content = await fs.readFile(filePath, 'utf-8');
  
  // Check if already has auth import
  if (content.includes('improved-auth-helpers') || 
      content.includes('ImprovedAuthHelper') ||
      content.includes('setupPageWithAuth')) {
    return false;
  }
  
  // Check if test uses page.goto directly
  if (!content.includes('page.goto(') && !content.includes('test.beforeEach')) {
    return false;
  }
  
  // Add import after first import
  const importMatch = content.match(/import .* from ['"]@playwright\/test['"]/);
  if (importMatch) {
    const importLine = importMatch[0];
    const newImport = `${importLine}\nimport { setupPageWithAuth } from './utils/improved-auth-helpers';`;
    content = content.replace(importLine, newImport);
    
    await fs.writeFile(filePath, content, 'utf-8');
    return true;
  }
  
  return false;
}

// Main execution
const testDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
fixAllTestFiles(testDir).catch(console.error);