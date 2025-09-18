import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';

import { UserPermissionsController } from '../../../../src/server/api/controllers/UserPermissionsController';
import { Request, Response } from 'express';

// Mock database
const createMockQuery = (returnValue: any = []) => {
  const query: any = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    insert: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(1),
    delete: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
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
  
  // Make it thenable for async operations
  query.then = jest.fn((resolve: any) => {
    resolve(returnValue);
    return Promise.resolve(returnValue);
  });
  
  return query;
};

const mockDb = jest.fn(() => createMockQuery()) as any;
mockDb.raw = jest.fn((sql: string) => sql);

describe('UserPermissionsController', () => {
  let controller: UserPermissionsController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    controller = new UserPermissionsController(mockDb);

    mockReq = {
      body: {},
      params: {},
      query: {}
    };

    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    } as any;
  });

  describe('getSystemPermissions', () => {
    it('should return all system permissions grouped by category', async () => {
      const mockPermissions = [
        { id: '1', name: 'people:view', description: 'View people', category: 'people' },
        { id: '2', name: 'people:edit', description: 'Edit people', category: 'people' },
        { id: '3', name: 'projects:view', description: 'View projects', category: 'projects' }
      ];

      const mockQuery = createMockQuery(mockPermissions);
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

      const mockQuery = createMockQuery(mockRoles);
      (controller as any).db = jest.fn(() => mockQuery);

      await controller.getUserRoles(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockRoles
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

      // First query for count
      const mockCountQuery = createMockQuery();
      mockCountQuery.first.mockResolvedValue({ count: 1 });
      
      // Second query for users
      const mockUsersQuery = createMockQuery(mockUsers);
      
      // Third query for permission counts
      const mockPermissionCountsQuery = createMockQuery([]);
      
      let callCount = 0;
      (controller as any).db = jest.fn(() => {
        callCount++;
        if (callCount === 1) return mockCountQuery;
        if (callCount === 2) return mockUsersQuery;
        return mockPermissionCountsQuery;
      });

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

      // First query for user
      const mockUserQuery = createMockQuery();
      mockUserQuery.first.mockResolvedValue(mockUser);
      
      // Second query for role (mock subquery)
      const mockRoleQuery = createMockQuery();
      mockRoleQuery.first.mockResolvedValue({ role_id: 'role-1', permissions: ['projects:view'] });
      
      // Third query for overrides
      const mockOverridesQuery = createMockQuery(mockOverrides);
      
      let callCount = 0;
      (controller as any).db = jest.fn(() => {
        callCount++;
        if (callCount === 1) return mockUserQuery;
        if (callCount === 2) return mockRoleQuery;
        return mockOverridesQuery;
      });
      (controller as any).db.raw = jest.fn((sql: string) => sql);

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

  describe('updateUserRole', () => {
    it('should update user role assignment', async () => {
      mockReq.params = { userId: '1' };
      mockReq.body = { roleId: '2' };

      // First query to check user exists
      const mockUserQuery = createMockQuery();
      mockUserQuery.first.mockResolvedValue({ id: '1', name: 'Test User' });
      
      // Second query to check role exists
      const mockRoleQuery = createMockQuery();
      mockRoleQuery.first.mockResolvedValue({ id: '2', name: 'Test Role' });
      
      // Third query to update user role
      const mockUpdateQuery = createMockQuery();
      mockUpdateQuery.update.mockResolvedValue(1);
      
      let callCount = 0;
      (controller as any).db = jest.fn(() => {
        callCount++;
        if (callCount === 1) return mockUserQuery;
        if (callCount === 2) return mockRoleQuery;
        return mockUpdateQuery;
      });

      await controller.updateUserRole(mockReq as Request, mockRes as Response);

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

      // First query to check user exists
      const mockUserQuery = createMockQuery();
      mockUserQuery.first.mockResolvedValue({ id: '1', name: 'Test User' });
      
      // Second query to delete existing overrides
      const mockDeleteQuery = createMockQuery();
      mockDeleteQuery.del.mockResolvedValue(1);
      
      // Third query to insert new overrides
      const mockInsertQuery = createMockQuery();
      mockInsertQuery.insert.mockResolvedValue([]);
      
      let callCount = 0;
      (controller as any).db = jest.fn(() => {
        callCount++;
        if (callCount === 1) return mockUserQuery;
        if (callCount === 2) return mockDeleteQuery;
        return mockInsertQuery;
      });

      await controller.updateUserPermission(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Permission overrides updated successfully'
      });
    });

    it('should return 400 for invalid overrides format', async () => {
      mockReq.params = { userId: '1' };
      mockReq.body = { overrides: 'invalid' };
      
      // First query to check user exists
      const mockUserQuery = createMockQuery();
      mockUserQuery.first.mockResolvedValue({ id: '1', name: 'Test User' });
      
      (controller as any).db = jest.fn(() => mockUserQuery);

      await controller.updateUserPermission(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'overrides must be an array'
      });
    });
  });
});