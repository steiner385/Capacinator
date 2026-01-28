# Windows Developer Mode Setup Guide

**Purpose**: Enable Windows Developer Mode to allow electron-builder to create NSIS installers without administrator privileges.

**Issue**: electron-builder fails to create NSIS installer due to symlink permission errors.

**Solution**: Enable Windows Developer Mode (one-time setup).

---

## Option 1: Enable via Windows Settings (Recommended)

### Windows 11 Instructions

1. **Open Windows Settings**:
   - Press `Win + I` (or click Start → Settings)

2. **Navigate to Developer Settings**:
   - Click **Privacy & Security** in the left sidebar
   - Click **For developers** in the right panel

3. **Enable Developer Mode**:
   - Toggle **Developer Mode** to **ON**
   - Windows will download and install required components (~10 seconds)
   - You may see a User Account Control (UAC) prompt - click **Yes**

4. **Verify**:
   - Developer Mode should show as **On**
   - Close Settings

### Windows 10 Instructions

1. **Open Windows Settings**:
   - Press `Win + I` (or click Start → Settings)

2. **Navigate to Developer Settings**:
   - Click **Update & Security**
   - Click **For developers** in the left sidebar

3. **Enable Developer Mode**:
   - Select **Developer mode** radio button
   - Windows will download and install required components
   - Click **Yes** on the UAC prompt if shown

4. **Verify**:
   - Developer mode should be selected
   - Close Settings

---

## Option 2: Enable via PowerShell (Alternative)

If you prefer command-line setup:

1. **Open PowerShell as Administrator**:
   - Right-click Start → Windows Terminal (Admin) or PowerShell (Admin)

2. **Run this command**:
   ```powershell
   Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" -Name "AllowDevelopmentWithoutDevLicense" -Value 1
   ```

3. **Restart your computer** for changes to take effect

---

## What Developer Mode Does

**Enabled Features**:
- ✅ Symbolic link creation without admin privileges
- ✅ Sideloading of UWP apps
- ✅ Remote debugging capabilities
- ✅ Device discovery for deployment

**Security Considerations**:
- Developer Mode is safe for development machines
- Does NOT disable Windows security features
- Does NOT expose your system to additional risks
- Can be disabled anytime (toggle off in Settings)

**Impact on electron-builder**:
- Allows extraction of winCodeSign tools (required for installer creation)
- Enables NSIS installer generation without admin rights
- No impact on code signing (separate certificate requirement)

---

## After Enabling Developer Mode

### Step 1: Clear electron-builder Cache

```bash
# Remove the problematic cache
rm -rf "$LOCALAPPDATA/electron-builder/Cache/winCodeSign"

# Or on Windows:
rmdir /s /q "%LOCALAPPDATA%\electron-builder\Cache\winCodeSign"
```

### Step 2: Rebuild the Installer

```bash
cd C:\Users\tony\GitHub\Capacinator

# Full build with NSIS installer
npm run dist:win
```

**Expected Output**:
```
• electron-builder  version=26.0.12
• loaded configuration  file=package.json ("build" field)
• packaging       platform=win32 arch=x64
• building        target=nsis file=dist-electron/Capacinator Setup 1.0.0.exe
• building block map  blockMapFile=dist-electron/Capacinator Setup 1.0.0.exe.blockmap
```

**Success Indicators**:
- ✅ Build completes without errors
- ✅ File created: `dist-electron/Capacinator Setup 1.0.0.exe`
- ✅ File size: ~150-200 MB
- ✅ File created: `dist-electron/latest.yml` (update manifest)

### Step 3: Verify the Installer

```bash
# Check installer was created
ls -lh dist-electron/*.exe

# Expected output:
# -rw-r--r-- 1 tony 197609 ~150-200M Jan 24 20:XX Capacinator Setup 1.0.0.exe
```

---

## Testing the Installer

### Test 1: Installation

1. **Run the installer**:
   - Navigate to `dist-electron/`
   - Double-click `Capacinator Setup 1.0.0.exe`

2. **Follow installation prompts**:
   - Choose installation directory (default: `%LOCALAPPDATA%\Programs\Capacinator`)
   - Select shortcuts (Desktop, Start Menu)
   - Click **Install**

3. **Verify installation**:
   - Desktop shortcut created: ✅
   - Start Menu entry: ✅
   - Application files in installation directory: ✅

### Test 2: Application Launch

