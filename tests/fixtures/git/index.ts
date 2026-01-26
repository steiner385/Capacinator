/**
 * Git test fixtures index
 * Feature: 001-git-sync-integration
 * Issue: #104 - Git Sync Test Infrastructure
 *
 * Provides pre-built test data for Git sync testing scenarios.
 */

import * as validScenarios from './scenarios/index.js';
import * as conflictScenarios from './conflicts/index.js';
import * as corruptedData from './corrupted/index.js';

export { validScenarios, conflictScenarios, corruptedData };

// Re-export commonly used fixtures
export {
  minimalScenario,
  fullScenario,
  scenarioWithAssignments,
} from './scenarios/index.js';

export {
  simpleFieldConflict,
  multiFieldConflict,
  deletionConflict,
  nestedConflict,
} from './conflicts/index.js';

export {
  malformedJson,
  invalidSchema,
  missingRequiredFields,
} from './corrupted/index.js';
