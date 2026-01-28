import { ExcelImporterV2 } from '../server/services/import/ExcelImporterV2.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testAllImports() {
  console.log('🧪 Testing all Excel import files...\n');
  
  const testFiles = [
    { name: 'Simple Test Data', file: 'simple-test-data.xlsx', expectSuccess: true },
    { name: 'Complex Test Data', file: 'complex-test-data.xlsx', expectSuccess: false },
    { name: 'Exact Template Data', file: 'exact-template-data.xlsx', expectSuccess: true }
  ];

  for (const test of testFiles) {
    console.log(`📊 Testing: ${test.name}`);
    console.log(`📁 File: ${test.file}`);
    
    const importer = new ExcelImporterV2();
    const templatePath = path.join(__dirname, `../../test-data/${test.file}`);
    
    try {
      const result = await importer.importFromFile(templatePath, { clearExisting: true });
      
      console.log(`✅ Import completed - Success: ${result.success}`);
      
      // Summary of imported data
      const totalImported = Object.values(result.imported).reduce((sum, count) => sum + count, 0);
      console.log(`📈 Total records imported: ${totalImported}`);
      
      if (result.errors.length > 0) {
        console.log(`❌ Errors: ${result.errors.length}`);
        result.errors.slice(0, 3).forEach(error => console.log(`   - ${error}`));
        if (result.errors.length > 3) {
          console.log(`   ... and ${result.errors.length - 3} more errors`);
        }
      }
      
      if (result.warnings.length > 0) {
        console.log(`⚠️  Warnings: ${result.warnings.length}`);
        result.warnings.slice(0, 3).forEach(warning => console.log(`   - ${warning}`));
        if (result.warnings.length > 3) {
          console.log(`   ... and ${result.warnings.length - 3} more warnings`);
        }
      }

      // Check if result matches expectation
      if (result.success === test.expectSuccess) {
        console.log(`✅ Test PASSED - Expected success: ${test.expectSuccess}, Got: ${result.success}`);
      } else {
        console.log(`❌ Test FAILED - Expected success: ${test.expectSuccess}, Got: ${result.success}`);
      }
      
    } catch (error) {
      console.error(`💥 Import failed with exception:`, error instanceof Error ? error.message : error);
      if (!test.expectSuccess) {
        console.log(`✅ Test PASSED - Expected failure and got exception`);
      } else {
        console.log(`❌ Test FAILED - Expected success but got exception`);
      }
    }
    
    console.log('─'.repeat(80));
  }

  console.log('🎉 All import tests completed!');
}

testAllImports().catch(console.error);