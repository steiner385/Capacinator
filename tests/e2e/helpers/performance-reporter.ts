/**
 * Performance Reporter for Playwright Tests
 * Tracks test execution times and provides performance insights
 */

import { Reporter, TestCase, TestResult, FullResult, Suite } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

interface TestPerformanceData {
  testName: string;
  fileName: string;
  suite: string;
  duration: number;
  status: string;
  retries: number;
  tags: string[];
}

interface PerformanceReport {
  totalDuration: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  averageTestDuration: number;
  slowestTests: TestPerformanceData[];
  testsByDuration: {
    under5s: number;
    under10s: number;
    under30s: number;
    over30s: number;
  };
  suitePerformance: {
    [suite: string]: {
      totalTests: number;
      totalDuration: number;
      averageDuration: number;
    };
  };
  tagPerformance: {
    [tag: string]: {
      totalTests: number;
      totalDuration: number;
      averageDuration: number;
    };
  };
}

export class PerformanceReporter implements Reporter {
  private testData: TestPerformanceData[] = [];
  private suiteStartTime: number = 0;
  private outputPath: string;

  constructor(options: { outputFile?: string } = {}) {
    this.outputPath = options.outputFile || 'test-results/performance-report.json';
  }

  onBegin(config: any, suite: Suite) {
    this.suiteStartTime = Date.now();
    console.log('🚀 Starting performance tracking...');
  }

  onTestEnd(test: TestCase, result: TestResult) {
    // Extract test information
    const testName = test.title;
    const fileName = test.location.file;
    const suite = this.extractSuite(fileName);
    const duration = result.duration;
    const status = result.status;
    const retries = result.retry;
    const tags = this.extractTags(test);

    // Store performance data
    this.testData.push({
      testName,
      fileName,
      suite,
      duration,
      status,
      retries,
      tags,
    });

    // Log slow tests immediately
    if (duration > 30000) {
      console.log(`⚠️  Slow test detected: ${testName} (${(duration / 1000).toFixed(2)}s)`);
    }
  }

  async onEnd(result: FullResult) {
    const totalDuration = Date.now() - this.suiteStartTime;
    
    // Generate performance report
    const report = this.generateReport(totalDuration);
    
    // Save report to file
    await this.saveReport(report);
    
    // Print summary to console
    this.printSummary(report);
  }

  private extractSuite(fileName: string): string {
    const match = fileName.match(/suites\/([^\/]+)\//);
    return match ? match[1] : 'root';
  }

  private extractTags(test: TestCase): string[] {
    const tags: string[] = [];
    const titleMatch = test.title.match(/\[([^\]]+)\]/g);
    
    if (titleMatch) {
      titleMatch.forEach(match => {
        tags.push(match.slice(1, -1));
      });
    }
    
    // Also check for tags in annotations
    test.annotations.forEach(annotation => {
      if (annotation.type === 'tag') {
        tags.push(annotation.description || '');
      }
    });
    
    return tags;
  }

  private generateReport(totalDuration: number): PerformanceReport {
    const passedTests = this.testData.filter(t => t.status === 'passed').length;
    const failedTests = this.testData.filter(t => t.status === 'failed').length;
    const skippedTests = this.testData.filter(t => t.status === 'skipped').length;
    
    // Calculate test duration distribution
    const testsByDuration = {
      under5s: this.testData.filter(t => t.duration < 5000).length,
      under10s: this.testData.filter(t => t.duration >= 5000 && t.duration < 10000).length,
      under30s: this.testData.filter(t => t.duration >= 10000 && t.duration < 30000).length,
      over30s: this.testData.filter(t => t.duration >= 30000).length,
    };
    
    // Calculate suite performance
    const suitePerformance: any = {};
    const suiteGroups = this.groupBy(this.testData, 'suite');
    
    for (const [suite, tests] of Object.entries(suiteGroups)) {
      const totalSuiteDuration = tests.reduce((sum, t) => sum + t.duration, 0);
      suitePerformance[suite] = {
        totalTests: tests.length,
        totalDuration: totalSuiteDuration,
        averageDuration: totalSuiteDuration / tests.length,
      };
    }
    
    // Calculate tag performance
    const tagPerformance: any = {};
    const taggedTests = this.testData.filter(t => t.tags.length > 0);
    
    taggedTests.forEach(test => {
      test.tags.forEach(tag => {
        if (!tagPerformance[tag]) {
          tagPerformance[tag] = {
            totalTests: 0,
            totalDuration: 0,
            averageDuration: 0,
          };
        }
        tagPerformance[tag].totalTests++;
        tagPerformance[tag].totalDuration += test.duration;
      });
    });
    
    // Calculate averages for tags
    for (const tag of Object.keys(tagPerformance)) {
      tagPerformance[tag].averageDuration = 
        tagPerformance[tag].totalDuration / tagPerformance[tag].totalTests;
    }
    
    // Find slowest tests
    const slowestTests = [...this.testData]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);
    
