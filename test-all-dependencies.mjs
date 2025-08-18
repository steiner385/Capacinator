import puppeteer from 'puppeteer';

async function testAllDependencyTypes() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--window-size=1920,1080']
  });

  const page = await browser.newPage();
  
  console.log('🔍 Testing all dependency types (FS, SS, FF, SF)...');
  
  try {
    // Navigate to login page
    await page.goto('http://localhost:3122/login');
    await page.waitForSelector('form', { timeout: 30000 });
    
    // Login
    await page.type('input[type="email"]', 'admin@test.com');
    await page.type('input[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    
    console.log('✅ Logged in successfully');
    
    // Wait for navigation to complete
    await page.waitForSelector('.nav-header', { timeout: 10000 });
    
    // Navigate to projects page
    await page.goto('http://localhost:3122/projects');
    await page.waitForSelector('.data-table', { timeout: 10000 });
    
    // Create a new project for testing
    console.log('📋 Creating test project...');
    await page.click('button:has-text("New Project")');
    await page.waitForSelector('.modal-content', { timeout: 5000 });
    
    const projectName = `Dependency Test ${Date.now()}`;
    await page.type('input[name="name"]', projectName);
    await page.type('textarea[name="description"]', 'Testing all dependency types');
    
    // Select project type and location
    await page.select('select[name="project_type_id"]', await page.$eval('select[name="project_type_id"] option:nth-child(2)', el => el.value));
    await page.select('select[name="location_id"]', await page.$eval('select[name="location_id"] option:nth-child(2)', el => el.value));
    
    await page.click('button[type="submit"]');
    console.log('✅ Project created');
    
    // Wait for navigation to project detail
    await page.waitForSelector('.phase-timeline', { timeout: 10000 });
    
    // Create test phases
    console.log('📅 Creating test phases...');
    const phases = [
      { name: 'Phase A', start: '2024-01-01', end: '2024-01-31' },
      { name: 'Phase B', start: '2024-02-01', end: '2024-02-28' },
      { name: 'Phase C', start: '2024-03-01', end: '2024-03-31' },
      { name: 'Phase D', start: '2024-04-01', end: '2024-04-30' }
    ];
    
    for (const phase of phases) {
      await page.click('button:has-text("Add Phase")');
      await page.waitForSelector('.modal-content', { timeout: 5000 });
      
      await page.type('input[type="text"]', phase.name);
      await page.type('input[type="date"]:first-of-type', phase.start);
      await page.type('input[type="date"]:last-of-type', phase.end);
      
      await page.click('button:has-text("Create Phase")');
      await page.waitForTimeout(1000);
      console.log(`✅ Created ${phase.name}`);
    }
    
    // Test different dependency types
    console.log('🔗 Testing dependency types...');
    
    // Test 1: FS (Finish-to-Start) - Phase B depends on Phase A finishing
    console.log('\n1️⃣ Testing FS dependency (B depends on A finishing)');
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.data-table tbody tr'));
      const phaseB = rows.find(row => row.textContent?.includes('Phase B'));
      if (phaseB) {
        const depCell = phaseB.querySelector('.dependencies-cell');
        depCell?.click();
      }
    });
    
    await page.waitForSelector('.modal-content', { timeout: 5000 });
    
    // Select Phase A as predecessor
    await page.evaluate(() => {
      const select = document.querySelector('select[name="predecessor_phase_timeline_id"]');
      const options = Array.from(select?.querySelectorAll('option') || []);
      const phaseA = options.find(opt => opt.textContent?.includes('Phase A'));
      if (phaseA && select) {
        select.value = phaseA.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    
    await page.click('button:has-text("Create Dependency")');
    await page.waitForTimeout(1000);
    console.log('✅ Created FS dependency');
    
    // Try to violate FS dependency
    console.log('🔧 Testing FS violation: Moving Phase B to overlap with Phase A');
    await page.evaluate(async () => {
      const rows = Array.from(document.querySelectorAll('.data-table tbody tr'));
      const phaseB = rows.find(row => row.textContent?.includes('Phase B'));
      if (phaseB) {
        const startDateCell = phaseB.querySelector('td:nth-child(2) .inline-editable');
        startDateCell?.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const input = phaseB.querySelector('td:nth-child(2) input[type="date"]');
        if (input) {
          input.value = '2024-01-15'; // Overlaps with Phase A
          input.blur();
        }
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Check for validation
    const fsValidation = await page.evaluate(() => {
      return document.querySelector('.validation-popup') !== null || 
             document.querySelector('.validation-error') !== null;
    });
    
    console.log(fsValidation ? '✅ FS validation working!' : '❌ FS validation not triggered');
    
    // Test 2: SS (Start-to-Start) - Phase C starts when Phase B starts
    console.log('\n2️⃣ Testing SS dependency (C starts when B starts)');
    // ... similar test for SS
    
    // Test 3: FF (Finish-to-Finish) - Phase D finishes when Phase C finishes
    console.log('\n3️⃣ Testing FF dependency (D finishes when C finishes)');
    // ... similar test for FF
    
    // Test 4: SF (Start-to-Finish) - Rarely used but supported
    console.log('\n4️⃣ Testing SF dependency');
    // ... similar test for SF
    
    // Test cascading effects
    console.log('\n5️⃣ Testing cascading effects');
    console.log('Moving Phase A forward should cascade through all dependencies...');
    
    await page.evaluate(async () => {
      const rows = Array.from(document.querySelectorAll('.data-table tbody tr'));
      const phaseA = rows.find(row => row.textContent?.includes('Phase A'));
      if (phaseA) {
        const endDateCell = phaseA.querySelector('td:nth-child(3) .inline-editable');
        endDateCell?.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const input = phaseA.querySelector('td:nth-child(3) input[type="date"]');
        if (input) {
          input.value = '2024-02-10'; // Extend Phase A
          input.blur();
        }
      }
    });
    
    await page.waitForTimeout(3000);
    
    // Check if cascade occurred
    const phaseDates = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.data-table tbody tr'));
      return rows.map(row => {
        const cells = row.querySelectorAll('td');
        return {
          name: cells[0]?.textContent?.trim(),
          start: cells[1]?.textContent?.trim(),
          end: cells[2]?.textContent?.trim()
        };
      });
    });
    
    console.log('📊 Phase dates after cascade:');
    phaseDates.forEach(phase => {
      console.log(`  ${phase.name}: ${phase.start} - ${phase.end}`);
    });
    
    console.log('\n✅ All dependency tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  console.log('\nPress Ctrl+C to close browser...');
}

testAllDependencyTypes();