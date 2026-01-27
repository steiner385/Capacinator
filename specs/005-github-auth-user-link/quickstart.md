# Quick Start: GitHub Authentication Development

**Feature**: 005-github-auth-user-link
**Purpose**: Get developers up and running with GitHub authentication feature development

## Prerequisites

- Node.js 20+
- Capacinator development environment set up (see main README.md)
- GitHub account for testing
- GitHub OAuth App registered (see Setup section)

## Setup

### 1. Register GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in details:
   - **Application name**: Capacinator Development
   - **Homepage URL**: `http://localhost:3120`
   - **Authorization callback URL**: `http://localhost:3000/oauth/callback`
4. Click "Register application"
5. Note your **Client ID** and generate a **Client Secret**

### 2. Environment Variables

Create or update `.env.local`:

```bash
# GitHub OAuth App (from step 1)
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
GITHUB_CALLBACK_URL=http://localhost:3000/oauth/callback

# Token Encryption
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
ENCRYPTION_KEY=your_base64_key_here

# Optional: GitHub Enterprise
# GITHUB_ENTERPRISE_URL=https://github.mycompany.com/api/v3
```

### 3. Install Dependencies

```bash
npm install simple-oauth2 @octokit/rest @octokit/plugin-retry @octokit/plugin-throttling
```

### 4. Run Database Migrations

```bash
npm run db:migrate
```

This will create the new tables:
- `github_connections`
- `github_account_associations`
- Add `github_username` and `github_user_id` columns to `people` table

### 5. Start Development Servers

```bash
npm run dev
```

This starts:
- Backend server on `http://localhost:3110`
- Frontend dev server on `http://localhost:3120`

## Testing OAuth Flow

### Manual Testing

1. **Log in to Capacinator** at `http://localhost:3120`

2. **Navigate to Profile**: Click your user avatar → Profile

3. **Connect GitHub Account**:
   - Click "Connect GitHub Account" button
   - System browser opens to GitHub OAuth consent screen
   - Click "Authorize" on GitHub
   - You're redirected back to Capacinator
   - GitHub connection appears in profile

4. **Verify Connection**:
   - Check that GitHub username appears
   - Status shows "active"
   - Default checkbox appears

5. **Test PAT Connection**:
   - Generate a PAT at https://github.com/settings/tokens
   - Required scopes: `read:user`, `user:email`, `repo`
   - Click "Add Personal Access Token"
   - Paste PAT and click "Connect"
   - Verify token is validated and user info appears

### Automated Testing

```bash
# Unit tests
npm run test:unit -- GitHubConnection

# Integration tests
npm run test:integration -- github-connection-service

# E2E tests (requires test GitHub account)
npm run test:e2e -- github-auth
```

## Development Workflow

### Adding a New Endpoint

1. **Define route** in `src/server/api/routes/github-connections.ts`:
   ```typescript
   router.get('/test', controller.testEndpoint);
   ```

2. **Add controller method** in `src/server/api/controllers/GitHubConnectionController.ts`:
   ```typescript
   async testEndpoint(req: Request, res: Response) {
     // Implementation
   }
   ```

3. **Add service logic** in `src/server/services/GitHubConnectionService.ts`:
   ```typescript
   async performAction() {
     // Business logic
   }
   ```

4. **Update OpenAPI contract** in `specs/005-github-auth-user-link/contracts/github-connections.yaml`

5. **Write tests** in `tests/unit/server/services/` and `tests/e2e/suites/github-auth/`

### Testing Token Encryption

```typescript
// tests/unit/server/services/EncryptionService.test.ts
import { EncryptionService } from '@/services/EncryptionService';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    // Use test key
    process.env.ENCRYPTION_KEY = Buffer.from('test-key-32-bytes-long-exactly!').toString('base64');
    service = new EncryptionService();
  });

  it('should encrypt and decrypt token', () => {
    const plaintext = 'ghp_test_token_1234567890';
    const encrypted = service.encrypt(plaintext);

    expect(encrypted).toMatch(/^encrypted:/);
    expect(service.decrypt(encrypted)).toBe(plaintext);
  });
});
```

### Debugging OAuth Flow

1. **Enable debug logging** in `.env.local`:
   ```bash
   LOG_LEVEL=debug
   ```

2. **Check OAuth state**:
   ```typescript
   // In GitHubOAuthService
   console.log('OAuth state:', state);
   console.log('OAuth states cache:', this.oauthStates);
   ```

3. **Verify GitHub API calls**:
   ```typescript
   // In GitHubConnectionService
   console.log('GitHub API response:', response.data);
   ```

4. **Test callback locally**:
   ```bash
   curl "http://localhost:3000/oauth/callback?code=test_code&state=test_state"
   ```

## Common Issues

### Issue: "GitHub account already connected"

**Problem**: Trying to connect a GitHub account already linked to another user.

**Solution**: Disconnect the account from the other user first, or use a different GitHub account.

### Issue: "Missing required scopes"

**Problem**: PAT doesn't have sufficient permissions.

**Solution**: Regenerate PAT with scopes: `read:user`, `user:email`, `repo`

### Issue: "OAuth callback not working"

**Problem**: Localhost server not starting or wrong port.

**Solution**:
- Check that port 3000 is not already in use
- Verify `GITHUB_CALLBACK_URL` matches OAuth App settings
- Check browser console for CORS errors

### Issue: "Encryption key invalid"

**Problem**: `ENCRYPTION_KEY` env variable missing or malformed.

**Solution**: Generate a valid key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Useful Commands

```bash
# Run specific test file
npm test -- GitHubConnectionService.test.ts

# Watch mode for tests
npm test -- --watch GitHubConnection

# Check database schema
sqlite3 capacinator-dev.db ".schema github_connections"

# View GitHub connections in DB
sqlite3 capacinator-dev.db "SELECT * FROM github_connections"

# Clear all connections (dev only)
sqlite3 capacinator-dev.db "DELETE FROM github_connections"

# Check migration status
npm run db:migrate:status
```

## API Testing with curl

### Get connections
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3110/api/github-connections
```

### Add PAT connection
```bash
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token":"ghp_your_token_here"}' \
  http://localhost:3110/api/github-connections/pat
```

### Delete connection
```bash
curl -X DELETE \
  -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3110/api/github-connections/1
```

## Code Style Guidelines

Follow existing Capacinator conventions:

- **Controllers**: Extend `BaseController`, use `handleError()`, `handleNotFound()`
- **Services**: Inject via `ServiceContainer`, return typed results
- **Types**: Define in `shared/types/github.ts`
- **Tests**: Use descriptive test names, `describe` blocks for grouping
- **Commits**: Use conventional commits (`feat:`, `fix:`, `test:`)

## Next Steps

1. **Implement OAuth flow** (Priority: P1)
2. **Add PAT support** (Priority: P2)
3. **Build association logic** (Priority: P2)
4. **Create admin UI** for manual associations (Priority: P3)
5. **Add commit attribution** display (Priority: P2)

See [tasks.md](./tasks.md) for detailed task breakdown (run `/speckit.tasks` to generate).

## Resources

- **GitHub OAuth Docs**: https://docs.github.com/en/apps/oauth-apps
- **GitHub API Docs**: https://docs.github.com/en/rest
- **@octokit/rest**: https://octokit.github.io/rest.js/
- **simple-oauth2**: https://www.npmjs.com/package/simple-oauth2
- **Capacinator Constitution**: `/.specify/memory/constitution.md`
- **Feature Spec**: `./spec.md`
- **Implementation Plan**: `./plan.md`
