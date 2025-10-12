#!/usr/bin/env node

/**
 * Simple test script to verify the Export Scenario Data button fix
 * This script makes a direct HTTP request to the export endpoint to test if it works
 */

const https = require('https');
const http = require('http');

function testExportEndpoint() {
  console.log('🧪 Testing Export Scenario Data endpoint...');
  
  // Construct the test URL (assuming default development setup)
  const options = {
    hostname: 'localhost',
    port: 3110, // Default development server port
    path: '/api/import/export/scenario?includeAssignments=true&includePhases=true',
    method: 'GET',
    headers: {
      'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'User-Agent': 'Export-Test-Script'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`📊 Response Status: ${res.statusCode} ${res.statusMessage}`);
    console.log(`📋 Response Headers:`, res.headers);

    if (res.statusCode === 200) {
      console.log('✅ SUCCESS: Export endpoint is responding correctly!');
      console.log(`📁 Content-Type: ${res.headers['content-type']}`);
      console.log(`📏 Content-Length: ${res.headers['content-length'] || 'chunked'}`);
      
      let dataLength = 0;
      res.on('data', (chunk) => {
        dataLength += chunk.length;
      });
      
      res.on('end', () => {
        console.log(`💾 Total data received: ${dataLength} bytes`);
        if (dataLength > 1000) {
          console.log('✅ File size looks reasonable for an Excel export');
        } else {
          console.log('⚠️  Warning: File size seems small, might be an error response');
        }
      });
    } else if (res.statusCode === 401) {
      console.log('🔐 Authentication required - this is expected in production');
      console.log('✅ The endpoint exists and is protected correctly');
    } else if (res.statusCode === 404) {
      console.log('❌ FAILED: Export endpoint not found');
      console.log('💡 The route might not be registered correctly');
    } else if (res.statusCode === 500) {
      console.log('❌ FAILED: Server error occurred');
      console.log('💡 Check server logs for ExcelJS or database errors');
    } else {
      console.log(`ℹ️  Unexpected status code: ${res.statusCode}`);
    }

    // Read any error response
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode !== 200 && body) {
        try {
          const errorData = JSON.parse(body);
          console.log('📄 Error details:', errorData);
        } catch (e) {
          console.log('📄 Raw response:', body.substring(0, 200));
        }
      }
    });
  });

  req.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
      console.log('❌ FAILED: Cannot connect to server');
      console.log('💡 Make sure the development server is running on port 3110');
      console.log('💡 Run: npm run dev');
    } else {
      console.log('❌ FAILED: Request error:', err.message);
    }
  });

  req.setTimeout(10000, () => {
    console.log('⏰ Request timeout - server might be slow to respond');
    req.destroy();
  });

  req.end();
}

// Test template endpoint as well
function testTemplateEndpoint() {
  console.log('\n🧪 Testing Download Template endpoint...');
  
  const options = {
    hostname: 'localhost',
    port: 3110,
    path: '/api/import/template',
    method: 'GET',
    headers: {
      'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'User-Agent': 'Template-Test-Script'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`📊 Template Response Status: ${res.statusCode} ${res.statusMessage}`);
    
    if (res.statusCode === 200) {
      console.log('✅ SUCCESS: Template endpoint is working!');
    } else {
      console.log(`ℹ️  Template status: ${res.statusCode}`);
    }
  });

  req.on('error', (err) => {
    console.log('❌ Template endpoint error:', err.message);
  });

  req.end();
}

console.log('🚀 Starting Export Functionality Test\n');
console.log('This script tests the export endpoints to verify the fix is working\n');

testExportEndpoint();

// Test template endpoint after a short delay
setTimeout(testTemplateEndpoint, 2000);

console.log('\n📝 Instructions:');
console.log('1. Make sure the development server is running: npm run dev');
console.log('2. If you see "SUCCESS" messages, the export button should work');
console.log('3. If you see errors, check the server logs for more details');
console.log('4. The frontend button should now work in the browser at /import');