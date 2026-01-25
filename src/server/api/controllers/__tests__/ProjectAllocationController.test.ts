import { ProjectAllocationController } from '../ProjectAllocationController.js';
import { createMockDb, flushPromises } from './helpers/mockDb.js';

describe('ProjectAllocationController', () => {
  let controller: ProjectAllocationController;
  let mockReq: any;
  let mockRes: any;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new ProjectAllocationController();

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

  describe('getProjectAllocations - Get Project Allocations', () => {
    beforeEach(() => {
      mockReq.params = { projectId: 'proj-1' };
    });

    it('returns project allocations with summary', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Project Alpha',
        project_type_id: 'type-1'
      };

      const mockAllocations = [
        {
          id: 'alloc-1',
          project_id: 'proj-1',
          phase_id: 'phase-1',
          role_id: 'role-1',
          allocation_percentage: 50,
          is_inherited: true,
          phase_name: 'Planning',
          role_name: 'Developer'
        },
        {
          id: 'alloc-2',
          project_id: 'proj-1',
          phase_id: 'phase-2',
          role_id: 'role-2',
          allocation_percentage: 75,
          is_inherited: false,
          phase_name: 'Development',
          role_name: 'QA Engineer'
        }
      ];

      // Mock project lookup
      mockDb._queueFirstResult(mockProject);

      // Mock getEffectiveAllocations (project lookup + allocations query)
      mockDb._queueFirstResult(mockProject);
      mockDb._queueQueryResult(mockAllocations);

      await controller.getProjectAllocations(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          project: mockProject,
          allocations: mockAllocations,
          summary: {
            total_allocations: 2,
            inherited_count: 1,
            overridden_count: 1
          }
        }
      });
    });

    it('returns 404 when project not found', async () => {
      mockDb._setFirstResult(null);

      await controller.getProjectAllocations(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Project not found'
      });
    });

    it('calculates summary correctly with all inherited allocations', async () => {
      const mockProject = { id: 'proj-1', name: 'Project' };
      const mockAllocations = [
        { id: 'a1', is_inherited: true },
        { id: 'a2', is_inherited: true },
        { id: 'a3', is_inherited: true }
      ];

      mockDb._queueFirstResult(mockProject);
      mockDb._queueFirstResult(mockProject);
      mockDb._queueQueryResult(mockAllocations);

      await controller.getProjectAllocations(mockReq, mockRes);
      await flushPromises();

      const response = mockRes.json.mock.calls[0][0];
      expect(response.data.summary).toEqual({
        total_allocations: 3,
        inherited_count: 3,
        overridden_count: 0
      });
    });

    it('calculates summary correctly with no inherited allocations', async () => {
      const mockProject = { id: 'proj-1', name: 'Project' };
      const mockAllocations = [
        { id: 'a1', is_inherited: false },
        { id: 'a2', is_inherited: false }
      ];

      mockDb._queueFirstResult(mockProject);
      mockDb._queueFirstResult(mockProject);
      mockDb._queueQueryResult(mockAllocations);

      await controller.getProjectAllocations(mockReq, mockRes);
      await flushPromises();

      const response = mockRes.json.mock.calls[0][0];
      expect(response.data.summary).toEqual({
        total_allocations: 2,
        inherited_count: 0,
        overridden_count: 2
      });
    });

    it('handles empty allocations list', async () => {
      const mockProject = { id: 'proj-1', name: 'Project' };

      mockDb._queueFirstResult(mockProject);
      mockDb._queueFirstResult(mockProject);
      mockDb._queueQueryResult([]);

      await controller.getProjectAllocations(mockReq, mockRes);
      await flushPromises();

      const response = mockRes.json.mock.calls[0][0];
      expect(response.data.summary).toEqual({
        total_allocations: 0,
        inherited_count: 0,
        overridden_count: 0
      });
    });
  });

  describe('initializeProjectAllocations - Initialize from Project Type', () => {
    beforeEach(() => {
      mockReq.params = { projectId: 'proj-1' };
    });

    it('creates inherited allocations from project type templates', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Project Alpha',
        project_type_id: 'type-1'
      };

      const mockTemplates = [
        {
          id: 'template-1',
          phase_id: 'phase-1',
          role_id: 'role-1',
          allocation_percentage: 50,
          phase_name: 'Planning',
          role_name: 'Developer'
        },
        {
          id: 'template-2',
          phase_id: 'phase-2',
          role_id: 'role-2',
          allocation_percentage: 75,
          phase_name: 'Development',
          role_name: 'QA Engineer'
        }
      ];

      // Mock project lookup
      mockDb._queueFirstResult(mockProject);

      // Mock templates query
      mockDb._queueQueryResult(mockTemplates);

      // Mock insert operation
      mockDb._setInsertResult([]);

      await controller.initializeProjectAllocations(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.insert).toHaveBeenCalled();
      const insertCall = mockDb.insert.mock.calls[0][0];
      expect(insertCall).toHaveLength(2);
      expect(insertCall[0]).toMatchObject({
        project_id: 'proj-1',
        phase_id: 'phase-1',
        role_id: 'role-1',
        allocation_percentage: 50,
        is_inherited: true,
        template_id: 'template-1'
      });
      expect(insertCall[0].notes).toContain('Inherited from project type');

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.created_count).toBe(2);
    });

    it('returns 404 when project not found', async () => {
      mockDb._setFirstResult(null);

      await controller.initializeProjectAllocations(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Project not found'
      });
    });

    it('handles project type with no templates', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Project Alpha',
        project_type_id: 'type-1'
      };

      mockDb._queueFirstResult(mockProject);
      mockDb._queueQueryResult([]);

      await controller.initializeProjectAllocations(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.insert).not.toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.data.created_count).toBe(0);
      expect(response.data.allocations).toEqual([]);
    });

    it('generates unique IDs for each allocation', async () => {
      const mockProject = { id: 'proj-1', project_type_id: 'type-1' };
      const mockTemplates = [
        { id: 'template-1', phase_id: 'p1', role_id: 'r1', allocation_percentage: 50, phase_name: 'Planning', role_name: 'Dev' },
        { id: 'template-2', phase_id: 'p2', role_id: 'r2', allocation_percentage: 75, phase_name: 'Dev', role_name: 'QA' }
      ];

      mockDb._queueFirstResult(mockProject);
      mockDb._queueQueryResult(mockTemplates);
      mockDb._setInsertResult([]);

      await controller.initializeProjectAllocations(mockReq, mockRes);
      await flushPromises();

      const insertCall = mockDb.insert.mock.calls[0][0];
      const ids = insertCall.map((a: any) => a.id);
      expect(ids[0]).not.toBe(ids[1]);
      expect(ids[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });

  describe('overrideAllocation - Override or Create Allocation', () => {
    beforeEach(() => {
      mockReq.params = { projectId: 'proj-1' };
      mockReq.body = {
        phase_id: 'phase-1',
        role_id: 'role-1',
        allocation_percentage: 80,
        notes: 'Custom override'
      };
    });

    it('updates existing allocation to override', async () => {
      const mockProject = { id: 'proj-1', name: 'Project' };
      const existingAllocation = {
        id: 'alloc-1',
        project_id: 'proj-1',
        phase_id: 'phase-1',
        role_id: 'role-1',
        allocation_percentage: 50,
        is_inherited: true
      };

      // Mock project lookup
      mockDb._queueFirstResult(mockProject);

      // Mock existing allocation lookup
      mockDb._queueFirstResult(existingAllocation);

      // Mock update operation
      mockDb._queueUpdateResult([{
        ...existingAllocation,
        allocation_percentage: 80,
        is_inherited: false,
        notes: 'Custom override'
      }]);

      await controller.overrideAllocation(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          allocation_percentage: 80,
          is_inherited: false,
          notes: 'Custom override'
        })
      );

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Allocation overridden successfully');
      expect(response.data.is_inherited).toBe(false);
    });

    it('creates new allocation when none exists', async () => {
      const mockProject = { id: 'proj-1', name: 'Project' };

      // Mock project lookup
      mockDb._queueFirstResult(mockProject);

      // Mock existing allocation lookup (not found)
      mockDb._queueFirstResult(null);

      // Mock insert operation
      mockDb._queueInsertResult([{
        id: 'new-alloc-1',
        project_id: 'proj-1',
        phase_id: 'phase-1',
        role_id: 'role-1',
        allocation_percentage: 80,
        is_inherited: false,
        notes: 'Custom override'
      }]);

      await controller.overrideAllocation(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.insert).toHaveBeenCalled();
      const insertCall = mockDb.insert.mock.calls[0][0];
      expect(insertCall).toMatchObject({
        project_id: 'proj-1',
        phase_id: 'phase-1',
        role_id: 'role-1',
        allocation_percentage: 80,
        is_inherited: false,
        notes: 'Custom override'
      });

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('New allocation created successfully');
    });

    it('returns 404 when project not found', async () => {
      mockDb._setFirstResult(null);

      await controller.overrideAllocation(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Project not found'
      });
    });

    it('uses default notes when not provided for update', async () => {
      mockReq.body.notes = undefined;
      const mockProject = { id: 'proj-1' };
      const existingAllocation = { id: 'alloc-1', project_id: 'proj-1', phase_id: 'phase-1', role_id: 'role-1' };

      mockDb._queueFirstResult(mockProject);
      mockDb._queueFirstResult(existingAllocation);
      mockDb._queueUpdateResult([{ ...existingAllocation, notes: 'Overridden on...' }]);

      await controller.overrideAllocation(mockReq, mockRes);
      await flushPromises();

      const updateCall = mockDb.update.mock.calls[0][0];
      expect(updateCall.notes).toContain('Overridden on');
    });

    it('uses default notes when not provided for new allocation', async () => {
      mockReq.body.notes = undefined;
      const mockProject = { id: 'proj-1' };

      mockDb._queueFirstResult(mockProject);
      mockDb._queueFirstResult(null);
      mockDb._queueInsertResult([{ id: 'new-1' }]);

      await controller.overrideAllocation(mockReq, mockRes);
      await flushPromises();

      const insertCall = mockDb.insert.mock.calls[0][0];
      expect(insertCall.notes).toContain('Custom allocation created on');
    });
  });

  describe('resetToInherited - Reset Allocation to Template Value', () => {
    beforeEach(() => {
      mockReq.params = {
        projectId: 'proj-1',
        phaseId: 'phase-1',
        roleId: 'role-1'
      };
    });

    it('resets allocation to inherited template value', async () => {
      const mockProject = {
        id: 'proj-1',
        project_type_id: 'type-1'
      };

      const mockTemplate = {
        id: 'template-1',
        allocation_percentage: 50,
        phase_id: 'phase-1',
        role_id: 'role-1'
      };

      // Mock project lookup
      mockDb._queueFirstResult(mockProject);

      // Mock template lookup
      mockDb._queueFirstResult(mockTemplate);

      // Mock update operation
      mockDb._queueUpdateResult([{
        id: 'alloc-1',
        project_id: 'proj-1',
        phase_id: 'phase-1',
        role_id: 'role-1',
        allocation_percentage: 50,
        is_inherited: true,
        template_id: 'template-1',
        notes: 'Reset to inherited value on...'
      }]);

      await controller.resetToInherited(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          allocation_percentage: 50,
          is_inherited: true,
          template_id: 'template-1'
        })
      );

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Allocation reset to inherited value successfully');
      expect(response.data.is_inherited).toBe(true);
    });

    it('returns 404 when project not found', async () => {
      mockDb._setFirstResult(null);

      await controller.resetToInherited(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Project not found'
      });
    });

    it('returns 404 when template allocation not found', async () => {
      const mockProject = { id: 'proj-1', project_type_id: 'type-1' };

      // Mock project lookup
      mockDb._queueFirstResult(mockProject);

      // Mock template lookup (not found)
      mockDb._setFirstResult(null);

      await controller.resetToInherited(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No template allocation found to inherit from'
      });
    });

    it('includes timestamp in notes', async () => {
      const mockProject = { id: 'proj-1', project_type_id: 'type-1' };
      const mockTemplate = { id: 'template-1', allocation_percentage: 50 };

      mockDb._queueFirstResult(mockProject);
      mockDb._queueFirstResult(mockTemplate);
      mockDb._queueUpdateResult([{ id: 'alloc-1', notes: 'Reset to inherited value on...' }]);

      await controller.resetToInherited(mockReq, mockRes);
      await flushPromises();

      const updateCall = mockDb.update.mock.calls[0][0];
      expect(updateCall.notes).toContain('Reset to inherited value on');
    });
  });

  describe('deleteAllocation - Delete Project Allocation', () => {
    beforeEach(() => {
      mockReq.params = {
        projectId: 'proj-1',
        phaseId: 'phase-1',
        roleId: 'role-1'
      };
    });

    it('deletes allocation successfully', async () => {
      mockDb._setDeleteResult(1);

      await controller.deleteAllocation(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.del).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Allocation deleted successfully'
      });
    });

    it('returns 404 when allocation not found', async () => {
      mockDb._setDeleteResult(0);

      await controller.deleteAllocation(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Allocation not found'
      });
    });

    it('filters by project_id, phase_id, and role_id', async () => {
      mockDb._setDeleteResult(1);

      await controller.deleteAllocation(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.where).toHaveBeenCalledWith({
        project_id: 'proj-1',
        phase_id: 'phase-1',
        role_id: 'role-1'
      });
    });
  });

  describe('Error Handling', () => {
    it('handles database errors in getProjectAllocations', async () => {
      mockReq.params = { projectId: 'proj-1' };

      mockDb.where = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.getProjectAllocations(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('handles project deleted between queries in getProjectAllocations', async () => {
      mockReq.params = { projectId: 'proj-1' };

      const mockProject = { id: 'proj-1', name: 'Project' };

      // First query finds project
      mockDb._queueFirstResult(mockProject);
      // Second query in getEffectiveAllocations finds project deleted (race condition)
      mockDb._queueFirstResult(null);

      await controller.getProjectAllocations(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });

    it('handles database errors in initializeProjectAllocations', async () => {
      mockReq.params = { projectId: 'proj-1' };

      mockDb.where = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.initializeProjectAllocations(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});
