#!/usr/bin/env node
/**
 * Script to fix modal background transparency issues
 * Updates all modal CSS to ensure solid backgrounds
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const fixes = [
  // Fix transparent modal overlays
  {
    pattern: /background:\s*rgba\(0,\s*0,\s*0,\s*0\.[0-4]\d*\)/g,
    replacement: 'background: rgba(0, 0, 0, 0.75)'
  },
  {
    pattern: /background-color:\s*rgba\(0,\s*0,\s*0,\s*0\.[0-4]\d*\)/g,
    replacement: 'background-color: rgba(0, 0, 0, 0.75)'
  },
  // Remove backdrop filters that can cause transparency
  {
    pattern: /backdrop-filter:\s*blur\([^)]+\);?/g,
    replacement: '/* backdrop-filter removed for solid background */'
  },
  // Fix modal content with transparent backgrounds
  {
    pattern: /\.modal-content\s*\{[^}]*background:\s*transparent[^}]*\}/g,
    replacement: (match: string) => match.replace('background: transparent', 'background: var(--bg-primary)')
  },
  {
    pattern: /\.modal-container\s*\{[^}]*background:\s*transparent[^}]*\}/g,
    replacement: (match: string) => match.replace('background: transparent', 'background: var(--bg-primary)')
  }
];

async function fixModalBackgrounds() {
  console.log('🔍 Finding CSS files with modal styles...');
  
  const cssFiles = await glob('client/src/**/*.css', {
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
  });
  
  let fixedCount = 0;
  
  for (const file of cssFiles) {
    const content = fs.readFileSync(file, 'utf8');
    let modified = content;
    let hasChanges = false;
    
    // Check if file has modal-related styles
    if (content.includes('modal') || content.includes('dialog') || content.includes('overlay')) {
      // Apply fixes
      for (const fix of fixes) {
        const beforeLength = modified.length;
        modified = modified.replace(fix.pattern, fix.replacement as any);
        if (modified.length !== beforeLength) {
          hasChanges = true;
        }
      }
      
      // Add import for common modal styles if not present
      if (hasChanges && !modified.includes('modal-common.css')) {
        // Add import at the top of the file
        if (modified.includes('@import')) {
          // Add after other imports
          modified = modified.replace(
            /(@import[^;]+;)([^@])/,
            '$1\n@import "../../styles/modal-common.css";\n$2'
          );
        } else {
          // Add at the beginning
          modified = `@import "../../styles/modal-common.css";\n\n${modified}`;
        }
      }
      
      if (hasChanges) {
        fs.writeFileSync(file, modified, 'utf8');
        console.log(`✅ Fixed: ${path.relative(process.cwd(), file)}`);
        fixedCount++;
      }
    }
  }
  
  console.log(`\n🎉 Fixed ${fixedCount} files with modal transparency issues`);
}

// Run the script
fixModalBackgrounds().catch(console.error);