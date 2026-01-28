# Feature Specification: Windows Build Process Refinement

**Feature Branch**: `002-windows-build-refinement`
**Created**: 2026-01-24
**Status**: Draft
**Input**: User description: "i'd like to begin refining our windows executable / installer / setup / build process"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reliable Windows Installer Generation (Priority: P1)

As a developer or release manager, I need to generate a Windows installer that correctly bundles all application components, installs dependencies, and creates proper shortcuts, so that end users can install Capacinator without technical issues.

**Why this priority**: This is the foundation of distributing the application to Windows users. Without a reliable installer, the application cannot reach its intended audience.

**Independent Test**: Can be fully tested by running `npm run dist:win`, installing the generated .exe on a clean Windows machine, and verifying that the application launches and functions correctly.

**Acceptance Scenarios**:

1. **Given** the codebase is built successfully, **When** I run `npm run dist:win`, **Then** an installer executable is generated in `dist-electron/` directory
2. **Given** a generated installer, **When** a user runs the installer on Windows, **Then** the application installs to the selected directory with all required files
3. **Given** the application is installed, **When** the user clicks the desktop or start menu shortcut, **Then** the application launches and displays the setup wizard or main interface
4. **Given** the application is running, **When** the user performs basic operations (create project, assign resources), **Then** all core functionality works without errors

---

### User Story 2 - Code Signing and Security (Priority: P2)

As a release manager, I need the Windows installer and executable to be properly signed with a code signing certificate, so that users don't receive Windows SmartScreen warnings and trust that the application is authentic.

**Why this priority**: Improves user trust and reduces friction during installation, but the application can function without it (users just need to accept security warnings).

**Independent Test**: Can be tested by configuring code signing certificates, building the installer, and verifying the digital signature in Windows file properties.

**Acceptance Scenarios**:

1. **Given** code signing credentials are configured, **When** the installer is built, **Then** the executable and installer are digitally signed
2. **Given** a signed installer, **When** a user runs it on Windows, **Then** Windows SmartScreen does not show a warning about an unknown publisher
3. **Given** a signed executable, **When** viewed in Windows file properties, **Then** the Digital Signatures tab shows a valid certificate

---

### User Story 3 - Auto-Update Capability (Priority: P3)

As an end user, I want the application to automatically check for and install updates, so that I always have the latest features and security patches without manual intervention.

**Why this priority**: Enhances user experience and ensures users stay current, but is not critical for initial release as updates can be distributed manually.

**Independent Test**: Can be tested by publishing a new version, launching an older version of the app, and verifying that it detects and offers to install the update.

**Acceptance Scenarios**:

1. **Given** a new version is published, **When** an older version of the app starts, **Then** it checks for updates and notifies the user
2. **Given** an update is available, **When** the user accepts the update, **Then** the application downloads and installs the new version
3. **Given** the update is installed, **When** the application restarts, **Then** it launches with the new version number

---

### User Story 4 - Build Optimization and Performance (Priority: P4)

As a developer, I want the build process to be optimized for faster build times and smaller installer size, so that CI/CD pipelines complete quickly and users download smaller files.

**Why this priority**: Nice to have but not critical for functionality - improves developer and user experience but doesn't block releases.

**Independent Test**: Can be tested by measuring build time before and after optimizations, and comparing installer file sizes.

**Acceptance Scenarios**:

1. **Given** the build configuration is optimized, **When** running `npm run dist:win`, **Then** the build completes in under 10 minutes
2. **Given** the installer is built with compression, **When** measuring file size, **Then** the installer is under 200MB
3. **Given** optimized packaging, **When** installing the application, **Then** installation completes in under 2 minutes

---

### Edge Cases

- What happens when the build process fails mid-way through electron-builder?
- How does the system handle missing or expired code signing certificates?
- What happens if the installer is run without administrator privileges?
- How does the application behave when installed in a non-standard directory (e.g., external drive)?
- What happens when multiple versions are installed on the same system?
- How does the auto-updater handle network failures or interrupted downloads?
- What happens if required Windows components (e.g., .NET runtime) are missing?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Build system MUST generate a Windows NSIS installer executable (.exe) from the Electron application
- **FR-002**: Installer MUST bundle all required Node.js dependencies, compiled server code, client assets, and Electron runtime
- **FR-003**: Installer MUST allow users to choose installation directory during setup
- **FR-004**: Installer MUST create desktop shortcut and Start Menu entry by default (with option to disable)
- **FR-005**: Application MUST launch the embedded Express server on startup and connect the Electron window to it
- **FR-006**: Build process MUST exclude development dependencies, source TypeScript files, test files, and unnecessary node_modules from the package
- **FR-007**: Installer MUST support per-user installation (installing to user profile without requiring administrator privileges)
- **FR-008**: Build system MUST support code signing with authenticode certificates for both the executable and installer
- **FR-009**: Application MUST include an uninstaller that removes all installed files, shortcuts, and registry entries
- **FR-010**: Build configuration MUST specify application metadata (name, version, publisher, icon)

### Key Entities *(include if feature involves data)*

- **Installer Package**: The distributable .exe file containing the application, installer logic, and all dependencies
- **Build Configuration**: Settings in package.json defining electron-builder behavior, file inclusion/exclusion, compression, and platform-specific options
- **Code Signing Certificate**: Digital certificate used to sign the executable and installer for Windows trust verification
- **Application Bundle**: The packaged application including Electron runtime, Node.js server, compiled client assets, and SQLite database
- **NSIS Script**: Custom installer logic for Windows-specific installation behaviors (located at build/installer.nsh, currently missing)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Windows installer builds successfully on CI/CD pipeline with zero errors
- **SC-002**: Generated installer completes installation on a clean Windows 10/11 machine in under 3 minutes
- **SC-003**: Installed application launches successfully within 10 seconds of clicking the shortcut
- **SC-004**: Installer size is optimized to be under 250MB (including all dependencies)
- **SC-005**: Build process completes in under 10 minutes on standard CI/CD hardware
- **SC-006**: 100% of core application features work correctly after installation (projects, people, assignments, scenarios)
- **SC-007**: Uninstaller removes all application files and leaves no registry orphans
- **SC-008**: Signed installer eliminates Windows SmartScreen warnings on Windows 10/11