    const totalTestDuration = this.testData.reduce((sum, t) => sum + t.duration, 0);
    
    return {
      totalDuration,
      totalTests: this.testData.length,
      passedTests,
      failedTests,
      skippedTests,
      averageTestDuration: totalTestDuration / this.testData.length,
      slowestTests,
      testsByDuration,
      suitePerformance,
      tagPerformance,
    };
  }

  private groupBy<T>(array: T[], key: keyof T): { [key: string]: T[] } {
    return array.reduce((result, item) => {
      const group = String(item[key]);
      if (!result[group]) result[group] = [];
      result[group].push(item);
      return result;
    }, {} as { [key: string]: T[] });
  }

  private async saveReport(report: PerformanceReport) {
    const dir = path.dirname(this.outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(
      this.outputPath,
      JSON.stringify(report, null, 2)
    );
    
    // Also save a CSV for easy analysis
    const csvPath = this.outputPath.replace('.json', '.csv');
    const csv = this.generateCSV();
    fs.writeFileSync(csvPath, csv);
  }

  private generateCSV(): string {
    const headers = ['Test Name', 'Suite', 'Duration (ms)', 'Status', 'Retries', 'Tags'];
    const rows = this.testData.map(test => [
      test.testName,
      test.suite,
      test.duration,
      test.status,
      test.retries,
      test.tags.join(';'),
    ]);
    
    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');
  }

  private printSummary(report: PerformanceReport) {
    console.log('\n📊 Performance Report Summary');
    console.log('═══════════════════════════════════════');
    console.log(`Total Duration: ${this.formatDuration(report.totalDuration)}`);
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Passed: ${report.passedTests} | Failed: ${report.failedTests} | Skipped: ${report.skippedTests}`);
    console.log(`Average Test Duration: ${this.formatDuration(report.averageTestDuration)}`);
    
    console.log('\n⏱️  Test Duration Distribution:');
    console.log(`  < 5s:  ${report.testsByDuration.under5s} tests`);
    console.log(`  5-10s: ${report.testsByDuration.under10s} tests`);
    console.log(`  10-30s: ${report.testsByDuration.under30s} tests`);
    console.log(`  > 30s: ${report.testsByDuration.over30s} tests`);
    
    console.log('\n🐌 Slowest Tests:');
    report.slowestTests.slice(0, 5).forEach((test, i) => {
      console.log(`  ${i + 1}. ${test.testName} (${this.formatDuration(test.duration)})`);
      console.log(`     File: ${test.fileName}`);
    });
    
    console.log('\n📁 Suite Performance:');
    const suites = Object.entries(report.suitePerformance)
      .sort((a, b) => b[1].totalDuration - a[1].totalDuration)
      .slice(0, 5);
    
    suites.forEach(([suite, data]) => {
      console.log(`  ${suite}: ${data.totalTests} tests, avg ${this.formatDuration(data.averageDuration)}`);
    });
    
    console.log('\n🏷️  Tag Performance:');
    const tags = Object.entries(report.tagPerformance)
      .sort((a, b) => b[1].totalTests - a[1].totalTests)
      .slice(0, 5);
    
    tags.forEach(([tag, data]) => {
      console.log(`  ${tag}: ${data.totalTests} tests, avg ${this.formatDuration(data.averageDuration)}`);
    });
    
    console.log('\n✅ Performance report saved to:', this.outputPath);
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(0)}s`;
  }
}