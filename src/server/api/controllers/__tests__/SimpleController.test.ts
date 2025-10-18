import { SimpleController } from '../SimpleController.js';
import { createMockDb } from './helpers/mockDb.js';

// Helper to flush promises
const flushPromises = () => new Promise(resolve => setImmediate(resolve));

describe('SimpleController', () => {
  let controller: SimpleController;
  let mockReq: any;
  let mockRes: any;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new SimpleController('test_table');
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
    mockDb = createMockDb();
    (controller as any).db = mockDb;
    mockDb._reset();
  });

  describe('getAll - Get all items', () => {
    it('returns all items without pagination', async () => {
      const mockItems = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' }
      ];

      mockDb._queueQueryResult(mockItems);

      await controller.getAll(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        data: mockItems
      });
    });

    it('returns paginated items when page/limit provided', async () => {
      mockReq.query = { page: '2', limit: '10' };
      const mockItems = [{ id: '1', name: 'Item 1' }];
      const mockCount = { count: 25 };

      mockDb._queueQueryResult(mockItems);
      mockDb._queueFirstResult(mockCount);

      await controller.getAll(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        data: mockItems,
        pagination: {
          page: 2,
          limit: 10,
          total: 25,
          totalPages: 3
        }
      });
    });

    it('applies search filter when search query provided', async () => {
      mockReq.query = { search: 'test' };
      const mockItems = [{ id: '1', name: 'Test Item' }];

      mockDb._queueQueryResult(mockItems);

      await controller.getAll(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.where).toHaveBeenCalledWith('name', 'like', '%test%');
      expect(mockRes.json).toHaveBeenCalledWith({
        data: mockItems
      });
    });

    it('applies search filter with pagination', async () => {
      mockReq.query = { search: 'test', page: '1', limit: '10' };
      const mockItems = [{ id: '1', name: 'Test Item' }];
      const mockCount = { count: 1 };

      mockDb._queueQueryResult(mockItems);
      mockDb._queueFirstResult(mockCount);

      await controller.getAll(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.where).toHaveBeenCalledWith('name', 'like', '%test%');
      expect(mockRes.json).toHaveBeenCalledWith({
        data: mockItems,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      });
    });

    it('orders by name for tables with name column', async () => {
      const locationsController = new SimpleController('locations');
      (locationsController as any).db = mockDb;
      const mockItems = [{ id: '1', name: 'Location A' }];

      mockDb._queueQueryResult(mockItems);

      await locationsController.getAll(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.orderBy).toHaveBeenCalledWith('name');
    });

    it('does not order by name for tables without name column', async () => {
      const assignmentsController = new SimpleController('assignments');
      (assignmentsController as any).db = mockDb;
      const mockItems = [{ id: '1', project_id: 'p1' }];

      mockDb._queueQueryResult(mockItems);

      await assignmentsController.getAll(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.orderBy).not.toHaveBeenCalled();
    });

    it('uses default pagination values when not provided', async () => {
      mockReq.query = { page: undefined, limit: undefined };
      const mockItems = [{ id: '1', name: 'Item 1' }];

      mockDb._queueQueryResult(mockItems);

      await controller.getAll(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        data: mockItems
      });
    });

    it('handles zero total count in pagination', async () => {
      mockReq.query = { page: '1', limit: '10' };
      const mockCount = { count: 0 };

      mockDb._queueQueryResult([]);
      mockDb._queueFirstResult(mockCount);

      await controller.getAll(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      });
    });

    it('handles null count result gracefully', async () => {
      mockReq.query = { page: '1', limit: '10' };

      mockDb._queueQueryResult([]);
      mockDb._queueFirstResult(null);

      await controller.getAll(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      });
    });
  });

  describe('getById - Get item by ID', () => {
    it('returns item when found', async () => {
      mockReq.params = { id: 'test-id' };
      const mockItem = { id: 'test-id', name: 'Test Item' };

      mockDb._queueFirstResult(mockItem);

      await controller.getById(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.where).toHaveBeenCalledWith('id', 'test-id');
      expect(mockRes.json).toHaveBeenCalledWith({
        data: mockItem
      });
    });

    it('returns 404 when item not found', async () => {
      mockReq.params = { id: 'nonexistent' };

      mockDb._queueFirstResult(null);

      await controller.getById(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'test_tabl not found'
      });
    });

    it('converts plural table name to singular in error message', async () => {
      const rolesController = new SimpleController('roles');
      (rolesController as any).db = mockDb;
      mockReq.params = { id: 'nonexistent' };

      mockDb._queueFirstResult(null);

      await rolesController.getById(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'role not found'
      });
    });
  });

  describe('create - Create new item', () => {
    it('creates item with timestamps', async () => {
      mockReq.body = { name: 'New Item', description: 'Test' };
      const mockCreated = { id: 'new-id', name: 'New Item', description: 'Test' };

      mockDb._queueInsertResult([mockCreated]);

      await controller.create(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.insert).toHaveBeenCalled();
      const insertCall = mockDb.insert.mock.calls[0][0];
      expect(insertCall.name).toBe('New Item');
      expect(insertCall.description).toBe('Test');
      expect(insertCall.created_at).toBeInstanceOf(Date);
      expect(insertCall.updated_at).toBeInstanceOf(Date);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: mockCreated
      });
    });

    it('preserves all fields from request body', async () => {
      mockReq.body = {
        name: 'Item',
        custom_field: 'value',
        another_field: 123
      };
      const mockCreated = { id: 'id', ...mockReq.body };

      mockDb._queueInsertResult([mockCreated]);

      await controller.create(mockReq, mockRes);
      await flushPromises();

      const insertCall = mockDb.insert.mock.calls[0][0];
      expect(insertCall.name).toBe('Item');
      expect(insertCall.custom_field).toBe('value');
      expect(insertCall.another_field).toBe(123);
    });
  });

  describe('update - Update existing item', () => {
    it('updates item and returns updated data', async () => {
      mockReq.params = { id: 'test-id' };
      mockReq.body = { name: 'Updated Name' };
      const mockUpdated = { id: 'test-id', name: 'Updated Name' };

      mockDb._queueUpdateResult([mockUpdated]);

      await controller.update(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.where).toHaveBeenCalledWith('id', 'test-id');
      expect(mockDb.update).toHaveBeenCalled();
      const updateCall = mockDb.update.mock.calls[0][0];
      expect(updateCall.name).toBe('Updated Name');
      expect(updateCall.updated_at).toBeInstanceOf(Date);

      expect(mockRes.json).toHaveBeenCalledWith({
        data: mockUpdated
      });
    });

    it('returns 404 when item not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockReq.body = { name: 'Updated' };

      mockDb._queueUpdateResult([]);

      await controller.update(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'test_tabl not found'
      });
    });

    it('preserves all update fields', async () => {
      mockReq.params = { id: 'test-id' };
      mockReq.body = {
        name: 'Name',
        field1: 'value1',
        field2: 42
      };
      const mockUpdated = { id: 'test-id', ...mockReq.body };

      mockDb._queueUpdateResult([mockUpdated]);

      await controller.update(mockReq, mockRes);
      await flushPromises();

      const updateCall = mockDb.update.mock.calls[0][0];
      expect(updateCall.name).toBe('Name');
      expect(updateCall.field1).toBe('value1');
      expect(updateCall.field2).toBe(42);
      expect(updateCall.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('delete - Delete item', () => {
    it('deletes item and returns success message', async () => {
      mockReq.params = { id: 'test-id' };

      mockDb._setDeleteResult(1);

      await controller.delete(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.where).toHaveBeenCalledWith('id', 'test-id');
      expect(mockDb.del).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'test_tabl deleted successfully'
      });
    });

    it('returns 404 when item not found', async () => {
      mockReq.params = { id: 'nonexistent' };

      mockDb._setDeleteResult(0);

      await controller.delete(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'test_tabl not found'
      });
    });

    it('uses singular table name in success message', async () => {
      const locationsController = new SimpleController('locations');
      (locationsController as any).db = mockDb;
      mockReq.params = { id: 'loc-id' };

      mockDb._setDeleteResult(1);

      await locationsController.delete(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'location deleted successfully'
      });
    });
  });

  describe('Constructor and table name handling', () => {
    it('initializes with correct table name', () => {
      const rolesController = new SimpleController('roles');
      expect((rolesController as any).tableName).toBe('roles');
    });

    it('works with different table names', async () => {
      const projectsController = new SimpleController('projects');
      (projectsController as any).db = mockDb;
      const mockItems = [{ id: '1', name: 'Project 1' }];

      mockDb._queueQueryResult(mockItems);

      await projectsController.getAll(mockReq, mockRes);
      await flushPromises();

      expect(mockDb).toHaveBeenCalledWith('projects');
    });
  });
});
