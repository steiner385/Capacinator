# Windows Installer Automated Testing

This directory contains automated tests for the Windows installer. These tests replace manual testing iterations by automating the complete workflow from installation through app launch and verification.

## What These Tests Do

The installer tests automate the following workflow:

1. **Build** the installer (if needed)
2. **Clean** any previous installation
3. **Pre-configure** electron-store to bypass the setup wizard
4. **Install** the application in silent mode
5. **Validate** installation artifacts (files, registry, shortcuts)
6. **Launch** the installed Electron app
7. **Verify** server health and detect critical errors
8. **Test** basic API functionality
9. **Cleanup** all artifacts after testing

## Running the Tests

### Prerequisites

- Windows operating system
- Developer Mode enabled (for symlink support)
- Node.js 20+ installed
- Project built: `npm run build`
- Installer created: `npm run dist:win`

### Commands

```bash
# Run all installer tests
npm run test:installer

# Run in headed mode (see browser)
npm run test:installer:headed

# Run in debug mode (step through test)
npm run test:installer:debug

# Clean up test artifacts manually
npm run test:installer:cleanup
```

### Full Testing Workflow

```bash
# 1. Clean previous test artifacts
npm run test:installer:cleanup

# 2. Build fresh code
npm run build

# 3. Create installer
npm run dist:win

# 4. Run automated tests
npm run test:installer

# 5. View HTML report
start test-results/installer-report/index.html
```

## Test Structure

### Helpers

- **config-manager.ts** - Pre-configures electron-store to bypass setup wizard
- **installer-runner.ts** - Executes installer/uninstaller, detects errors
- **system-validator.ts** - Validates files, registry, shortcuts, AppData
- **cleanup-manager.ts** - Removes all installation artifacts

### Test Specs

- **app-launch-health.spec.ts** - Main test suite
  - Installs application in silent mode
  - Validates installation artifacts
  - Launches app and waits for server health
  - Detects critical errors in console and debug log
  - Tests basic API connectivity

## Success Criteria

A test passes when:

✅ Installer exits with code 0
✅ All critical files are installed
✅ Registry keys are created
✅ Shortcuts are created (Desktop, Start Menu)
✅ App launches within 60 seconds
✅ Server health endpoint responds within 30 seconds
✅ No critical errors in console output
✅ No critical errors in debug log
✅ Basic API endpoints respond successfully

## Error Detection

The tests detect these critical errors:

❌ Maximum call stack size exceeded (infinite recursion)
❌ Server exited with code 1 (startup failure)
❌ Cannot find module (missing dependencies)
❌ Database initialization failed
❌ Server not responding after 30 seconds
❌ Uncaught exceptions or unhandled rejections

## Test Output

Each test run produces:

- **HTML Report**: `test-results/installer-report/index.html`
- **JSON Results**: `test-results/installer-results.json`
- **Screenshots**: Captured on failure
- **Videos**: Recorded on failure
- **Console Output**: Full test execution log

## Configuration

Test configuration is in `playwright.installer.config.ts`:

- **Timeout**: 5 minutes per test (installers are slow)
- **Workers**: 1 (tests run sequentially)
- **Retries**: 0 (installer tests are too slow for retries)
- **Trace**: Captured on failure
- **Screenshots/Videos**: Captured on failure

## Installation Paths

The tests use these default paths:

- **Installation**: `%USERPROFILE%\AppData\Local\Programs\Capacinator`
- **AppData**: `%APPDATA%\capacinator`
- **Desktop Shortcut**: `%USERPROFILE%\Desktop\Capacinator.lnk`
- **Start Menu**: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Capacinator.lnk`

## Troubleshooting

### Test fails with "Installer not found"

Make sure you've built the installer first:
```bash
npm run build
npm run dist:win
```

### Test fails with "Process still running"

Clean up manually:
```bash
npm run test:installer:cleanup
```

Or kill processes manually:
```bash
taskkill /F /IM Capacinator.exe /T
```

### Test fails with "Installation directory still exists"

Delete manually:
```bash
rd /s /q "%LOCALAPPDATA%\Programs\Capacinator"
rd /s /q "%APPDATA%\capacinator"
```

### View debug logs

The app writes startup logs to:
```
%APPDATA%\capacinator\startup-debug.log
```

## CI/CD Integration

These tests can run in GitHub Actions using a Windows runner:

```yaml
- name: Run Installer Tests
  run: |
    npm run build
    npm run dist:win
    npm run test:installer
```

## Benefits Over Manual Testing

- **Speed**: ~5 minutes automated vs 10+ minutes manual
- **Consistency**: Same test every time, no human error
- **Detail**: Captures screenshots, videos, logs on failure
- **Validation**: Checks files, registry, shortcuts automatically
- **No Context Switching**: Run and walk away

## Next Steps

1. Fix any failing tests
2. Add additional test scenarios if needed
3. Integrate into CI/CD pipeline
4. Add tests for upgrade scenarios
5. Add tests for uninstall verification
