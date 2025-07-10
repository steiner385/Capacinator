import { ExcelImporterV2 } from '../server/services/import/ExcelImporterV2.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testImportV2() {
  console.log('Testing ExcelImporterV2 with new template...');
  
  const importer = new ExcelImporterV2();
  const templatePath = path.join(__dirname, '../../test-data/complex-test-data.xlsx');
  
  console.log(`Template path: ${templatePath}`);
  
  try {
    const result = await importer.importFromFile(templatePath, true);
    
    console.log('\n📊 Import Results:');
    console.log('Success:', result.success);
    console.log('\nImported counts:');
    Object.entries(result.imported).forEach(([key, count]) => {
      console.log(`  ${key}: ${count}`);
    });
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

testImportV2();