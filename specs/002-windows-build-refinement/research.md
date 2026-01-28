# Research: Windows Build Process Refinement

**Feature**: Windows Build Process Refinement
**Branch**: `002-windows-build-refinement`
**Date**: 2026-01-24

## Executive Summary

This document consolidates research findings for implementing a production-ready Windows build process for Capacinator's Electron application. The research covers code signing, auto-updates, build optimization, NSIS customization, and CI/CD integration.

## 1. Code Signing for Windows

### Decision: Use Organization Validation (OV) Code Signing Certificate

**Rationale**:
- **Cost-Effective**: OV certificates ($100-300/year) vs EV certificates ($300-600/year)
- **No Hardware Token Required**: OV uses file-based PFX, easier to integrate with CI/CD
- **SmartScreen Reputation**: Builds over time through download volume and user feedback
- **Sufficient Security**: Both OV and EV provide equal cryptographic security

**Alternatives Considered**:
1. **Extended Validation (EV) Certificate**
   - ✅ Instant SmartScreen reputation (no warnings from day one)
   - ✅ Highest trust level
   - ❌ Requires hardware USB token (complicates CI/CD automation)
   - ❌ Higher cost ($300-600/year)
   - ❌ Strict identity validation process (legal docs, notarization)
   - **Rejected**: Hardware token requirement incompatible with CI/CD automation

2. **Self-Signed Certificate**
   - ✅ Free
   - ❌ Not trusted by Windows (worse than no signature)
   - ❌ Triggers severe SmartScreen warnings
   - **Rejected**: Poor user experience, defeats security purpose

3. **No Code Signing**
   - ✅ Zero cost
   - ❌ Windows SmartScreen warnings block most users
   - ❌ No tamper protection
   - **Rejected**: Unacceptable user experience for production application

### Implementation Details

**Certificate Provider**: DigiCert, Sectigo, or SSL.com (all Windows-trusted CAs)

**Storage Strategy**:
- **Development**: PFX file in local filesystem, password in `.env.local` (gitignored)
- **CI/CD**: PFX file base64-encoded in GitHub Secrets, decoded during build
- **Backup**: PFX file stored in secure password manager (1Password, LastPass)

**electron-builder Configuration**:
```json
{
  "win": {
    "certificateFile": "./certs/code-signing.pfx",
    "certificatePassword": process.env.CSC_KEY_PASSWORD,
    "sign": "./scripts/custom-sign.js"  // Optional: custom signing logic
  }
}
```

**Environment Variables**:
- `CSC_LINK`: Path to PFX file or base64-encoded certificate
- `CSC_KEY_PASSWORD`: Certificate password
- `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD`: Windows-specific overrides

**SmartScreen Reputation Timeline**:
- **Week 1-2**: Most users see "Unknown publisher" warning
- **Week 3-4**: Warning frequency decreases as download volume grows
- **Month 2-3**: Minimal warnings for established user base (500+ downloads)
- **Month 6+**: Rare warnings, good reputation established

**Mitigation for Initial Warnings**:
- Clear documentation for users (expected warning, how to proceed safely)
- Beta testing with known users to build initial reputation
- Consistent signing (same certificate for all releases)

### Best Practices

1. **Timestamp Signing**: Always use timestamp server so signatures remain valid after certificate expires
2. **Consistent Publisher Name**: Use same publisher name across all releases (builds reputation)
3. **Sign All Executables**: Sign both installer and application executable
4. **Backup Certificate**: Store PFX in multiple secure locations (loss requires restarting reputation)

---

## 2. Auto-Update Implementation

### Decision: Use electron-updater with GitHub Releases

**Rationale**:
- **Built-in Integration**: electron-updater designed specifically for electron-builder
- **Zero Infrastructure Cost**: GitHub Releases hosts files for free
- **Automatic Manifest**: electron-builder generates `latest.yml` automatically
- **Proven Solution**: Used by thousands of Electron apps
- **Cross-Platform**: Works on Windows, macOS, Linux

**Alternatives Considered**:
1. **Custom Update Server (S3 + API)**
   - ✅ Full control over update logic
   - ✅ Custom analytics, staged rollouts
   - ❌ Requires infrastructure (S3 buckets, Lambda/server)
   - ❌ Maintenance overhead
   - ❌ Cost (storage + bandwidth)
   - **Rejected**: Over-engineering for initial release, adds complexity

