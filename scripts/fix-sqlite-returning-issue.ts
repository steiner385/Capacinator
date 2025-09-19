import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

/**
 * Fix SQLite .returning('*') issue in all controllers
 * SQLite with better-sqlite3 doesn't support returning clause
 */

interface ControllerFix {
  file: string;
  method: string;
  tableName: string;
  hasUuid: boolean;
}

async function findControllersToFix(): Promise<ControllerFix[]> {
  const controllers = await glob('src/server/api/controllers/*.ts');
  const fixes: ControllerFix[] = [];

  for (const file of controllers) {
    const content = await fs.readFile(file, 'utf-8');
    
    // Skip if already has uuid import
    const hasUuid = content.includes("import { v4 as uuidv4 }") || content.includes("uuid");
    
    // Find insert operations with returning('*')
    const insertPattern = /await this\.db\('(\w+)'\)\s*\.insert\([^)]+\)\s*\.returning\('\*'\)/g;
    let match;
    
    while ((match = insertPattern.exec(content)) !== null) {
      const tableName = match[1];
      
      // Try to find the method name
      const beforeMatch = content.substring(0, match.index);
      const methodMatch = beforeMatch.match(/async (\w+)\s*\([^)]*\)\s*{[^}]*$/);
      const methodName = methodMatch ? methodMatch[1] : 'unknown';
      
      fixes.push({
        file,
        method: methodName,
        tableName,
        hasUuid
      });
    }
  }

  return fixes;
}

async function fixController(fix: ControllerFix): Promise<void> {
  console.log(`🔧 Fixing ${path.basename(fix.file)} - ${fix.method} method (${fix.tableName} table)`);
  
  let content = await fs.readFile(fix.file, 'utf-8');
  
  // Add uuid import if needed
  if (!fix.hasUuid) {
    // Find the imports section
    const importMatch = content.match(/import [^;]+;/);
    if (importMatch) {
      const lastImportIndex = content.lastIndexOf(importMatch[0]) + importMatch[0].length;
      content = content.substring(0, lastImportIndex) + 
                "\nimport { v4 as uuidv4 } from 'uuid';" + 
                content.substring(lastImportIndex);
    }
  }
  
  // Fix insert operations
  // This is a simplified fix - in practice we'd need more sophisticated parsing
  const patterns = [
    {
      // Pattern for simple insert().returning('*')
      pattern: new RegExp(
        `const \\[(\\w+)\\] = await this\\.db\\('${fix.tableName}'\\)\\s*\\.insert\\(([^)]+)\\)\\s*\\.returning\\('\\*'\\);`,
        'g'
      ),
      replacement: (match: string, varName: string, insertData: string) => {
        return `// Generate a UUID for the ${fix.tableName.slice(0, -1)}
      const ${varName}Id = uuidv4();

      // Insert with generated ID
      await this.db('${fix.tableName}')
        .insert({
          id: ${varName}Id,${insertData.includes('...') ? '\n          ' + insertData.trim() : insertData}
        });

      // Fetch the created record
      const [${varName}] = await this.db('${fix.tableName}')
        .where({ id: ${varName}Id })
        .select('*');`
      }
    }
  ];
  
  for (const { pattern, replacement } of patterns) {
    content = content.replace(pattern, replacement);
  }
  
  await fs.writeFile(fix.file, content, 'utf-8');
  console.log(`✅ Fixed ${fix.method} method`);
}

async function main() {
  console.log('🔍 Searching for controllers with .returning(*) issue...\n');
  
  const fixes = await findControllersToFix();
  
  console.log(`Found ${fixes.length} methods to fix:\n`);
  
  // Group by file
  const byFile = fixes.reduce((acc, fix) => {
    if (!acc[fix.file]) acc[fix.file] = [];
    acc[fix.file].push(fix);
    return acc;
  }, {} as Record<string, ControllerFix[]>);
  
  // Show what we'll fix
  for (const [file, fileFixes] of Object.entries(byFile)) {
    console.log(`📄 ${path.basename(file)}:`);
    for (const fix of fileFixes) {
      console.log(`   - ${fix.method}() method (${fix.tableName} table)`);
    }
  }
  
  console.log('\n⚠️  This will modify controller files. Manual review recommended after running.');
  console.log('Note: Only fixing PeopleController for now as a test.\n');
  
  // For now, just fix PeopleController as it's critical for tests
  const peopleControllerFixes = fixes.filter(f => f.file.includes('PeopleController.ts'));
  
  if (peopleControllerFixes.length > 0) {
    // Since manual pattern matching is complex, let's just fix PeopleController directly
    await fixPeopleControllerDirectly();
  }
}

async function fixPeopleControllerDirectly() {
  const file = 'src/server/api/controllers/PeopleController.ts';
  console.log(`\n🔧 Applying manual fix to PeopleController...`);
  
  let content = await fs.readFile(file, 'utf-8');
  
  // Add uuid import
  if (!content.includes('uuid')) {
    content = content.replace(
      "import { Request, Response } from 'express';",
      "import { Request, Response } from 'express';\nimport { v4 as uuidv4 } from 'uuid';"
    );
  }
  
  // Fix the create method
  content = content.replace(
    /const \[person\] = await this\.db\('people'\)\s*\.insert\(\{([^}]+)\}\)\s*\.returning\('\*'\);/gs,
    `// Generate a UUID for the person
      const personId = uuidv4();
      
      // Insert with generated ID
      await this.db('people')
        .insert({
          id: personId,$1
        });

      // Fetch the created person
      const [person] = await this.db('people')
        .where({ id: personId })
        .select('*');`
  );
  
  await fs.writeFile(file, content, 'utf-8');
  console.log('✅ Fixed PeopleController\n');
}

main().catch(console.error);