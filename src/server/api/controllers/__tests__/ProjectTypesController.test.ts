import { ProjectTypesController } from '../ProjectTypesController';
import { createMockDb, flushPromises } from './helpers/mockDb';

describe('ProjectTypesController', () => {
  let controller: ProjectTypesController;
  let mockReq: any;
  let mockRes: any;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new ProjectTypesController();

    // Create mock request
    mockReq = {
      query: {},
      params: {},
      body: {},
      headers: {}
    };

    // Create mock response
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    // Create mock database
    mockDb = createMockDb();
    (controller as any).db = mockDb;

    mockDb._reset();
  });

  describe('getAll - List Project Types', () => {
    it('returns paginated project types with sub-type counts', async () => {
      mockReq.query = { page: '1', limit: '50' };

      const mockProjectTypes = [
        { id: 'type-1', name: 'Type A' },
        { id: 'type-2', name: 'Type B' }
      ];

      const mockSubTypeCounts = [
        { project_type_id: 'type-1', sub_type_count: '3' },
        { project_type_id: 'type-2', sub_type_count: '1' }
      ];

      // Mock the query as a thenable (it gets awaited directly)
      mockDb._setQueryResult(mockProjectTypes);

      // Mock count query.first()
      mockDb._setCountResult(2);

      // Mock sub-type counts query (separate query)
      const secondQuery = false;
      mockDb._queueQueryResult(mockProjectTypes); // First query result
      mockDb._queueQueryResult(mockSubTypeCounts); // Second query result

      await controller.getAll(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        data: [
          { id: 'type-1', name: 'Type A', sub_type_count: 3 },
          { id: 'type-2', name: 'Type B', sub_type_count: 1 }
        ],
        pagination: {
          page: 1,
          limit: 50,
          total: 2,
          totalPages: 1
        }
      });
    });

    it('returns project types with zero sub-type counts when none exist', async () => {
      const mockProjectTypes = [{ id: 'type-1', name: 'Type A' }];

      mockDb._setQueryResult(mockProjectTypes);
      mockDb._setCountResult(1);
      mockDb._queueQueryResult(mockProjectTypes);
      mockDb._queueQueryResult([]); // No sub-types

      await controller.getAll(mockReq, mockRes);
      await flushPromises();

      const response = mockRes.json.mock.calls[0][0];
      expect(response.data[0].sub_type_count).toBe(0);
    });

    it('uses default pagination values', async () => {
      mockReq.query = {};

      mockDb._setQueryResult([]);
      mockDb._setCountResult(0);
      mockDb._queueQueryResult([]);
      mockDb._queueQueryResult([]);

      await controller.getAll(mockReq, mockRes);
      await flushPromises();

      // Just verify the response has default pagination
      const response = mockRes.json.mock.calls[0][0];
      expect(response.pagination.page).toBe(1);
      expect(response.pagination.limit).toBe(50);
    });

    it('handles database errors gracefully', async () => {
      mockDb.select = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.getAll(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getById - Get Single Project Type', () => {
    beforeEach(() => {
      mockReq.params = { id: 'type-1' };
    });

    it('returns main project type with sub-types and phases', async () => {
      const mockProjectType = {
        id: 'type-1',
        name: 'Main Type',
        is_sub_type: undefined
      };

      const mockSubTypes = [
        { id: 'sub-1', name: 'Sub Type 1' }
      ];

      const mockPhases = [
        { id: 'phase-1', name: 'Planning', order_index: 1 }
      ];

      // Mock main type lookup
      mockDb._queueFirstResult(mockProjectType);

      // Mock sub-types query
      mockDb._queueQueryResult(mockSubTypes);

      // Mock phases query
      mockDb._queueQueryResult(mockPhases);

      await controller.getById(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        ...mockProjectType,
        sub_types: mockSubTypes,
        phases: mockPhases
      });
    });

    it('returns sub-type with parent info when ID is sub-type', async () => {
      const mockSubType = {
        id: 'sub-1',
        name: 'Sub Type',
        project_type_id: 'parent-1'
      };

      const mockParentType = {
        id: 'parent-1',
        name: 'Parent Type'
      };

      const mockPhases = [];

      // Mock main type lookup (not found)
      mockDb._queueFirstResult(null);

      // Mock sub-type lookup
      mockDb._queueFirstResult(mockSubType);

      // Mock parent type lookup
      mockDb._queueFirstResult(mockParentType);

      // Mock sub-types query (empty for sub-types)
      mockDb._queueQueryResult([]);

      // Mock phases query
      mockDb._queueQueryResult(mockPhases);

      await controller.getById(mockReq, mockRes);
      await flushPromises();

      const response = mockRes.json.mock.calls[0][0];
      expect(response.is_sub_type).toBe(true);
      expect(response.parent_id).toBe('parent-1');
      expect(response.parent_name).toBe('Parent Type');
      expect(response.sub_types).toEqual([]);
    });

    it('returns 404 when project type not found', async () => {
      // Mock main type lookup (not found)
      mockDb._queueFirstResult(null);

      // Mock sub-type lookup (not found)
      mockDb._setFirstResult(null);

      await controller.getById(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('handles database errors gracefully', async () => {
      mockDb.where = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.getById(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('create - Create Project Type', () => {
    beforeEach(() => {
      mockReq.body = {
        name: 'New Project Type',
        description: 'Description',
        color_code: '#FF0000'
      };
    });

    it('creates project type and default child successfully', async () => {
      const mockCreated = {
        id: 'new-type-1',
        ...mockReq.body
      };

      // Mock insert
      mockDb._queueInsertResult([]);

      // Mock fetch created type
      mockDb._queueFirstResult(mockCreated);

      // Mock createDefaultChild - insert default child
      mockDb._queueInsertResult([]);

      // Mock resource templates query for default child
      mockDb._queueQueryResult([]);

      await controller.create(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockCreated);
    });

    it('creates project type without default child when parent_id provided', async () => {
      mockReq.body.parent_id = 'parent-1';

      const mockCreated = {
        id: 'new-child-1',
        ...mockReq.body
      };

      mockDb._queueInsertResult([]);
      mockDb._queueFirstResult(mockCreated);

      await controller.create(mockReq, mockRes);
      await flushPromises();

      // Should only call insert once (no default child)
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });

    it('creates default child with resource templates', async () => {
      const mockCreated = {
        id: 'new-type-1',
        name: 'New Type'
      };

      const mockTemplates = [
        {
          id: 'template-1',
          phase_id: 'phase-1',
          role_id: 'role-1',
          allocation_percentage: 50
        }
      ];

      mockDb._queueInsertResult([]);
      mockDb._queueFirstResult(mockCreated);

      // Mock createDefaultChild
      mockDb._queueInsertResult([]); // Default child insert
      mockDb._queueQueryResult(mockTemplates); // Templates query
      mockDb._queueInsertResult([]); // Template insert

      await controller.create(mockReq, mockRes);
      await flushPromises();

      // Should call insert 3 times: main type, default child, template
      expect(mockDb.insert).toHaveBeenCalledTimes(3);
    });

    it('handles database errors gracefully', async () => {
      mockDb.insert = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.create(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('update - Update Project Type', () => {
    beforeEach(() => {
      mockReq.params = { id: 'type-1' };
      mockReq.body = {
        name: 'Updated Name',
        description: 'Updated Description'
      };
    });

    it('updates project type successfully', async () => {
      const mockUpdated = {
        id: 'type-1',
        ...mockReq.body
      };

      mockDb._queueUpdateResult([mockUpdated]);

      await controller.update(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Name',
          description: 'Updated Description'
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockUpdated);
    });

    it('returns 404 when project type not found', async () => {
      mockDb._setUpdateResult([]);

      await controller.update(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('sets updated_at timestamp', async () => {
      mockDb._queueUpdateResult([{ id: 'type-1' }]);

      await controller.update(mockReq, mockRes);
      await flushPromises();

      const updateCall = mockDb.update.mock.calls[0][0];
      expect(updateCall.updated_at).toBeInstanceOf(Date);
    });

    it('handles database errors gracefully', async () => {
      mockDb.where = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.update(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('delete - Delete Project Type', () => {
    beforeEach(() => {
      mockReq.params = { id: 'type-1' };
    });

    it('deletes project type successfully when no dependencies', async () => {
      // Mock children check
      mockDb._queueQueryResult([]);

      // Mock projects check
      mockDb._queueQueryResult([]);

      // Mock delete operation
      mockDb._setDeleteResult(1);

      await controller.delete(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.del).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Project type deleted successfully'
      });
    });

    it('returns error when project type has children', async () => {
      // Mock children check (has children)
      mockDb._queueQueryResult([{ id: 'child-1' }]);

      await controller.delete(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to delete project type'
        })
      );
    });

    it('returns error when project type is used by projects', async () => {
      // Mock children check (no children)
      mockDb._queueQueryResult([]);

      // Mock projects check (has projects)
      mockDb._queueQueryResult([{ id: 'proj-1' }]);

      await controller.delete(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to delete project type'
        })
      );
    });

    it('returns 404 when delete count is zero', async () => {
      mockDb._queueQueryResult([]);
      mockDb._queueQueryResult([]);
      mockDb._setDeleteResult(0);

      await controller.delete(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('handles database errors gracefully', async () => {
      mockDb.where = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.delete(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});