2. **Squirrel.Windows**
   - ✅ Windows-native update framework
   - ❌ Windows-only (Capacinator may support macOS/Linux later)
   - ❌ More complex setup than electron-updater
   - **Rejected**: electron-updater provides cross-platform solution

3. **Manual Updates Only**
   - ✅ Zero implementation cost
   - ❌ Users must manually check for updates
   - ❌ Low adoption of new versions
   - ❌ Security vulnerabilities persist longer
   - **Rejected**: Poor user experience, security risk

### Implementation Details

**Update Channels**:
- **Stable**: Production releases (tagged `v1.0.0`, `v1.1.0`)
- **Beta**: Pre-release testing (tagged `v1.1.0-beta.1`)
- **Alpha**: Internal testing (not public, manual distribution)

**Update Flow**:
1. App starts, electron-updater checks for updates in background
2. If update available, show notification: "New version available (v1.1.0)"
3. User clicks "Download and Install"
4. Download progress shown in notification (10%, 50%, 100%)
5. On completion, prompt: "Quit and Install" button
6. App quits, installer runs, app relaunches with new version

**Update Manifest** (`latest.yml`):
```yaml
version: 1.1.0
files:
  - url: Capacinator-Setup-1.1.0.exe
    sha512: [hash]
    size: 150000000
path: Capacinator-Setup-1.1.0.exe
sha512: [hash]
releaseDate: '2026-01-24T10:30:00.000Z'
```

**electron-updater Configuration** (package.json):
```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "steiner385",
      "repo": "Capacinator",
      "releaseType": "release"
    }
  }
}
```

**Auto-Updater Code** (src/electron/auto-updater.ts):
```typescript
import { autoUpdater } from 'electron-updater';
import { app, dialog } from 'electron';

export function initializeAutoUpdater() {
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `Version ${info.version} is available. Download now?`,
      buttons: ['Yes', 'Later']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded. Restart to install?',
      buttons: ['Restart', 'Later']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });
}
```

### Best Practices

