/**
 * Corrupted data fixtures for error handling testing
 * Feature: 001-git-sync-integration
 * Issue: #104 - Git Sync Test Infrastructure
 *
 * Provides invalid data scenarios to test error handling.
 */

/**
 * Malformed JSON strings
 */
export const malformedJson = {
  // Missing closing brace
  unclosedObject: '{"name": "Test", "value": 123',

  // Missing closing bracket
  unclosedArray: '["item1", "item2"',

  // Trailing comma
  trailingComma: '{"name": "Test", "value": 123,}',

  // Single quotes instead of double
  singleQuotes: "{'name': 'Test', 'value': 123}",

  // Unquoted keys
  unquotedKeys: '{name: "Test", value: 123}',

  // Invalid escape sequence
  invalidEscape: '{"path": "C:\\invalid\\path"}',

  // Truncated in middle of value
  truncatedValue: '{"name": "Test Project with a very long n',

  // Binary garbage
  binaryGarbage: Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe]).toString(),

  // Empty file
  emptyFile: '',

  // Just whitespace
  whitespaceOnly: '   \n\t  \r\n  ',

  // Comment in JSON (not allowed)
  withComment: `{
    // This is a comment
    "name": "Test"
  }`,
};

/**
 * Valid JSON but invalid schema
 */
export const invalidSchema = {
  // Missing schemaVersion
  missingSchemaVersion: {
    exportedAt: '2024-01-15T10:30:00.000Z',
    scenarioId: 'scenario-001',
    data: {},
  },

  // Missing scenarioId
  missingScenarioId: {
    schemaVersion: '1.0.0',
    exportedAt: '2024-01-15T10:30:00.000Z',
    data: {},
  },

  // Invalid schemaVersion format
  invalidSchemaVersion: {
    schemaVersion: 'not-a-version',
    exportedAt: '2024-01-15T10:30:00.000Z',
    scenarioId: 'scenario-001',
    data: {},
  },

  // Future schemaVersion
  futureSchemaVersion: {
    schemaVersion: '99.0.0',
    exportedAt: '2024-01-15T10:30:00.000Z',
    scenarioId: 'scenario-001',
    data: {},
  },

  // Data is not an object
  dataNotObject: {
    schemaVersion: '1.0.0',
    exportedAt: '2024-01-15T10:30:00.000Z',
    scenarioId: 'scenario-001',
    data: 'not an object',
  },

  // Data is array instead of object
  dataIsArray: {
    schemaVersion: '1.0.0',
    exportedAt: '2024-01-15T10:30:00.000Z',
    scenarioId: 'scenario-001',
    data: [],
  },

  // Invalid date format
  invalidDateFormat: {
    schemaVersion: '1.0.0',
    exportedAt: 'not-a-date',
    scenarioId: 'scenario-001',
    data: {},
  },

  // Wrong data types
  wrongDataTypes: {
    schemaVersion: '1.0.0',
    exportedAt: '2024-01-15T10:30:00.000Z',
    scenarioId: 12345, // Should be string
    data: {
      projects: 'not an array', // Should be array
    },
  },
};

/**
 * Missing required fields in entities
 */
export const missingRequiredFields = {
  // Project missing id
  projectMissingId: {
    schemaVersion: '1.0.0',
    exportedAt: '2024-01-15T10:30:00.000Z',
    scenarioId: 'scenario-001',
    data: {
      projects: [
        {
          name: 'Test Project',
          // Missing: id
        },
      ],
    },
  },

  // Project missing name
  projectMissingName: {
    schemaVersion: '1.0.0',
    exportedAt: '2024-01-15T10:30:00.000Z',
    scenarioId: 'scenario-001',
    data: {
      projects: [
        {
          id: 'proj-001',
          // Missing: name
        },
      ],
    },
  },

  // Person missing required fields
  personMissingEmail: {
    schemaVersion: '1.0.0',
    exportedAt: '2024-01-15T10:30:00.000Z',
    scenarioId: 'scenario-001',
    data: {
      people: [
        {
          id: 'person-001',
          name: 'Test Person',
          // Missing: email
        },
      ],
    },
  },

  // Assignment missing person_id
  assignmentMissingPersonId: {
    schemaVersion: '1.0.0',
    exportedAt: '2024-01-15T10:30:00.000Z',
    scenarioId: 'scenario-001',
    data: {
      assignments: [
        {
          id: 'assign-001',
          project_id: 'proj-001',
          // Missing: person_id
          allocation_percentage: 50,
        },
      ],
    },
  },

  // Assignment missing project_id
  assignmentMissingProjectId: {
    schemaVersion: '1.0.0',
    exportedAt: '2024-01-15T10:30:00.000Z',
    scenarioId: 'scenario-001',
    data: {
      assignments: [
        {
          id: 'assign-001',
          person_id: 'person-001',
          // Missing: project_id
          allocation_percentage: 50,
        },
      ],
    },
  },
};

