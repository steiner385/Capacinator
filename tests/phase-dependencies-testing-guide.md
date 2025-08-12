# Phase Dependencies Testing Guide

This document outlines the comprehensive testing strategy for the Phase Dependencies system in Capacinator.

## Overview

The Phase Dependencies system enables users to create relationships between project phases, with automatic cascade calculation when phases are moved or resized. This testing suite ensures the system works reliably across all layers.

## Test Architecture

### 1. Unit Tests

#### Backend Controllers (`tests/unit/server/controllers/ProjectPhaseDependenciesController.test.ts`)
- **Purpose**: Test API endpoint logic and request/response handling
- **Coverage**:
  - CRUD operations for dependencies
  - Validation logic (self-dependencies, circular dependencies)
  - Cascade calculation endpoint
  - Error handling and edge cases
  - Pagination and filtering

#### Backend Services (`tests/unit/server/services/ProjectPhaseCascadeService.test.ts`)
- **Purpose**: Test core business logic for dependency cascade calculations
- **Coverage**:
  - All dependency types (FS, SS, FF, SF)
  - Complex dependency chains
  - Circular dependency detection
  - Conflict detection
  - Database transaction handling
  - Edge cases and error scenarios

#### Frontend Components (`tests/unit/client/components/VisualPhaseManager.dependencies.test.tsx`)
- **Purpose**: Test React component behavior and user interactions
- **Coverage**:
  - Data loading and display
  - User interaction handling
  - API integration
  - Error state handling
  - Cascade result visualization

### 2. Integration Tests

#### API Integration (`tests/integration/phase-dependencies-api.test.ts`)
- **Purpose**: Test complete API functionality with real database
- **Coverage**:
  - End-to-end API workflows
  - Database constraints and relationships
  - Real cascade calculations
  - Data consistency
  - Transaction rollbacks

#### Performance Testing (`tests/integration/phase-dependencies-performance.test.ts`)
- **Purpose**: Ensure system performs well under load
- **Coverage**:
  - Large projects (50+ phases)
  - Complex dependency chains
  - High dependency density
  - Concurrent operations
  - Memory usage
  - Database query performance

### 3. End-to-End Tests

#### User Workflows (`tests/e2e/phase-dependencies.spec.ts`)
- **Purpose**: Test complete user workflows in browser environment
- **Coverage**:
  - Visual timeline interaction
  - Dependency creation and management
  - Cascade visualization
  - Conflict handling
  - Cross-browser compatibility
  - Real user scenarios

## Running Tests

### Prerequisites

1. **Environment Setup**:
   ```bash
   npm install
   npm run build
   ```

2. **Database Setup**:
   ```bash
   npm run db:migrate
   npm run db:seed:test
   ```

3. **Services Running**:
   ```bash
   # Terminal 1 - Backend
   npm run dev:server
   
   # Terminal 2 - Frontend  
   npm run dev:client
   ```

### Running All Tests

Use the comprehensive test runner:
```bash
node scripts/run-dependency-tests.js
```

### Running Individual Test Suites

1. **Unit Tests**:
   ```bash
   # Backend controller tests
   npm run test:unit -- tests/unit/server/controllers/ProjectPhaseDependenciesController.test.ts
   
   # Backend service tests
   npm run test:unit -- tests/unit/server/services/ProjectPhaseCascadeService.test.ts
   
   # Frontend component tests
   npm run test:client -- tests/unit/client/components/VisualPhaseManager.dependencies.test.tsx
   ```

2. **Integration Tests**:
   ```bash
   # API integration tests
   npm run test:integration -- tests/integration/phase-dependencies-api.test.ts
   
   # Performance tests
   npm run test:integration -- tests/integration/phase-dependencies-performance.test.ts
   ```

3. **E2E Tests**:
   ```bash
   npm run test:e2e -- tests/e2e/phase-dependencies.spec.ts
   ```

## Test Data

### Sample Project Structure
```
Test Project
├── Analysis Phase (Jan 1-31, 2024)
├── Development Phase (Feb 1 - Mar 31, 2024)  
├── Testing Phase (Apr 1-30, 2024)
└── Deployment Phase (May 1-15, 2024)

Dependencies:
- Analysis → Development (FS, 0 days)
- Development → Testing (FS, 5 days)
- Testing → Deployment (FS, 0 days)
```

### Dependency Types Tested
- **FS (Finish-to-Start)**: Successor starts after predecessor finishes
- **SS (Start-to-Start)**: Successor starts with predecessor
- **FF (Finish-to-Finish)**: Successor finishes with predecessor  
- **SF (Start-to-Finish)**: Successor finishes when predecessor starts

## Performance Benchmarks

The system should meet these performance criteria:

| Metric | Threshold | Test |
|--------|-----------|------|
| API Response (50 phases) | < 1 second | Large project test |
| Cascade calculation (20 phases) | < 5 seconds | Complex chain test |
| Database query (50 dependencies) | < 1 second | Query performance test |
| Memory usage (100 phases) | < 50 MB increase | Memory test |
| Concurrent operations (5x) | < 10 seconds | Concurrency test |

## Test Coverage Goals

- **Backend Controllers**: > 90%
- **Backend Services**: > 95%
- **Frontend Components**: > 85%
- **API Integration**: > 90%
- **E2E User Flows**: 100% critical paths

## Continuous Integration

Tests run automatically on:
- Pull requests to main branch
- Nightly builds
- Before releases

### CI Pipeline
1. Unit tests (parallel execution)
2. Integration tests (database required)
3. Performance tests (extended timeout)
4. E2E tests (browser automation)
5. Coverage report generation
6. Performance regression detection

## Debugging Failed Tests

### Common Issues

1. **Database State**:
   - Ensure test database is clean
   - Check migration status
   - Verify test data setup

2. **Service Dependencies**:
   - Backend server must be running for E2E tests
   - Frontend dev server required for browser tests
   - Database connections must be available

3. **Timing Issues**:
   - Use appropriate timeouts
   - Wait for async operations
   - Handle race conditions

4. **Browser Environment**:
   - Profile selection may be required
   - Network requests must complete
   - DOM elements must be rendered

### Debug Commands

```bash
# Run with verbose output
npm run test:unit -- --verbose

# Run single test file with debug
DEBUG=* npm run test:integration -- tests/integration/phase-dependencies-api.test.ts

# Run E2E with browser visible
npm run test:e2e -- --headed tests/e2e/phase-dependencies.spec.ts
```

## Test Maintenance

### Adding New Tests

1. **New Features**: Add corresponding test cases to relevant suites
2. **Bug Fixes**: Add regression tests to prevent reoccurrence
3. **Performance**: Update benchmarks for new functionality
4. **User Workflows**: Extend E2E tests for new user paths

### Updating Tests

1. **API Changes**: Update integration and unit tests
2. **UI Changes**: Update component and E2E tests
3. **Database Schema**: Update migration and API tests
4. **Dependencies**: Update cascade calculation tests

### Test Data Management

- Use factories for consistent test data
- Clean up after each test
- Use transactions for isolation
- Mock external dependencies

## Reporting

Test results are saved to:
- `test-reports/phase-dependencies-test-report.json`
- Coverage reports in `coverage/`
- Performance metrics in test output

The test runner provides:
- Real-time progress
- Detailed error messages
- Performance metrics
- Summary statistics
- Failure analysis

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data
3. **Assertions**: Use descriptive assertion messages
4. **Performance**: Set realistic timeouts
5. **Maintenance**: Keep tests updated with code changes
6. **Documentation**: Document complex test scenarios