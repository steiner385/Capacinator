# Quickstart: Building Windows Installer

**Feature**: Windows Build Process Refinement
**Audience**: Developers building Capacinator installer locally
**Last Updated**: 2026-01-24

## Prerequisites

Before building the Windows installer, ensure you have:

- **Node.js 20+** installed (verify: `node --version`)
- **npm** installed (verify: `npm --version`)
- **Git** installed (verify: `git --version`)
- **Windows 10/11** (or Windows Server 2019+)
- **Code signing certificate** (PFX file) - optional for local builds, required for production

## Quick Build (No Code Signing)

For local testing without code signing:

```bash
# 1. Clone repository
git clone https://github.com/steiner385/Capacinator.git
cd Capacinator

# 2. Install dependencies
npm ci

# 3. Build application (server + client + electron)
npm run build

# 4. Build Windows installer (unsigned)
npm run dist:win
```

**Output**: `dist-electron/Capacinator Setup 1.0.0.exe`

**Build Time**: ~5-7 minutes (first build)

**Installer Size**: ~150-200MB

## Signed Build (Production)

For production builds with code signing:

```bash
# 1. Obtain code signing certificate
# - Purchase from DigiCert, Sectigo, or SSL.com
# - Download as PFX file (e.g., code-signing.pfx)

# 2. Store certificate securely
mkdir -p certs
cp /path/to/your-cert.pfx certs/code-signing.pfx

# 3. Set environment variables
export CSC_LINK=./certs/code-signing.pfx
export CSC_KEY_PASSWORD="your-certificate-password"

# 4. Build and sign installer
npm run build
npm run dist:win
```

**Output**: `dist-electron/Capacinator Setup 1.0.0.exe` (digitally signed)

**Verification**: Right-click installer → Properties → Digital Signatures tab

## Testing the Installer

### On Your Development Machine

**Warning**: Installing on your dev machine may interfere with development workflow. Use VM for testing.

```bash
# Run installer
./dist-electron/Capacinator\ Setup\ 1.0.0.exe

# Follow installer prompts
# - Choose installation directory
# - Select shortcuts (desktop, start menu)
# - Click "Install"

# Launch application
# - From desktop shortcut, or
# - From Start Menu: Capacinator
```

### On Clean Windows VM

Recommended for production testing:

1. **Set Up VM**:
   - Download Windows 10/11 ISO from Microsoft
   - Create VM in VirtualBox, VMware, or Hyper-V
   - Install Windows (use evaluation license for testing)

2. **Transfer Installer**:
   - Copy `Capacinator Setup 1.0.0.exe` to VM
   - Or download from GitHub Releases

3. **Test Installation**:
   - Run installer (note SmartScreen warnings if unsigned)
   - Verify application launches
   - Test core features (create project, assign resources)
   - Test uninstallation (no leftover files)

4. **Check Cleanup**:
   - After uninstall, verify removed:
     - `C:\Users\<username>\AppData\Roaming\Capacinator`
     - `C:\Users\<username>\AppData\Local\Capacinator`
     - Desktop shortcut
     - Start Menu entry

## Build Configuration

### Customizing electron-builder

Edit `package.json` "build" section:

```json
{
  "build": {
    "appId": "com.capacinator.app",
    "productName": "Capacinator",
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "nsis": {
      "oneClick": false,                          // Allow directory selection
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "perMachine": false,                        // Per-user install
      "runAfterFinish": true                      // Launch after install
    }
  }
}
```

### Customizing Version

Update version in `package.json`:

```bash
# Increment patch version (1.0.0 → 1.0.1)
npm version patch

# Increment minor version (1.0.0 → 1.1.0)
npm version minor

# Increment major version (1.0.0 → 2.0.0)
npm version major

# Custom version
npm version 1.5.0
```

## Troubleshooting

### Build Fails with "electron-builder not found"

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Build Fails with "Cannot find module 'dist/server/index.js'"

```bash
# Ensure server is built first
npm run build:server
npm run dist:win
```

### Installer Shows "Unknown Publisher" Warning

