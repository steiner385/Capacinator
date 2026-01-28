# Research: GitHub Authentication and User Association

**Feature**: 005-github-auth-user-link
**Date**: 2026-01-27
**Purpose**: Resolve technical unknowns for implementing OAuth 2.0, PAT authentication, and token encryption

## Research Questions

1. OAuth 2.0 Implementation for Desktop Apps
2. Token Encryption Strategy
3. GitHub API Integration Best Practices
4. Email-Based Association Logic

---

## 1. OAuth 2.0 Implementation for Desktop Apps

### Decision: Localhost Callback Server + simple-oauth2 Library

**Rationale**:
- **Localhost Server Pattern**: Electron apps can temporarily spin up HTTP server on `http://localhost:PORT/callback` for OAuth redirects
- **Library Choice**: `simple-oauth2` v5+ handles OAuth flow, token refresh, and error handling
- **CSRF Protection**: Generate cryptographically secure state parameter using `crypto.randomBytes(32)`
- **Token Storage**: Store state in memory cache (Map) with 10-minute expiry, cleared after callback

**Alternatives Considered**:
- **Custom Protocol Handler** (`capacinator://oauth/callback`): More complex OS integration, browser security warnings
- **Manual OAuth Implementation**: Reinventing wheel, error-prone (rejected per Constitution Principle VIII - Simplicity)
- **Passport.js**: Overkill for single OAuth provider, adds unnecessary middleware complexity

**Implementation Pattern**:
```typescript
// OAuth flow initiation
const authorizationUri = oauth2Client.authorizeURL({
  redirect_uri: 'http://localhost:3000/oauth/callback',
  scope: 'read:user user:email repo',
  state: cryptoRandomState
});

// Open system browser
shell.openExternal(authorizationUri);

// Temporary callback server
const server = http.createServer(handleCallback);
server.listen(3000);
```

**State Management**:
- Store state + userId in memory Map: `oauthStates.set(state, { userId, expiresAt })`
- Validate state on callback
- Clear state after successful exchange

**References**:
- GitHub OAuth Apps Docs: https://docs.github.com/en/apps/oauth-apps
- simple-oauth2 Library: https://www.npmjs.com/package/simple-oauth2
- Electron Shell API: https://www.electronjs.org/docs/latest/api/shell

---

## 2. Token Encryption Strategy

### Decision: AES-256-GCM with Derived Keys

**Rationale**:
- **Algorithm**: AES-256-GCM provides both encryption and authentication (prevents tampering)
- **Key Derivation**: Use PBKDF2 to derive encryption key from master secret (stored in env variable)
- **Per-Token IV**: Generate unique Initialization Vector per token using `crypto.randomBytes(16)`
- **Storage Format**: `encrypted:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`

**Alternatives Considered**:
- **AES-256-CBC**: No built-in authentication, vulnerable to padding oracle attacks
- **RSA Encryption**: Slower, overkill for symmetric key scenario
- **Database-Level Encryption**: SQLCipher adds complexity, entire database or nothing (rejected for flexibility)

