const fs = require('fs');
const path = require('path');

try {
  const coverageFile = path.join(__dirname, 'coverage', 'coverage-summary.json');
  if (fs.existsSync(coverageFile)) {
    const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
    const total = coverage.total;
    
    console.log('\n📊 Overall Test Coverage Summary:\n');
    console.log(`Statements   : ${total.statements.pct}% (${total.statements.covered}/${total.statements.total})`);
    console.log(`Branches     : ${total.branches.pct}% (${total.branches.covered}/${total.branches.total})`);
    console.log(`Functions    : ${total.functions.pct}% (${total.functions.covered}/${total.functions.total})`);
    console.log(`Lines        : ${total.lines.pct}% (${total.lines.covered}/${total.lines.total})`);
  } else {
    console.log('Coverage file not found. Running tests first...');
  }
} catch (error) {
  console.error('Error reading coverage:', error.message);
}
