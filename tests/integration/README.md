# Integration Testing Setup

This directory contains integration tests that test the full API functionality with a real database.

## Key Components

1. **setup.ts**: Sets up an in-memory SQLite test database that's isolated from production
2. **helpers/test-routes.ts**: Factory functions that create Express routers with injected test database
3. Test files: Integration tests for various API endpoints

## Writing Integration Tests

When writing integration tests for API controllers:

1. **Use the test database**: Import `db` from `./setup.js`
2. **Create routes with test database**: Use the factory functions from `helpers/test-routes.js`
3. **Clean up test data**: Always clean up test data in `afterEach` hooks

### Example Test Structure

```typescript
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { db } from './setup.js';
import supertest from 'supertest';
import express from 'express';
import { createProjectPhaseDependenciesRouter } from './helpers/test-routes.js';

// Create test app with injected test database
const app = express();
app.use(express.json());

// Use the factory function to create routes with test database
const router = createProjectPhaseDependenciesRouter(db);
app.use('/api/project-phase-dependencies', router);

const request = supertest(app);

describe('API Integration Tests', () => {
  beforeEach(async () => {
    // Set up test data
  });

  afterEach(async () => {
    // Clean up test data
  });

  test('should do something', async () => {
    const response = await request
      .get('/api/endpoint')
      .expect(200);
    
    expect(response.body).toMatchObject({
      // expected response
    });
  });
});
```

## Important Notes

- The test database is created in-memory, so it's fast and isolated
- Migrations are run automatically before tests
- Each test should clean up its own data
- Controllers must accept a database instance in their constructor for proper dependency injection