import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';

import { UserPermissionsController } from '../../../../src/server/api/controllers/UserPermissionsController';
import type { Request, Response } from 'express';

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
          is_system_admin: false,
          role_priority: 1,
          primary_role_name: 'Developer'
        }
      ];

      // First query for users
      const mockUsersQuery = createMockQuery(mockUsers);
      
      // Second query for permission counts
      const mockPermissionCountsQuery = createMockQuery([
        { person_id: '1', override_count: '2' }
      ]);
      
      let callCount = 0;
      (controller as any).db = jest.fn(() => {
        callCount++;
        if (callCount === 1) return mockUsersQuery;
        return mockPermissionCountsQuery;
      });

      await controller.getUsersList(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [
          {
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            role_name: 'Admin',
            is_active: true,
            last_login: '2023-01-01',
            is_system_admin: false,
            role_priority: 1,
            primary_role_name: 'Developer',
            permission_overrides: '2'
          }
        ]
      });
    });
  });

  describe('getUserPermissions', () => {
    it('should return user permissions including role and overrides', async () => {
      mockReq.params = { userId: '1' };

      const mockUser = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        user_role_id: 'role-1',
        is_system_admin: false,
        role_name: 'Admin',
        role_is_admin: false
      };

      const mockRolePermissions = [
        {
          permission_id: 'perm-1',
          permission_name: 'projects:view',
          permission_description: 'View projects',
          permission_category: 'projects',
          source: 'role'
        }
      ];

      const mockIndividualPermissions = [
        {
          permission_id: 'perm-2',
          permission_name: 'people:edit',
          permission_description: 'Edit people',
          permission_category: 'people',
          granted: true
        }
      ];

      // First query for user
      const mockUserQuery = createMockQuery();
      mockUserQuery.first.mockResolvedValue(mockUser);
      
      // Second query for role permissions
      const mockRoleQuery = createMockQuery(mockRolePermissions);
      
      // Third query for individual permissions
      const mockIndividualQuery = createMockQuery(mockIndividualPermissions);
      
      let callCount = 0;
      const dbMock: any = jest.fn(() => {
        callCount++;
        if (callCount === 1) return mockUserQuery;
        if (callCount === 2) return mockRoleQuery;
        return mockIndividualQuery;
      });
      // Add raw method for SQL literals
      dbMock.raw = jest.fn((sql: string) => ({ sql, bindings: [] }));
      (controller as any).db = dbMock;

      await controller.getUserPermissions(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: mockUser,
          permissions: expect.arrayContaining([
            expect.objectContaining({
              permission_id: 'perm-1',
              permission_name: 'projects:view',
              source: 'role'
            }),
            expect.objectContaining({
              permission_id: 'perm-2',
              permission_name: 'people:edit',
              source: 'override'
            })
          ]),
          rolePermissions: 1,
          individualOverrides: 1
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

  describe('updateUserPermission', () => {
    it('should update user permission override', async () => {
      mockReq.params = { userId: '1' };
      mockReq.body = {
        permissionId: 'perm1',
        granted: true,
        reason: 'Test reason'
      };

      // First query to check user exists
      const mockUserQuery = createMockQuery();
      mockUserQuery.first.mockResolvedValue({ id: '1', name: 'Test User' });
      
      // Second query to check permission exists
      const mockPermissionQuery = createMockQuery();
      mockPermissionQuery.first.mockResolvedValue({ id: 'perm1', name: 'test:permission' });
      
      // Third query to check existing override
      const mockExistingQuery = createMockQuery();
      mockExistingQuery.first.mockResolvedValue(null); // No existing override
      
      // Fourth query to insert new override
      const mockInsertQuery = createMockQuery();
      
      let callCount = 0;
      (controller as any).db = jest.fn(() => {
        callCount++;
        if (callCount === 1) return mockUserQuery;
        if (callCount === 2) return mockPermissionQuery;
        if (callCount === 3) return mockExistingQuery;
        return mockInsertQuery;
      });

      await controller.updateUserPermission(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Permission granted successfully'
      });
    });

    it('should return 404 for invalid user', async () => {
      mockReq.params = { userId: '999' };
      mockReq.body = { permissionId: 'perm1', granted: true };
      
      // First query to check user exists
      const mockUserQuery = createMockQuery();
      mockUserQuery.first.mockResolvedValue(null); // User not found
      
      (controller as any).db = jest.fn(() => mockUserQuery);

      await controller.updateUserPermission(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'User not found'
      });
    });
  });
});