1. **Update on Startup**: Check for updates when app starts (non-blocking)
2. **User Control**: Let users choose when to install (don't force immediate restart)
3. **Progress Feedback**: Show download progress (percentage, MB downloaded)
4. **Error Handling**: Gracefully handle network failures, corrupted downloads
5. **Differential Updates**: electron-updater supports delta updates (only changed files)
6. **Release Notes**: Include changelog in update notification

---

## 3. Build Optimization

### Decision: Use `compression: "store"` with Optimized File Patterns

**Rationale**:
- **Faster Builds**: No compression during electron-builder packaging (5-7 min vs 10-15 min)
- **Installer Compresses**: NSIS installer compresses files during installer creation
- **Net Effect**: Same final installer size, 40-50% faster builds
- **CI/CD Efficiency**: Faster builds = lower CI/CD costs

**Alternatives Considered**:
1. **Maximum Compression (`compression: "maximum"`)**
   - ✅ Smallest intermediate build artifacts
   - ❌ 2-3x longer build time
   - ❌ Marginal final installer size difference (NSIS re-compresses)
   - **Rejected**: Build time penalty not justified by minimal size savings

2. **Normal Compression (`compression: "normal"`)**
   - ✅ Balanced approach
   - ❌ Still slower than "store" (15-20% slower)
   - **Rejected**: "Store" with NSIS compression provides same result faster

### Implementation Details

**File Inclusion/Exclusion Patterns** (package.json):
```json
{
  "build": {
    "files": [
      "dist/**/*",                    // Compiled client + server
      "src/electron/*.cjs",           // Electron main process
      "src/electron/*.js",            // Electron scripts
      "src/electron/*.html",          // Electron windows
      "package.json",
      "node_modules/**/*",            // Dependencies
      "!**/*.ts",                     // Exclude TypeScript source
      "!**/*.map",                    // Exclude source maps
      "!**/*.spec.js",                // Exclude test files
      "!**/*.test.js",
      "!node_modules/**/test/**",     // Exclude test folders
      "!node_modules/**/*.md",        // Exclude docs
      "!node_modules/**/LICENSE",     // Exclude licenses (except top-level)
      "!node_modules/**/*.d.ts"       // Exclude TypeScript definitions
    ],
    "asar": true,                     // Bundle app into ASAR archive
    "asarUnpack": [                   // Exclude native modules from ASAR
      "node_modules/better-sqlite3/**",
      "node_modules/@serialport/**"   // If used for hardware integration
    ],
    "compression": "store"
  }
}
```

**ASAR Archive Optimization**:
- **asar: true**: Bundle app files into single archive (faster startup, harder to inspect)
- **asarUnpack**: Native modules (.node binaries) must be extracted (can't run from archive)

**Dependency Optimization**:
- **Production Dependencies Only**: `npm ci --production` before packaging
- **Tree Shaking**: Vite client build removes unused code automatically
- **TypeScript Compilation**: Exclude source .ts files, include only compiled .js

### Build Time Breakdown (Estimated)

| Phase | Normal Compression | Store Compression | Savings |
|-------|-------------------|-------------------|---------|
| TypeScript Compilation | 45s | 45s | 0s |
| Client Build (Vite) | 60s | 60s | 0s |
| Server Build (tsc) | 30s | 30s | 0s |
| electron-builder Packaging | 180s | 60s | **120s** |
| NSIS Installer Creation | 90s | 90s | 0s |
| **Total** | **405s (6.75 min)** | **285s (4.75 min)** | **120s (2 min)** |

**Caching Strategy** (CI/CD):
- Cache `node_modules` (restore from hash of package-lock.json)
- Cache `dist/` for incremental builds (invalidate on source changes)
- Cache electron-builder cache (`~/.cache/electron-builder`)

---

## 4. NSIS Customization

### Decision: Minimal Custom NSIS Script for Uninstaller Cleanup

**Rationale**:
- **electron-builder Defaults**: Handle 90% of installer needs (shortcuts, registry, file copy)
- **Custom Script for Cleanup**: Add uninstaller logic to remove AppData, user preferences
- **Maintainability**: Minimal custom code reduces maintenance burden

**Alternatives Considered**:
1. **Fully Custom NSIS Script**
   - ✅ Complete control over installer UI, logic
   - ❌ High maintenance burden (NSIS syntax is complex)
   - ❌ Risk of breaking existing electron-builder integration
   - **Rejected**: Over-engineering, electron-builder defaults sufficient

2. **Zero Customization**
   - ✅ Zero maintenance
   - ❌ Uninstaller leaves user data in AppData (poor UX)
   - **Rejected**: User data cleanup important for clean uninstall

### Implementation Details

**Custom NSIS Script** (`build/installer.nsh`):
```nsis
; Custom installer script for Capacinator
!macro customInstall
  ; Additional installation steps (if needed)
  ; Example: Create registry keys for file associations
  WriteRegStr HKCU "Software\Capacinator" "InstallPath" "$INSTDIR"
!macroend

!macro customUnInstall
  ; Clean up user data on uninstall
  RMDir /r "$APPDATA\Capacinator"                 ; Remove application data
  RMDir /r "$LOCALAPPDATA\Capacinator"            ; Remove cached data

  ; Remove registry keys
  DeleteRegKey HKCU "Software\Capacinator"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Capacinator"

  ; Remove desktop shortcut (if user didn't delete it)
  Delete "$DESKTOP\Capacinator.lnk"

  ; Remove Start Menu folder
  RMDir /r "$SMPROGRAMS\Capacinator"
!macroend

; Custom header for installer UI (optional)
!macro customHeader
  !system "echo Custom installer for Capacinator v1.0"
!macroend
```

**electron-builder Integration** (package.json):
```json
{
  "build": {
    "nsis": {
      "oneClick": false,                          // Allow directory selection
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "include": "build/installer.nsh",           // Custom NSIS script
      "warningsAsErrors": false,                  // Don't fail on NSIS warnings
      "perMachine": false,                        // Per-user installation
      "runAfterFinish": true,                     // Launch app after install
      "deleteAppDataOnUninstall": true            // Clean up user data
    }
  }
}
```

### Best Practices

1. **Test Installer Locally**: Run installer on clean VM before CI/CD deployment
2. **Silent Install Support**: Test `/S` flag for automated deployments
3. **Uninstaller Testing**: Verify all files removed after uninstall (use registry monitor)
4. **License Agreement**: Add `license: "LICENSE.txt"` if needed
5. **Installer Icons**: Use high-quality 256x256 icon for installer UI

---

## 5. CI/CD Integration

### Decision: GitHub Actions with Windows Runner

**Rationale**:
- **Native Windows Environment**: Windows runner supports signtool.exe natively
- **GitHub Integration**: Direct access to GitHub Releases for artifact upload
- **Cost-Effective**: 2000 free minutes/month for private repos, unlimited for public
- **Proven Solution**: Used by thousands of open-source Electron projects

**Alternatives Considered**:
1. **Jenkins (Self-Hosted)**
   - ✅ Full control over build environment
   - ❌ Requires Windows server maintenance
   - ❌ Additional infrastructure cost
   - **Rejected**: GitHub Actions provides sufficient functionality with less overhead

2. **CircleCI / Travis CI**
   - ✅ Mature CI/CD platforms
   - ❌ Limited Windows support (expensive)
   - ❌ Less integrated with GitHub ecosystem
   - **Rejected**: GitHub Actions has better GitHub integration

### Implementation Details

**GitHub Actions Workflow** (`.github/workflows/build-windows.yml`):
```yaml
name: Build Windows Installer

on:
  push:
    tags:
      - 'v*.*.*'  # Trigger on version tags (v1.0.0, v1.1.0-beta.1)
  workflow_dispatch:  # Allow manual trigger

jobs:
  build:
    runs-on: windows-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Decode code signing certificate
        run: |
          echo "${{ secrets.WINDOWS_CERT_BASE64 }}" | base64 -d > cert.pfx
        shell: bash

      - name: Build Windows installer
        env:
          CSC_LINK: ./cert.pfx
          CSC_KEY_PASSWORD: ${{ secrets.WINDOWS_CERT_PASSWORD }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm run dist:win

      - name: Upload artifacts to release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        with:
          files: |
            dist-electron/*.exe
            dist-electron/latest.yml
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Clean up certificate
        if: always()
        run: Remove-Item -Force cert.pfx
```

**Required GitHub Secrets**:
- `WINDOWS_CERT_BASE64`: Base64-encoded PFX certificate
- `WINDOWS_CERT_PASSWORD`: Certificate password
- `GITHUB_TOKEN`: Auto-provided by GitHub Actions (for release upload)

**Artifact Caching**:
```yaml
- name: Cache node_modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

### Release Automation

**Tagging Strategy**:
- **Stable**: `v1.0.0`, `v1.1.0`, `v2.0.0` (triggers build + release)
- **Beta**: `v1.1.0-beta.1`, `v1.1.0-beta.2` (triggers build + pre-release)
- **Alpha**: Manual builds only (no auto-release)

**Semantic Versioning**:
- **MAJOR**: Breaking changes (v1.0.0 → v2.0.0)
- **MINOR**: New features (v1.0.0 → v1.1.0)
- **PATCH**: Bug fixes (v1.0.0 → v1.0.1)

**Release Process**:
1. Update version in `package.json`: `npm version minor` (generates commit + tag)
2. Push tag: `git push origin v1.1.0`
3. GitHub Actions builds installer, uploads to release
4. electron-updater detects new version, notifies users

### Best Practices

1. **Build Validation**: Add step to verify installer size, signature
2. **Notification**: Slack/Discord webhook on build success/failure
3. **Artifact Retention**: Keep installers for 90 days (GitHub default)
4. **Build Logs**: Archive logs for troubleshooting failed builds
5. **Security**: Never log certificate password or sensitive data

---

## Technology Stack Summary

| Component | Technology Choice | Rationale |
|-----------|------------------|-----------|
| Code Signing | OV Certificate (DigiCert/Sectigo) | Cost-effective, CI/CD compatible |
| Auto-Update | electron-updater + GitHub Releases | Zero infrastructure, proven solution |
| Compression | "store" + NSIS | Faster builds, same final size |
| Installer | NSIS with minimal customization | Maintainable, electron-builder integrated |
| CI/CD | GitHub Actions (Windows runner) | Native Windows, GitHub integrated |
| Artifact Storage | GitHub Releases | Free, reliable, integrated |
| Update Channels | Stable + Beta | Standard versioning strategy |

---

## Next Steps

1. Procure code signing certificate (1-2 weeks lead time)
2. Implement auto-updater module (`src/electron/auto-updater.ts`)
3. Create custom NSIS script (`build/installer.nsh`)
4. Update electron-builder configuration (`package.json`)
5. Create GitHub Actions workflow (`.github/workflows/build-windows.yml`)
6. Test installer on clean Windows 10/11 VMs
7. Document build process in `docs/BUILD_WINDOWS.md`

---

**Research Status**: ✅ Complete
**Next Phase**: Design & Contracts (Phase 1)
