/**
 * E2E Test Helpers - Centralized Exports
 *
 * This module provides a unified entry point for all test helper utilities.
 *
 * RECOMMENDED: Use UnifiedTestDataFactory for test data creation.
 * It provides automatic cleanup, retry logic, and consistent API.
 *
 * @example
 * ```typescript
 * import { UnifiedTestDataFactory } from './helpers';
 *
 * const factory = new UnifiedTestDataFactory(apiContext);
 * const data = await factory.scenarios.utilization();
 * ```
 */

// Primary export - Unified Test Data Factory (RECOMMENDED)
export {
  UnifiedTestDataFactory,
  createUnifiedTestDataFactory,
  type Person,
  type Project,
  type Assignment,
  type Role,
  type Location,
  type Scenario,
  type ProjectType,
  type AvailabilityOverride,
} from './unified-test-data-factory';

// Test context management
export {
  TestContextManager,
  TestContext,
  createTestContextManager,
} from './test-context-manager';

// Test configuration
export { testConfig } from './test-config';

// Legacy exports (deprecated - use UnifiedTestDataFactory instead)
/** @deprecated Use UnifiedTestDataFactory instead */
export { TestDataFactory } from './test-data-factory';
/** @deprecated Use UnifiedTestDataFactory instead */
export { E2ETestDataBuilder } from './e2e-test-data-builder';
/** @deprecated Use UnifiedTestDataFactory instead */
export { TestDataGenerator } from './test-data-generator';