/**
 * Referential integrity violations
 */
export const referentialIntegrityViolations = {
  // Assignment references non-existent person
  orphanedAssignmentPerson: {
    schemaVersion: '1.0.0',
    exportedAt: '2024-01-15T10:30:00.000Z',
    scenarioId: 'scenario-001',
    data: {
      projects: [{ id: 'proj-001', name: 'Test Project' }],
      people: [], // Empty - no person for assignment to reference
      assignments: [
        {
          id: 'assign-001',
          person_id: 'person-nonexistent',
          project_id: 'proj-001',
          allocation_percentage: 50,
        },
      ],
    },
  },

  // Assignment references non-existent project
  orphanedAssignmentProject: {
    schemaVersion: '1.0.0',
    exportedAt: '2024-01-15T10:30:00.000Z',
    scenarioId: 'scenario-001',
    data: {
      projects: [], // Empty - no project for assignment to reference
      people: [{ id: 'person-001', name: 'Test Person', email: 'test@example.com' }],
      assignments: [
        {
          id: 'assign-001',
          person_id: 'person-001',
          project_id: 'proj-nonexistent',
          allocation_percentage: 50,
        },
      ],
    },
  },

  // Circular reference (if applicable)
  circularReference: {
    schemaVersion: '1.0.0',
    exportedAt: '2024-01-15T10:30:00.000Z',
    scenarioId: 'scenario-001',
    data: {
      projects: [
        {
          id: 'proj-001',
          name: 'Project A',
          depends_on: 'proj-002',
        },
        {
          id: 'proj-002',
          name: 'Project B',
          depends_on: 'proj-001', // Circular dependency
        },
      ],
    },
  },

  // Duplicate IDs
  duplicateIds: {
    schemaVersion: '1.0.0',
    exportedAt: '2024-01-15T10:30:00.000Z',
    scenarioId: 'scenario-001',
    data: {
      projects: [
        { id: 'proj-001', name: 'Project A' },
        { id: 'proj-001', name: 'Project B' }, // Duplicate ID
      ],
    },
  },
};

/**
 * Invalid field values
 */
export const invalidFieldValues = {
  // Negative allocation percentage
  negativeAllocation: {
    schemaVersion: '1.0.0',
    exportedAt: '2024-01-15T10:30:00.000Z',
    scenarioId: 'scenario-001',
    data: {
      assignments: [
        {
          id: 'assign-001',
          person_id: 'person-001',
          project_id: 'proj-001',
          allocation_percentage: -50,
        },
      ],
    },
  },

  // Allocation over 100%
  overAllocation: {
    schemaVersion: '1.0.0',
    exportedAt: '2024-01-15T10:30:00.000Z',
    scenarioId: 'scenario-001',
    data: {
      assignments: [
        {
          id: 'assign-001',
          person_id: 'person-001',
          project_id: 'proj-001',
          allocation_percentage: 150,
        },
      ],
    },
  },

  // End date before start date
  endBeforeStart: {
    schemaVersion: '1.0.0',
    exportedAt: '2024-01-15T10:30:00.000Z',
    scenarioId: 'scenario-001',
    data: {
      projects: [
        {
          id: 'proj-001',
          name: 'Test Project',
          aspiration_start: '2024-12-31',
          aspiration_finish: '2024-01-01', // Before start
        },
      ],
    },
  },

  // Invalid priority
  invalidPriority: {
    schemaVersion: '1.0.0',
    exportedAt: '2024-01-15T10:30:00.000Z',
    scenarioId: 'scenario-001',
    data: {
      projects: [
        {
          id: 'proj-001',
          name: 'Test Project',
          priority: -1, // Invalid (should be 1-5 or similar)
        },
      ],
    },
  },

  // Invalid email format
  invalidEmail: {
    schemaVersion: '1.0.0',
    exportedAt: '2024-01-15T10:30:00.000Z',
    scenarioId: 'scenario-001',
    data: {
      people: [
        {
          id: 'person-001',
          name: 'Test Person',
          email: 'not-an-email',
        },
      ],
    },
  },

  // Invalid UUID format
  invalidUuid: {
    schemaVersion: '1.0.0',
    exportedAt: '2024-01-15T10:30:00.000Z',
    scenarioId: 'scenario-001',
    data: {
      projects: [
        {
          id: 'not-a-valid-uuid!!!',
          name: 'Test Project',
        },
      ],
    },
  },
};

/**
 * Get all corrupted data scenarios for comprehensive error handling tests
 */
export function getAllCorruptedScenarios() {
  return {
    malformedJson,
    invalidSchema,
    missingRequiredFields,
    referentialIntegrityViolations,
    invalidFieldValues,
  };
}
