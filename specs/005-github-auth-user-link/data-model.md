# Data Model: GitHub Authentication and User Association

**Feature**: 005-github-auth-user-link
**Date**: 2026-01-27
**Purpose**: Database schema design for GitHub connections and people resource associations

## Entity Relationship Diagram

```
┌──────────────────┐       ┌──────────────────────────────┐       ┌─────────────────┐
│     users        │───┐   │  github_connections          │   ┌───│     people      │
│                  │   │   │                              │   │   │                 │
│  id (PK)         │   └──>│  id (PK)                     │<──┘   │  id (PK)        │
│  email           │       │  user_id (FK → users.id)     │       │  email          │
│  name            │       │  github_user_id              │       │  name           │
│  ...             │       │  github_username             │       │  github_username│
└──────────────────┘       │  connection_method           │       │  github_user_id │
                           │  encrypted_token             │       │  ...            │
                           │  token_expires_at            │       └─────────────────┘
                           │  scopes                      │               │
                           │  github_base_url             │               │
                           │  status                      │               │
                           │  is_default                  │               │
                           │  last_used_at                │               │
                           │  created_at                  │               │
                           │  updated_at                  │               │
                           └──────────────────────────────┘               │
                                       │                                  │
                                       │                                  │
                                       └───────────────┬──────────────────┘
                                                       │
                                          ┌────────────────────────────────────┐
                                          │  github_account_associations       │
                                          │                                    │
                                          │  id (PK)                           │
                                          │  github_connection_id (FK)         │
                                          │  person_id (FK → people.id)        │
                                          │  association_type                  │
                                          │  associated_by_user_id (FK, null)  │
                                          │  active                            │
                                          │  created_at                        │
                                          │  updated_at                        │
                                          └────────────────────────────────────┘
```

---

## Table: `github_connections`

**Purpose**: Stores GitHub account credentials linked to Capacinator users

### Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique connection identifier |
| user_id | INTEGER | NOT NULL, FOREIGN KEY → users(id) ON DELETE CASCADE | Capacinator user who owns this connection |
| github_user_id | INTEGER | NOT NULL | GitHub user ID (numeric, from API) |
| github_username | TEXT | NOT NULL | GitHub username (for display) |
| connection_method | TEXT | NOT NULL, CHECK IN ('oauth', 'pat') | Authentication method used |
| encrypted_token | TEXT | NOT NULL | AES-256-GCM encrypted OAuth token or PAT |
| token_expires_at | DATETIME | NULL | OAuth token expiration (NULL for PATs) |
| refresh_token | TEXT | NULL | Encrypted OAuth refresh token (NULL for PATs) |
| scopes | TEXT | NOT NULL | JSON array of granted scopes, e.g. `["read:user","repo"]` |
| github_base_url | TEXT | NOT NULL DEFAULT 'https://api.github.com' | GitHub instance URL (supports Enterprise) |
| status | TEXT | NOT NULL DEFAULT 'active' | Connection status: 'active', 'expired', 'revoked', 'error' |
| is_default | BOOLEAN | NOT NULL DEFAULT 0 | Whether this is user's default GitHub account |
| last_used_at | DATETIME | NULL | Last time this connection was used for Git sync |
| encryption_version | INTEGER | NOT NULL DEFAULT 1 | Version of encryption key used (for key rotation) |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | Connection creation timestamp |
| updated_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

### Indexes

```sql
CREATE INDEX idx_github_connections_user_id ON github_connections(user_id);
CREATE INDEX idx_github_connections_github_user_id ON github_connections(github_user_id);
CREATE UNIQUE INDEX idx_github_connections_unique_github_account
  ON github_connections(github_user_id, github_base_url)
  WHERE status = 'active';  -- Prevent duplicate active connections for same GitHub account
```

### Constraints

