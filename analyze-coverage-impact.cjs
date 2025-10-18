const fs = require('fs');

// Read the coverage summary
const coverageData = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));

// Extract file data (skip the first 'total' entry)
const files = Object.entries(coverageData)
  .filter(([path]) => path !== 'total')
  .map(([path, data]) => {
    const lines = data.lines.total;
    const coverage = data.lines.pct;
    const coverageGap = 100 - coverage;
    const impactScore = lines * coverageGap;

    return {
      path: path.replace('/home/tony/GitHub/Capacinator/', ''),
      lines,
      coverage: coverage.toFixed(2),
      coverageGap: coverageGap.toFixed(2),
      impactScore: Math.round(impactScore),
      uncoveredLines: lines - data.lines.covered,
      functions: data.functions.pct.toFixed(2),
      branches: data.branches.pct.toFixed(2)
    };
  });

// Sort by impact score (highest first)
const sortedByImpact = files.sort((a, b) => b.impactScore - a.impactScore);

// Filter for files with significant impact potential
const highImpactFiles = sortedByImpact.filter(f =>
  f.lines > 80 && // Meaningful size
  f.coverage < 60 && // Room for improvement
  f.impactScore > 3000 // Substantial impact potential
);

console.log('=== OVERALL COVERAGE SUMMARY ===');
const total = coverageData.total;
console.log(`Lines: ${total.lines.pct.toFixed(2)}% (${total.lines.covered}/${total.lines.total})`);
console.log(`Statements: ${total.statements.pct.toFixed(2)}% (${total.statements.covered}/${total.statements.total})`);
console.log(`Functions: ${total.functions.pct.toFixed(2)}% (${total.functions.covered}/${total.functions.total})`);
console.log(`Branches: ${total.branches.pct.toFixed(2)}% (${total.branches.covered}/${total.branches.total})`);
console.log('');

console.log('=== TOP 15 HIGH-IMPACT FILES ===');
console.log('(Impact Score = Lines × Coverage Gap)');
console.log('');

highImpactFiles.slice(0, 15).forEach((file, idx) => {
  console.log(`${idx + 1}. ${file.path}`);
  console.log(`   Lines: ${file.lines} | Coverage: ${file.coverage}% | Gap: ${file.coverageGap}%`);
  console.log(`   Impact Score: ${file.impactScore.toLocaleString()}`);
  console.log(`   Uncovered Lines: ${file.uncoveredLines}`);
  console.log(`   Functions: ${file.functions}% | Branches: ${file.branches}%`);
  console.log('');
});

console.log('=== COVERAGE POTENTIAL ANALYSIS ===');
const top7 = highImpactFiles.slice(0, 7);
const totalImpactScore = top7.reduce((sum, f) => sum + f.impactScore, 0);
const totalUncoveredLines = top7.reduce((sum, f) => sum + f.uncoveredLines, 0);
const potentialCoverageGain = (totalUncoveredLines / total.lines.total * 100).toFixed(2);

console.log(`Top 7 files combined:`);
console.log(`  Total Impact Score: ${totalImpactScore.toLocaleString()}`);
console.log(`  Total Uncovered Lines: ${totalUncoveredLines}`);
console.log(`  Potential Coverage Gain: +${potentialCoverageGain}%`);
console.log(`  Projected Overall Coverage: ${(parseFloat(total.lines.pct) + parseFloat(potentialCoverageGain)).toFixed(2)}%`);
console.log('');

// Write detailed analysis to file
const analysisReport = {
  summary: {
    currentCoverage: total.lines.pct,
    totalLines: total.lines.total,
    coveredLines: total.lines.covered,
    uncoveredLines: total.lines.total - total.lines.covered
  },
  highImpactFiles: highImpactFiles.slice(0, 15),
  top7Analysis: {
    files: top7.map(f => f.path),
    totalImpactScore,
    totalUncoveredLines,
    potentialCoverageGain: parseFloat(potentialCoverageGain),
    projectedCoverage: parseFloat(total.lines.pct) + parseFloat(potentialCoverageGain)
  }
};

fs.writeFileSync('coverage-impact-analysis.json', JSON.stringify(analysisReport, null, 2));
console.log('Detailed analysis written to coverage-impact-analysis.json');
