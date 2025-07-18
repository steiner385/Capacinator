import { UserPermissionsController } from '../../../../src/server/api/controllers/UserPermissionsController.js';
import { Request, Response } from 'express';
import { jest } from '@jest/globals';

// Mock database
const createMockQuery = () => {
  const query = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    first: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    distinct: jest.fn().mockReturnThis(),
    as: jest.fn().mockReturnThis(),
    onConflict: jest.fn().mockReturnThis(),
    merge: jest.fn().mockReturnThis()
  };
  return query;
};

describe('UserPermissionsController', () => {
  let controller: UserPermissionsController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    controller = new UserPermissionsController();
    (controller as any).db = jest.fn(() => createMockQuery());

    mockReq = {
      body: {},
      params: {},
      query: {}
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('getSystemPermissions', () => {
    it('should return all system permissions grouped by category', async () => {
      const mockPermissions = [
        { id: '1', name: 'people:view', description: 'View people', category: 'people' },
        { id: '2', name: 'people:edit', description: 'Edit people', category: 'people' },
        { id: '3', name: 'projects:view', description: 'View projects', category: 'projects' }
      ];

      const mockQuery = createMockQuery();
      mockQuery.orderBy.mockResolvedValue(mockPermissions);
      (controller as any).db = jest.fn(() => mockQuery);

      await controller.getSystemPermissions(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          permissions: mockPermissions,
          permissionsByCategory: {
            people: [
              { id: '1', name: 'people:view', description: 'View people', category: 'people' },
              { id: '2', name: 'people:edit', description: 'Edit people', category: 'people' }
            ],
            projects: [
              { id: '3', name: 'projects:view', description: 'View projects', category: 'projects' }
            ]
          }
        }
      });
    });
  });

  describe('getUserRoles', () => {
    it('should return all user roles', async () => {
      const mockRoles = [
        {
          id: '1',
          name: 'Admin',
          description: 'System Administrator',
          priority: 1,
          is_system_admin: true,
          permissions: [{ name: 'system:admin' }]
        },
        {
          id: '2',
          name: 'User',
          description: 'Regular User',
          priority: 2,
          is_system_admin: false,
          permissions: [{ name: 'people:view' }]
        }
      ];

      const mockQuery = createMockQuery();
      mockQuery.orderBy.mockResolvedValue(mockRoles);
      (controller as any).db = jest.fn(() => mockQuery);

      await controller.getUserRoles(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockRoles.map(role => ({
          ...role,
          permissions: [{ name: 'system:admin' }]
        }))
      });
    });
  });

  describe('createUserRole', () => {
    it('should create a new user role', async () => {
      const newRole = {
        name: 'Project Manager',
        description: 'Manages projects',
        priority: 3,
        is_system_admin: false,
        permissions: ['projects:view', 'projects:edit']
      };

      mockReq.body = newRole;

      const mockQuery = createMockQuery();
      const mockRole = { id: '3', ...newRole };
      mockQuery.returning.mockResolvedValue([mockRole]);
      (controller as any).db = jest.fn(() => mockQuery);

      await controller.createUserRole(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockRole
      });
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteRole = {
        name: 'Test Role'
        // Missing other required fields
      };

      mockReq.body = incompleteRole;

      await controller.createUserRole(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Missing required fields: name, description, priority, is_system_admin'
      });
    });
  });

  describe('updateUserRole', () => {
    it('should update an existing user role', async () => {
      const updateData = {
        name: 'Updated Role',
        description: 'Updated description'
      };

      mockReq.params = { roleId: '1' };
      mockReq.body = updateData;

      const mockQuery = createMockQuery();
      const mockUpdatedRole = { id: '1', ...updateData };
      mockQuery.returning.mockResolvedValue([mockUpdatedRole]);
      (controller as any).db = jest.fn(() => mockQuery);

      await controller.updateUserRole(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedRole
      });
    });
  });

  describe('deleteUserRole', () => {
    it('should delete a user role', async () => {
      mockReq.params = { roleId: '1' };

      const mockQuery = createMockQuery();
      mockQuery.del.mockResolvedValue(1); // One row deleted
      (controller as any).db = jest.fn(() => mockQuery);

      await controller.deleteUserRole(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'User role deleted successfully'
      });
    });

    it('should return 404 if role not found', async () => {
      mockReq.params = { roleId: '999' };

      const mockQuery = createMockQuery();
      mockQuery.del.mockResolvedValue(0); // No rows deleted
      (controller as any).db = jest.fn(() => mockQuery);

      await controller.deleteUserRole(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'User role not found'
      });
    });
  });

  describe('getUsersList', () => {
    it('should return paginated list of users with roles and permissions', async () => {
      const mockUsers = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          role_name: 'Admin',
          is_active: true,
          last_login: '2023-01-01',
          permission_overrides: 0
        }
      ];

      const mockQuery = createMockQuery();
      mockQuery.first.mockResolvedValue({ count: 1 });
      mockQuery.orderBy.mockResolvedValue(mockUsers);
      (controller as any).db = jest.fn(() => mockQuery);

      await controller.getUsersList(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          users: mockUsers,
          pagination: {
            page: 1,
            limit: 50,
            total: 1,
            totalPages: 1
          }
        }
      });
    });
  });

  describe('getUserPermissions', () => {
    it('should return user permissions including role and overrides', async () => {
      mockReq.params = { userId: '1' };

      const mockUser = {
        id: '1',
        name: 'John Doe',
        role_name: 'Admin',
        role_permissions: [{ name: 'system:admin' }]
      };

      const mockOverrides = [{ permission_name: 'people:edit', granted: true }];

      const mockQuery = createMockQuery();
      mockQuery.first.mockResolvedValue(mockUser);
      mockQuery.orderBy.mockResolvedValue(mockOverrides);
      (controller as any).db = jest.fn(() => mockQuery);

      await controller.getUserPermissions(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: mockUser,
          rolePermissions: [{ name: 'system:admin' }],
          permissionOverrides: mockOverrides,
          effectivePermissions: expect.any(Array)
        }
      });
    });

    it('should return 404 if user not found', async () => {
      mockReq.params = { userId: '999' };

      const mockQuery = createMockQuery();
      mockQuery.first.mockResolvedValue(null);
      (controller as any).db = jest.fn(() => mockQuery);

      await controller.getUserPermissions(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'User not found'
      });
    });
  });

  describe('updateUserRole assignment', () => {
    it('should update user role assignment', async () => {
      mockReq.params = { userId: '1' };
      mockReq.body = { roleId: '2' };

      const mockQuery = createMockQuery();
      mockQuery.update.mockResolvedValue(1);
      (controller as any).db = jest.fn(() => mockQuery);

      await controller.updateUserRoleAssignment(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'User role updated successfully'
      });
    });
  });

  describe('updateUserPermissionOverrides', () => {
    it('should update user permission overrides', async () => {
      mockReq.params = { userId: '1' };
      mockReq.body = {
        overrides: [
          { permissionId: 'perm1', granted: true },
          { permissionId: 'perm2', granted: false }
        ]
      };

      const mockQuery = createMockQuery();
      mockQuery.del.mockResolvedValue(1);
      mockQuery.insert.mockResolvedValue([]);
      (controller as any).db = jest.fn(() => mockQuery);

      await controller.updateUserPermissionOverrides(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Permission overrides updated successfully'
      });
    });

    it('should return 400 for invalid overrides format', async () => {
      mockReq.params = { userId: '1' };
      mockReq.body = { overrides: 'invalid' };

      await controller.updateUserPermissionOverrides(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'overrides must be an array'
      });
    });
  });
});