**Implementation Pattern**:
```typescript
class EncryptionService {
  private masterKey: Buffer; // Derived from env.ENCRYPTION_KEY

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');
    return `encrypted:${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  decrypt(ciphertext: string): string {
    const [prefix, ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
    // ... decipher implementation
  }
}
```

**Key Rotation Strategy**:
- Store `encryption_version` column in `github_connections` table
- Support multiple master keys (env: `ENCRYPTION_KEY_V1`, `ENCRYPTION_KEY_V2`)
- Re-encrypt tokens lazily on next use when version changes

**References**:
- Node.js Crypto Docs: https://nodejs.org/api/crypto.html
- OWASP Encryption Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html

---

## 3. GitHub API Integration Best Practices

### Decision: @octokit/rest v20+ with Retry & Throttle Plugins

**Rationale**:
- **Official Library**: @octokit/rest is GitHub's official Node.js SDK
- **Type Safety**: Full TypeScript definitions for all API endpoints
- **Rate Limiting**: Built-in `@octokit/plugin-retry` handles 429 responses automatically
- **GitHub Enterprise**: Supports custom base URLs via `baseUrl` option

**Alternatives Considered**:
- **Direct fetch() Calls**: Manual error handling, no type safety, reinventing wheel
- **axios**: Not GitHub-specific, requires manual retry logic
- **Simple Git** alone: Only handles Git operations, not GitHub API (users, emails, scopes)

**Implementation Pattern**:
```typescript
import { Octokit } from '@octokit/rest';
import { retry } from '@octokit/plugin-retry';
import { throttling } from '@octokit/plugin-throttling';

const MyOctokit = Octokit.plugin(retry, throttling);

const octokit = new MyOctokit({
  auth: userToken,
  baseUrl: githubBaseUrl || 'https://api.github.com',
  throttle: {
    onRateLimit: (retryAfter, options) => {
      logger.warn(`Rate limit hit, retrying after ${retryAfter}s`);
      return true; // Auto-retry
    },
    onSecondaryRateLimit: (retryAfter, options) => {
      logger.warn(`Secondary rate limit, retrying after ${retryAfter}s`);
      return true;
    }
  }
});

// Validate token and get user info
const { data: user } = await octokit.users.getAuthenticated();
```

**Rate Limiting Strategy**:
- **Primary Limit**: 5000 requests/hour for authenticated users
- **Handling**: Plugin auto-retries with exponential backoff
- **UI Feedback**: Show toast message when rate limit approached (>4500 requests)
- **Caching**: Cache user info (username, email) for 1 hour to reduce API calls

**Scope Validation**:
```typescript
// Check token has required scopes
const response = await octokit.request('GET /user');
const scopes = response.headers['x-oauth-scopes']?.split(', ') || [];

const requiredScopes = ['read:user', 'user:email', 'repo'];
const missingScopes = requiredScopes.filter(s => !scopes.includes(s));

if (missingScopes.length > 0) {
  throw new ValidationError(`Missing GitHub scopes: ${missingScopes.join(', ')}`);
}
```

**References**:
- @octokit/rest Docs: https://octokit.github.io/rest.js/
- GitHub API Rate Limiting: https://docs.github.com/en/rest/rate-limit
- @octokit Plugins: https://github.com/octokit/plugin-retry.js

---

## 4. Email-Based Association Logic

### Decision: Auto-Link All Matching Emails, Admin Override Available

**Rationale**:
- **Optimistic Approach**: When user connects GitHub account, auto-associate all people resources sharing same email
- **GitHub Email Source**: Use `octokit.users.listEmailsForAuthenticatedUser()` to get verified emails
- **Match Logic**: Case-insensitive email match against `people.email` column
- **Admin Override**: Provide UI to manually break/add associations (handles edge cases)

**Alternatives Considered**:
- **Require Confirmation**: Show list before linking → adds friction, slows down UX
- **Single Match Only**: Link to first person resource → creates confusion when multiple matches exist
- **Manual Only**: No auto-linking → tedious for users, defeats purpose of email-based association

**Implementation Algorithm**:
```typescript
async function autoAssociateByEmail(
  githubConnectionId: number,
  githubEmails: string[]
): Promise<number> {
  // Get all people resources matching any verified GitHub email
  const matchingPeople = await db('people')
    .whereIn('email', githubEmails.map(e => e.toLowerCase()))
    .select('id', 'email', 'name');

  // Create associations
  const associations = matchingPeople.map(person => ({
    github_connection_id: githubConnectionId,
    person_id: person.id,
    association_type: 'automatic',
    associated_by_user_id: null, // System-generated
    created_at: new Date()
  }));

  await db('github_account_associations').insert(associations);

  return associations.length;
}
```

**Edge Cases**:
- **No Email Match**: User can manually select people resources to associate
- **GitHub Email Not Verified**: Skip unverified emails (security - anyone can add unverified email)
- **Multiple People Same Email**: Link to ALL (consultant scenario - intentional)
- **Person Already Linked**: Prevent duplicate associations (unique constraint)

**Conflict Resolution**:
- Admin UI shows all associations with "Break Link" button
- Breaking link sets `active = false` in `github_account_associations` (soft delete, preserves audit trail)
- Re-associating reactivates existing association record

**References**:
- GitHub User Emails API: https://docs.github.com/en/rest/users/emails

---

## Summary of Key Decisions

| Question | Decision | Library/Pattern |
|----------|----------|-----------------|
| OAuth Flow | Localhost callback server | simple-oauth2 v5+ |
| Token Encryption | AES-256-GCM with derived keys | Node.js crypto module |
| GitHub API | Official SDK with retry/throttle | @octokit/rest v20+ |
| Association Logic | Auto-link all matching emails | Optimistic with admin override |

---

## Implementation Dependencies

```json
{
  "dependencies": {
    "simple-oauth2": "^5.0.0",
    "@octokit/rest": "^20.0.0",
    "@octokit/plugin-retry": "^6.0.0",
    "@octokit/plugin-throttling": "^8.0.0"
  }
}
```

**Environment Variables Required**:
```bash
# GitHub OAuth App (register at github.com/settings/developers)
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/oauth/callback

# Token Encryption
ENCRYPTION_KEY=base64_encoded_32_byte_key  # Generate: crypto.randomBytes(32).toString('base64')

# Optional: GitHub Enterprise
GITHUB_ENTERPRISE_URL=https://github.mycompany.com  # Defaults to github.com
```

---

## Open Items for Implementation Phase

1. **OAuth Callback Port**: Should port 3000 be configurable? (Recommendation: Yes, env variable with default)
2. **Token Refresh UI**: Show notification when token auto-refreshed? (Recommendation: Silent refresh, log event)
3. **Association Confirmation**: Show toast after auto-association? (Recommendation: Yes, "Linked 3 people resources to your GitHub account")
4. **Rate Limit Warning**: At what threshold show warning? (Recommendation: 80% of limit = 4000 requests/hour)
