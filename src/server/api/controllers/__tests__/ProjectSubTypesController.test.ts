import { Request, Response } from 'express';

// Create mock query builder
let queryResult: any = [];
let queryResultQueue: any[] = [];
let mockQuery: any;

const createMockQuery = (result?: any) => {
  let returnValue: any = undefined;

  const mock: any = {
    leftJoin: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    first: jest.fn(() => {
      const resolveValue = result !== undefined ? result : queryResult;
      return Promise.resolve(resolveValue);
    }),
    count: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    del: jest.fn(() => {
      const resolveValue = result !== undefined ? result : queryResult;
      return Promise.resolve(1);
    }),
    returning: jest.fn((columns) => {
      // Set the return value when .returning() is called
      returnValue = result !== undefined ? result : queryResult;
      return mock; // Return this for chaining
    }),
    transaction: jest.fn(),
    then: jest.fn((resolve) => {
      // Use returnValue if set by .returning(), otherwise use result/queryResult
      const resolveValue = returnValue !== undefined ? returnValue : (result !== undefined ? result : queryResult);
      return Promise.resolve(resolveValue).then(resolve);
    }),
    catch: jest.fn((reject) => {
      const resolveValue = returnValue !== undefined ? returnValue : (result !== undefined ? result : queryResult);
      return Promise.resolve(resolveValue).catch(reject);
    })
  };
  return mock;
};

// Initialize mock query
mockQuery = createMockQuery();

// Mock db function that returns the query builder
const mockDbFn: any = jest.fn(() => {
  // If there's a queued result, create a query with that result
  if (queryResultQueue.length > 0) {
    return createMockQuery(queryResultQueue.shift());
  }
  // Otherwise use the default queryResult
  return mockQuery;
});

// Add transaction method to db mock
mockDbFn.transaction = jest.fn(async (callback) => {
  // Create a transaction function that returns query builders (like db())
  const mockTrx: any = jest.fn(() => createMockQuery());
  return await callback(mockTrx);
});

// Mock the database module
jest.mock('../../../database/index.js', () => ({
  db: mockDbFn
}));

// Mock audit middleware
jest.mock('../../../middleware/auditMiddleware.js', () => ({
  auditModelChanges: jest.fn().mockResolvedValue(undefined)
}));

import { db } from '../../../database/index.js';
import { auditModelChanges } from '../../../middleware/auditMiddleware.js';
import {
  getProjectSubTypes,
  getProjectSubType,
  createProjectSubType,
  updateProjectSubType,
  deleteProjectSubType
} from '../ProjectSubTypesController';

const flushPromises = () => new Promise(resolve => setImmediate(resolve));

