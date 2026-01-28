# Build Process Baseline

**Date**: 2026-01-24
**Feature**: Windows Build Process Refinement
**Purpose**: Document current build configuration before enhancements

## Current electron-builder Configuration

### Application Metadata
- **App ID**: com.capacinator.app
- **Product Name**: Capacinator
- **Copyright**: Copyright © 2024 Capacinator
- **Main Entry Point**: src/electron/main-with-setup.cjs

### Build Directories
- **Output**: dist-electron/
- **Build Resources**: build/

### File Inclusion/Exclusion
**Included**:
- dist/**/* (compiled server + client)
- src/electron/*.cjs (Electron main process)
- src/electron/*.html (Electron windows)
- src/electron/*.js (Electron scripts)
- package.json
- node_modules/**/* (all dependencies)

**Excluded**:
- **/*.ts (TypeScript source files)
- **/tsconfig.json (TypeScript config)
- **/*.map (source maps)
- **/*.spec.js (test files)
- **/*.test.js (test files)
- node_modules/**/test/** (test directories in dependencies)
- node_modules/**/*.md (documentation in dependencies)

### Compression & Packaging
- **ASAR**: true (bundle app files into archive)
- **Compression**: "store" (no compression during packaging, NSIS compresses at install time)

### Windows Configuration
- **Target**: NSIS installer
- **Icon**: assets/icon.ico
- **Install Mode**: Per-user (perMachine: false)

### NSIS Installer Settings
- **One-Click Install**: false (allows directory selection)
- **Allow Directory Change**: true
- **Create Desktop Shortcut**: true
- **Create Start Menu Shortcut**: true
- **Custom Script**: build/installer.nsh (referenced but file does not exist yet)
- **Warnings As Errors**: false
- **Per-Machine Install**: false (per-user installation)

## Current Build Process

### Build Commands
- `npm run build` - Builds server + client + electron
- `npm run build:server` - Compiles TypeScript server code
- `npm run build:client` - Builds Vite client bundle
- `npm run build:electron` - Runs electron-builder
- `npm run dist:win` - Full build + Windows installer generation

### Build Outputs (Expected)
- `dist/` - Compiled server and client code
- `dist-electron/` - Electron installer and artifacts
  - `Capacinator Setup 1.0.0.exe` (installer)
  - `win-unpacked/` (unpacked application files)
  - `builder-effective-config.yaml` (electron-builder config dump)

## Baseline Metrics (To Be Measured)

**Build Performance** (run `npm run dist:win` on clean build):
- Total build time: TBD (target: < 10 minutes)
- TypeScript compilation: TBD
- Client build (Vite): TBD
- Server build (tsc): TBD
- electron-builder packaging: TBD
- NSIS installer creation: TBD

**Installer Characteristics**:
- Installer file size: TBD (target: < 200MB)
- Number of files bundled: TBD
- Installation time on clean Windows VM: TBD (target: < 3 minutes)
- Application launch time: TBD (target: < 10 seconds)

## Known Issues & Observations

1. **Missing NSIS Script**: `build/installer.nsh` is referenced in config but does not exist
   - This will cause a warning during build (warningsAsErrors: false)
   - Need to create this file for custom installer behavior

2. **Icon Path**: Currently points to `assets/icon.ico`
   - Should be updated to `build/icon.ico` for consistency

3. **No Code Signing**: No code signing configuration present
   - Installers will show "Unknown Publisher" warning on Windows

4. **No Auto-Update**: No electron-updater dependency or configuration
   - Users must manually download and install updates

5. **File Patterns**: Could be optimized further
   - Missing exclusions for .d.ts files, LICENSE files
   - No asarUnpack configuration for native modules (better-sqlite3)

## Next Steps

1. Create `build/installer.nsh` with custom install/uninstall logic
2. Update icon path to `build/icon.ico`
3. Add additional file exclusion patterns for optimization
4. Configure asarUnpack for better-sqlite3 native module
5. Measure baseline performance metrics
6. Test current build process to establish baseline

---

**Baseline Status**: ✅ Documented
**Next Phase**: User Story 1 Implementation (US1)
