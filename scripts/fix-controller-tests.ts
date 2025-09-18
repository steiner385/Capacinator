import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';

// Find all controller test files
const testFiles = globSync('tests/unit/server/controllers/*.test.ts', {
  ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
});

console.log(`Found ${testFiles.length} controller test files to fix`);

testFiles.forEach(file => {
  let content = readFileSync(file, 'utf-8');
  let modified = false;

  // Fix the chainable mock to properly handle the database methods
  if (content.includes('createChainableMock') && !content.includes('mockImplementation')) {
    const improvedChainableMock = `// Create chainable mock methods with proper typing
const createChainableMock = (returnValue: any = []): any => {
  const chainable: any = {
    select: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    sum: jest.fn().mockReturnThis(),
    min: jest.fn().mockReturnThis(),
    max: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(returnValue),
    then: jest.fn().mockResolvedValue(returnValue),
    returning: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    del: jest.fn().mockResolvedValue(1),
    delete: jest.fn().mockResolvedValue(1),
    transaction: jest.fn((callback) => callback(chainable)),
    raw: jest.fn((sql) => sql)
  };
  
  // Make it thenable
  chainable.then = jest.fn((resolve) => {
    resolve(returnValue);
    return Promise.resolve(returnValue);
  });
  
  return chainable;
};`;

    // Replace the existing createChainableMock
    content = content.replace(
      /const createChainableMock[^}]+\};/s,
      improvedChainableMock
    );
    modified = true;
  }

  // Fix the db mock to properly return chainable mocks
  const dbMockRegex = /\(controller as any\)\.db = jest\.fn\(\(\) => createChainableMock\(\)\);/;
  if (dbMockRegex.test(content)) {
    content = content.replace(
      dbMockRegex,
      `// Setup database mock with proper chainable returns
    const mockDb = jest.fn((table?: string) => {
      // Return different mock data based on table name
      if (table === 'people') return createChainableMock([{ id: 'person-123', name: 'Test Person' }]);
      if (table === 'roles') return createChainableMock([{ id: 'role-123', name: 'Test Role' }]);
      if (table === 'locations') return createChainableMock([{ id: 'loc-123', name: 'Test Location' }]);
      if (table === 'person_roles') return createChainableMock([{ person_id: 'person-123', role_id: 'role-123' }]);
      if (table === 'project_assignments') return createChainableMock([{ id: 'assignment-123' }]);
      return createChainableMock([]);
    });
    mockDb.transaction = jest.fn((callback) => callback(mockDb));
    mockDb.raw = jest.fn((sql) => ({ sql }));
    (controller as any).db = mockDb;`
    );
    modified = true;
  }

  if (modified) {
    writeFileSync(file, content);
    console.log(`Fixed ${file}`);
  }
});

console.log('Controller test fixes complete');