#!/bin/bash

# Create results directory with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="test-results/e2e-run-${TIMESTAMP}"
mkdir -p "${RESULTS_DIR}"

echo "🚀 Running ALL E2E tests with comprehensive logging..."
echo "Results will be saved to: ${RESULTS_DIR}"
echo "Total test files: $(find tests/e2e -name "*.spec.ts" -type f | wc -l)"
echo "Estimated test count: ~1,123"
echo ""

# Clean up any existing processes
echo "🧹 Cleaning up existing processes..."
lsof -ti:3110,3120 | xargs -r kill -9 2>/dev/null || true
sleep 2

# Set up environment
export NODE_ENV=e2e
export PORT=3110
export CLIENT_PORT=3120

# Create summary file
SUMMARY_FILE="${RESULTS_DIR}/test-summary.txt"
echo "E2E Test Run Summary - ${TIMESTAMP}" > "${SUMMARY_FILE}"
echo "=================================" >> "${SUMMARY_FILE}"
echo "" >> "${SUMMARY_FILE}"

# Run tests with multiple reporters
echo "🏃 Starting test execution..."
echo "Using 4 parallel workers for better performance"
echo "Logs: ${RESULTS_DIR}/full-test-run.log"
echo ""

# Run with multiple reporters and save all output
npx playwright test tests/e2e \
  --reporter=list \
  --reporter="json:${RESULTS_DIR}/results.json" \
  --reporter="junit:${RESULTS_DIR}/junit.xml" \
  --reporter=html \
  --workers=4 \
  --max-failures=100 \
  --timeout=90000 \
  --global-timeout=7200000 \
  2>&1 | tee "${RESULTS_DIR}/full-test-run.log"

# Capture exit code
TEST_EXIT_CODE=$?

echo ""
echo "📊 Test execution complete with exit code: ${TEST_EXIT_CODE}"

# Generate summary from JSON results if available
if [ -f "${RESULTS_DIR}/results.json" ]; then
    echo ""
    echo "📈 Generating test summary..."
    
    # Extract summary stats
    node -e "
    const results = require('./${RESULTS_DIR}/results.json');
    const stats = results.stats || {};
    console.log('Total Tests: ' + (stats.expected || 0));
    console.log('Passed: ' + (stats.passed || 0));
    console.log('Failed: ' + (stats.failed || 0));  
    console.log('Skipped: ' + (stats.skipped || 0));
    console.log('Duration: ' + Math.round((stats.duration || 0) / 1000) + 's');
    " | tee -a "${SUMMARY_FILE}"
    
    # Extract failed tests
    echo "" >> "${SUMMARY_FILE}"
    echo "Failed Tests:" >> "${SUMMARY_FILE}"
    echo "=============" >> "${SUMMARY_FILE}"
    
    node -e "
    const results = require('./${RESULTS_DIR}/results.json');
    const failures = [];
    
    function extractFailures(suite, path = '') {
        const currentPath = path ? path + ' › ' + suite.title : suite.title;
        
        if (suite.specs) {
            suite.specs.forEach(spec => {
                if (!spec.ok && spec.tests) {
                    spec.tests.forEach(test => {
                        if (test.results && test.results.some(r => r.status === 'failed')) {
                            failures.push({
                                title: currentPath + ' › ' + spec.title,
                                error: test.results.find(r => r.error)?.error?.message || 'Unknown error'
                            });
                        }
                    });
                }
            });
        }
        
        if (suite.suites) {
            suite.suites.forEach(s => extractFailures(s, currentPath));
        }
    }
    
    if (results.suites) {
        results.suites.forEach(suite => extractFailures(suite));
    }
    
    failures.forEach(f => {
        console.log('\\n- ' + f.title);
        console.log('  Error: ' + f.error.split('\\n')[0]);
    });
    " >> "${SUMMARY_FILE}" 2>/dev/null || echo "Could not extract failure details" >> "${SUMMARY_FILE}"
fi

echo ""
echo "📁 Results saved to: ${RESULTS_DIR}"
echo "📄 Summary: ${SUMMARY_FILE}"
echo "📊 JSON results: ${RESULTS_DIR}/results.json"
echo "📑 JUnit XML: ${RESULTS_DIR}/junit.xml"
echo "🌐 HTML report: ${RESULTS_DIR}/html-report/index.html"
echo "📜 Full logs: ${RESULTS_DIR}/full-test-run.log"
echo ""
echo "To view the HTML report, run:"
echo "npx playwright show-report ${RESULTS_DIR}/html-report"

# Create a symlink to latest results
ln -sfn "${RESULTS_DIR}" "test-results/latest-e2e-run"

exit ${TEST_EXIT_CODE}