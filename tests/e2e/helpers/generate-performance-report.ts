#!/usr/bin/env node

/**
 * Generate Performance Report from test results
 * Used in CI/CD to create performance summaries
 */

import * as fs from 'fs';
import * as path from 'path';

interface PerformanceData {
  totalDuration: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  averageTestDuration: number;
  slowestTests: Array<{
    testName: string;
    duration: number;
    suite: string;
  }>;
  suitePerformance: {
    [key: string]: {
      totalTests: number;
      averageDuration: number;
    };
  };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(0)}s`;
}

function generateMarkdownReport(data: PerformanceData): string {
  const successRate = ((data.passedTests / data.totalTests) * 100).toFixed(1);
  
  let report = `## 📊 E2E Test Performance Report\n\n`;
  report += `### Summary\n`;
  report += `- **Total Tests**: ${data.totalTests}\n`;
  report += `- **Passed**: ${data.passedTests} (${successRate}%)\n`;
  report += `- **Failed**: ${data.failedTests}\n`;
  report += `- **Total Duration**: ${formatDuration(data.totalDuration)}\n`;
  report += `- **Average Test Duration**: ${formatDuration(data.averageTestDuration)}\n\n`;
  
  if (data.slowestTests.length > 0) {
    report += `### 🐌 Slowest Tests\n`;
    report += `| Test | Suite | Duration |\n`;
    report += `|------|-------|----------|\n`;
    
    data.slowestTests.slice(0, 5).forEach(test => {
      report += `| ${test.testName.substring(0, 50)}... | ${test.suite} | ${formatDuration(test.duration)} |\n`;
    });
    report += `\n`;
  }
  
  if (Object.keys(data.suitePerformance).length > 0) {
    report += `### 📁 Suite Performance\n`;
    report += `| Suite | Tests | Avg Duration |\n`;
    report += `|-------|-------|-------------|\n`;
    
    Object.entries(data.suitePerformance)
      .sort((a, b) => b[1].totalTests - a[1].totalTests)
      .forEach(([suite, perf]) => {
        report += `| ${suite} | ${perf.totalTests} | ${formatDuration(perf.averageDuration)} |\n`;
      });
    report += `\n`;
  }
  
  // Add performance insights
  report += `### 💡 Insights\n`;
  
  if (data.averageTestDuration > 10000) {
    report += `- ⚠️ Average test duration is ${formatDuration(data.averageTestDuration)}, consider optimization\n`;
  } else {
    report += `- ✅ Average test duration is good at ${formatDuration(data.averageTestDuration)}\n`;
  }
  
  const slowTests = data.slowestTests.filter(t => t.duration > 30000).length;
  if (slowTests > 0) {
    report += `- ⚠️ ${slowTests} tests take longer than 30 seconds\n`;
  }
  
  if (data.failedTests > 0) {
    const failureRate = ((data.failedTests / data.totalTests) * 100).toFixed(1);
    report += `- ❌ ${failureRate}% failure rate needs attention\n`;
  }
  
  return report;
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: generate-performance-report.ts <performance-report.json> [<performance-report2.json> ...]');
    process.exit(1);
  }
  
  // Merge all performance reports
  const mergedData: PerformanceData = {
    totalDuration: 0,
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    averageTestDuration: 0,
    slowestTests: [],
    suitePerformance: {},
  };
  
  for (const file of args) {
    if (!fs.existsSync(file)) {
      console.error(`File not found: ${file}`);
      continue;
    }
    
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      
      // Merge data
      mergedData.totalDuration = Math.max(mergedData.totalDuration, data.totalDuration || 0);
      mergedData.totalTests += data.totalTests || 0;
      mergedData.passedTests += data.passedTests || 0;
      mergedData.failedTests += data.failedTests || 0;
      
      // Merge slowest tests
      if (data.slowestTests) {
        mergedData.slowestTests.push(...data.slowestTests);
      }
      
      // Merge suite performance
      if (data.suitePerformance) {
        for (const [suite, perf] of Object.entries(data.suitePerformance as any)) {
          if (!mergedData.suitePerformance[suite]) {
            mergedData.suitePerformance[suite] = {
              totalTests: 0,
              averageDuration: 0,
            };
          }
          mergedData.suitePerformance[suite].totalTests += perf.totalTests;
          mergedData.suitePerformance[suite].averageDuration = 
            (mergedData.suitePerformance[suite].averageDuration + perf.averageDuration) / 2;
        }
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }
  
  // Calculate final averages
  if (mergedData.totalTests > 0) {
    const totalTestDuration = mergedData.slowestTests.reduce((sum, t) => sum + t.duration, 0);
    mergedData.averageTestDuration = totalTestDuration / mergedData.slowestTests.length || 0;
  }
  
  // Sort slowest tests
  mergedData.slowestTests.sort((a, b) => b.duration - a.duration);
  
  // Generate and output report
  const report = generateMarkdownReport(mergedData);
  console.log(report);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}