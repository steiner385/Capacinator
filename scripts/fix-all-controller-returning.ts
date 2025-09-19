#!/usr/bin/env tsx

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const controllersDir = join(process.cwd(), 'src/server/api/controllers');

// Get all controller files
const controllerFiles = readdirSync(controllersDir)
  .filter(file => file.endsWith('Controller.ts'));

console.log(`Found ${controllerFiles.length} controller files to check`);

let filesFixed = 0;

for (const file of controllerFiles) {
  const filePath = join(controllersDir, file);
  let content = readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Skip if already imports uuid
  const hasUuidImport = content.includes("import { v4 as uuidv4 }") || content.includes("from 'uuid'");
  
  // Check if file contains .returning('*')
  if (content.includes(".returning('*')")) {
    console.log(`\nProcessing ${file}...`);
    
    // Add uuid import if not present
    if (!hasUuidImport) {
      // Find the last import statement
      const importMatches = content.match(/^import .* from .*;$/gm);
      if (importMatches) {
        const lastImport = importMatches[importMatches.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        content = content.slice(0, lastImportIndex + lastImport.length) + 
                  "\nimport { v4 as uuidv4 } from 'uuid';" +
                  content.slice(lastImportIndex + lastImport.length);
      }
    }
    
    // Find all insert operations with .returning('*')
    const insertPatterns = [
      // Pattern 1: Simple insert with returning
      /(\s*)const \[?(\w+)\]? = await this\.(?:db|executeQuery)\([\s\S]*?\.insert\(([\s\S]*?)\)[\s\S]*?\.returning\('\*'\);?/g,
      
      // Pattern 2: Insert in transaction
      /(\s*)const \[?(\w+)\]? = await (?:trx|transaction)\([\s\S]*?\.insert\(([\s\S]*?)\)[\s\S]*?\.returning\('\*'\);?/g,
      
      // Pattern 3: Direct table insert
      /(\s*)const \[?(\w+)\]? = await this\.db\('(\w+)'\)[\s\S]*?\.insert\(([\s\S]*?)\)[\s\S]*?\.returning\('\*'\);?/g
    ];
    
    for (const pattern of insertPatterns) {
      content = content.replace(pattern, (match, indent, varName, ...args) => {
        // Extract table name from the match
        const tableMatch = match.match(/(?:this\.db|trx|transaction)\(['"](\w+)['"]\)|from\(['"](\w+)['"]\)/);
        const tableName = tableMatch ? (tableMatch[1] || tableMatch[2]) : null;
        
        if (!tableName) {
          console.warn(`  Could not extract table name from: ${match.substring(0, 100)}...`);
          return match;
        }
        
        // Extract the data being inserted
        const insertDataMatch = match.match(/\.insert\(([\s\S]*?)\)[\s\S]*?\.returning/);
        const insertData = insertDataMatch ? insertDataMatch[1].trim() : 'data';
        
        console.log(`  Fixing ${tableName} insert operation...`);
        
        // Generate the new code
        const idVar = `${varName}Id`;
        const replacement = `${indent}// Generate a UUID for the ${tableName.replace(/_/g, ' ')}
${indent}const ${idVar} = uuidv4();

${indent}// Insert with generated ID
${indent}await this.db('${tableName}')
${indent}  .insert({
${indent}    id: ${idVar},
${indent}    ...${insertData}
${indent}  });

${indent}// Fetch the created record
${indent}const [${varName}] = await this.db('${tableName}')
${indent}  .where({ id: ${idVar} })
${indent}  .select('*');`;
        
        return replacement;
      });
    }
    
    // Handle update operations with .returning('*')
    const updatePattern = /(\s*)const \[?(\w+)\]? = await this\.(?:db|executeQuery)\([\s\S]*?\.update\(([\s\S]*?)\)[\s\S]*?\.returning\('\*'\);?/g;
    
    content = content.replace(updatePattern, (match, indent, varName, ...args) => {
      // Extract where clause
      const whereMatch = match.match(/\.where\(([\s\S]*?)\)[\s\S]*?\.update/);
      const whereClause = whereMatch ? whereMatch[1] : '{ id }';
      
      // Extract table name
      const tableMatch = match.match(/(?:this\.db|trx|transaction)\(['"](\w+)['"]\)|from\(['"](\w+)['"]\)/);
      const tableName = tableMatch ? (tableMatch[1] || tableMatch[2]) : null;
      
      if (!tableName) {
        console.warn(`  Could not extract table name from update: ${match.substring(0, 100)}...`);
        return match;
      }
      
      console.log(`  Fixing ${tableName} update operation...`);
      
      const replacement = `${indent}// Update the record
${indent}await this.db('${tableName}')
${indent}  .where(${whereClause})
${indent}  .update(${args[0]});

${indent}// Fetch the updated record
${indent}const [${varName}] = await this.db('${tableName}')
${indent}  .where(${whereClause})
${indent}  .select('*');`;
      
      return replacement;
    });
    
    // Write back if changed
    if (content !== originalContent) {
      writeFileSync(filePath, content);
      filesFixed++;
      console.log(`  ✅ Fixed ${file}`);
    }
  }
}

console.log(`\n✅ Fixed ${filesFixed} controller files`);
console.log('\nNote: Please review the changes and test thoroughly!');