describe('ProjectSubTypesController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      query: {},
      params: {},
      body: {},
      headers: {}
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    // Reset query result and queue
    queryResult = [];
    queryResultQueue = [];

    // Recreate mock query for each test
    mockQuery = createMockQuery();
    mockDbFn.mockClear();
  });

  describe('getProjectSubTypes', () => {
    it('returns all sub-types grouped by project type when no filter', async () => {
      const mockSubTypes = [
        {
          id: 'sub-1',
          name: 'Sub Type 1',
          project_type_id: 'type-1',
          project_type_name: 'Type A',
          project_type_color: '#FF0000'
        },
        {
          id: 'sub-2',
          name: 'Sub Type 2',
          project_type_id: 'type-1',
          project_type_name: 'Type A',
          project_type_color: '#FF0000'
        },
        {
          id: 'sub-3',
          name: 'Sub Type 3',
          project_type_id: 'type-2',
          project_type_name: 'Type B',
          project_type_color: '#00FF00'
        }
      ];

      queryResult = mockSubTypes;

      await getProjectSubTypes(mockReq as Request, mockRes as Response);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            project_type_id: 'type-1',
            project_type_name: 'Type A',
            sub_types: expect.arrayContaining([
              expect.objectContaining({ id: 'sub-1' }),
              expect.objectContaining({ id: 'sub-2' })
            ])
          }),
          expect.objectContaining({
            project_type_id: 'type-2',
            project_type_name: 'Type B',
            sub_types: [expect.objectContaining({ id: 'sub-3' })]
          })
        ])
      });
    });

    it('returns filtered sub-types when project_type_id provided', async () => {
      mockReq.query = { project_type_id: 'type-1' };

      const mockSubTypes = [
        { id: 'sub-1', name: 'Sub Type 1', project_type_id: 'type-1' },
        { id: 'sub-2', name: 'Sub Type 2', project_type_id: 'type-1' }
      ];

      queryResult = mockSubTypes;

      await getProjectSubTypes(mockReq as Request, mockRes as Response);
      await flushPromises();

      expect(mockQuery.where).toHaveBeenCalledWith('project_sub_types.project_type_id', 'type-1');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockSubTypes
      });
    });

    it('filters out inactive sub-types by default', async () => {
      queryResult = [];

      await getProjectSubTypes(mockReq as Request, mockRes as Response);
      await flushPromises();

      expect(mockQuery.where).toHaveBeenCalledWith('project_sub_types.is_active', true);
    });

    it('includes inactive sub-types when include_inactive is true', async () => {
      mockReq.query = { include_inactive: 'true' };
      queryResult = [];

      await getProjectSubTypes(mockReq as Request, mockRes as Response);
      await flushPromises();

      // Should NOT call where for is_active when include_inactive is true
      const whereCalls = (mockQuery.where as jest.Mock).mock.calls;
      expect(whereCalls.some((call: any) => call[0] === 'project_sub_types.is_active')).toBe(false);
    });

    it('handles database errors gracefully', async () => {
      // Make the query reject when awaited
      mockQuery.then = jest.fn((resolve, reject) => Promise.reject(new Error('Database error')).then(resolve, reject));

      await getProjectSubTypes(mockReq as Request, mockRes as Response);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch project sub-types'
      });
    });
  });

  describe('getProjectSubType', () => {
    beforeEach(() => {
      mockReq.params = { id: 'sub-1' };
    });

    it('returns sub-type with phases and resource templates', async () => {
      const mockSubType = {
        id: 'sub-1',
        name: 'Sub Type 1',
        project_type_id: 'type-1'
      };

      const mockPhases = [
        { id: 'phase-1', name: 'Planning', order_index: 1 }
      ];

      const mockTemplates = [
        { id: 'template-1', role_name: 'Developer', phase_name: 'Planning' }
      ];

      // Queue results for each db() call
      queryResultQueue.push(mockSubType);   // First query (sub-type)
      queryResultQueue.push(mockPhases);    // Second query (phases)
      queryResultQueue.push(mockTemplates); // Third query (templates)

      await getProjectSubType(mockReq as Request, mockRes as Response);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          ...mockSubType,
          phases: mockPhases,
          resource_templates: mockTemplates
        }
      });
    });

    it('returns 404 when sub-type not found', async () => {
      queryResultQueue.push(null); // Sub-type not found

      await getProjectSubType(mockReq as Request, mockRes as Response);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Project sub-type not found'
      });
    });

    it('handles database errors gracefully', async () => {
      // Make the first query reject
      mockQuery.then = jest.fn((resolve, reject) => Promise.reject(new Error('Database error')).then(resolve, reject));

      await getProjectSubType(mockReq as Request, mockRes as Response);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch project sub-type'
      });
    });
  });

  describe('createProjectSubType', () => {
    beforeEach(() => {
      mockReq.body = {
        project_type_id: 'type-1',
        name: 'New Sub Type',
        description: 'Description',
        color_code: '#FF0000',
        sort_order: 1,
        is_default: false
      };
    });

    it('creates new sub-type successfully', async () => {
      const mockProjectType = { id: 'type-1', name: 'Type A' };
      const mockCreated = { id: 'new-sub-1', ...mockReq.body };

      // Queue results for each db() call
      queryResultQueue.push(mockProjectType); // Project type check
      queryResultQueue.push(null);            // Duplicate check
      queryResultQueue.push([mockCreated]);   // Insert
      queryResultQueue.push([]);              // Parent phases
      queryResultQueue.push([]);              // Parent templates

      await createProjectSubType(mockReq as Request, mockRes as Response);
      await flushPromises();

      expect(auditModelChanges).toHaveBeenCalledWith(
        mockReq,
        expect.objectContaining({
          tableName: 'project_sub_types',
          action: 'INSERT'
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockCreated
      });
    });

    it('returns 400 when required fields missing', async () => {
      mockReq.body = { description: 'No name or type' };

      await createProjectSubType(mockReq as Request, mockRes as Response);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Project type ID and name are required'
      });
    });

    it('returns 404 when project type not found', async () => {
      queryResultQueue.push(null); // Project type not found

      await createProjectSubType(mockReq as Request, mockRes as Response);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Project type not found'
      });
    });

    it('returns 409 when duplicate name exists', async () => {
      const mockProjectType = { id: 'type-1' };
      const mockExisting = { id: 'existing-sub-1', name: 'New Sub Type' };

      queryResultQueue.push(mockProjectType); // Project type check
      queryResultQueue.push(mockExisting);    // Duplicate found

      await createProjectSubType(mockReq as Request, mockRes as Response);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'A sub-type with this name already exists for this project type'
      });
    });

    it('uses defaults for optional fields', async () => {
      mockReq.body = {
        project_type_id: 'type-1',
        name: 'Minimal Sub Type'
      };

      queryResultQueue.push({ id: 'type-1' });  // Project type check
      queryResultQueue.push(null);              // Duplicate check
      queryResultQueue.push([{ id: 'new-sub-1' }]); // Insert
      queryResultQueue.push([]);                // Parent phases
      queryResultQueue.push([]);                // Parent templates

      await createProjectSubType(mockReq as Request, mockRes as Response);
      await flushPromises();

      // Check the insert was called (we can't check the mock.insert call since each query is new)
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateProjectSubType', () => {
    beforeEach(() => {
      mockReq.params = { id: 'sub-1' };
      mockReq.body = {
        name: 'Updated Name',
        description: 'Updated Description',
        sort_order: 2,
        is_active: true
      };
    });

    it('updates sub-type successfully', async () => {
      const mockExisting = {
        id: 'sub-1',
        name: 'Old Name',
        project_type_id: 'type-1'
      };
      const mockUpdated = { ...mockExisting, ...mockReq.body };

      queryResultQueue.push(mockExisting);    // Existing record lookup
      queryResultQueue.push(null);            // Duplicate check
      queryResultQueue.push([mockUpdated]);   // Update

      await updateProjectSubType(mockReq as Request, mockRes as Response);
      await flushPromises();

      expect(auditModelChanges).toHaveBeenCalledWith(
        mockReq,
        expect.objectContaining({
          tableName: 'project_sub_types',
          action: 'UPDATE',
          oldValues: mockExisting,
          newValues: mockUpdated
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdated
      });
    });

    it('returns 404 when sub-type not found', async () => {
      queryResultQueue.push(null); // Sub-type not found

      await updateProjectSubType(mockReq as Request, mockRes as Response);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Project sub-type not found'
      });
    });

    it('returns 409 when duplicate name exists', async () => {
      const mockExisting = { id: 'sub-1', name: 'Old Name', project_type_id: 'type-1' };
      const mockDuplicate = { id: 'sub-2', name: 'Updated Name' };

      queryResultQueue.push(mockExisting);  // Existing record lookup
      queryResultQueue.push(mockDuplicate); // Duplicate found

      await updateProjectSubType(mockReq as Request, mockRes as Response);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'A sub-type with this name already exists for this project type'
      });
    });

    it('skips duplicate check when name unchanged', async () => {
      mockReq.body.name = 'Old Name'; // Same as existing
      const mockExisting = { id: 'sub-1', name: 'Old Name', project_type_id: 'type-1' };

      queryResultQueue.push(mockExisting);    // Existing record lookup
      queryResultQueue.push([mockExisting]);  // Update

      await updateProjectSubType(mockReq as Request, mockRes as Response);
      await flushPromises();

      // Should succeed without duplicate check
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockExisting
      });
    });

    it('handles database errors gracefully', async () => {
      // Create a query that rejects
      const rejectingQuery: any = {
        ...createMockQuery(),
        first: jest.fn().mockRejectedValue(new Error('Database error')),
        then: jest.fn((resolve, reject) => Promise.reject(new Error('Database error')).then(resolve, reject))
      };
      mockDbFn.mockReturnValueOnce(rejectingQuery);

      await updateProjectSubType(mockReq as Request, mockRes as Response);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to update project sub-type'
      });
    });
  });

  describe('deleteProjectSubType', () => {
    beforeEach(() => {
      mockReq.params = { id: 'sub-1' };
    });

    it('deletes sub-type and related records successfully', async () => {
      const mockExisting = { id: 'sub-1', name: 'Sub Type 1' };
      const mockCount = { count: '0' };

      queryResultQueue.push(mockExisting); // Existing record lookup
      queryResultQueue.push(mockCount);    // Count check
      // No need to queue anything for transaction - db.transaction is mocked separately

      await deleteProjectSubType(mockReq as Request, mockRes as Response);
      await flushPromises();

      expect(mockDbFn.transaction).toHaveBeenCalled();
      expect(auditModelChanges).toHaveBeenCalledWith(
        mockReq,
        expect.objectContaining({
          tableName: 'project_sub_types',
          action: 'DELETE',
          oldValues: mockExisting,
          newValues: null
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Project sub-type deleted successfully'
      });
    });

    it('returns 404 when sub-type not found', async () => {
      queryResultQueue.push(null); // Sub-type not found

      await deleteProjectSubType(mockReq as Request, mockRes as Response);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Project sub-type not found'
      });
    });

    it('returns 409 when sub-type is being used by projects', async () => {
      const mockExisting = { id: 'sub-1', name: 'Sub Type 1' };
      const mockCount = { count: '5' };

      queryResultQueue.push(mockExisting); // Existing record lookup
      queryResultQueue.push(mockCount);    // Count check shows usage

      await deleteProjectSubType(mockReq as Request, mockRes as Response);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot delete project sub-type that is being used by projects'
      });
    });

    it('handles database errors gracefully', async () => {
      // Create a query that rejects
      const rejectingQuery: any = {
        ...createMockQuery(),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockRejectedValue(new Error('Database error')),
        then: jest.fn((resolve, reject) => Promise.reject(new Error('Database error')).then(resolve, reject))
      };
      mockDbFn.mockReturnValueOnce(rejectingQuery);

      await deleteProjectSubType(mockReq as Request, mockRes as Response);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to delete project sub-type'
      });
    });
  });
});
