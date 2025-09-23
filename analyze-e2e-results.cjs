const fs = require('fs');
const path = require('path');

const testRunDir = '/home/tony/GitHub/Capacinator/e2e-test-results/e2e-20250923-080209/results/';

function analyzeTestFile(filename) {
    const filepath = path.join(testRunDir, filename);
    const content = fs.readFileSync(filepath, 'utf8');
    
    // Find JSON start
    const jsonStart = content.indexOf('{');
    if (jsonStart === -1) return null;
    
    try {
        const jsonContent = content.substring(jsonStart);
        const data = JSON.parse(jsonContent);
        
        const failures = [];
        
        // Extract failures
        if (data.suites) {
            data.suites.forEach(suite => {
                if (suite.suites) {
                    suite.suites.forEach(subSuite => {
                        if (subSuite.specs) {
                            subSuite.specs.forEach(spec => {
                                if (spec.tests) {
                                    spec.tests.forEach(test => {
                                        if (test.results) {
                                            test.results.forEach(result => {
                                                if (result.status === 'failed') {
                                                    failures.push({
                                                        file: spec.file,
                                                        title: spec.title,
                                                        error: result.error ? result.error.message : 'Unknown error',
                                                        stack: result.error ? result.error.stack : ''
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
        
        return {
            stats: data.stats || {},
            failures: failures
        };
    } catch (e) {
        console.error(`Error parsing ${filename}:`, e.message);
        return null;
    }
}

// Analyze all result files
console.log('📊 E2E Test Results Analysis');
console.log('============================\n');

const resultFiles = fs.readdirSync(testRunDir).filter(f => f.endsWith('.json'));

let totalStats = {
    expected: 0,
    unexpected: 0,
    flaky: 0,
    skipped: 0
};

let allFailures = [];

resultFiles.forEach(file => {
    const result = analyzeTestFile(file);
    if (result) {
        console.log(`\n📁 ${file.replace('.json', '')}`);
        console.log('-------------------');
        
        if (result.stats) {
            console.log('Stats:');
            console.log(`  ✅ Passed: ${result.stats.expected || 0}`);
            console.log(`  ❌ Failed: ${result.stats.unexpected || 0}`);
            console.log(`  🔄 Flaky: ${result.stats.flaky || 0}`);
            console.log(`  ⏭️ Skipped: ${result.stats.skipped || 0}`);
            
            totalStats.expected += result.stats.expected || 0;
            totalStats.unexpected += result.stats.unexpected || 0;
            totalStats.flaky += result.stats.flaky || 0;
            totalStats.skipped += result.stats.skipped || 0;
        }
        
        if (result.failures.length > 0) {
            console.log('\n❌ Failures:');
            result.failures.forEach((failure, i) => {
                console.log(`\n  ${i + 1}. ${failure.title}`);
                console.log(`     File: ${failure.file}`);
                console.log(`     Error: ${failure.error}`);
                if (failure.stack) {
                    const firstLine = failure.stack.split('\n')[0];
                    console.log(`     Stack: ${firstLine}`);
                }
                allFailures.push({
                    suite: file.replace('.json', ''),
                    ...failure
                });
            });
        }
    }
});

// Overall summary
console.log('\n\n📊 OVERALL SUMMARY');
console.log('==================');
console.log(`Total Tests: ${totalStats.expected + totalStats.unexpected + totalStats.flaky + totalStats.skipped}`);
console.log(`✅ Passed: ${totalStats.expected}`);
console.log(`❌ Failed: ${totalStats.unexpected}`);
console.log(`🔄 Flaky: ${totalStats.flaky}`);
console.log(`⏭️ Skipped: ${totalStats.skipped}`);
console.log(`\nSuccess Rate: ${((totalStats.expected / (totalStats.expected + totalStats.unexpected)) * 100).toFixed(2)}%`);

// Group failures by error type
console.log('\n\n❌ FAILURES BY ERROR TYPE');
console.log('==========================');

const errorGroups = {};
allFailures.forEach(failure => {
    const errorKey = failure.error.split('\n')[0].substring(0, 100);
    if (!errorGroups[errorKey]) {
        errorGroups[errorKey] = [];
    }
    errorGroups[errorKey].push(failure);
});

Object.keys(errorGroups).forEach(errorKey => {
    console.log(`\n\n🔴 ${errorKey}`);
    console.log(`   Occurrences: ${errorGroups[errorKey].length}`);
    console.log('   Affected tests:');
    errorGroups[errorKey].forEach(failure => {
        console.log(`     - ${failure.suite}: ${failure.title}`);
    });
});

// Save detailed failure report
const failureReport = {
    summary: totalStats,
    failuresByError: errorGroups,
    allFailures: allFailures
};

fs.writeFileSync('/home/tony/GitHub/Capacinator/e2e-test-results/failure-analysis.json', JSON.stringify(failureReport, null, 2));
console.log('\n\n📄 Detailed failure report saved to: /home/tony/GitHub/Capacinator/e2e-test-results/failure-analysis.json');