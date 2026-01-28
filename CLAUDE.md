# Capacinator

A web-based project capacity planning system replacing Excel-based planning. Standalone desktop application using Electron with embedded SQLite database.

**Primary Purpose**: Resource allocation, capacity planning, conflict detection, and project management with fiscal week support.

## Tech Stack

**Frontend**: React 19 + Vite + TypeScript + Tailwind CSS + Radix UI (shadcn/ui)
**Backend**: Node.js + Express + TypeScript
**Database**: SQLite (better-sqlite3) with Knex.js
**Desktop**: Electron
**Testing**: Jest (unit) + Playwright (e2e)
**State Management**: React Query (TanStack Query v5) + Context API

## Common Commands

**Development is fully cross-platform** - all commands work identically on Windows, macOS, and Linux.

```bash
npm run dev              # Start all dev servers (server + client)
npm run dev:stop         # Stop dev servers
npm run dev:logs         # View live logs
npm run dev:cleanup      # Clean up orphaned processes
npm run dev:server       # Backend only (port 3110)
npm run dev:client       # Frontend only (port 3120)
npm run build            # Build all
npm run test             # All Jest tests
npm run test:client      # Client unit tests only
npm run test:server      # Server unit tests only
npm run test:e2e         # Playwright E2E tests
npm run lint             # ESLint check
npm run typecheck        # TypeScript validation
npm run db:migrate       # Run database migrations
npm run commands         # List all available commands
```

See [docs/PLATFORM_AGNOSTIC_SETUP.md](docs/PLATFORM_AGNOSTIC_SETUP.md) for details on the cross-platform architecture.
See [docs/BUILD_AND_TEST_SETUP.md](docs/BUILD_AND_TEST_SETUP.md) for build system and test configuration.

## Project Structure

```
client/src/              # React frontend
  components/            # Reusable components (modals/, ui/)
  pages/                 # Page components (Dashboard, Projects, People, Assignments, etc.)
  contexts/              # React contexts (User, Scenario, Theme)
  hooks/                 # Custom React hooks
  services/              # API client
  types/                 # TypeScript types

src/server/              # Express backend
  api/controllers/       # Route handlers (extend BaseController)
  api/routes/            # Endpoint definitions
  services/              # Business logic services
  middleware/            # Express middleware
  database/              # Knex migrations and initialization

tests/
  e2e/                   # Playwright E2E tests
  unit/                  # Jest unit tests (client/ and server/)
  integration/           # Integration tests
```

## Code Conventions

### React Components
- Functional components with hooks only
- Use React Query for all server state
- Use Context API for global state (UserContext, ScenarioContext)
- Modals use Radix UI Dialog primitives with isOpen/onClose pattern

### API Client
- All API calls go through `client/src/lib/api-client.ts`
- Namespaced: `api.projects.list()`, `api.people.create()`, etc.
- Scenario context automatically added via interceptor

### Controllers
- Extend BaseController for common functionality
- Use `handleError()`, `handleNotFound()`, `handleValidationError()` methods
- Services contain business logic, controllers handle HTTP concerns

### State Management
- React Query for server state (queries/mutations)
- Context + useState for UI state
- Query keys: `['projects']`, `['people']`, `['roles']`, etc.
- Always invalidate queries after mutations

### Styling
- Tailwind CSS with CSS variables for theming
- Dark mode supported (class-based toggle)
- Use shadcn/ui components from `client/src/components/ui/`

## Testing

### Unit Tests (Jest)
- Tests colocated in `__tests__/` directories
- Mock api-client and contexts
- Client tests use jsdom environment
- Server tests use Node environment

### E2E Tests (Playwright)
- Organized in tests/e2e/suites/ by feature
- Use TestDataGenerator for dynamic test data
- Each test should isolate its own data context
- Global setup initializes E2E database

### Running Specific Tests
```bash
npm test -- --testPathPattern="AssignmentModal"     # Jest pattern
npx playwright test tests/e2e/suites/crud/          # Playwright folder
```

## Important Patterns

### Fiscal Weeks
- System uses fiscal week format: "24FW36-25FW11" (year + FW + week number)
- Fiscal year starts in September
- All date ranges should support fiscal week display

