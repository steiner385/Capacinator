# Implementation Plan: Windows Build Process Refinement

**Branch**: `002-windows-build-refinement` | **Date**: 2026-01-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-windows-build-refinement/spec.md`

## Summary

Refine the Windows executable/installer/build process for Capacinator to create production-ready installers with proper code signing, optimized packaging, and auto-update capability. The implementation will enhance the existing electron-builder configuration, add code signing support, implement auto-update infrastructure using electron-updater, optimize build performance, and create proper NSIS installer customization scripts.

**Primary Requirement**: Generate reliable, signed Windows installers that install correctly, launch successfully, and support auto-updates.

**Technical Approach**: Enhance existing electron-builder configuration in package.json, implement code signing workflow with certificates, add electron-updater for auto-updates, optimize file inclusion/exclusion patterns, create custom NSIS scripts for installer behavior, and document build pipeline for CI/CD integration.

## Technical Context

**Language/Version**: TypeScript 5.8 (ES2022 target), Node.js 20+
**Primary Dependencies**: electron-builder 26.0.12, electron (current version), electron-updater (to be added)
**Storage**: File system (installer artifacts in dist-electron/), code signing certificates (file-based or Azure Key Vault)
**Testing**: Manual testing on clean Windows machines, automated build validation in CI/CD
**Target Platform**: Windows 10/11 (x64), NSIS installer format
**Project Type**: Desktop application (Electron)
**Performance Goals**: Build time < 10 minutes, installer size < 200MB, installation time < 3 minutes
**Constraints**: Per-user installation (no admin required), code signing required for SmartScreen bypass
**Scale/Scope**: Single desktop application, multiple release channels (stable/beta)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Alignment with Core Principles

**I. Type Safety (NON-NEGOTIABLE)**: ✅ PASS
- Build configuration in package.json is JSON (not typed)
- Electron main process files use TypeScript (.ts) and JavaScript (.cjs) appropriately
- No new runtime type validation needed (build-time tooling)

**II. Scenario Isolation & Audit Transparency (NON-NEGOTIABLE)**: ✅ PASS
- Build process does not affect scenario data
- Installer bundles application code, not user data
- N/A for this feature (infrastructure only)

**III. Test-Driven Discipline**: ⚠️ PARTIAL
- Build process testing is primarily manual (install on clean machine)
- Should add automated build validation (artifact existence, file sizes, signature verification)
- Integration tests for auto-update mechanism recommended

**IV. Validated Inputs & Semantic Errors**: ✅ PASS
- electron-builder validates configuration schema
- No API endpoints involved in this feature

**V. Controller-Service Separation**: ✅ PASS
- N/A for build tooling (no business logic)

**VI. API Design Consistency**: ✅ PASS
- N/A for build process (no API changes)

**VII. Security by Default**: ✅ PASS
- Code signing enhances security (prevents tampering)
- Auto-update should use HTTPS for update manifest
- Installer should verify digital signatures before applying updates

**VIII. Simplicity & Minimal Abstraction**: ✅ PASS
- Use existing electron-builder tooling (no custom build scripts)
- Leverage NSIS for installer customization (standard approach)
- Avoid over-engineering build pipeline

**IX. Git-First Collaboration (NON-NEGOTIABLE)**: ✅ PASS
- Build artifacts (dist-electron/) are gitignored
- Build configuration (package.json) is version controlled
- No impact on Git-based data storage

### Violations

No constitution violations. This is infrastructure work that enhances distribution without affecting core application architecture.

## Project Structure

### Documentation (this feature)

```text
specs/002-windows-build-refinement/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
build/                          # Build resources (NEW)
├── installer.nsh               # Custom NSIS installer script
├── icon.ico                    # Windows application icon (moved from assets/)
└── background.bmp              # Installer background image (OPTIONAL)

src/electron/                   # Electron main process
├── main-with-setup.cjs         # Main entry point (existing)
├── main-production.cjs         # Production mode (existing)
├── auto-updater.ts             # Auto-update logic (NEW)
└── ...                         # Other Electron files (existing)

package.json                    # electron-builder configuration (MODIFY)
.github/workflows/              # CI/CD workflows (MODIFY or NEW)
└── build-windows.yml           # Windows build workflow

