---
description: Implement a specific GitHub issue by number with full workflow automation
---

# GitHub Issue Implementation Workflow

You are tasked with systematically implementing a solution for a GitHub issue. The issue number will be provided as the first argument to this command.

## Phase 1: Issue Analysis & Branch Setup

### Step 0: Sync with Latest Main (CRITICAL)
**IMPORTANT**: Always pull the latest changes from main before starting new work:

```bash
git checkout main
git pull origin main
```

This ensures:
- You have the latest code from other completed issues
- No conflicting changes from concurrent work
- Your feature branch starts from the most recent state

Display confirmation:
```
Synced with latest main (latest commit: [HASH])
```

### Step 1: Fetch and Analyze Issue
- First, capture the issue number from the command arguments
- Use `gh issue view [ISSUE_NUMBER]` to get complete issue details
- Analyze the issue description, acceptance criteria, and any linked discussions
- Identify the scope, complexity, and affected components
- Check the issue labels for priority metadata:
  - `foundation:l0/l1/l2/l3` - Foundation level
  - `business-value:N` - Business value (1-10)
  - `effort:N` - Effort estimate in hours
  - `depends-on:X,Y,Z` - Dependencies on other issues

### Step 1.5: Check Dependencies via GitHub Labels
- Look for `depends-on:` labels on the issue
- If dependencies exist, check if they are resolved:
  ```bash
  gh issue view [DEPENDENCY_NUMBER] --json state -q '.state'
  ```
- If any dependencies are OPEN, **warn the user**:
  ```
  WARNING: This issue has unresolved dependencies:
  - Issue #X: [Title] (currently OPEN)
  - Issue #Y: [Title] (currently OPEN)

  Consider implementing dependencies first, or proceed with caution.
  ```

### Step 1.6: Mark Issue as In Progress (CRITICAL)
**IMPORTANT**: Before creating a branch, mark the issue as in-progress to prevent other sessions from picking it up.

Check if already marked (from `/implement-next-gh-issue`):

```bash
# If called from /implement-gh-issue directly (not from /implement-next-gh-issue):
# The issue may not be marked yet. Check and mark if needed.
if ! gh issue view [ISSUE_NUMBER] --json labels --jq '.labels[] | select(.name == "status: in-progress")' | grep -q .; then
  gh issue edit [ISSUE_NUMBER] --add-label "status: in-progress"
  echo "Marked issue #[ISSUE_NUMBER] as in-progress"
else
  echo "Issue #[ISSUE_NUMBER] is already marked as in-progress"
fi
```

This ensures:
- If called from `/implement-next-gh-issue`: Issue already marked (skip marking)
- If called from `/implement-gh-issue` directly: Check and mark if needed
- Signals to other working directories that this issue is being worked on
- Excludes the issue from other `/implement-next-gh-issue` recommendations
- Provides real-time coordination across multiple parallel working directories

### Step 2: Create Dedicated Branch
- Create a descriptive branch name: `git checkout -b issue-[ISSUE_NUMBER]-brief-description`
- (Latest main already synced in Step 0)

### Step 3: Plan Implementation
- Break down the issue into specific, actionable tasks
- Identify files and components that need modification
- Consider potential edge cases and testing requirements
- Use the TodoWrite tool to create a comprehensive task list

## Phase 2: Implementation

### Step 4: Systematic Development
- Implement changes incrementally, following the task list
- Test each change as you implement it
- Commit frequently with descriptive messages
- Follow the project's coding standards and patterns

### Step 5: Quality Assurance
- Run relevant tests to ensure your changes work correctly
- Check for any breaking changes or regressions
- Verify the solution meets all acceptance criteria from the issue
- Consider adding new tests if needed

## Phase 3: Pull Request & Closure

### Step 6: Create Pull Request

**CRITICAL**: Push your branch and create a PR with the auto-close keyword explicitly in the BODY (not just title):

```bash
git push -u origin issue-[ISSUE_NUMBER]-brief-description

gh pr create \
  --title "feat: implement [brief description] (closes #[ISSUE_NUMBER])" \
  --body "$(cat <<'EOF'
## Summary
[Brief description of what was implemented and the problem it solves]

## Changes Made
- [Key change 1 with file paths if applicable]
- [Key change 2 with file paths if applicable]
- [Key change 3 with file paths if applicable]

## Test Results
- All tests passing
- [Specific test results if applicable]

## Testing Instructions
```bash
npm test -- path/to/test.ts
```

## Breaking Changes
[None | List any breaking changes and migration steps]

Fixes #[ISSUE_NUMBER]

Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**Auto-Close Keywords** (MUST appear in PR body):
- `Fixes #[ISSUE_NUMBER]` (preferred - use this one)
- `Closes #[ISSUE_NUMBER]` (also works)
- `Resolves #[ISSUE_NUMBER]` (also works)

