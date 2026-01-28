# Contracts: Git Sync Unit Tests - Tier 2

**Note**: This feature is about testing existing services, not creating new APIs.

The services being tested already have defined interfaces:

1. **ConflictValidator** - Internal service with database dependency
2. **GitErrors** - Error classification utility functions
3. **GitHealthCheck** - Internal service with network/filesystem dependencies

No new API contracts are introduced by this feature. The interfaces to test are documented in [data-model.md](../data-model.md).

## Test Interfaces

The test files create mock implementations of:

- `Knex` database query builder (for ConflictValidator)
- Node.js `https`/`http` modules (for GitHealthCheck network checks)
- Node.js `fs/promises` module (for GitHealthCheck disk checks)

These mocks are internal test utilities, not public contracts.
