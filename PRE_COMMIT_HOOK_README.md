# Pre-commit Hook Configuration

A pre-commit hook has been configured to automatically run unit tests before each commit and prevent commits if any unit tests fail.

## What the Hook Does

The pre-commit hook automatically runs:

1. **Unit Tests** - Runs all tests in the `tests/unit/` directory (both client and server-unit projects)
2. **Linting** (optional) - Runs ESLint if configuration is found
3. **Type Checking** (disabled by default) - Can be enabled to run TypeScript type checking

## Hook Location

The hook is located at `.git/hooks/pre-commit` and is automatically executed before each commit.

## Running Tests

### Unit Tests Only
The hook runs unit tests using:
```bash
npm run test -- --testPathPatterns="tests/unit" --passWithNoTests
```

This specifically targets:
- `tests/unit/client/**/*.test.tsx` - React component tests
- `tests/unit/server/**/*.test.ts` - Server-side unit tests

### Integration tests are excluded
Integration tests in `tests/integration/` are NOT run by the pre-commit hook to keep commit times reasonable.

## Bypassing the Hook

If you need to commit without running the hook (not recommended):
```bash
git commit --no-verify -m "Your commit message"
```

## Hook Status Messages

- 🧪 **Running pre-commit checks** - Hook started
- 🔍 **Running unit tests** - Unit tests in progress  
- ✅ **All unit tests passed** - Tests successful
- ❌ **Unit tests failed** - Tests failed, commit blocked
- ⚠️ **ESLint config not found** - Linting skipped
- 🎉 **All pre-commit checks passed** - Ready to commit

## Troubleshooting

### If unit tests fail:
1. Run `npm run test -- --testPathPatterns="tests/unit"` to see detailed results
2. Fix the failing tests
3. Try committing again

### If you want to enable type checking:
1. Edit `.git/hooks/pre-commit`
2. Uncomment the type checking section (lines 74-85)
3. Save the file

### If you want to disable the hook entirely:
1. Rename the hook: `mv .git/hooks/pre-commit .git/hooks/pre-commit.disabled`
2. Or remove it: `rm .git/hooks/pre-commit`

## Configuration

The hook checks for:
- `package.json` with test scripts
- `node_modules` directory (installs if missing)
- ESLint configuration files (`.eslintrc.*` or `eslint.config.*`)

## Performance

Unit tests typically complete in 2-4 seconds, making the hook fast enough for regular development workflow.