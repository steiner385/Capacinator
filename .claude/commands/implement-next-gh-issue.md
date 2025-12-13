---
description: Automatically select and implement the next highest-priority GitHub issue based on real-time priority calculation (project)
---

You are going to help implement the next GitHub issue using real-time priority calculation based on GitHub labels.

## How It Works

The priority calculator queries GitHub live for all open issues and their labels, then calculates priority scores based on:

1. **Foundation Level** (`foundation:l0/l1/l2/l3` labels) - 43.75% weight
2. **Dependencies** (`depends-on:issue-numbers` labels) - 31.25% weight
3. **Business Value** (`business-value:1-10` labels) - 12.5% weight
4. **Effort/Value Ratio** (`effort:hours` labels) - 12.5% weight

**Multi-Session Coordination**: Issues marked `status: in-progress` are automatically excluded from recommendations to prevent multiple sessions from working on the same issue.

Follow these steps:

## Step 0: Sync with Latest Main (CRITICAL)
**IMPORTANT**: Always pull the latest changes from main before querying for issues:

```bash
git checkout main
git pull origin main
```

This ensures:
- You have the latest code from other completed issues
- The priority calculator works with updated repository state
- No conflicting changes from concurrent work

Display confirmation:
```
Synced with latest main (latest commit: [HASH])
```

## Step 1: Query Open Issues with Labels

Fetch all open issues with their labels from the current repository:

```bash
gh issue list --state open --json number,title,labels,state --limit 100
```

## Step 2: Calculate Priority Scores

For each issue, calculate the priority score using this algorithm:

### Foundation Level Score (43.75% weight)
- `foundation:l0` = 100 points (Core infrastructure)
- `foundation:l1` = 75 points (Essential capabilities)
- `foundation:l2` = 50 points (Enhanced features)
- `foundation:l3` = 25 points (Refinements)
- No foundation label = 25 points (default to L3)

### Dependency Score (31.25% weight)
- Check `depends-on:X,Y,Z` labels
- If any dependency issue is still OPEN, score = 0 (blocked)
- If all dependencies CLOSED, score = 100 (unblocked)
- No dependencies = 100 (unblocked)

To check dependency status:
```bash
gh issue view [DEPENDENCY_NUMBER] --json state -q '.state'
```

### Business Value Score (12.5% weight)
- `business-value:N` where N is 1-10
- Score = N * 10 (so business-value:8 = 80 points)
- No label = 50 points (default to 5)

### Effort/Value Ratio Score (12.5% weight)
- `effort:N` where N is hours
- Score = max(0, 100 - (effort * 2))
- Lower effort = higher score
- No label = 50 points (default to 8 hours)

### In-Progress Exclusion
- Issues with `status: in-progress` or `status:in-progress` labels are EXCLUDED
- These are being worked on by other sessions

### Final Score Calculation
```
total_score = (foundation * 0.4375) + (dependency * 0.3125) + (business_value * 0.125) + (effort_ratio * 0.125)
```

## Step 3: Display Priority Rankings

Show the top 5 eligible issues sorted by priority score:

```
Priority Rankings (Real-Time)
=============================

Rank | Issue | Score | Foundation | Deps | Value | Effort | Title
-----|-------|-------|------------|------|-------|--------|------
1    | #123  | 87.5  | L0 (100)   | OK   | 8     | 4h     | [Title]
2    | #456  | 72.3  | L1 (75)    | OK   | 7     | 8h     | [Title]
3    | #789  | 65.0  | L2 (50)    | OK   | 9     | 16h    | [Title]
...

Excluded (In Progress):
- #100: Being worked on (status: in-progress)
- #200: Being worked on (status: in-progress)

Blocked (Unresolved Dependencies):
- #300: Blocked by #123 (OPEN)
```

## Step 4: Select and Claim Top Issue

Select the highest-scoring eligible issue and mark it as in-progress:

```bash
gh issue edit [ISSUE_NUMBER] --add-label "status: in-progress"
```

Display confirmation:
```
Claimed Issue #[NUMBER]: [TITLE]
Priority Score: [SCORE]
Foundation: L[LEVEL]
Business Value: [VALUE]/10
Effort: [HOURS] hours

Issue marked as in-progress. Starting implementation...
```

## Step 5: Start Implementation (AUTO)

Immediately invoke the implementation command with the claimed issue number:

```bash
/implement-gh-issue [ISSUE_NUMBER]
```

**No confirmation step** - Your intent to run `/implement-next-gh-issue` is your confirmation to start work.

---

## Important Notes

- **Real-Time Calculation**: Priority is calculated fresh each time from GitHub labels
- **In-Progress Exclusion**: Issues with `status: in-progress` are automatically skipped
- **Dependency Checking**: Blocked issues (open dependencies) are excluded
- **Multi-Session Safe**: Each session claims its own issue before starting work

- **If No Eligible Issues**:
  - Check for in-progress issues from abandoned sessions
  - Consider removing old `status: in-progress` labels manually
  - Or wait for in-progress issues to complete

- **Direct Usage** (`/implement-gh-issue [NUMBER]`):
  - Can still be called directly with a specific issue number
  - Works even if issue wasn't claimed via `/implement-next-gh-issue`