1. **Launch from Desktop shortcut**:
   - Double-click `Capacinator` on Desktop
   - Application should launch within 10 seconds

2. **Verify UI loads**:
   - Setup wizard appears (first run), OR
   - Main application interface loads

3. **Check embedded server**:
   - Server should start automatically
   - UI should be responsive

### Test 3: Core Functionality

**Manual testing required**:

1. **Create a Project**:
   - Click "New Project" or equivalent
   - Fill in project details
   - Save project
   - Verify project appears in list

2. **Add a Person**:
   - Navigate to People section
   - Add a new person
   - Verify person is saved

3. **Create Assignment**:
   - Assign person to project
   - Verify assignment is created

### Test 4: Uninstallation

1. **Uninstall via Windows Settings**:
   - Settings → Apps → Installed Apps
   - Find "Capacinator"
   - Click **Uninstall**

2. **Verify cleanup**:
   - `%LOCALAPPDATA%\Programs\Capacinator` - removed ✅
   - `%APPDATA%\Capacinator` - removed ✅
   - `%LOCALAPPDATA%\Capacinator` - removed ✅
   - Desktop shortcut - removed ✅
   - Start Menu entry - removed ✅

3. **Check registry** (optional):
   - Run `regedit`
   - Navigate to `HKEY_CURRENT_USER\Software\`
   - Verify `Capacinator` key removed ✅

---

## Troubleshooting

### Issue: "Developer Mode is not available for this device"

**Possible Causes**:
- Windows Home edition on some older builds
- Group Policy restrictions (corporate environment)

**Solutions**:
1. Update Windows to latest version
2. Check with IT department if on corporate network
3. Use PowerShell method (may bypass UI restriction)
4. Build installer on different machine or CI/CD

### Issue: Still getting symlink errors after enabling Developer Mode

**Solution**:
1. **Restart your computer** - Developer Mode changes require reboot
2. Clear cache: `rm -rf "$LOCALAPPDATA/electron-builder/Cache"`
3. Rebuild: `npm run dist:win`

### Issue: UAC prompts during installation

**This is expected behavior**:
- Installer is unsigned (no code signing certificate)
- Windows SmartScreen will show "Unknown Publisher" warning
- Click "More info" → "Run anyway"
- **Normal for development builds**
- Will be resolved in User Story 2 (Code Signing)

### Issue: Application won't launch after installation

**Debugging steps**:
1. Check Event Viewer:
   - Run `eventvwr.msc`
   - Windows Logs → Application
   - Look for Capacinator errors

2. Check installation directory:
   - `%LOCALAPPDATA%\Programs\Capacinator`
   - Verify files exist

3. Try running directly:
   - `cd %LOCALAPPDATA%\Programs\Capacinator`
   - `Capacinator.exe`
   - Check console for errors

---

## Performance Targets

After successful build, verify these metrics:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Build time | < 10 min | `time npm run dist:win` |
| Installer size | < 200 MB | `ls -lh dist-electron/*.exe` |
| Installation time | < 3 min | Stopwatch during install |
| Launch time | < 10 sec | Stopwatch from icon click to UI load |

---

## Next Steps After Completion

Once installer is working:

1. **Mark Tasks Complete**:
   - ✅ T014: Build test
   - ✅ T015: Installation test
   - ✅ T016: Launch test
   - ✅ T017: Core functionality test
   - ✅ T018: Uninstaller test
   - ✅ T019: Performance metrics

2. **Update Documentation**:
   - Add Developer Mode requirement to BUILD_WINDOWS.md
   - Document actual build times and sizes
   - Add screenshots (optional)

3. **Proceed to User Story 2** (Code Signing):
   - Procure code signing certificate
   - Configure signing in package.json
   - Build signed installer
   - Test SmartScreen behavior

4. **Create Git Commit**:
   - Commit all configuration changes
   - Push to feature branch
   - Create pull request

---

## Quick Reference Commands

```bash
# Clear cache (if needed)
rm -rf "$LOCALAPPDATA/electron-builder/Cache/winCodeSign"

# Build installer
cd C:\Users\tony\GitHub\Capacinator
npm run dist:win

# Check output
ls -lh dist-electron/*.exe

# Test installation
cd dist-electron
./Capacinator\ Setup\ 1.0.0.exe
```

---

**Document Status**: Ready for use
**Last Updated**: 2026-01-24
**Estimated Time**: 5-10 minutes (setup + build + test)
