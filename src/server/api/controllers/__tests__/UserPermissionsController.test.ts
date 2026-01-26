import { UserPermissionsController } from '../UserPermissionsController.js';
import { createMockDb, flushPromises } from './helpers/mockDb.js';

describe('UserPermissionsController', () => {
  let controller: UserPermissionsController;
  let mockReq: any;
  let mockRes: any;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new UserPermissionsController();

    // Create mock request
    mockReq = {
      query: {},
      params: {},
      body: {},
      headers: {},
      user: { id: 'admin-user' }
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

  describe('getSystemPermissions - Get all system permissions', () => {
    it('returns permissions grouped by category', async () => {
      const mockPermissions = [
        { id: 'perm-1', name: 'view_projects', category: 'projects', description: 'View projects' },
        { id: 'perm-2', name: 'edit_projects', category: 'projects', description: 'Edit projects' },
        { id: 'perm-3', name: 'view_roles', category: 'roles', description: 'View roles' }
      ];

      mockDb._setQueryResult(mockPermissions);

      await controller.getSystemPermissions(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          permissions: mockPermissions,
          permissionsByCategory: {
            projects: [mockPermissions[0], mockPermissions[1]],
            roles: [mockPermissions[2]]
          }
        }
      });
    });

    it('filters only active permissions', async () => {
      mockDb._setQueryResult([]);

      await controller.getSystemPermissions(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.where).toHaveBeenCalledWith('is_active', true);
    });

    it('handles empty permissions list', async () => {
      mockDb._setQueryResult([]);

      await controller.getSystemPermissions(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          permissions: [],
          permissionsByCategory: {}
        }
      });
    });

    it('handles database errors gracefully', async () => {
      mockDb.select = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.getSystemPermissions(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getUserRoles - Get all user roles', () => {
    it('returns all active user roles', async () => {
      const mockRoles = [
        { id: 'role-1', name: 'Admin', priority: 1 },
        { id: 'role-2', name: 'Manager', priority: 2 }
      ];

      mockDb._setQueryResult(mockRoles);

      await controller.getUserRoles(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.where).toHaveBeenCalledWith('is_active', true);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockRoles
      });
    });

    it('orders roles by priority', async () => {
      mockDb._setQueryResult([]);

      await controller.getUserRoles(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.orderBy).toHaveBeenCalledWith('priority', 'asc');
    });

    it('handles database errors gracefully', async () => {
      mockDb.select = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.getUserRoles(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getRolePermissions - Get permissions for role', () => {
    beforeEach(() => {
      mockReq.params = { roleId: 'role-1' };
    });

    it('returns role permissions with details', async () => {
      const mockRolePermissions = [
        {
          permission_id: 'perm-1',
          permission_name: 'view_projects',
          permission_description: 'View projects',
          permission_category: 'projects',
          role_name: 'Admin'
        }
      ];

      mockDb._setQueryResult(mockRolePermissions);

      await controller.getRolePermissions(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.where).toHaveBeenCalledWith('user_role_permissions.user_role_id', 'role-1');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockRolePermissions
      });
    });

    it('handles roles with no permissions', async () => {
      mockDb._setQueryResult([]);

      await controller.getRolePermissions(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: []
      });
    });

    it('handles database errors gracefully', async () => {
      mockDb.join = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.getRolePermissions(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateRolePermissions - Update role permissions', () => {
    beforeEach(() => {
      mockReq.params = { roleId: 'role-1' };
      mockReq.body = {
        permissionIds: ['perm-1', 'perm-2']
      };
    });

    it('updates role permissions successfully', async () => {
      const mockRole = { id: 'role-1', name: 'Admin' };

      // Mock role lookup
      mockDb._queueFirstResult(mockRole);

      // Mock existing permissions query
      mockDb._queueQueryResult([]);

      // Create transaction mock that properly chains methods
      const mockTrx = jest.fn((table: string) => ({
        where: jest.fn().mockReturnThis(),
        del: jest.fn().mockResolvedValue(1),
        insert: jest.fn().mockResolvedValue([])
      }));

      // Mock transaction to execute callback with proper trx
      mockDb.transaction = jest.fn().mockImplementation(async (callback: any) => {
        const trxResult = await callback(mockTrx);
        return trxResult;
      });

      await controller.updateRolePermissions(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Role permissions updated successfully'
      });
    });

    it('returns 404 when role not found', async () => {
      mockDb._setFirstResult(null);

      await controller.updateRolePermissions(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('handles empty permission list', async () => {
      mockReq.body.permissionIds = [];

      const mockRole = { id: 'role-1', name: 'Admin' };
      mockDb._queueFirstResult(mockRole);
      mockDb._queueQueryResult([]);

      const mockTrx = jest.fn((table: string) => ({
        where: jest.fn().mockReturnThis(),
        del: jest.fn().mockResolvedValue(1)
      }));

      mockDb.transaction = jest.fn().mockImplementation(async (callback: any) => {
        return await callback(mockTrx);
      });

      await controller.updateRolePermissions(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Role permissions updated successfully'
      });
    });

    it('logs audit event when logAuditEvent available', async () => {
      const mockRole = { id: 'role-1', name: 'Admin' };
      const mockExistingPerms = [{ permission_id: 'perm-old' }];

      mockReq.logAuditEvent = jest.fn().mockResolvedValue(undefined);
      mockDb._queueFirstResult(mockRole);
      mockDb._queueQueryResult(mockExistingPerms);

      const mockTrx = jest.fn((table: string) => ({
        where: jest.fn().mockReturnThis(),
        del: jest.fn().mockResolvedValue(1),
        insert: jest.fn().mockResolvedValue([])
      }));

      mockDb.transaction = jest.fn().mockImplementation(async (callback: any) => {
        return await callback(mockTrx);
      });

      await controller.updateRolePermissions(mockReq, mockRes);
      await flushPromises();

      expect(mockReq.logAuditEvent).toHaveBeenCalledWith(
        'user_role_permissions',
        'role-1',
        'UPDATE',
        { existing_permissions: mockExistingPerms },
        { new_permission_ids: ['perm-1', 'perm-2'] },
        'Role permissions updated for role Admin'
      );
    });

    it('handles transaction errors gracefully', async () => {
      const mockRole = { id: 'role-1', name: 'Admin' };
      mockDb._queueFirstResult(mockRole);
      mockDb._queueQueryResult([]);

      mockDb.transaction.mockRejectedValue(new Error('Transaction failed'));

      await controller.updateRolePermissions(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getUserPermissions - Get user permissions', () => {
    beforeEach(() => {
      mockReq.params = { userId: 'user-1' };
    });

    it('returns combined role and individual permissions', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        user_role_id: 'role-1',
        is_system_admin: false,
        role_name: 'Manager',
        role_is_admin: false
      };

      const mockRolePerms = [
        { permission_id: 'perm-1', permission_name: 'view_projects', permission_category: 'projects' }
      ];

      const mockIndividualPerms = [
        { permission_id: 'perm-2', permission_name: 'edit_projects', permission_category: 'projects', granted: true }
      ];

      // Mock user lookup
      mockDb._queueFirstResult(mockUser);

      // Mock role permissions query
      mockDb._queueQueryResult(mockRolePerms);

      // Mock individual permissions query
      mockDb._queueQueryResult(mockIndividualPerms);

      await controller.getUserPermissions(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          user: mockUser,
          rolePermissions: 1,
          individualOverrides: 1,
          permissions: expect.arrayContaining([
            expect.objectContaining({ permission_id: 'perm-1', source: 'role' }),
            expect.objectContaining({ permission_id: 'perm-2', source: 'override' })
          ])
        })
      });
    });

    it('returns 404 when user not found', async () => {
      mockDb._setFirstResult(null);

      await controller.getUserPermissions(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('handles user without role', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'John Doe',
        user_role_id: null,
        is_system_admin: false
      };

      mockDb._queueFirstResult(mockUser);
      mockDb._queueQueryResult([]); // Individual permissions

      await controller.getUserPermissions(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          rolePermissions: 0
        })
      });
    });

    it('handles database errors gracefully', async () => {
      mockDb.leftJoin = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.getUserPermissions(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateUserRole - Update user role', () => {
    beforeEach(() => {
      mockReq.params = { userId: 'user-1' };
      mockReq.body = { roleId: 'role-1' };
    });

    it('updates user role successfully', async () => {
      const mockUser = { id: 'user-1', name: 'John Doe', user_role_id: null };
      const mockRole = { id: 'role-1', name: 'Manager' };

      // Mock user lookup
      mockDb._queueFirstResult(mockUser);

      // Mock role lookup
      mockDb._queueFirstResult(mockRole);

      // Mock update
      mockDb._setUpdateResult(1);

      await controller.updateUserRole(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          user_role_id: 'role-1'
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'User role updated successfully'
      });
    });

    it('returns 404 when user not found', async () => {
      mockDb._setFirstResult(null);

      await controller.updateUserRole(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when role not found', async () => {
      const mockUser = { id: 'user-1', name: 'John Doe' };

      mockDb._queueFirstResult(mockUser);
      mockDb._setFirstResult(null); // Role not found

      await controller.updateUserRole(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('allows setting roleId to null', async () => {
      mockReq.body.roleId = null;

      const mockUser = { id: 'user-1', name: 'John Doe', user_role_id: 'role-old' };
      mockDb._queueFirstResult(mockUser);
      mockDb._setUpdateResult(1);

      await controller.updateUserRole(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          user_role_id: null
        })
      );
    });

    it('logs audit event when logAuditEvent available', async () => {
      const mockUser = { id: 'user-1', name: 'John Doe', user_role_id: 'role-old' };
      const mockRole = { id: 'role-1', name: 'Manager' };

      mockReq.logAuditEvent = jest.fn();
      mockDb._queueFirstResult(mockUser);
      mockDb._queueFirstResult(mockRole);
      mockDb._setUpdateResult(1);

      await controller.updateUserRole(mockReq, mockRes);
      await flushPromises();

      expect(mockReq.logAuditEvent).toHaveBeenCalledWith(
        'people',
        'user-1',
        'UPDATE',
        { user_role_id: 'role-old' },
        { user_role_id: 'role-1' },
        'User role updated for John Doe'
      );
    });

    it('handles database errors gracefully', async () => {
      mockDb.where = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.updateUserRole(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateUserPermission - Grant or revoke permission', () => {
    beforeEach(() => {
      mockReq.params = { userId: 'user-1' };
      mockReq.body = {
        permissionId: 'perm-1',
        granted: true,
        reason: 'Special access'
      };
    });

    it('creates new permission override', async () => {
      const mockUser = { id: 'user-1', name: 'John Doe' };
      const mockPermission = { id: 'perm-1', name: 'edit_projects' };

      // Mock user lookup
      mockDb._queueFirstResult(mockUser);

      // Mock permission lookup
      mockDb._queueFirstResult(mockPermission);

      // Mock existing override check (not found)
      mockDb._queueFirstResult(null);

      // Mock insert
      mockDb._setInsertResult([]);

      await controller.updateUserPermission(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          person_id: 'user-1',
          permission_id: 'perm-1',
          granted: true,
          reason: 'Special access'
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Permission granted successfully'
      });
    });

    it('updates existing permission override', async () => {
      const mockUser = { id: 'user-1', name: 'John Doe' };
      const mockPermission = { id: 'perm-1', name: 'edit_projects' };
      const mockExistingOverride = {
        person_id: 'user-1',
        permission_id: 'perm-1',
        granted: false
      };

      mockDb._queueFirstResult(mockUser);
      mockDb._queueFirstResult(mockPermission);
      mockDb._queueFirstResult(mockExistingOverride);
      mockDb._setUpdateResult(1);

      await controller.updateUserPermission(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          granted: true,
          reason: 'Special access'
        })
      );
    });

    it('returns 404 when user not found', async () => {
      mockDb._setFirstResult(null);

      await controller.updateUserPermission(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when permission not found', async () => {
      const mockUser = { id: 'user-1', name: 'John Doe' };

      mockDb._queueFirstResult(mockUser);
      mockDb._setFirstResult(null); // Permission not found

      await controller.updateUserPermission(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('handles revoke permission', async () => {
      mockReq.body.granted = false;

      const mockUser = { id: 'user-1', name: 'John Doe' };
      const mockPermission = { id: 'perm-1', name: 'edit_projects' };

      mockDb._queueFirstResult(mockUser);
      mockDb._queueFirstResult(mockPermission);
      mockDb._queueFirstResult(null);
      mockDb._setInsertResult([]);

      await controller.updateUserPermission(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Permission revoked successfully'
      });
    });

    it('logs audit event for create when logAuditEvent available', async () => {
      const mockUser = { id: 'user-1', name: 'John Doe' };
      const mockPermission = { id: 'perm-1', name: 'edit_projects' };

      mockReq.logAuditEvent = jest.fn();
      mockDb._queueFirstResult(mockUser);
      mockDb._queueFirstResult(mockPermission);
      mockDb._queueFirstResult(null);
      mockDb._setInsertResult([]);

      await controller.updateUserPermission(mockReq, mockRes);
      await flushPromises();

      expect(mockReq.logAuditEvent).toHaveBeenCalledWith(
        'user_permissions',
        'user-1-perm-1',
        'CREATE',
        null,
        expect.objectContaining({
          permission_name: 'edit_projects'
        }),
        'User permission granted for John Doe: edit_projects'
      );
    });

    it('logs audit event for update when logAuditEvent available', async () => {
      const mockUser = { id: 'user-1', name: 'John Doe' };
      const mockPermission = { id: 'perm-1', name: 'edit_projects' };
      const mockExistingOverride = { granted: false };

      mockReq.logAuditEvent = jest.fn();
      mockDb._queueFirstResult(mockUser);
      mockDb._queueFirstResult(mockPermission);
      mockDb._queueFirstResult(mockExistingOverride);
      mockDb._setUpdateResult(1);

      await controller.updateUserPermission(mockReq, mockRes);
      await flushPromises();

      expect(mockReq.logAuditEvent).toHaveBeenCalledWith(
        'user_permissions',
        'user-1-perm-1',
        'UPDATE',
        mockExistingOverride,
        expect.objectContaining({
          permission_name: 'edit_projects'
        }),
        'User permission granted for John Doe: edit_projects'
      );
    });

    it('handles database errors gracefully', async () => {
      mockDb.where = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.updateUserPermission(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('removeUserPermissionOverride - Remove permission override', () => {
    beforeEach(() => {
      mockReq.params = {
        userId: 'user-1',
        permissionId: 'perm-1'
      };
    });

    it('removes permission override successfully', async () => {
      const mockExistingOverride = {
        person_id: 'user-1',
        permission_id: 'perm-1',
        granted: true,
        permission_name: 'edit_projects',
        user_name: 'John Doe'
      };

      // Mock existing override lookup
      mockDb._queueFirstResult(mockExistingOverride);

      // Mock delete
      mockDb._setDeleteResult(1);

      await controller.removeUserPermissionOverride(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.del).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Permission override removed successfully'
      });
    });

    it('returns 404 when override not found (before delete)', async () => {
      mockDb._setFirstResult(null);

      await controller.removeUserPermissionOverride(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when delete count is zero', async () => {
      const mockExistingOverride = {
        person_id: 'user-1',
        permission_id: 'perm-1',
        permission_name: 'edit_projects',
        user_name: 'John Doe'
      };

      mockDb._queueFirstResult(mockExistingOverride);
      mockDb._setDeleteResult(0);

      await controller.removeUserPermissionOverride(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('logs audit event when logAuditEvent available', async () => {
      const mockExistingOverride = {
        person_id: 'user-1',
        permission_id: 'perm-1',
        granted: true,
        permission_name: 'edit_projects',
        user_name: 'John Doe'
      };

      mockReq.logAuditEvent = jest.fn();
      mockDb._queueFirstResult(mockExistingOverride);
      mockDb._setDeleteResult(1);

      await controller.removeUserPermissionOverride(mockReq, mockRes);
      await flushPromises();

      expect(mockReq.logAuditEvent).toHaveBeenCalledWith(
        'user_permissions',
        'user-1-perm-1',
        'DELETE',
        mockExistingOverride,
        null,
        'Permission override removed for John Doe: edit_projects'
      );
    });

    it('handles database errors gracefully', async () => {
      mockDb.join = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.removeUserPermissionOverride(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getUsersList - Get users with roles', () => {
    it('returns users with roles and permission counts', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          is_system_admin: false,
          is_active: true,
          last_login: new Date('2025-01-01'),
          role_name: 'Manager',
          role_priority: 2,
          primary_role_name: 'Developer'
        }
      ];

      const mockPermissionCounts = [
        { person_id: 'user-1', override_count: 3 }
      ];

      // Create a fresh mock query for each call
      const mockUsersQuery = {
        ...mockDb,
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockUsers)
      };

      const mockCountsQuery = {
        ...mockDb,
        select: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockResolvedValue(mockPermissionCounts)
      };

      // Override the table call to return different queries
      let callCount = 0;
      mockDb.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) return mockUsersQuery; // First call: people table
        return mockCountsQuery; // Second call: user_permissions table
      });

      await controller.getUsersList(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [
          expect.objectContaining({
            ...mockUsers[0],
            permission_overrides: 3
          })
        ]
      });
    });

    it('handles users without permission overrides', async () => {
      const mockUsers = [
        { id: 'user-1', name: 'John Doe', email: 'john@example.com' }
      ];

      const mockUsersQuery = {
        ...mockDb,
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockUsers)
      };

      const mockCountsQuery = {
        ...mockDb,
        select: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockResolvedValue([])
      };

      let callCount = 0;
      mockDb.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) return mockUsersQuery;
        return mockCountsQuery;
      });

      await controller.getUsersList(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [
          expect.objectContaining({
            permission_overrides: 0
          })
        ]
      });
    });

    it('handles database errors gracefully', async () => {
      mockDb.leftJoin = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.getUsersList(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('checkUserPermission - Check specific permission', () => {
    beforeEach(() => {
      mockReq.params = {
        userId: 'user-1',
        permissionName: 'edit_projects'
      };
    });

    it('returns true when user has permission', async () => {
      // Mock hasPermission to return true
      jest.spyOn(controller, 'hasPermission').mockResolvedValue(true);

      await controller.checkUserPermission(mockReq, mockRes);
      await flushPromises();

      expect(controller.hasPermission).toHaveBeenCalledWith('user-1', 'edit_projects');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          hasPermission: true,
          userId: 'user-1',
          permissionName: 'edit_projects'
        }
      });
    });

    it('returns false when user does not have permission', async () => {
      jest.spyOn(controller, 'hasPermission').mockResolvedValue(false);

      await controller.checkUserPermission(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          hasPermission: false,
          userId: 'user-1',
          permissionName: 'edit_projects'
        }
      });
    });

    it('handles database errors gracefully', async () => {
      jest.spyOn(controller, 'hasPermission').mockRejectedValue(new Error('Database error'));

      await controller.checkUserPermission(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('hasPermission - Helper method', () => {
    it('returns true for system admin', async () => {
      const mockUser = { id: 'user-1', is_system_admin: true };
      mockDb._setFirstResult(mockUser);

      const result = await controller.hasPermission('user-1', 'edit_projects');

      expect(result).toBe(true);
    });

    it('returns false for non-existent user', async () => {
      mockDb._setFirstResult(null);

      const result = await controller.hasPermission('user-1', 'edit_projects');

      expect(result).toBe(false);
    });

    it('returns granted value from individual override', async () => {
      const mockUser = { id: 'user-1', is_system_admin: false };
      const mockIndividualPerm = { granted: true };

      mockDb._queueFirstResult(mockUser);
      mockDb._queueFirstResult(mockIndividualPerm);

      const result = await controller.hasPermission('user-1', 'edit_projects');

      expect(result).toBe(true);
    });

    it('returns false when individual override denies permission', async () => {
      const mockUser = { id: 'user-1', is_system_admin: false };
      const mockIndividualPerm = { granted: false };

      mockDb._queueFirstResult(mockUser);
      mockDb._queueFirstResult(mockIndividualPerm);

      const result = await controller.hasPermission('user-1', 'edit_projects');

      expect(result).toBe(false);
    });

    it('checks role permission when no individual override', async () => {
      const mockUser = { id: 'user-1', is_system_admin: false, user_role_id: 'role-1' };
      const mockRolePerm = { permission_id: 'perm-1' };

      mockDb._queueFirstResult(mockUser);
      mockDb._queueFirstResult(null); // No individual override
      mockDb._queueFirstResult(mockRolePerm);

      const result = await controller.hasPermission('user-1', 'edit_projects');

      expect(result).toBe(true);
    });

    it('returns false when user has no role and no override', async () => {
      const mockUser = { id: 'user-1', is_system_admin: false, user_role_id: null };

      mockDb._queueFirstResult(mockUser);
      mockDb._queueFirstResult(null); // No individual override

      const result = await controller.hasPermission('user-1', 'edit_projects');

      expect(result).toBe(false);
    });

    it('returns false when role has no matching permission', async () => {
      const mockUser = { id: 'user-1', is_system_admin: false, user_role_id: 'role-1' };

      mockDb._queueFirstResult(mockUser);
      mockDb._queueFirstResult(null); // No individual override
      mockDb._setFirstResult(null); // No role permission

      const result = await controller.hasPermission('user-1', 'edit_projects');

      expect(result).toBe(false);
    });
  });
});
