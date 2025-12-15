/**
 * Test Data Cleanup Utilities
 *
 * Provides automated cleanup of orphaned test data to prevent test pollution
 * and database bloat. Should be run:
 * - Before test runs (in global setup) to ensure clean state
 * - After test runs (in global teardown) to clean up any missed data
 * - Periodically as maintenance (e.g., nightly cleanup job)
 */

import { APIRequestContext } from '@playwright/test';

/**
 * Configuration for cleanup operations
 */
export interface CleanupConfig {
  /** Base URL of the API server */
  apiBaseUrl: string;
  /** Maximum age of test data to keep (in milliseconds) */
  maxAge?: number;
  /** Whether to perform a dry run (no actual deletion) */
  dryRun?: boolean;
  /** Patterns to match test data names */
  testDataPatterns?: string[];
  /** Whether to output verbose logs */
  verbose?: boolean;
}

/**
 * Result of a cleanup operation
 */
export interface CleanupResult {
  success: boolean;
  deletedCounts: Record<string, number>;
  errors: string[];
  duration: number;
}

/**
 * Default test data patterns to match
 */
const DEFAULT_TEST_PATTERNS = [
  't%', // Test context prefix pattern (e.g., t1abc2def_)
  'test_%', // Generic test prefix
  'Test_%', // Another common pattern
  'e2e_%', // E2E test prefix
  '%_TestUser_%', // Test user pattern
  '%_TestProject_%', // Test project pattern
  '%_TestScenario_%', // Test scenario pattern
];

/**
 * Clean up orphaned test data via API
 */