```sql
-- Ensure at most one default connection per user
CREATE UNIQUE INDEX idx_github_connections_one_default_per_user
  ON github_connections(user_id)
  WHERE is_default = 1;

-- Validate connection_method
ALTER TABLE github_connections
  ADD CONSTRAINT chk_connection_method
  CHECK (connection_method IN ('oauth', 'pat'));

-- Validate status
ALTER TABLE github_connections
  ADD CONSTRAINT chk_status
  CHECK (status IN ('active', 'expired', 'revoked', 'error'));
```

### Validation Rules

1. **Unique GitHub Account**: Each active GitHub account (identified by `github_user_id` + `github_base_url`) can only be connected to ONE Capacinator user
2. **Token Format**: `encrypted_token` must start with `encrypted:` prefix (enforced by EncryptionService)
3. **OAuth Requirements**: If `connection_method = 'oauth'`, `token_expires_at` and `refresh_token` must be present
4. **PAT Requirements**: If `connection_method = 'pat'`, `token_expires_at` and `refresh_token` must be NULL
5. **Scopes**: Must be valid JSON array of strings
6. **Default Connection**: If setting `is_default = 1`, automatically set `is_default = 0` for user's other connections

---

## Table: `github_account_associations`

**Purpose**: Many-to-many mapping between GitHub connections and people resources

### Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique association identifier |
| github_connection_id | INTEGER | NOT NULL, FOREIGN KEY → github_connections(id) ON DELETE CASCADE | GitHub connection being associated |
| person_id | INTEGER | NOT NULL, FOREIGN KEY → people(id) ON DELETE CASCADE | People resource receiving attribution |
| association_type | TEXT | NOT NULL, CHECK IN ('automatic', 'manual') | How association was created |
| associated_by_user_id | INTEGER | NULL, FOREIGN KEY → users(id) ON DELETE SET NULL | User who created manual association (NULL for automatic) |
| active | BOOLEAN | NOT NULL DEFAULT 1 | Whether association is currently active (soft delete) |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | Association creation timestamp |
| updated_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

### Indexes

```sql
CREATE INDEX idx_github_associations_connection_id ON github_account_associations(github_connection_id);
CREATE INDEX idx_github_associations_person_id ON github_account_associations(person_id);
CREATE UNIQUE INDEX idx_github_associations_unique_pair
  ON github_account_associations(github_connection_id, person_id)
  WHERE active = 1;  -- Prevent duplicate active associations
```

### Constraints

```sql
-- Validate association_type
ALTER TABLE github_account_associations
  ADD CONSTRAINT chk_association_type
  CHECK (association_type IN ('automatic', 'manual'));

-- Manual associations must have associated_by_user_id
ALTER TABLE github_account_associations
  ADD CONSTRAINT chk_manual_has_user
  CHECK (association_type = 'automatic' OR associated_by_user_id IS NOT NULL);
```

### Validation Rules

1. **Unique Active Association**: Each (github_connection_id, person_id) pair can have at most ONE active association
2. **Manual Attribution**: If `association_type = 'manual'`, `associated_by_user_id` must reference a valid admin user
3. **Automatic Attribution**: If `association_type = 'automatic'`, `associated_by_user_id` must be NULL
4. **Soft Delete**: Breaking an association sets `active = 0` rather than deleting the row (preserves audit trail)
5. **Reactivation**: Re-associating an existing (github_connection_id, person_id) pair sets `active = 1` and updates `updated_at`

---

## Table: `people` (Extended)

**Purpose**: Extend existing people table with GitHub lookup fields

### New Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| github_username | TEXT | NULL | Cached GitHub username for quick lookup (denormalized) |
| github_user_id | INTEGER | NULL | Cached GitHub user ID for quick lookup (denormalized) |

### Index

```sql
CREATE INDEX idx_people_github_username ON people(github_username) WHERE github_username IS NOT NULL;
CREATE INDEX idx_people_github_user_id ON people(github_user_id) WHERE github_user_id IS NOT NULL;
```