**Expected behavior for unsigned builds**. To remove warning:

1. Obtain code signing certificate
2. Configure `CSC_LINK` and `CSC_KEY_PASSWORD`
3. Rebuild installer

### Installer Size is Too Large (> 250MB)

Check for unnecessary files in build:

```bash
# List files included in build
npx electron-builder --dir

# Review dist-electron/win-unpacked/ contents
# Look for large files that shouldn't be included
# Update "files" exclusion patterns in package.json
```

### Application Won't Launch After Install

Check Windows Event Viewer for errors:

1. Open Event Viewer: `eventvwr.msc`
2. Windows Logs → Application
3. Look for errors from "Capacinator"

Common causes:
- Missing Node.js runtime (should be bundled)
- Missing native module (.node files)
- Incorrect file paths in main process

## CI/CD Build (GitHub Actions)

For automated builds on tag push:

```bash
# 1. Create and push version tag
git tag v1.0.0
git push origin v1.0.0

# 2. GitHub Actions builds installer automatically
# - Triggered by tag push (refs/tags/v*)
# - Uploads to GitHub Releases
# - Update manifest (latest.yml) generated

# 3. Download installer from release
# - Go to: https://github.com/steiner385/Capacinator/releases/tag/v1.0.0
# - Download: Capacinator-Setup-1.0.0.exe
```

## Advanced Configuration

### Enable Auto-Updates

Edit `src/electron/main-with-setup.cjs`:

```javascript
const { autoUpdater } = require('electron-updater');

// Initialize auto-updater
autoUpdater.checkForUpdatesAndNotify();

// Handle update events
autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
});

autoUpdater.on('update-downloaded', () => {
  console.log('Update downloaded, will install on restart');
});
```

### Custom NSIS Installer Script

Create `build/installer.nsh`:

```nsis
!macro customInstall
  ; Custom installation steps
  WriteRegStr HKCU "Software\Capacinator" "InstallPath" "$INSTDIR"
!macroend

!macro customUnInstall
  ; Custom uninstallation cleanup
  RMDir /r "$APPDATA\Capacinator"
  DeleteRegKey HKCU "Software\Capacinator"
!macroend
```

Reference in `package.json`:

```json
{
  "build": {
    "nsis": {
      "include": "build/installer.nsh"
    }
  }
}
```

### Silent Installation (IT Deployments)

Install without user interaction:

```bash
# Silent install to default location
Capacinator-Setup-1.0.0.exe /S

# Silent install to custom location
Capacinator-Setup-1.0.0.exe /S /D=C:\CustomPath\Capacinator

# Silent uninstall
"C:\Users\<username>\AppData\Local\Programs\Capacinator\Uninstall Capacinator.exe" /S
```

## Performance Benchmarks

**Expected Build Times** (on modern hardware):

| Phase | Duration |
|-------|----------|
| `npm ci` (clean install) | 60-90s |
| `npm run build:server` | 25-35s |
| `npm run build:client` | 45-60s |
| `npm run dist:win` (unsigned) | 180-240s |
| `npm run dist:win` (signed) | 200-260s |
| **Total (clean build)** | **5-7 minutes** |

**Expected Installer Sizes**:

| Configuration | Size |
|--------------|------|
| Minimal (no dependencies) | ~80MB |
| Standard (with dependencies) | ~150MB |
| Full (with dev dependencies) | ~250MB |

**Target**: < 200MB for production builds

## Next Steps

1. **Test installer on clean Windows VM**
2. **Verify all core features work after installation**
3. **Test uninstaller cleanup**
4. **Document any issues or edge cases**
5. **Proceed to code signing setup** (if ready for production)

## Resources

- [electron-builder Documentation](https://www.electron.build/)
- [NSIS Scripting Reference](https://nsis.sourceforge.io/Docs/)
- [Code Signing Guide](https://www.electron.build/code-signing)
- [GitHub Actions Windows Runner](https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners#supported-runners-and-hardware-resources)

---

**Document Status**: ✅ Complete
**Last Tested**: 2026-01-24
**Next Review**: After first production build
