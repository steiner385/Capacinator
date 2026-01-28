# Building Windows Installer for Capacinator

**Last Updated**: 2026-01-24
**Target Platform**: Windows 10/11 (x64)
**Installer Format**: NSIS

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Build Configuration](#build-configuration)
4. [Testing the Installer](#testing-the-installer)
5. [Code Signing](#code-signing)
6. [Auto-Updates](#auto-updates)
7. [CI/CD Integration](#cicd-integration)
8. [Troubleshooting](#troubleshooting)
9. [Performance Benchmarks](#performance-benchmarks)

---

## Prerequisites

### Required Software

- **Node.js 20+** - Runtime environment
  - Verify: `node --version`
  - Download: https://nodejs.org/

- **npm** - Package manager (comes with Node.js)
  - Verify: `npm --version`

- **Git** - Version control
  - Verify: `git --version`
  - Download: https://git-scm.com/

- **Windows Developer Mode** - Required for NSIS installer creation
  - **CRITICAL**: Must be enabled to create Windows installers
  - How to enable: Settings → Privacy & Security → For developers → Developer Mode ON
  - See: `specs/002-windows-build-refinement/DEVELOPER_MODE_SETUP.md` for detailed instructions
  - Without this: Build will fail with "Cannot create symbolic link" error

### Optional (for Code Signing)

- **Windows SDK** - For signtool.exe
  - Included with Visual Studio
  - Or download standalone: https://developer.microsoft.com/windows/downloads/windows-sdk/

- **Code Signing Certificate** - OV or EV certificate
  - Providers: DigiCert, Sectigo, SSL.com
  - Format: PFX file with password

---

## Quick Start

### Build Unsigned Installer (Local Development)

```bash
# 1. Clone repository
git clone https://github.com/steiner385/Capacinator.git
cd Capacinator

# 2. Install dependencies
npm ci

# 3. Build application (server + client + electron)
npm run build

# 4. Build Windows installer
npm run dist:win
```

**Output**: `dist-electron/Capacinator Setup 1.0.0.exe`

**Expected Build Time**: 5-7 minutes (first build)
**Expected Installer Size**: 150-200MB

### Build Signed Installer (Production)

```bash
# 1. Set environment variables for code signing
export CSC_LINK=./certs/code-signing.pfx
export CSC_KEY_PASSWORD="your-certificate-password"

# 2. Build and sign installer
npm run build
npm run dist:win
```

**Output**: `dist-electron/Capacinator Setup 1.0.0.exe` (digitally signed)

---

## Build Configuration

### electron-builder Configuration

The Windows build configuration is defined in `package.json` under the `"build"` section:

```json
{
  "build": {
    "appId": "com.capacinator.app",
    "productName": "Capacinator",
    "copyright": "Copyright © 2024 Capacinator",
    "directories": {
      "output": "dist-electron",
      "buildResources": "build"
    },
    "files": [
      "dist/**/*",
      "src/electron/*.cjs",
      "src/electron/*.html",
      "src/electron/*.js",
      "package.json",
      "node_modules/**/*",
      "!**/*.ts",
      "!**/tsconfig.json",
      "!**/*.map",
      "!**/*.spec.js",
      "!**/*.test.js",
      "!node_modules/**/test/**",
      "!node_modules/**/*.md",
      "!node_modules/**/LICENSE",
      "!node_modules/**/*.d.ts"
    ],
    "asar": true,
    "asarUnpack": [
      "node_modules/better-sqlite3/**"
    ],
    "compression": "store",
    "win": {
      "target": "nsis",
      "icon": "build/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "include": "build/installer.nsh",
      "warningsAsErrors": false,
      "perMachine": false
    }
  }
}
```

### Key Configuration Options

| Option | Value | Description |
|--------|-------|-------------|
| **appId** | com.capacinator.app | Unique application identifier |
| **target** | nsis | Windows installer format (NSIS) |
| **icon** | build/icon.ico | Application icon (256x256 recommended) |
| **asar** | true | Bundle app files into ASAR archive for faster loading |
| **asarUnpack** | better-sqlite3 | Native modules that can't be packaged in ASAR |
| **compression** | store | No compression (NSIS compresses at install time) |
| **oneClick** | false | Allow users to choose installation directory |
| **perMachine** | false | Per-user installation (no admin required) |

### Custom NSIS Script

The custom installer script is located at `build/installer.nsh` and provides:

- **Custom Install Logic**: Registry entries for installation tracking
- **Custom Uninstall Logic**: Complete cleanup of AppData, LocalAppData, registry
- **Pre-installation Checks**: Detect previous installations

**Key Cleanup Locations**:
- `$APPDATA\Capacinator` - User preferences, database files
- `$LOCALAPPDATA\Capacinator` - Cache, temporary files
- `HKCU\Software\Capacinator` - Registry entries
- Desktop and Start Menu shortcuts

---

## Testing the Installer

### Local Testing

**⚠️ Warning**: Installing on your development machine may interfere with the dev environment. Use a VM for thorough testing.

```bash
# Run the installer
./dist-electron/Capacinator\ Setup\ 1.0.0.exe

# Follow installation prompts
# - Choose installation directory (default: %LOCALAPPDATA%\Programs\Capacinator)
# - Select shortcuts (desktop, start menu)
# - Click "Install"

# Launch application
# - From desktop shortcut, or
# - From Start Menu: Capacinator
```

### Testing on Clean Windows VM

**Recommended for production validation**:

1. **Set Up VM**:
   - Download Windows 10/11 ISO from Microsoft
   - Create VM in VirtualBox, VMware, or Hyper-V
   - Install Windows (use 90-day evaluation license for testing)

2. **Transfer Installer**:
   - Copy `Capacinator Setup 1.0.0.exe` to VM
   - Or download from GitHub Releases

3. **Test Installation** (install):
   - Run installer
   - Note any SmartScreen warnings (expected for unsigned builds)
   - Verify application launches
   - Test core features (create project, assign resources)

4. **Test Uninstallation**:
   - Uninstall via Windows Settings or Control Panel
   - Verify complete file cleanup:
     - Check `%APPDATA%\Capacinator` (should not exist)
     - Check `%LOCALAPPDATA%\Capacinator` (should not exist)
     - Check Desktop shortcut (should be removed)
     - Check Start Menu entry (should be removed)

5. **Check Registry** (run `regedit`):
   - Navigate to `HKEY_CURRENT_USER\Software\`
   - Verify `Capacinator` key is removed

### Silent Installation (IT Deployments)

For automated deployments without user interaction:

```bash
# Silent install to default location
Capacinator-Setup-1.0.0.exe /S

# Silent install to custom location
Capacinator-Setup-1.0.0.exe /S /D=C:\CustomPath\Capacinator

# Silent uninstall
"C:\Users\<username>\AppData\Local\Programs\Capacinator\Uninstall Capacinator.exe" /S
```

---

## Code Signing

### Certificate Procurement

**Organization Validation (OV) Certificate** (Recommended):
- **Cost**: $100-300/year
- **Providers**: DigiCert, Sectigo, SSL.com
- **Delivery**: PFX file + password
- **Lead Time**: 1-2 weeks (identity validation)
- **SmartScreen**: Reputation builds over 2-6 months

**Extended Validation (EV) Certificate**:
- **Cost**: $300-600/year
- **Benefits**: Instant SmartScreen reputation
- **Requirements**: Hardware USB token
- **Challenge**: CI/CD automation complexity

### Certificate Setup

1. **Purchase Certificate**:
   - Choose provider (DigiCert recommended)
   - Complete identity validation (business documents)
   - Receive PFX file and password

2. **Store Certificate Securely**:
   ```bash
   # Create certs directory (gitignored)
   mkdir -p certs

   # Copy certificate
   cp /path/to/certificate.pfx certs/code-signing.pfx

   # Set password in environment
   echo "CSC_KEY_PASSWORD=your-password" >> .env.local
   ```

3. **Configure electron-builder**:

   Add to `package.json` "win" section:
   ```json
   {
     "win": {
       "certificateFile": "./certs/code-signing.pfx",
       "certificatePassword": "${CSC_KEY_PASSWORD}",
       "sign": "./build/sign.js"  // Optional: custom signing script
     }
   }
   ```

4. **Build Signed Installer**:
   ```bash
   # Set environment variables
   export CSC_LINK=./certs/code-signing.pfx
   export CSC_KEY_PASSWORD="your-password"

   # Build installer
   npm run dist:win
   ```

5. **Verify Signature**:
   - Right-click installer .exe
   - Properties → Digital Signatures tab
   - Should show your company name and valid certificate

### SmartScreen Reputation

**Timeline for OV Certificates**:
- **Week 1-2**: Most users see "Unknown Publisher" warning
- **Week 3-4**: Warning frequency decreases (500+ downloads)
- **Month 2-3**: Minimal warnings for established user base
- **Month 6+**: Rare warnings, good reputation

**Best Practices**:
- Use same certificate for all releases (builds reputation)
- Always use timestamp server (signatures valid after cert expires)
- Sign both installer and application executable
- Backup certificate securely (loss requires reputation restart)

---

## Auto-Updates

### Configuration (Future Implementation)

Auto-update capability will be added in a future release using electron-updater.

**Planned Features**:
- Automatic update checks on app startup
- Background update downloads
- User-controlled installation (no forced restarts)
- Update manifest hosted on GitHub Releases

**Current Workaround**:
- Manual updates: Download new installer from GitHub Releases
- Users must uninstall old version and install new version

---

## CI/CD Integration

### GitHub Actions Workflow

**Planned Implementation**: Automated Windows builds on tag push.

**Workflow File**: `.github/workflows/build-windows.yml`

**Trigger**: Version tags (e.g., `v1.0.0`, `v1.1.0-beta.1`)

**Steps**:
1. Checkout code
2. Setup Node.js 20 with npm cache
3. Install dependencies (`npm ci`)
4. Build application (`npm run build`)
5. Decode code signing certificate from GitHub Secret
6. Build Windows installer (`npm run dist:win`)
7. Upload installer to GitHub Releases
8. Clean up certificate

**Required GitHub Secrets**:
- `WINDOWS_CERT_BASE64`: Base64-encoded PFX certificate
- `WINDOWS_CERT_PASSWORD`: Certificate password

**Release Process**:
```bash
# 1. Update version in package.json
npm version minor  # or patch, major

# 2. Push tag
git push origin v1.1.0

# 3. GitHub Actions builds installer automatically
# 4. Download from: https://github.com/steiner385/Capacinator/releases/tag/v1.1.0
```

---

## Troubleshooting

### Build Errors

#### "electron-builder not found"

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### "Cannot find module 'dist/server/index.js'"

```bash
# Ensure server is built first
npm run build:server
npm run dist:win
```

#### "better-sqlite3 binding not found"

This indicates the native module wasn't unpacked from ASAR. Verify `asarUnpack` in `package.json`:

```json
"asarUnpack": [
  "node_modules/better-sqlite3/**"
]
```

### Installer Issues

#### "Unknown Publisher" Warning

**Expected behavior for unsigned builds**. To remove:
1. Obtain code signing certificate
2. Configure `CSC_LINK` and `CSC_KEY_PASSWORD`
3. Rebuild installer

#### Installer Size Too Large (> 250MB)

Check for unnecessary files:
```bash
# List packaged files
npx electron-builder --dir

# Review dist-electron/win-unpacked/ contents
# Look for large files that shouldn't be included
# Update "files" exclusion patterns in package.json
```

#### Application Won't Launch After Install

Check Windows Event Viewer:
1. Open Event Viewer: `eventvwr.msc`
2. Windows Logs → Application
3. Look for errors from "Capacinator"

**Common Causes**:
- Missing Node.js runtime (should be bundled)
- Missing native module (.node files)
- Incorrect file paths in main process
- Database initialization failure

### Runtime Errors

#### "ENOENT: no such file or directory"

File paths may be incorrect. Use `app.getPath()` for runtime paths:
```javascript
const { app } = require('electron');
const dbPath = path.join(app.getPath('userData'), 'database.db');
```

#### "SQLite database is locked"

Only one instance should access the database. Check:
- No other instances running
- Database file in writable location (`userData`, not `appData`)

---

## Performance Benchmarks

### Expected Build Times

**On Modern Hardware** (6-core CPU, SSD, 16GB RAM):

| Phase | Duration |
|-------|----------|
| `npm ci` (clean install) | 60-90s |
| `npm run build:server` | 25-35s |
| `npm run build:client` | 45-60s |
| `npm run dist:win` (unsigned) | 180-240s |
| `npm run dist:win` (signed) | 200-260s |
| **Total (clean build)** | **5-7 minutes** |

### Expected Installer Characteristics

| Metric | Value |
|--------|-------|
| Installer file size | 150-200MB |
| Installation time (clean Windows VM) | < 3 minutes |
| Application launch time | < 10 seconds |
| Number of bundled files | ~1500-2000 |

### Optimization Targets

- ✅ Build time: < 10 minutes (current: 5-7 min)
- ✅ Installer size: < 200MB (current: 150-200MB)
- ✅ Installation time: < 3 minutes
- ✅ Launch time: < 10 seconds

---

## Related Documentation

- [Electron Builder Documentation](https://www.electron.build/)
- [NSIS Scripting Reference](https://nsis.sourceforge.io/Docs/)
- [Code Signing Guide](https://www.electron.build/code-signing)
- [electron-updater Documentation](https://www.electron.build/auto-update)

---

**Document Version**: 1.0
**Last Reviewed**: 2026-01-24
**Next Review**: After first production release