**Note**: These fields are caches populated when associations are created. Source of truth is `github_account_associations` table. Multiple people may share same `github_user_id` (consultant scenario).

---

## State Transitions

### GitHub Connection Status

```
        [Create Connection]
                │
                ▼
            ┌─────────┐
            │ active  │◄─────────────┐
            └─────────┘               │
                │                     │
                │                     │ [Token Refresh Success]
                │                     │
                │                     │
    ┌───────────┴───────────┐        │
    │                       │        │
    │ [Token Expires]       │ [Token Refresh Fails]
    │                       │        │
    ▼                       ▼        │
┌─────────┐           ┌─────────┐   │
│ expired │───────────│  error  │───┘
└─────────┘           └─────────┘
    │                       │
    │                       │
    │ [User Disconnects]    │ [User Disconnects]
    │                       │
    ▼                       ▼
┌─────────┐           ┌─────────┐
│ revoked │           │ revoked │
└─────────┘           └─────────┘
```

### Association Active State

```
        [Auto-Associate or Manual Add]
                │
                ▼
        ┌──────────────┐
        │ active = 1   │
        └──────────────┘
                │
                │ [Admin Breaks Link]
                │
                ▼
        ┌──────────────┐
        │ active = 0   │◄─────────┐
        └──────────────┘          │
                │                 │
                │ [Admin Re-adds] │
                └─────────────────┘
```

---

## Query Patterns

### 1. Get User's GitHub Connections

```sql
SELECT
  id,
  github_username,
  connection_method,
  status,
  is_default,
  last_used_at,
  created_at
FROM github_connections
WHERE user_id = ? AND status = 'active'
ORDER BY is_default DESC, last_used_at DESC NULLS LAST;
```

### 2. Get People Associated with GitHub Connection

```sql
SELECT
  p.id,
  p.name,
  p.email,
  gaa.association_type,
  gaa.created_at
FROM people p
INNER JOIN github_account_associations gaa ON p.id = gaa.person_id
WHERE gaa.github_connection_id = ? AND gaa.active = 1
ORDER BY p.name;
```

### 3. Get GitHub Connections for Person (for Commit Attribution)

```sql
SELECT
  gc.id,
  gc.github_user_id,
  gc.github_username,
  gc.encrypted_token,
  gc.github_base_url
FROM github_connections gc
INNER JOIN github_account_associations gaa ON gc.id = gaa.github_connection_id
WHERE gaa.person_id = ? AND gaa.active = 1 AND gc.status = 'active';
```

### 4. Auto-Associate by Email

```sql
-- Step 1: Find matching people resources
SELECT id, email, name
FROM people
WHERE LOWER(email) IN (?, ?, ?)  -- GitHub verified emails (lowercase)

-- Step 2: Create associations (in application code)
INSERT INTO github_account_associations
  (github_connection_id, person_id, association_type, created_at)
SELECT ?, id, 'automatic', CURRENT_TIMESTAMP
FROM people
WHERE LOWER(email) IN (?, ?, ?)
ON CONFLICT (github_connection_id, person_id) WHERE active = 1
DO UPDATE SET active = 1, updated_at = CURRENT_TIMESTAMP;
```

### 5. Check if GitHub Account Already Connected

```sql
SELECT user_id, github_username
FROM github_connections
WHERE github_user_id = ? AND github_base_url = ? AND status = 'active'
LIMIT 1;
```

---

## Migration Scripts

### Migration 047: Create github_connections Table

