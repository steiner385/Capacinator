#!/usr/bin/env npx tsx

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

interface TestResult {
  scenario: string;
  passed: boolean;
  duration: number;
  errors: string[];
}

class E2ETestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;

  async runAllScenarios(): Promise<void> {
    console.log('🚀 Starting comprehensive E2E test suite for Capacinator...\n');
    
    this.startTime = Date.now();
    
    // Define all test scenarios
    const scenarios = [
      {
        name: 'Enterprise Expansion',
        file: 'enterprise-expansion.spec.ts',
        description: 'Large tech company expanding into new markets'
      },
      {
        name: 'Agile Product Development',
        file: 'agile-product-development.spec.ts',
        description: 'Software company with multiple product teams using agile'
      },
      {
        name: 'Consulting Services',
        file: 'consulting-services.spec.ts',
        description: 'Professional services firm managing multiple client engagements'
      }
    ];

    // Run each scenario
    for (const scenario of scenarios) {
      await this.runScenario(scenario);
    }

    // Generate comprehensive report
    await this.generateReport();
  }

  private async runScenario(scenario: { name: string; file: string; description: string }): Promise<void> {
    console.log(`\n📋 Running ${scenario.name} scenario...`);
    console.log(`   Description: ${scenario.description}`);
    
    const startTime = Date.now();
    
    try {
      // Run the specific test file
      const command = `npx playwright test tests/e2e/${scenario.file} --reporter=json`;
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 300000, // 5 minutes per scenario
        cwd: process.cwd()
      });
      
      const duration = Date.now() - startTime;
      
      // Parse results
      let passed = true;
      let errors: string[] = [];
      
      try {
        const results = JSON.parse(stdout);
        passed = results.stats.failed === 0;
        if (!passed) {
          errors = results.suites.flatMap((suite: any) => 
            suite.specs.flatMap((spec: any) => 
              spec.tests.filter((test: any) => test.status === 'failed')
                .map((test: any) => test.title)
            )
          );
        }
      } catch (parseError) {
        passed = false;
        errors = [stderr || 'Failed to parse test results'];
      }
      
      this.results.push({
        scenario: scenario.name,
        passed,
        duration,
        errors
      });
      
      if (passed) {
        console.log(`   ✅ ${scenario.name} - PASSED (${(duration / 1000).toFixed(1)}s)`);
      } else {
        console.log(`   ❌ ${scenario.name} - FAILED (${(duration / 1000).toFixed(1)}s)`);
        errors.forEach(error => console.log(`      - ${error}`));
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        scenario: scenario.name,
        passed: false,
        duration,
        errors: [error instanceof Error ? error.message : String(error)]
      });
      
      console.log(`   ❌ ${scenario.name} - ERROR (${(duration / 1000).toFixed(1)}s)`);
      console.log(`      ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async generateReport(): Promise<void> {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE E2E TEST RESULTS');
    console.log('='.repeat(80));
    
    console.log(`\n📈 Overall Summary:`);
    console.log(`   Total Scenarios: ${total}`);
    console.log(`   Passed: ${passed} (${((passed / total) * 100).toFixed(1)}%)`);
    console.log(`   Failed: ${failed} (${((failed / total) * 100).toFixed(1)}%)`);
    console.log(`   Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);
    
    console.log(`\n📋 Detailed Results:`);
    this.results.forEach(result => {
      const status = result.passed ? '✅ PASSED' : '❌ FAILED';
      const duration = (result.duration / 1000).toFixed(1);
      console.log(`   ${status} - ${result.scenario} (${duration}s)`);
      
      if (!result.passed && result.errors.length > 0) {
        result.errors.forEach(error => {
          console.log(`     └─ ${error}`);
        });
      }
    });
    
    // Generate HTML report
    await this.generateHTMLReport();
    
    // Generate JSON report
    await this.generateJSONReport();
    
    console.log(`\n📄 Reports generated:`);
    console.log(`   HTML: test-results/comprehensive-report.html`);
    console.log(`   JSON: test-results/comprehensive-report.json`);
    
    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
  }

  private async generateHTMLReport(): Promise<void> {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Capacinator E2E Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .passed { border-left: 4px solid #10b981; }
        .failed { border-left: 4px solid #ef4444; }
        .results { margin-top: 20px; }
        .result-item { margin: 10px 0; padding: 15px; border-radius: 8px; }
        .result-passed { background: #f0fdf4; border: 1px solid #10b981; }
        .result-failed { background: #fef2f2; border: 1px solid #ef4444; }
        .error-list { margin-top: 10px; padding-left: 20px; }
        .error-item { color: #dc2626; margin: 5px 0; }
        .duration { color: #6b7280; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Capacinator E2E Test Results</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <h3>Total Scenarios</h3>
            <div style="font-size: 2em; font-weight: bold;">${total}</div>
        </div>
        <div class="metric passed">
            <h3>Passed</h3>
            <div style="font-size: 2em; font-weight: bold; color: #10b981;">${passed}</div>
            <div>${((passed / total) * 100).toFixed(1)}%</div>
        </div>
        <div class="metric failed">
            <h3>Failed</h3>
            <div style="font-size: 2em; font-weight: bold; color: #ef4444;">${failed}</div>
            <div>${((failed / total) * 100).toFixed(1)}%</div>
        </div>
        <div class="metric">
            <h3>Total Duration</h3>
            <div style="font-size: 2em; font-weight: bold;">${(totalDuration / 1000).toFixed(1)}s</div>
        </div>
    </div>
    
    <div class="results">
        <h2>📋 Detailed Results</h2>
        ${this.results.map(result => `
            <div class="result-item ${result.passed ? 'result-passed' : 'result-failed'}">
                <h3>${result.passed ? '✅' : '❌'} ${result.scenario}</h3>
                <div class="duration">Duration: ${(result.duration / 1000).toFixed(1)}s</div>
                ${result.errors.length > 0 ? `
                    <div class="error-list">
                        <h4>Errors:</h4>
                        ${result.errors.map(error => `<div class="error-item">• ${error}</div>`).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('')}
    </div>
    
    <div class="footer" style="margin-top: 40px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
        <h3>🎯 Test Coverage</h3>
        <p>These comprehensive e2e tests validate:</p>
        <ul>
            <li>Database tables, views, and business logic</li>
            <li>API endpoints and data transformations</li>
            <li>Frontend components and user interactions</li>
            <li>Complex workflow scenarios</li>
            <li>Data integrity and constraint validation</li>
        </ul>
    </div>
</body>
</html>
    `;
    
    // Ensure test-results directory exists
    const testResultsDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(testResultsDir, 'comprehensive-report.html'), html);
  }

  private async generateJSONReport(): Promise<void> {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total,
        passed,
        failed,
        passRate: ((passed / total) * 100).toFixed(1),
        totalDuration: totalDuration,
        totalDurationSeconds: (totalDuration / 1000).toFixed(1)
      },
      results: this.results.map(result => ({
        ...result,
        durationSeconds: (result.duration / 1000).toFixed(1)
      }))
    };
    
    // Ensure test-results directory exists
    const testResultsDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(testResultsDir, 'comprehensive-report.json'),
      JSON.stringify(report, null, 2)
    );
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  const runner = new E2ETestRunner();
  runner.runAllScenarios().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export { E2ETestRunner };