### Scenarios
- All data operations are scenario-aware
- Scenario context passed via API interceptor
- "Working scenario" vs "committed scenario" distinction

### Audit Logging
- All changes logged to audit_logs table
- Middleware automatically captures user context
- Never bypass audit logging in production

### Cascading Updates
- Phase changes cascade to assignments
- Use ProjectPhaseCascadeService for phase modifications
- Assignment recalculation handled by AssignmentRecalculationService

## Database

- SQLite with Knex.js query builder
- 46+ migrations in src/server/database/migrations/
- Never modify migrations that are committed
- Create new migrations for schema changes: `npm run db:migrate:make <name>`

Key Tables: projects, people, roles, assignments, project_phases, availability_overrides, scenarios, audit_logs, notifications

## Debugging

- Server logs: Check terminal running dev:server
- Client logs: Browser DevTools console
- Database: SQLite file at ./capacinator.db (dev) or in userData (production)
- API requests: Check Network tab, all go through /api/
- React Query: Use React Query DevTools in browser

## Environment Variables

Copy `.env.example` to `.env.local` for local development overrides.

### Required
| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment (development/production/test) | development |
| PORT | Server port | 3110 |
| VITE_PORT | Client dev server port | 3120 |
| JWT_SECRET | JWT signing secret (CHANGE IN PRODUCTION) | dev-jwt-secret |
| DB_FILENAME | SQLite database file | capacinator-dev.db |

### Optional
| Variable | Description | Default |
|----------|-------------|---------|
| LOG_LEVEL | Logging level (error/warn/info/http/debug) | info |
| AUDIT_ENABLED | Enable audit logging | true |
| DB_BACKUP_ENABLED | Enable automatic backups | true |
| DB_BACKUP_INTERVAL | Backup frequency | daily |
| MAX_FILE_SIZE | Max upload size (bytes) | 52428800 (50MB) |

### Environment Files
- `.env.development` - Local development (committed, safe defaults)
- `.env.production` - Production settings
- `.env.test` - Jest test settings
- `.env.e2e` - Playwright E2E test settings
- `.env.local` - Local overrides (not committed)

## PR & Commit Conventions

### Commit Messages
Use conventional commits format:
- `feat: add new feature` - New functionality
- `fix: resolve bug` - Bug fixes
- `refactor: restructure code` - Code changes that don't add features or fix bugs
- `test: add/update tests` - Test additions or modifications
- `docs: update documentation` - Documentation changes
- `chore: maintenance tasks` - Build process, dependencies, etc.

### Branch Naming
- `feature/short-description` - New features
- `fix/issue-description` - Bug fixes
- `refactor/what-changing` - Code restructuring
- `test/what-testing` - Test additions

### Pull Requests
- Keep PRs focused on a single concern
- Include description of changes and testing done
- Ensure all tests pass before requesting review
- Update relevant documentation if behavior changes

## Building & Deployment

### Development
```bash
npm run dev              # Start all servers (recommended)
npm run dev:server       # Backend only (port 3110)
npm run dev:client       # Frontend only (port 3120)
```

### Production Build
```bash
npm run build            # Build server + client + electron
npm run dist             # Build + package Electron app
```

### Platform-Specific Builds
```bash
npm run dist:win         # Windows installer (.exe)
npm run dist:mac         # macOS app (.dmg)
npm run dist:linux       # Linux package (.AppImage)
```

### Build Output
- `dist/` - Compiled server and client
- `dist-electron/` - Packaged Electron applications

### Electron Configuration
- Main process: `src/electron/main-with-setup.cjs`
- Build config: `package.json` "build" section
- Icons: `assets/icon.ico` (Windows), `assets/icon.icns` (macOS)
- Installer customization: `build/installer.nsh`

## Common Pitfalls

- Don't forget to invalidate React Query cache after mutations
- Scenario context must be set before API calls work correctly
- E2E tests require the E2E database to be initialized
- Modal state should reset when closed (useEffect on isOpen)
- Always handle loading and error states in components

## Active Technologies
- TypeScript 5.8 (ES2022 target), Node.js 20+ (001-git-sync-integration)

## Recent Changes
- 001-git-sync-integration: Added TypeScript 5.8 (ES2022 target), Node.js 20+