```javascript
// 047_create_github_connections.js
exports.up = function(knex) {
  return knex.schema.createTable('github_connections', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.integer('github_user_id').notNullable();
    table.text('github_username').notNullable();
    table.text('connection_method').notNullable(); // 'oauth' or 'pat'
    table.text('encrypted_token').notNullable();
    table.datetime('token_expires_at').nullable();
    table.text('refresh_token').nullable();
    table.text('scopes').notNullable(); // JSON array
    table.text('github_base_url').notNullable().defaultTo('https://api.github.com');
    table.text('status').notNullable().defaultTo('active'); // 'active', 'expired', 'revoked', 'error'
    table.boolean('is_default').notNullable().defaultTo(false);
    table.datetime('last_used_at').nullable();
    table.integer('encryption_version').notNullable().defaultTo(1);
    table.timestamps(true, true); // created_at, updated_at

    // Indexes
    table.index('user_id');
    table.index('github_user_id');
    table.unique(['github_user_id', 'github_base_url'], {
      predicate: knex.raw('WHERE status = ?', ['active'])
    });
    table.unique(['user_id'], {
      predicate: knex.raw('WHERE is_default = ?', [true])
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('github_connections');
};
```

### Migration 048: Create github_account_associations Table

```javascript
// 048_create_github_associations.js
exports.up = function(knex) {
  return knex.schema.createTable('github_account_associations', (table) => {
    table.increments('id').primary();
    table.integer('github_connection_id').notNullable()
      .references('id').inTable('github_connections').onDelete('CASCADE');
    table.integer('person_id').notNullable()
      .references('id').inTable('people').onDelete('CASCADE');
    table.text('association_type').notNullable(); // 'automatic' or 'manual'
    table.integer('associated_by_user_id').nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamps(true, true); // created_at, updated_at

    // Indexes
    table.index('github_connection_id');
    table.index('person_id');
    table.unique(['github_connection_id', 'person_id'], {
      predicate: knex.raw('WHERE active = ?', [true])
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('github_account_associations');
};
```

### Migration 049: Add GitHub Fields to People Table

```javascript
// 049_add_github_to_people.js
exports.up = function(knex) {
  return knex.schema.table('people', (table) => {
    table.text('github_username').nullable();
    table.integer('github_user_id').nullable();

    // Indexes
    table.index('github_username', null, {
      predicate: knex.raw('WHERE github_username IS NOT NULL')
    });
    table.index('github_user_id', null, {
      predicate: knex.raw('WHERE github_user_id IS NOT NULL')
    });
  });
};

exports.down = function(knex) {
  return knex.schema.table('people', (table) => {
    table.dropColumn('github_username');
    table.dropColumn('github_user_id');
  });
};
```

---

## Data Integrity Rules

1. **Connection Uniqueness**: One active GitHub account per Capacinator user (enforced by unique index)
2. **Default Connection**: Only one default connection per user (enforced by unique partial index)
3. **Association Uniqueness**: One active association per (connection, person) pair (enforced by unique partial index)
4. **Cascade Deletes**: Deleting connection cascades to associations; deleting user cascades to connections
5. **Soft Deletes**: Associations use `active` flag for audit trail preservation
6. **Token Encryption**: All tokens encrypted before storage, never plaintext
7. **Email Matching**: Case-insensitive comparison for auto-association logic

---

## Performance Considerations

- **Indexes**: Cover common query patterns (user_id, person_id, github_user_id lookups)
- **Partial Indexes**: Only index active records for unique constraints (reduces index size)
- **Denormalization**: Cache github_username/github_user_id in people table (avoids JOIN for simple lookups)
- **Token Decryption**: Only decrypt tokens when needed (lazy decryption), cache decrypted value in memory for duration of Git operation
- **Scope Validation**: Parse JSON scopes only when validating permissions, otherwise store as string

---

## Security Considerations

- **Encrypted Storage**: All OAuth tokens and PATs stored with AES-256-GCM encryption
- **Key Rotation**: `encryption_version` column supports transparent key rotation
- **No Plaintext Logging**: Tokens never logged, even in debug mode (use `[REDACTED]` placeholder)
- **Token Expiry**: OAuth tokens auto-refreshed before expiry; expired PATs marked as 'expired' status
- **Association Auditing**: All manual associations track which admin user created them
- **Soft Delete Audit Trail**: Breaking associations preserves history for compliance
