const http = require('http');

// Simple function to test the page
async function testPage() {
  try {
    console.log('Testing client on port 8090...');
    
    const req = http.request({
      hostname: 'localhost',
      port: 8090,
      path: '/allocations',
      method: 'GET',
      timeout: 5000
    }, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers:`, res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Response received, length:', data.length);
        if (data.length > 0) {
          console.log('First 500 chars:', data.substring(0, 500));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Request error:', error.message);
    });
    
    req.on('timeout', () => {
      console.error('Request timeout');
      req.abort();
    });
    
    req.end();
    
    // Also test the API
    console.log('\nTesting API on port 8082...');
    const apiReq = http.request({
      hostname: 'localhost',
      port: 8082,
      path: '/api/resource-templates',
      method: 'GET',
      timeout: 5000
    }, (res) => {
      console.log(`API Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('API Response length:', data.length);
        try {
          const parsed = JSON.parse(data);
          console.log('API Response count:', parsed.length);
        } catch (e) {
          console.log('API Response not JSON');
        }
      });
    });
    
    apiReq.on('error', (error) => {
      console.error('API Request error:', error.message);
    });
    
    apiReq.end();
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testPage();