#!/usr/bin/env tsx
/**
 * Get next priority issue from GitHub
 *
 * Usage: npx tsx scripts/get-next-issue.ts
 *
 * Note: Requires the github-issue-prioritizer package (optional dependency).
 * If not installed, the script will exit with an error message.
 */

// Types for the optional github-issue-prioritizer dependency
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PriorityEngineClass = new (options: { owner: string; repo: string }) => any;

// Dynamic import to handle optional dependency
let PriorityEngine: PriorityEngineClass;
try {
  const module = await import('github-issue-prioritizer');
  PriorityEngine = module.PriorityEngine;
} catch {
  console.error('❌ Error: github-issue-prioritizer is not installed.');
  console.error('');
  console.error('This is an optional dependency that requires the PriorityCalculator');
  console.error('project to be available at ../PriorityCalculator relative to this repo.');
  console.error('');
  console.error('To install it:');
  console.error('  1. Clone the PriorityCalculator repo as a sibling directory');
  console.error('  2. Run: npm install');
  console.error('');
  console.error('Alternatively, use GitHub\'s web interface to manage issues.');
  process.exit(1);
}

async function main() {
  // Token will be auto-detected from GITHUB_TOKEN, GH_TOKEN env vars, or gh CLI
  const engine = new PriorityEngine({
    owner: 'steiner385',
    repo: 'Capacinator',
    // token will be detected automatically by GitHubClient
  });

  console.log('🔍 Querying GitHub for open issues...\n');

  try {
    // Check for in-progress issues
    const inProgressIssues = await engine.getInProgressIssues();

    if (inProgressIssues.length > 0) {
      console.log('⚠️  Currently In Progress:\n');
      inProgressIssues.forEach(issue => {
        const foundationLabel = issue.labels.find(l => l.startsWith('foundation:'));
        const foundation = foundationLabel ? foundationLabel.split(':')[1] : 'N/A';
        console.log(`  • #${issue.number}: ${issue.title}`);
        console.log(`    Foundation: ${foundation}`);
      });
      console.log('\n' + '─'.repeat(80) + '\n');
    }

    // ATOMICALLY claim the next issue with semaphore lock.
    // This performs both calculation AND marking as in-progress inside the lock,
    // preventing race conditions when multiple working directories run simultaneously.
    // No user confirmation needed - issue is already marked in-progress.
    //
    // CRITICAL: timeoutMs MUST be longer than the maximum lock holding time.
    // The claimNextIssue operation now takes ~15-20 seconds due to verification retries:
    // - Fetch issues: ~500-2000ms
    // - Add label: ~500ms
    // - Wait for GitHub propagation: 3000ms
    // - Verify by re-fetching with retries: 500ms + 1s + 2s + 4s + 8s = ~15.5s max
    // Total: ~15-20 seconds, so timeoutMs must be >= 25000ms to prevent stale lock races.
    //
    // The verification retry loop is CRITICAL for preventing the race condition:
    // It ensures that before we release the lock and allow the next process to run,
    // the label is definitely visible in GitHub's GraphQL API. Without this, concurrent
    // processes can both fetch issues before the label propagates, both seeing the issue
    // as available and claiming the same one.
    const nextIssue = await engine.claimNextIssue({
      timeoutMs: 30000,     // Lock is stale after 30 seconds (must be > 15-20s operation time)
      maxWaitMs: 35000,     // Wait up to 35 seconds for lock acquisition
      retryIntervalMs: 100, // Retry every 100ms
    });

    if (!nextIssue) {
      console.log('❌ No eligible issues found.');
      console.log('   All issues either have unresolved dependencies, are in progress,');
      console.log('   or are missing required labels.\n');

      // Show pending issues that might need cleanup (legacy from before this fix)
      const pendingIssues = await engine.getPendingIssues?.();
      if (pendingIssues && pendingIssues.length > 0) {
        console.log('ℹ️  Issues currently marked as pending (may need cleanup):');
        pendingIssues.forEach(issue => {
          console.log(`   • #${issue.number}: ${issue.title}`);
        });
        console.log('\n   To clear stale pending labels, run:');
        console.log('   gh issue edit <number> --remove-label "status:pending"\n');
      }
      return;
    }

    // Display recommendation
    console.log('## Next Recommended Issue\n');
    console.log(`**Issue #${nextIssue.issue.number}: ${nextIssue.issue.title}**\n`);
    console.log(`**Priority Score**: ${(nextIssue.total * 100).toFixed(2)}/100\n`);

    console.log('**Score Breakdown** (43.75% + 31.25% + 12.5% + 12.5%):');
    console.log(`- Foundation Level (43.75%): ${(nextIssue.breakdown.foundationPoints * 100).toFixed(2)} (L${nextIssue.issue.foundationLevel.substring(1)} - ${getFoundationDescription(nextIssue.issue.foundationLevel)})`);
    console.log(`- Dependencies (31.25%): ${(nextIssue.breakdown.dependencyPoints * 100).toFixed(2)} (All ${nextIssue.issue.dependencies.length} dependencies resolved)`);
    console.log(`- Business Value (12.5%): ${(nextIssue.breakdown.businessValuePoints * 100).toFixed(2)} (Value: ${nextIssue.issue.businessValue}/10)`);
    console.log(`- Effort/Value Ratio (12.5%): ${(nextIssue.breakdown.effortValuePoints * 100).toFixed(2)} (Value ${nextIssue.issue.businessValue} / Effort ${nextIssue.issue.effortHours}h = ${(nextIssue.issue.businessValue / nextIssue.issue.effortHours).toFixed(2)})\n`);

    console.log('**Why This Issue?**');
    console.log(generateRationale(nextIssue) + '\n');

    if (nextIssue.issue.dependencies.length > 0) {
      console.log('**Dependencies** (all resolved ✓):');
      nextIssue.issue.dependencies.forEach(dep => {
        console.log(`  • #${dep}`);
      });
    } else {
      console.log('**Dependencies**: None');
    }
    console.log('');

    console.log(`**Estimated Effort**: ${nextIssue.issue.effortHours} hours`);
    console.log(`**Business Value**: ${nextIssue.issue.businessValue}/10\n`);

    console.log('**Issue URL**: https://github.com/steiner385/Capacinator/issues/' + nextIssue.issue.number + '\n');

    console.log('─'.repeat(80));

    console.log('\n✅ Issue claimed and marked as in-progress\n');
    console.log(`**Issue #${nextIssue.issue.number} is now reserved for this working directory**\n`);
    console.log('Ready to start implementation with: `/implement-gh-issue ' + nextIssue.issue.number + '`\n');
    console.log('ℹ️  Note: The issue has been automatically marked as in-progress to prevent other working directories from claiming it.\n');

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('❌ Error:', err.message);
    if (err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

function getFoundationDescription(level: string): string {
  switch (level) {
    case 'L0':
      return 'Critical Path';
    case 'L1':
      return 'High Priority';
    case 'L2':
      return 'Medium Priority';
    case 'L3':
      return 'Low Priority';
    default:
      return 'Unknown';
  }
}

interface PriorityScore {
  issue: {
    foundationLevel: string;
    dependencies: number[];
    businessValue: number;
    effortHours: number;
  };
}

function generateRationale(score: PriorityScore): string {
  const { issue } = score;
  const level = issue.foundationLevel;
  const hasNoDeps = issue.dependencies.length === 0;
  const highValue = issue.businessValue >= 7;

  let rationale = `This ${level} issue `;

  if (hasNoDeps) {
    rationale += 'has no blocking dependencies and ';
  } else {
    rationale += `has ${issue.dependencies.length} resolved dependencies and `;
  }

  if (highValue) {
    rationale += `delivers high business value (${issue.businessValue}/10) `;
  } else {
    rationale += `delivers moderate business value (${issue.businessValue}/10) `;
  }

  rationale += `with an estimated effort of ${issue.effortHours} hours.`;

  if (level === 'L0') {
    rationale += ' As a critical path issue, it should be prioritized to unblock dependent work.';
  }

  return rationale;
}

main();
