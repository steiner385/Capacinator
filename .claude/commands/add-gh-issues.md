---
description: Create new GitHub issues and automatically add them to the prioritization framework (project)
---

You will help the user create new GitHub issues with proper labels for real-time priority calculation.

## How Priority Labels Work

The priority calculator uses GitHub labels to calculate issue priority in real-time:

1. **Foundation Level** (`foundation:l0/l1/l2/l3`) - 43.75% weight
2. **Dependencies** (`depends-on:X,Y,Z`) - 31.25% weight
3. **Business Value** (`business-value:N`) - 12.5% weight
4. **Effort Estimate** (`effort:N`) - 12.5% weight

## Step 1: Gather Issue Information from User

First, ask the user to describe the new capabilities or defects they want to create issues for. They can provide:
- A single issue description
- Multiple issues (as a list or in free-form text)
- High-level features that may need to be broken down

**Prompt the user**:
```
Please describe the new capabilities or defects you'd like to create GitHub issues for. You can:
- Describe a single feature or bug
- Provide a list of multiple items
- Describe a high-level capability (I can help break it down)

What would you like to add?
```

Wait for the user's response before proceeding.

## Step 2: For Each Issue, Gather Required Metadata

For each issue the user wants to create, systematically gather the following information using the AskUserQuestion tool:

### 2a. Basic Information
Ask the user for:
1. **Title**: Clear, concise issue title
2. **Description**: Detailed description of what this issue involves
3. **Issue Type**: Is this a feature enhancement or a bug/defect?

### 2b. Foundation Level
Help the user determine the foundation level by asking:

**"What foundation level is this issue?"**

Provide these options with descriptions:
- **L0 (Core Infrastructure)**: Provides fundamental capabilities that many other features depend on. Must be built first. Examples: authentication systems, core data models, foundational APIs.
- **L1 (Essential Capabilities)**: Primary operational capabilities that depend on L0 infrastructure. Examples: core workflows, essential business features.
- **L2 (Enhanced Features)**: Advanced capabilities that extend L1 features with sophisticated tools. Examples: advanced analytics, specialized integrations.
- **L3 (Refinements)**: Nice-to-have features, optimizations, and convenience tools. Examples: UI enhancements, migration utilities, reporting refinements.

Help guide them based on:
- Does this enable many other features? -> L0
- Is this a core business capability? -> L1
- Does this enhance existing features? -> L2
- Is this a refinement or convenience? -> L3

### 2c. Dependencies
Ask: **"Does this issue depend on any other issues being completed first?"**

If yes, help them identify the issue numbers. You can:
- Search for issues by keyword: `gh issue list --search "keyword"`
- Suggest likely dependencies based on the feature description

Create a comma-separated list of dependency issue numbers (can be empty).

### 2d. Business Value
Ask: **"What's the business value of this issue?"** (1-10 scale)

Provide guidance:
- **9-10**: Critical for customer adoption, competitive necessity, major revenue impact
- **7-8**: High customer demand, significant operational improvement
- **5-6**: Valuable enhancement, moderate customer interest
- **3-4**: Nice to have, limited immediate impact
- **1-2**: Minor improvement, edge case

### 2e. Effort Estimate
Ask: **"What's the estimated effort for this issue in hours?"**

Provide guidance:
- **40+**: Major feature, multiple weeks, complex architecture
- **20-40**: Substantial feature, 1-2 weeks
- **8-20**: Moderate feature, several days
- **4-8**: Small feature, 1-2 days
- **1-4**: Trivial change, hours

### 2f. Additional Context
Ask if there's any additional context or notes to include in the issue body.

## Step 3: Summarize and Confirm

After gathering all information for all issues, present a summary:

```
## Issues to Create

### Issue 1: [Title]
- **Foundation Level**: L[0-3]
- **Dependencies**: [list or none]
- **Business Value**: [value]/10
- **Effort Estimate**: [hours] hours
- **Type**: [enhancement/bug]

[Repeat for each issue]

---

**This will**:
1. Create [N] GitHub issue(s)
2. Add priority labels for real-time scoring

**Proceed with creating these issues?**
```

Wait for user confirmation before proceeding.

## Step 4: Create GitHub Issues with Labels

For each issue:

1. **Build the label list**:
   - `foundation:l[0-3]` - Foundation level
   - `business-value:[1-10]` - Business value
   - `effort:[hours]` - Effort in hours
   - `depends-on:[X,Y,Z]` - Dependencies (if any)
   - `enhancement` or `bug` - Issue type

2. **Create the GitHub issue** using `gh issue create`:
   ```bash
   gh issue create \
     --title "[Title]" \
     --body "[Description]" \
     --label "foundation:l[level]" \
     --label "business-value:[value]" \
     --label "effort:[hours]" \
     --label "[enhancement|bug]"
   ```

   If there are dependencies, add:
   ```bash
   --label "depends-on:[X,Y,Z]"
   ```

   Capture the issue number from the output.

3. **Report the created issue**:
   ```
   Created Issue #[number]: [Title]
   Labels: foundation:l[level], business-value:[value], effort:[hours]
   ```

## Step 5: Report Success

After creating all issues:

```
Successfully created [N] issue(s) with priority labels:

- Issue #[number1]: [Title1]
  Priority: L[level], Value: [value]/10, Effort: [hours]h

- Issue #[number2]: [Title2]
  Priority: L[level], Value: [value]/10, Effort: [hours]h
...

Run `/implement-next-gh-issue` to see real-time prioritization!
```

## Label Reference

### Foundation Levels
- `foundation:l0` - Core Infrastructure (highest priority)
- `foundation:l1` - Essential Capabilities
- `foundation:l2` - Enhanced Features
- `foundation:l3` - Refinements (lowest priority)

### Business Value
- `business-value:1` through `business-value:10`

### Effort Estimate
- `effort:1` through `effort:100` (hours)

### Dependencies
- `depends-on:123` - Single dependency
- `depends-on:123,456,789` - Multiple dependencies

### Status
- `status: in-progress` - Currently being worked on (auto-added by `/implement-gh-issue`)

## Important Notes

- **Labels are the source of truth**: Priority is calculated in real-time from labels
- **No external sync needed**: Priority calculation happens live from GitHub
- **Dependencies use issue numbers**: Format is `depends-on:X,Y,Z` (comma-separated)
- **Effort is in hours**: Actual hours, not a 1-10 scale
- **Use AskUserQuestion strategically**: Group related questions together when possible
- **Be conversational**: Make this feel like a guided wizard, not an interrogation

## Error Handling

If anything goes wrong:
- **GitHub issue creation fails**: Report the error and ask if they want to retry
- **Invalid label format**: Validate inputs and ask for correction
- **Missing dependencies**: Warn the user but allow them to proceed
- **Label doesn't exist**: GitHub will create it automatically

Remember: This tool should make it EASY to add issues while ensuring they're properly labeled for priority calculation!
