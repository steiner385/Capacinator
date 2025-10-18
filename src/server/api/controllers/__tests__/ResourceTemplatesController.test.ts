import { ResourceTemplatesController } from '../ResourceTemplatesController';
import { createMockDb, flushPromises } from './helpers/mockDb';

describe('ResourceTemplatesController', () => {
  let controller: ResourceTemplatesController;
  let mockReq: any;
  let mockRes: any;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new ResourceTemplatesController();

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
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };

    // Create mock database
    mockDb = createMockDb();
    (controller as any).db = mockDb;

    mockDb._reset();
  });

  describe('getAll - Get all resource templates', () => {
    it('returns all templates without pagination', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          project_type_id: 'type-1',
          phase_id: 'phase-1',
          role_id: 'role-1',
          allocation_percentage: 50,
          project_type_name: 'Project A',
          phase_name: 'Planning',
          role_name: 'Developer'
        }
      ];

      mockDb._setQueryResult(mockTemplates);

      await controller.getAll(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(mockTemplates);
    });

    it('returns paginated templates when page/limit provided', async () => {
      mockReq.query = { page: '2', limit: '10' };

      const mockTemplates = [{ id: 'template-1' }];

      // Mock paginated query
      mockDb._setQueryResult(mockTemplates);

      // Mock count query - need to override the count behavior
      const mockCountQuery = {
        first: jest.fn().mockResolvedValue({ count: 25 })
      };

      mockDb.count = jest.fn().mockReturnValue(mockCountQuery);

      await controller.getAll(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        data: mockTemplates,
        pagination: {
          page: 2,
          limit: 10,
          total: 25,
          totalPages: 3
        }
      });
    });

    it('applies filters when provided', async () => {
      mockReq.query = {
        project_type_id: 'type-1',
        phase_id: 'phase-1',
        role_id: 'role-1'
      };

      mockDb._setQueryResult([]);

      await controller.getAll(mockReq, mockRes);
      await flushPromises();

      // Should have called buildFilters
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('handles database errors gracefully', async () => {
      mockDb.join = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.getAll(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getByProjectType - Get templates for project type', () => {
    beforeEach(() => {
      mockReq.params = { project_type_id: 'type-1' };
    });

    it('returns templates grouped by phase', async () => {
      const mockAllocations = [
        {
          id: 'template-1',
          phase_id: 'phase-1',
          phase_name: 'Planning',
          phase_order: 1,
          role_id: 'role-1',
          role_name: 'Developer',
          allocation_percentage: 50
        },
        {
          id: 'template-2',
          phase_id: 'phase-1',
          phase_name: 'Planning',
          phase_order: 1,
          role_id: 'role-2',
          role_name: 'Designer',
          allocation_percentage: 30
        }
      ];

      const mockProjectType = { id: 'type-1', name: 'Project A' };

      mockDb._queueQueryResult(mockAllocations);
      mockDb._queueFirstResult(mockProjectType);

      await controller.getByProjectType(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        project_type: mockProjectType,
        phases: expect.arrayContaining([
          expect.objectContaining({
            phase_id: 'phase-1',
            phase_name: 'Planning',
            allocations: expect.arrayContaining([
              expect.objectContaining({ role_name: 'Developer' }),
              expect.objectContaining({ role_name: 'Designer' })
            ])
          })
        ]),
        summary: expect.objectContaining({
          total_phases: 1,
          total_allocations: 2
        })
      });
    });

    it('handles empty allocations', async () => {
      mockDb._queueQueryResult([]);
      mockDb._queueFirstResult({ id: 'type-1', name: 'Project A' });

      await controller.getByProjectType(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          phases: [],
          summary: expect.objectContaining({
            total_phases: 0,
            total_allocations: 0
          })
        })
      );
    });

    it('handles database errors gracefully', async () => {
      mockDb.join = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.getByProjectType(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('create - Create resource template', () => {
    beforeEach(() => {
      mockReq.body = {
        project_type_id: 'type-1',
        phase_id: 'phase-1',
        role_id: 'role-1',
        allocation_percentage: 50
      };
    });

    it('creates template successfully', async () => {
      const mockProjectType = { id: 'type-1', name: 'Project A', parent_id: 'parent-1' };
      const mockCreated = { id: 'template-1', ...mockReq.body };

      mockDb._queueFirstResult(mockProjectType);
      mockDb._queueFirstResult(null); // No existing allocation
      mockDb._queueInsertResult([mockCreated]);

      await controller.create(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockCreated);
    });

    it('returns 404 when project type not found', async () => {
      mockDb._setFirstResult(null);

      await controller.create(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Project type not found'
      });
    });

    it('returns 403 for default project types', async () => {
      const mockProjectType = { id: 'type-1', is_default: true };
      mockDb._queueFirstResult(mockProjectType);

      await controller.create(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Cannot modify allocations for default project types',
        message: 'Default project types are read-only. Modify the parent project type instead.'
      });
    });

    it('returns 409 when allocation already exists', async () => {
      const mockProjectType = { id: 'type-1', is_default: false };
      const mockExisting = { id: 'existing-1', ...mockReq.body };

      mockDb._queueFirstResult(mockProjectType);
      mockDb._queueFirstResult(mockExisting);

      await controller.create(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Allocation already exists',
        existing: mockExisting,
        message: 'Use PUT to update existing allocation'
      });
    });

    it('propagates template to children for parent project types', async () => {
      const mockProjectType = { id: 'type-1', name: 'Project A', parent_id: null };
      const mockCreated = { id: 'template-1', project_type_id: 'type-1' };
      const mockChildren = [{ id: 'child-1' }];

      mockDb._queueFirstResult(mockProjectType);
      mockDb._queueFirstResult(null); // No existing
      mockDb._queueInsertResult([mockCreated]);

      // Mock propagation queries
      mockDb._queueQueryResult(mockChildren);
      mockDb._queueFirstResult(null); // No override
      mockDb._queueFirstResult(null); // No inherited
      mockDb._queueInsertResult([]);
      mockDb._queueQueryResult([]); // No grandchildren

      await controller.create(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('handles database errors gracefully', async () => {
      mockDb.where = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.create(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('bulkUpdate - Bulk update templates', () => {
    beforeEach(() => {
      mockReq.body = {
        project_type_id: 'type-1',
        allocations: [
          { phase_id: 'phase-1', role_id: 'role-1', allocation_percentage: 50 },
          { phase_id: 'phase-2', role_id: 'role-2', allocation_percentage: 30 }
        ]
      };
    });

    it('creates and updates allocations successfully', async () => {
      const mockProjectType = { id: 'type-1', parent_id: 'parent-1', is_default: false };

      mockDb._queueFirstResult(mockProjectType);

      // Mock transaction
      const mockTrx = jest.fn((table: string) => ({
        where: jest.fn().mockReturnThis(),
        first: jest.fn()
          .mockResolvedValueOnce({ id: 'existing-1' }) // First allocation exists
          .mockResolvedValueOnce(null), // Second doesn't exist
        update: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 'updated-1' }]),
        insert: jest.fn().mockReturnThis()
      }));

      mockDb.transaction = jest.fn().mockImplementation(async (callback: any) => {
        const trx = mockTrx;

        // Mock first() to return different values
        const mockFirst = jest.fn()
          .mockResolvedValueOnce({ id: 'existing-1' })
          .mockResolvedValueOnce(null);

        trx.mockReturnValue({
          where: jest.fn().mockReturnThis(),
          first: mockFirst,
          update: jest.fn().mockReturnThis(),
          returning: jest.fn()
            .mockResolvedValueOnce([{ id: 'updated-1' }])
            .mockResolvedValueOnce([{ id: 'created-1' }]),
          insert: jest.fn().mockReturnThis()
        });

        return await callback(trx);
      });

      await controller.bulkUpdate(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: expect.objectContaining({
            total: 2
          })
        })
      );
    });

    it('returns 404 when project type not found', async () => {
      mockDb._setFirstResult(null);

      await controller.bulkUpdate(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 for default project types', async () => {
      const mockProjectType = { id: 'type-1', is_default: true };
      mockDb._queueFirstResult(mockProjectType);

      await controller.bulkUpdate(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('handles transaction errors gracefully', async () => {
      const mockProjectType = { id: 'type-1', is_default: false };
      mockDb._queueFirstResult(mockProjectType);
      mockDb.transaction = jest.fn().mockRejectedValue(new Error('Transaction failed'));

      await controller.bulkUpdate(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('copy - Copy templates between project types', () => {
    beforeEach(() => {
      mockReq.body = {
        source_project_type_id: 'source-1',
        target_project_type_id: 'target-1'
      };
    });

    it('copies templates successfully', async () => {
      const mockSourceType = { id: 'source-1', name: 'Source' };
      const mockTargetType = { id: 'target-1', name: 'Target' };
      const mockSourceAllocations = [
        { phase_id: 'phase-1', role_id: 'role-1', allocation_percentage: 50 }
      ];
      const mockInserted = [{ id: 'new-1', ...mockSourceAllocations[0] }];

      mockDb._queueFirstResult(mockSourceType);
      mockDb._queueFirstResult(mockTargetType);
      mockDb._queueQueryResult(mockSourceAllocations);
      mockDb._setDeleteResult(1);
      mockDb._queueInsertResult(mockInserted);

      await controller.copy(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.del).toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        source: {
          id: 'source-1',
          name: 'Source',
          allocation_count: 1
        },
        target: {
          id: 'target-1',
          name: 'Target',
          allocation_count: 1
        },
        copied_allocations: 1
      });
    });

    it('returns 404 when source project type not found', async () => {
      mockDb._queueFirstResult(null); // Source not found
      mockDb._queueFirstResult({ id: 'target-1' });

      await controller.copy(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Project type not found',
        source_exists: false,
        target_exists: true
      });
    });

    it('returns 404 when target project type not found', async () => {
      mockDb._queueFirstResult({ id: 'source-1' });
      mockDb._queueFirstResult(null); // Target not found

      await controller.copy(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when source has no allocations', async () => {
      mockDb._queueFirstResult({ id: 'source-1' });
      mockDb._queueFirstResult({ id: 'target-1' });
      mockDb._queueQueryResult([]); // No allocations

      await controller.copy(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No allocations found for source project type'
      });
    });

    it('handles database errors gracefully', async () => {
      mockDb.where = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.copy(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getTemplates - Get all project types with template counts', () => {
    it('returns templates with allocation counts', async () => {
      const mockTemplates = [
        { id: 'type-1', name: 'Project A', allocation_count: 5 },
        { id: 'type-2', name: 'Project B', allocation_count: 0 }
      ];

      // Queue the main templates query result
      mockDb._queueQueryResult(mockTemplates);

      // Queue the phase count queries for each template with allocations > 0
      mockDb._queueFirstResult({ phase_count: 3 }); // for type-1

      await controller.getTemplates(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          templates: expect.arrayContaining([
            expect.objectContaining({
              id: 'type-1',
              allocation_count: 5
            })
          ]),
          summary: expect.objectContaining({
            total_templates: 2,
            templates_with_allocations: 1,
            empty_templates: 1
          })
        })
      );
    });

    it('handles empty templates list', async () => {
      // Queue empty result for the main templates query
      mockDb._queueQueryResult([]);

      await controller.getTemplates(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: expect.objectContaining({
            total_templates: 0
          })
        })
      );
    });

    it('handles database errors gracefully', async () => {
      mockDb.leftJoin = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.getTemplates(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getSummary - Get allocation statistics', () => {
    it('returns comprehensive statistics', async () => {
      const mockStats = {
        project_types_count: 5,
        phases_count: 10,
        roles_count: 8,
        total_allocations: 50,
        avg_allocation: 45,
        max_allocation: 100,
        min_allocation: 10
      };

      const mockByProjectType = [
        { project_type: 'Project A', allocation_count: 10, total_percentage: 450 }
      ];

      const mockByRole = [
        { role: 'Developer', allocation_count: 20, avg_percentage: 50 }
      ];

      const mockOverAllocated = [
        { project_type: 'Project A', phase: 'Planning', total_percentage: 150 }
      ];

      mockDb._queueFirstResult(mockStats);
      mockDb._queueQueryResult(mockByProjectType);
      mockDb._queueQueryResult(mockByRole);
      mockDb._queueQueryResult(mockOverAllocated);

      await controller.getSummary(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        statistics: mockStats,
        by_project_type: mockByProjectType,
        by_role: mockByRole,
        over_allocated_phases: mockOverAllocated,
        summary: {
          has_over_allocations: true,
          over_allocation_count: 1
        }
      });
    });

    it('handles no over-allocations', async () => {
      mockDb._queueFirstResult({ total_allocations: 10 });
      mockDb._queueQueryResult([]);
      mockDb._queueQueryResult([]);
      mockDb._queueQueryResult([]); // No over-allocated

      await controller.getSummary(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: {
            has_over_allocations: false,
            over_allocation_count: 0
          }
        })
      );
    });

    it('handles database errors gracefully', async () => {
      mockDb.select = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.getSummary(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getEffectiveAllocations - Get effective allocations', () => {
    it('returns effective allocations for project type', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          phase_id: 'phase-1',
          phase_name: 'Planning',
          role_id: 'role-1',
          role_name: 'Developer',
          is_inherited: false
        }
      ];

      mockDb._setQueryResult(mockTemplates);

      const result = await controller.getEffectiveAllocations('type-1');

      expect(result).toEqual(mockTemplates);
    });

    it('returns empty array on error', async () => {
      mockDb.join = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await controller.getEffectiveAllocations('type-1');

      expect(result).toEqual([]);
    });
  });
});
