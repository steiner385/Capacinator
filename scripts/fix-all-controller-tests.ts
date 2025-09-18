import { readFileSync, writeFileSync, existsSync } from 'fs';
import { globSync } from 'glob';

// Find all controller test files
const controllerTests = globSync([
  'tests/unit/server/controllers/*.test.ts',
  'src/server/api/controllers/__tests__/*.test.ts'
]);

console.log(`Found ${controllerTests.length} controller test files to fix comprehensively`);

const standardDbMockSetup = `    // Setup database mock with proper chainable returns
    const mockDb = jest.fn((table?: string) => {
      const defaultData: Record<string, any[]> = {
        'people': [{ id: 'person-123', name: 'Test Person' }],
        'roles': [{ id: 'role-123', name: 'Test Role' }],
        'locations': [{ id: 'loc-123', name: 'Test Location' }],
        'person_roles': [{ person_id: 'person-123', role_id: 'role-123' }],
        'projects': [{ id: 'project-123', name: 'Test Project' }],
        'project_types': [{ id: 'type-123', name: 'Test Type' }],
        'project_sub_types': [{ id: 'subtype-123', name: 'Test SubType', project_type_id: 'type-123', is_active: true }],
        'project_assignments': [{ id: 'assignment-123', person_id: 'person-123', project_id: 'project-123' }],
        'project_phases': [{ id: 'phase-123', name: 'Test Phase' }],
        'project_phases_timeline': [{ id: 'timeline-123', project_id: 'project-123', phase_id: 'phase-123' }],
        'scenarios': [{ id: 'scenario-123', name: 'Test Scenario' }],
        'settings': [{ key: 'test_setting', value: 'test_value' }],
        'permissions': [{ id: 'perm-123', resource: 'projects', action: 'read' }],
        'user_permissions': [{ user_id: 'user-123', permission_id: 'perm-123' }],
        'audit_logs': [],
        'notifications': []
      };
      
      const data = defaultData[table || ''] || [];
      const mock = createChainableMock(data);
      
      // Special handling for complex where conditions
      const originalWhere = mock.where;
      mock.where = jest.fn((...args) => {
        if (typeof args[0] === 'function') {
          // Call the function with the mock itself for complex where clauses
          args[0].call(mock);
        }
        originalWhere(...args);
        return mock;
      });
      
      return mock;
    });
    
    // Add transaction support
    mockDb.transaction = jest.fn((callback) => callback(mockDb));
    mockDb.raw = jest.fn((sql) => ({ sql }));
    
    (controller as any).db = mockDb;`;

controllerTests.forEach(file => {
  if (!existsSync(file)) return;
  
  let content = readFileSync(file, 'utf-8');
  let modified = false;

  // Remove duplicate createChainableMock definitions
  if (content.includes('// Create chainable mock methods with proper typing\n// Create chainable mock methods with proper typing')) {
    content = content.replace(
      /\/\/ Create chainable mock methods with proper typing\n\/\/ Create chainable mock methods with proper typing/g,
      '// Create chainable mock methods with proper typing'
    );
    modified = true;
  }

  // Fix duplicate return statements
  if (content.includes('return chainable;\n};\n  return chainable;')) {
    content = content.replace(
      /return chainable;\n};\n  return chainable;\n};/g,
      'return chainable;\n};'
    );
    modified = true;
  }

  // Fix broken module paths
  const pathFixes = [
    { from: "require('../../middleware/auditMiddleware.js')", to: "require('../../../../src/server/middleware/auditMiddleware.js')" },
    { from: "'../services/audit/AuditService'", to: "'../../../../src/server/services/AuditService'" },
    { from: "'../../../../src/server/../../../../src/server/services/AuditService'", to: "'../../../../src/server/services/AuditService'" },
    { from: "from '../../../integration/setup'", to: "from '../../../../tests/integration/setup'" },
    { from: "../../../../../../src/server/database/index", to: "../../../../src/server/database/index" }
  ];

  pathFixes.forEach(fix => {
    if (content.includes(fix.from)) {
      content = content.replace(new RegExp(fix.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fix.to);
      modified = true;
    }
  });

  // Update simple db mock setups to use the comprehensive one
  const simpleDbMockRegex = /\/\/ Setup database mock.*\n.*const mockDb = jest\.fn.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\(controller as any\)\.db = mockDb;/s;
  if (simpleDbMockRegex.test(content) && !content.includes('defaultData')) {
    content = content.replace(simpleDbMockRegex, standardDbMockSetup);
    modified = true;
  }

  if (modified) {
    writeFileSync(file, content);
    console.log(`Fixed ${file}`);
  }
});

console.log('Comprehensive controller test fixes complete');