export async function cleanupOrphanedTestData(
  apiContext: APIRequestContext,
  config: CleanupConfig
): Promise<CleanupResult> {
  const startTime = Date.now();
  const result: CleanupResult = {
    success: true,
    deletedCounts: {},
    errors: [],
    duration: 0,
  };

  const {
    apiBaseUrl,
    maxAge = 24 * 60 * 60 * 1000, // 24 hours default
    dryRun = false,
    verbose = false,
  } = config;

  const log = (message: string) => {
    if (verbose) {
      console.log(`[TestDataCleanup] ${message}`);
    }
  };

  log(`Starting cleanup (maxAge: ${maxAge}ms, dryRun: ${dryRun})`);

  try {
    // Try to use the test-context cleanup API first
    const response = await apiContext.post(`${apiBaseUrl}/api/test-context/cleanup-orphaned`, {
      data: { maxAgeMs: maxAge },
    });

    if (response.ok()) {
      const data = await response.json();
      if (data.success) {
        result.deletedCounts = {
          contexts: data.data?.orphanedContexts?.length || 0,
          ...data.data?.orphanedDbData,
        };
        log(`API cleanup successful: ${JSON.stringify(result.deletedCounts)}`);
      }
    } else {
      log('Test context API not available, falling back to direct cleanup');
      // Fallback to direct entity deletion if API not available
      await cleanupEntitiesByPattern(apiContext, apiBaseUrl, result, dryRun, log);
    }
  } catch (error) {
    const errorMsg = `Cleanup failed: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(errorMsg);
    log(errorMsg);

    // Try fallback cleanup
    try {
      await cleanupEntitiesByPattern(apiContext, apiBaseUrl, result, dryRun, log);
    } catch (fallbackError) {
      result.errors.push(`Fallback cleanup failed: ${fallbackError}`);
      result.success = false;
    }
  }

  result.duration = Date.now() - startTime;
  log(`Cleanup completed in ${result.duration}ms`);

  return result;
}

/**
 * Clean up entities by pattern (fallback method)
 */
async function cleanupEntitiesByPattern(
  apiContext: APIRequestContext,
  apiBaseUrl: string,
  result: CleanupResult,
  dryRun: boolean,
  log: (msg: string) => void
): Promise<void> {
  // Order matters - delete in reverse dependency order
  const endpoints = [
    { name: 'assignments', path: '/api/test-data/allocations' },
    { name: 'project-phases', path: '/api/test-data/project-phases' },
    { name: 'availability-overrides', path: '/api/test-data/availability-overrides' },
    { name: 'phases', path: '/api/test-data/phases' },
    { name: 'roles', path: '/api/test-data/roles' },
    { name: 'project-types', path: '/api/test-data/project-types' },
    { name: 'locations', path: '/api/test-data/locations' },
  ];

  for (const { name, path } of endpoints) {
    try {
      if (dryRun) {
        log(`[DRY RUN] Would delete test ${name}`);
        continue;
      }

      const response = await apiContext.delete(`${apiBaseUrl}${path}`);
      if (response.ok()) {
        const data = await response.json();
        const count = parseInt(data.message?.match(/\d+/)?.[0] || '0');
        result.deletedCounts[name] = count;
        log(`Deleted ${count} ${name}`);
      }
    } catch (error) {
      log(`Failed to cleanup ${name}: ${error}`);
    }
  }
}

/**
 * Clean up test data before a test run
 * Call this in global setup to ensure clean state
 */
export async function preTestCleanup(
  apiContext: APIRequestContext,
  apiBaseUrl: string
): Promise<void> {
  console.log('[E2E] Running pre-test cleanup...');

  const result = await cleanupOrphanedTestData(apiContext, {
    apiBaseUrl,
    maxAge: 2 * 60 * 60 * 1000, // Clean up data older than 2 hours
    verbose: true,
  });

  if (result.success) {
    const totalDeleted = Object.values(result.deletedCounts).reduce((a, b) => a + b, 0);
    console.log(`[E2E] Pre-test cleanup completed: ${totalDeleted} entities cleaned up`);
  } else {
    console.warn('[E2E] Pre-test cleanup had errors:', result.errors);
  }
}

/**
 * Clean up test data after a test run
 * Call this in global teardown to clean up any missed data
 */
export async function postTestCleanup(
  apiContext: APIRequestContext,
  apiBaseUrl: string
): Promise<void> {
  console.log('[E2E] Running post-test cleanup...');

  const result = await cleanupOrphanedTestData(apiContext, {
    apiBaseUrl,
    maxAge: 0, // Clean up all test data
    verbose: true,
  });

  if (result.success) {
    const totalDeleted = Object.values(result.deletedCounts).reduce((a, b) => a + b, 0);
    console.log(`[E2E] Post-test cleanup completed: ${totalDeleted} entities cleaned up`);
  } else {
    console.warn('[E2E] Post-test cleanup had errors:', result.errors);
  }
}

/**
 * Clean up a specific test context by prefix
 */
export async function cleanupTestPrefix(
  apiContext: APIRequestContext,
  apiBaseUrl: string,
  prefix: string
): Promise<CleanupResult> {
  const startTime = Date.now();
  const result: CleanupResult = {
    success: true,
    deletedCounts: {},
    errors: [],
    duration: 0,
  };

  try {
    const response = await apiContext.delete(
      `${apiBaseUrl}/api/test-context/by-prefix/${encodeURIComponent(prefix)}`
    );

    if (response.ok()) {
      const data = await response.json();
      if (data.success) {
        result.deletedCounts = data.data?.deleted || {};
      }
    } else {
      throw new Error(`Failed to cleanup prefix ${prefix}: ${response.status()}`);
    }
  } catch (error) {
    result.success = false;
    result.errors.push(String(error));
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Register cleanup to run on process exit
 * Useful for ensuring cleanup even on test failures
 */
export function registerExitCleanup(
  apiContext: APIRequestContext,
  apiBaseUrl: string
): void {
  const cleanup = async () => {
    console.log('[E2E] Running exit cleanup...');
    try {
      await postTestCleanup(apiContext, apiBaseUrl);
    } catch (error) {
      console.error('[E2E] Exit cleanup failed:', error);
    }
  };

  // Note: In Playwright context, process exit handlers may not work as expected
  // This is more useful for standalone scripts
  process.on('beforeExit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}