**CRITICAL**: The keyword MUST appear in the PR **body/description** on its own line or at the start of a sentence. GitHub does NOT auto-close issues if the keyword only appears in the PR title.

### Step 7: Final Verification
- Ensure the PR passes any automated checks (CI/CD, tests, linting)
- Review the diff one final time for code quality
- Confirm all acceptance criteria from the original issue are met
- Verify no breaking changes are introduced
- Test the implementation end-to-end

### Step 8: Mandatory PR Merge with Verification

**Merge Process**:
```bash
# Merge the PR (use --squash for clean history)
gh pr merge --squash

# IMPORTANT: Wait 30-60 seconds for GitHub to process the auto-close
echo "Waiting 60 seconds for GitHub to process auto-close..."
sleep 60

# Verify the issue was automatically closed
ISSUE_STATE=$(gh issue view [ISSUE_NUMBER] --json state -q '.state')
echo "Issue #[ISSUE_NUMBER] state: $ISSUE_STATE"

if [ "$ISSUE_STATE" = "CLOSED" ]; then
  echo "Issue #[ISSUE_NUMBER] was automatically closed"
else
  echo "Issue #[ISSUE_NUMBER] is still OPEN - manually closing..."
  gh issue close [ISSUE_NUMBER] --comment "Implemented and merged via PR #[PR_NUMBER]. Auto-close did not trigger - closing manually."
fi

# Confirm merge was successful
git checkout main
git pull origin main
git log --oneline -5  # Should show your squashed commit
```

**Verification Checklist**:
- [ ] PR merged successfully
- [ ] Waited 60 seconds for GitHub processing
- [ ] Issue state verified (should be CLOSED)
- [ ] If still open after 60 seconds, manually closed with reference to PR
- [ ] Local main branch updated and shows merged commit

### Step 8.5: Remove In-Progress Status (CRITICAL)
**IMPORTANT**: After successful merge, remove the in-progress label to signal completion:

```bash
gh issue edit [ISSUE_NUMBER] --remove-label "status: in-progress"
```

If the issue was closed automatically, the label removal may not be needed, but run the command anyway to be safe.

Display confirmation:
```
Removed in-progress status from issue #[ISSUE_NUMBER]
(Issue is now marked as completed)
```

### Step 9: Cleanup & Return to Main
- Switch to main branch: `git checkout main`
- Pull latest changes: `git pull origin main`
- Delete the feature branch: `git branch -d issue-[ISSUE_NUMBER]-brief-description`
- Clean up remote branch: `git push origin --delete issue-[ISSUE_NUMBER]-brief-description`
- Verify clean state: `git status` should show "working tree clean"

## Important Notes

- **Always mark issues as in-progress** (Step 1.6) before starting work to coordinate with other sessions
- **Always link commits and PRs to the issue number** for traceability
- **Never skip the PR merge step** - every implementation must be merged via PR
- **The "Fixes #[ISSUE_NUMBER]" keyword is mandatory** - this ensures automatic issue closure
- **Always verify the issue was closed** after PR merge - manually close if needed
- **Always remove the in-progress label** (Step 8.5) after completion
- **Check dependencies** before starting (Step 1.5) - implementing blocked dependencies first is recommended
- If the issue is complex, consider breaking it into smaller sub-issues
- Communicate progress in issue comments if implementation takes multiple sessions
- Ask for clarification if requirements are unclear before implementing

## Failure Recovery

If any step fails:
- **PR merge fails**: Check for conflicts, resolve, and retry merge
- **Issue not auto-closed**: Use the manual close command in Step 8
- **Branch conflicts**: Rebase or merge main into your feature branch
- **CI/CD failures**: Fix issues before merging - never bypass checks
- **Dependencies warning**: Either implement dependencies first or document the risk and proceed
- **Session abandoned mid-work**: The in-progress label remains - another session can remove it if the issue appears stale (no commits in 24+ hours)

## Abandoning Work

If you need to stop working on an issue before completion (user request, blocker, etc.):

1. **Commit any work in progress** with a clear message: `git commit -m "WIP: [description of progress]"`
2. **Push the branch**: `git push -u origin issue-[ISSUE_NUMBER]-brief-description`
3. **Add a comment to the issue** explaining the current state
4. **Remove the in-progress label**: `gh issue edit [ISSUE_NUMBER] --remove-label "status: in-progress"`
5. **Display**:
   ```
   Work paused on issue #[ISSUE_NUMBER]
   - Progress saved to branch: issue-[ISSUE_NUMBER]-brief-description
   - In-progress status removed (issue available for other sessions)
   ```

Now proceed with implementing the GitHub issue following this systematic approach. Remember to substitute [ISSUE_NUMBER] with the actual issue number provided as an argument.