dist-electron/                  # Build output (gitignored)
├── Capacinator Setup 1.0.0.exe # Installer
├── latest.yml                  # Update manifest
└── ...                         # Other build artifacts

docs/                           # Documentation (NEW or UPDATE)
└── BUILD_WINDOWS.md            # Windows build guide
```

**Structure Decision**: This feature adds build tooling and configuration files to the existing Electron desktop application structure. The primary changes are in `package.json` (electron-builder config), `build/` directory (NSIS customization), and `src/electron/` (auto-updater integration). Build artifacts are generated in `dist-electron/` but are not committed to the repository.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - No constitution violations identified.

## Phase 0: Research & Technology Decisions

**Objective**: Research best practices for Electron packaging, code signing, auto-updates, and build optimization. Resolve any unknowns in the technical approach.

### Research Tasks

1. **Code Signing for Windows**
   - Research code signing certificate requirements (EV vs OV certificates)
   - Investigate certificate storage options (file-based PFX vs Azure Key Vault)
   - Determine electron-builder code signing configuration (signtool.exe integration)
   - Research Windows SmartScreen reputation building timeline

2. **Auto-Update Implementation**
   - Research electron-updater library integration with electron-builder
   - Investigate update manifest hosting (GitHub Releases vs S3 vs custom server)
   - Determine update channel strategy (stable vs beta)
   - Research update installation flow (quit-and-install vs background download)

3. **Build Optimization**
   - Research electron-builder compression options (store vs maximum)
   - Investigate asar archive optimization (unpacked files for native modules)
   - Determine optimal file inclusion/exclusion patterns
   - Research multi-platform build strategies (Windows-only vs cross-platform CI)

4. **NSIS Customization**
   - Research NSIS script syntax and electron-builder integration
   - Investigate installer customization options (license agreement, custom install pages)
   - Determine uninstaller cleanup requirements (registry, AppData, shortcuts)

5. **CI/CD Integration**
   - Research GitHub Actions Windows runners (build environment setup)
   - Investigate artifact caching strategies for faster builds
   - Determine release automation workflow (tag-based releases)

**Output**: `research.md` with consolidated findings, technology choices, and implementation recommendations.

## Phase 1: Design & Contracts

**Prerequisites:** `research.md` complete

### Design Artifacts

1. **electron-builder Configuration Design**
   - Enhanced `package.json` "build" section with optimized settings
   - Code signing configuration (certificate paths, signing parameters)
   - NSIS installer configuration (installer behavior, shortcuts, registry keys)
   - Auto-update configuration (update channels, manifest URLs)

2. **Auto-Updater Service Design**
   - TypeScript module in `src/electron/auto-updater.ts`
   - Integration with Electron main process
   - Update check logic (on startup, periodic checks)
   - Download progress UI (notification or dialog)
   - Error handling for update failures

3. **NSIS Installer Script Design**
   - Custom installer script in `build/installer.nsh`
   - Installation steps (file copy, shortcut creation, registry entries)
   - Uninstallation cleanup (remove all files, shortcuts, registry)
   - Custom install pages (if needed: license agreement, options)

4. **CI/CD Pipeline Design**
   - GitHub Actions workflow for Windows builds
   - Build environment setup (Node.js, dependencies, code signing certificate)
   - Artifact upload to GitHub Releases
   - Update manifest generation (latest.yml)

**Output**:
- `quickstart.md` - Developer guide for building Windows installer locally
- No API contracts needed (build tooling only)
- No data model needed (no database changes)

## Phase 2: Task Generation

**Note**: Task generation is handled by `/speckit.tasks` command, NOT by `/speckit.plan`.

This phase involves breaking down the implementation into actionable tasks with dependencies and priorities. See `/speckit.tasks` for task creation workflow.

## Implementation Notes

### Code Signing Considerations

**Certificate Type**: Extended Validation (EV) certificates provide instant SmartScreen reputation but require hardware token. Organization Validation (OV) certificates are cheaper but require reputation building (downloads + time).

**Certificate Storage**:
- **Development**: File-based PFX with password in environment variable
- **CI/CD**: Azure Key Vault or encrypted secrets in GitHub Actions

**Signing Tool**: electron-builder uses `signtool.exe` (Windows SDK) automatically when certificate is configured.

### Auto-Update Strategy

**Update Manifest**: electron-updater uses `latest.yml` file hosted alongside installer. GitHub Releases can host this automatically.

**Update Flow**:
1. App checks for updates on startup (background)
2. If update available, show notification
3. User clicks "Download and Install"
4. Update downloads in background, shows progress
5. On completion, app quits and relaunches with new version

**Rollback**: Not supported by electron-updater. Manual rollback requires uninstalling and reinstalling previous version.

### Build Performance Optimization

**Compression**: Use `compression: "store"` (no compression) for faster builds. NSIS installer compresses the files during installer creation.

**Caching**: Cache `node_modules` in CI/CD to avoid re-downloading dependencies.

**Incremental Builds**: electron-builder supports incremental builds for development iterations.

### Testing Strategy

**Manual Testing** (required):
1. Build installer on dev machine: `npm run dist:win`
2. Test installation on clean Windows 10 VM
3. Verify application launches and core features work
4. Test uninstallation (no leftover files/registry)
5. Test auto-update flow (requires hosting update manifest)

**Automated Testing** (recommended):
1. CI/CD build validation (artifact exists, correct size, signed)
2. Automated installer testing (silent install/uninstall in CI)
3. Auto-update integration tests (mock update server)

## Dependencies & Prerequisites

**Required Tools**:
- Node.js 20+ (existing)
- npm (existing)
- electron-builder 26.0.12 (existing)
- Windows SDK (for signtool.exe) - install on build machine
- Code signing certificate (PFX file or Azure Key Vault access)

**Environment Variables** (for code signing):
- `CSC_LINK`: Path to PFX certificate file or Azure Key Vault URL
- `CSC_KEY_PASSWORD`: Certificate password
- `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD`: Windows-specific overrides

**CI/CD Prerequisites**:
- GitHub Actions runner with Windows OS
- Code signing certificate stored in GitHub Secrets
- GitHub Releases enabled for artifact hosting

## Success Criteria Validation

Reference to spec.md success criteria:

- **SC-001**: Windows installer builds successfully on CI/CD pipeline with zero errors → Validated by CI/CD workflow green checkmark
- **SC-002**: Generated installer completes installation in < 3 minutes → Manual testing on clean Windows machine
- **SC-003**: Installed application launches within 10 seconds → Manual testing + performance monitoring
- **SC-004**: Installer size < 250MB → Automated check in CI/CD (file size validation)
- **SC-005**: Build process completes in < 10 minutes → CI/CD workflow duration monitoring
- **SC-006**: 100% of core features work after installation → Manual smoke testing + existing E2E tests
- **SC-007**: Uninstaller removes all files and registry entries → Manual testing + registry inspection
- **SC-008**: Signed installer eliminates SmartScreen warnings → Manual testing on Windows 10/11 with fresh install

## Risk Assessment

**High Risk**:
- Code signing certificate cost and procurement (EV cert requires legal validation)
- SmartScreen reputation building (can take weeks/months for OV certificates)
- Auto-update testing complexity (requires hosting update manifest)

**Medium Risk**:
- Build time optimization (may require iterative tuning)
- NSIS script syntax errors (complex installer logic)
- CI/CD Windows runner availability and cost

**Low Risk**:
- electron-builder configuration (well-documented, stable API)
- File inclusion/exclusion patterns (straightforward to test)
- Installer size optimization (compression settings)

**Mitigation Strategies**:
- Start code signing certificate procurement early (parallel to development)
- Use GitHub Releases for update manifest hosting (free, reliable)
- Test NSIS scripts locally before CI/CD integration
- Monitor CI/CD build times and iterate on optimization

## Next Steps

1. Run `/speckit.plan` to generate `research.md` (this command will handle Phase 0 research)
2. Review research findings and confirm technology choices
3. Run `/speckit.tasks` to generate actionable task list
4. Begin implementation with high-priority tasks (P1: Reliable Installer Generation)

---

**Plan Status**: ✅ Complete - Ready for research phase
**Next Command**: Research phase handled automatically by `/speckit.plan` workflow
