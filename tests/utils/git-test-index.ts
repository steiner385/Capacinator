/**
 * Git Test Infrastructure - Main Entry Point
 * Feature: 001-git-sync-integration
 * Issue: #104 - Git Sync Test Infrastructure
 *
 * This file exports all Git testing utilities for easy importing in tests.
 *
 * Usage:
 *   import {
 *     resetMockGitState,
 *     gitTestData,
 *     setupGitMatchers,
 *     GitErrors,
 *     fullScenario,
 *   } from '../utils/git-test-index';
 */

// ============================================
// Mock simple-git
// ============================================
export {
  default as simpleGit,
  resetMockGitState,
  getMockGitState,
  configureMockGitState,
  simulateGitError,
  clearGitError,
  createDefaultMockState,
  type MockGitState,
  type MockCommit,
} from '../__mocks__/simple-git.js';

// ============================================
// Test Data Generator
// ============================================
export {
  gitTestData,
  GitTestDataGenerator,
  GitTestDataGeneratorClass,
} from './git-test-data-generator.js';

// ============================================
// Custom Jest Matchers
// ============================================
export { gitMatchers, setupGitMatchers } from './git-matchers.js';

// ============================================
// Test Helpers
// ============================================
export {
  createGitTestContext,
  setupGitTestSuite,
  createInitializedRepo,
  simulatePendingChanges,
  simulateConflicts,
  simulateSyncStatus,
  simulateNetworkFailure,
  restoreNetwork,
  GitErrors,
  createTestScenarioFile,
  readTestScenarioFile,
  assertRepoState,
  waitForCondition,
  generateTestScenarios,
  diffScenarioExports,
  type GitTestContext,
} from './git-test-helpers.js';

// ============================================
// Test Fixtures
// ============================================
export {
  // Valid scenarios
  minimalScenario,
  singleProjectScenario,
  scenarioWithPeople,
  fullScenario,
  scenarioWithAssignments,
  generateLargeScenario,
} from '../fixtures/git/scenarios/index.js';

export {
  // Conflict scenarios
  simpleFieldConflict,
  multiFieldConflict,
  deletionConflict,
  creationConflict,
  nestedConflict,
  allocationConflict,
  dateOverlapConflict,
  getAllConflictScenarios,
  getConflictsByEntityType,
  type ConflictScenario,
} from '../fixtures/git/conflicts/index.js';

export {
  // Corrupted data scenarios
  malformedJson,
  invalidSchema,
  missingRequiredFields,
  referentialIntegrityViolations,
  invalidFieldValues,
  getAllCorruptedScenarios,
} from '../fixtures/git/corrupted/index.js';
