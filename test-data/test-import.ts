import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = 'http://localhost:3456/api';

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
}

async function testImport(fileName: string, clearExisting: boolean = true): Promise<TestResult> {
  const filePath = path.join(__dirname, fileName);
  
  if (!fs.existsSync(filePath)) {
    return {
      testName: `Import ${fileName}`,
      passed: false,
      message: `File not found: ${filePath}`
    };
  }

  try {
    const form = new FormData();
    form.append('excelFile', fs.createReadStream(filePath));
    form.append('clearExisting', clearExisting.toString());

    const response = await fetch(`${API_BASE_URL}/import/excel`, {
      method: 'POST',
      body: form as any,
      headers: form.getHeaders()
    });

    const result = await response.json();

    return {
      testName: `Import ${fileName} (clear=${clearExisting})`,
      passed: response.ok,
      message: response.ok ? 'Import succeeded' : 'Import failed',
      details: result
    };
  } catch (error) {
    return {
      testName: `Import ${fileName}`,
      passed: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    };
  }
}

async function validateImportedData(): Promise<TestResult[]> {
  const tests: TestResult[] = [];

  try {
    // Check projects
    const projectsResponse = await fetch(`${API_BASE_URL}/projects`);
    const projectsData = await projectsResponse.json();
    
    tests.push({
      testName: 'Projects imported',
      passed: projectsData.data && projectsData.data.length > 0,
      message: `Found ${projectsData.data?.length || 0} projects`,
      details: projectsData.pagination
    });

    // Check for specific edge case handling
    const projectNames = projectsData.data?.map((p: any) => p.name) || [];
    tests.push({
      testName: 'Unicode project names handled',
      passed: projectNames.some((name: string) => name.includes('项目')),
      message: 'Unicode characters in project names'
    });

    tests.push({
      testName: 'Long project names truncated/handled',
      passed: !projectNames.some((name: string) => name.length > 200),
      message: 'No project names exceed reasonable length'
    });

    // Check people
    const peopleResponse = await fetch(`${API_BASE_URL}/people`);
    const peopleData = await peopleResponse.json();
    
    tests.push({
      testName: 'People imported',
      passed: peopleData.data && peopleData.data.length > 0,
      message: `Found ${peopleData.data?.length || 0} people`,
      details: peopleData.pagination
    });

    // Check for duplicate email handling
    const emails = peopleData.data?.map((p: any) => p.email).filter(Boolean) || [];
    const uniqueEmails = new Set(emails);
    tests.push({
      testName: 'Duplicate emails handled',
      passed: emails.length === uniqueEmails.size || emails.length === 0,
      message: `${emails.length} emails, ${uniqueEmails.size} unique`
    });

    // Check roles
    const rolesResponse = await fetch(`${API_BASE_URL}/roles`);
    const rolesData = await rolesResponse.json();
    
    tests.push({
      testName: 'Roles created from data',
      passed: rolesData.length > 0,
      message: `Found ${rolesData.length} roles`
    });

    // Check standard allocations
    const allocationsResponse = await fetch(`${API_BASE_URL}/allocations`);
    const allocationsData = await allocationsResponse.json();
    
    tests.push({
      testName: 'Standard allocations imported',
      passed: allocationsData.length > 0,
      message: `Found ${allocationsData.length} standard allocations`
    });

    // Check for invalid allocation percentages
    const invalidAllocations = allocationsData.filter((a: any) => 
      a.allocation_percentage < 0 || a.allocation_percentage > 100
    );
    tests.push({
      testName: 'Invalid allocation percentages filtered',
      passed: invalidAllocations.length === 0,
      message: `Found ${invalidAllocations.length} invalid allocations`,
      details: invalidAllocations
    });

    // Check reporting endpoints
    const dashboardResponse = await fetch(`${API_BASE_URL}/reporting/dashboard`);
    const dashboardData = await dashboardResponse.json();
    
    tests.push({
      testName: 'Dashboard data available',
      passed: dashboardResponse.ok && dashboardData.summary,
      message: 'Dashboard endpoint working',
      details: dashboardData.summary
    });

    // Check capacity gaps
    const capacityResponse = await fetch(`${API_BASE_URL}/reporting/capacity`);
    const capacityData = await capacityResponse.json();
    
    tests.push({
      testName: 'Capacity analysis working',
      passed: capacityResponse.ok && capacityData.capacityGaps,
      message: 'Capacity gaps calculated',
      details: capacityData.summary
    });

  } catch (error) {
    tests.push({
      testName: 'Data validation',
      passed: false,
      message: `Error validating data: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  return tests;
}

async function runTests() {
  console.log('🧪 Testing Excel Import Functionality\n');
  console.log('=' .repeat(60));
  
  const allTests: TestResult[] = [];

  // Test 1: Import minimal valid file
  console.log('\n📋 Test 1: Import minimal valid file');
  const minimalTest = await testImport('minimal-valid-import.xlsx', true);
  allTests.push(minimalTest);
  console.log(`${minimalTest.passed ? '✅' : '❌'} ${minimalTest.testName}`);
  if (minimalTest.details) {
    console.log('   Imported:', minimalTest.details.imported);
  }

  // Validate minimal import
  console.log('\n🔍 Validating minimal import...');
  const minimalValidation = await validateImportedData();
  allTests.push(...minimalValidation);
  minimalValidation.forEach(test => {
    console.log(`${test.passed ? '✅' : '❌'} ${test.testName}: ${test.message}`);
  });

  // Test 2: Import complex file with edge cases
  console.log('\n📋 Test 2: Import complex test file with edge cases');
  const complexTest = await testImport('test-import-data.xlsx', true);
  allTests.push(complexTest);
  console.log(`${complexTest.passed ? '✅' : '❌'} ${complexTest.testName}`);
  if (complexTest.details) {
    console.log('   Imported:', complexTest.details.imported);
    if (complexTest.details.errors?.length > 0) {
      console.log('   Errors:', complexTest.details.errors.length);
      complexTest.details.errors.slice(0, 5).forEach((err: string) => 
        console.log(`     - ${err}`)
      );
      if (complexTest.details.errors.length > 5) {
        console.log(`     ... and ${complexTest.details.errors.length - 5} more errors`);
      }
    }
    if (complexTest.details.warnings?.length > 0) {
      console.log('   Warnings:', complexTest.details.warnings.length);
      complexTest.details.warnings.slice(0, 5).forEach((warn: string) => 
        console.log(`     - ${warn}`)
      );
    }
  }

  // Validate complex import
  console.log('\n🔍 Validating complex import...');
  const complexValidation = await validateImportedData();
  allTests.push(...complexValidation);
  complexValidation.forEach(test => {
    console.log(`${test.passed ? '✅' : '❌'} ${test.testName}: ${test.message}`);
    if (!test.passed && test.details) {
      console.log('   Details:', JSON.stringify(test.details, null, 2));
    }
  });

  // Test 3: Import without clearing (merge)
  console.log('\n📋 Test 3: Import without clearing existing data');
  const mergeTest = await testImport('minimal-valid-import.xlsx', false);
  allTests.push(mergeTest);
  console.log(`${mergeTest.passed ? '✅' : '❌'} ${mergeTest.testName}`);

  // Test 4: File validation endpoint
  console.log('\n📋 Test 4: File validation endpoint');
  try {
    const form = new FormData();
    form.append('excelFile', fs.createReadStream(path.join(__dirname, 'test-import-data.xlsx')));
    
    const response = await fetch(`${API_BASE_URL}/import/validate`, {
      method: 'POST',
      body: form as any,
      headers: form.getHeaders()
    });
    
    const result = await response.json();
    const validationTest = {
      testName: 'File validation endpoint',
      passed: response.ok,
      message: result.message || 'Validation completed',
      details: result
    };
    allTests.push(validationTest);
    console.log(`${validationTest.passed ? '✅' : '❌'} ${validationTest.testName}: ${validationTest.message}`);
  } catch (error) {
    console.log(`❌ File validation endpoint: ${error}`);
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Test Summary\n');
  
  const passed = allTests.filter(t => t.passed).length;
  const failed = allTests.filter(t => !t.passed).length;
  const total = allTests.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    allTests.filter(t => !t.passed).forEach(test => {
      console.log(`  - ${test.testName}: ${test.message}`);
    });
  }
  
  console.log('\n✨ Testing complete!');
}

// Run tests
runTests().catch(console.error);