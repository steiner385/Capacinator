import type { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { ServiceContainer } from '../../services/ServiceContainer.js';

export class UserPermissionsController extends BaseController {
  constructor(container?: ServiceContainer) {
    super({}, { container });
  }

  // Get all system permissions
  async getSystemPermissions(req: Request, res: Response) {
    try {
      const permissions = await this.db('system_permissions')
        .select('*')
        .where('is_active', true)
        .orderBy('category', 'asc')
        .orderBy('name', 'asc');
      
      // Group permissions by category
      const permissionsByCategory = permissions.reduce((acc, permission) => {
        if (!acc[permission.category]) {
          acc[permission.category] = [];
        }
        acc[permission.category].push(permission);
        return acc;
      }, {});
      
      res.json({
        success: true,
        data: {
          permissions,
          permissionsByCategory
        }
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to fetch system permissions');
    }
  }

  // Get all user roles
  async getUserRoles(req: Request, res: Response) {
    try {
      const roles = await this.db('user_roles')
        .select('*')
        .where('is_active', true)
        .orderBy('priority', 'asc');
      
      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to fetch user roles');
    }
  }

  // Get role permissions
  async getRolePermissions(req: Request, res: Response) {
    try {
      const { roleId } = req.params;
      
      const rolePermissions = await this.db('user_role_permissions')
        .join('system_permissions', 'user_role_permissions.permission_id', 'system_permissions.id')
        .join('user_roles', 'user_role_permissions.user_role_id', 'user_roles.id')
        .select(
          'system_permissions.id as permission_id',
          'system_permissions.name as permission_name',
          'system_permissions.description as permission_description',
          'system_permissions.category as permission_category',
          'user_roles.name as role_name'
        )
        .where('user_role_permissions.user_role_id', roleId);
      
      res.json({
        success: true,
        data: rolePermissions
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to fetch role permissions');
    }
  }

  // Update role permissions
  async updateRolePermissions(req: Request, res: Response) {
    try {
      const { roleId } = req.params;
      const { permissionIds } = req.body;
      
      // Validate role exists
      const role = await this.db('user_roles')
        .where('id', roleId)
        .first();
      
      if (!role) {
        return this.handleNotFound(res, 'Role');
      }
      
      // Get existing permissions for audit trail
      const existingPermissions = await this.db('user_role_permissions')
        .where('user_role_id', roleId)
        .select('*');

      // Begin transaction
      await this.db.transaction(async (trx) => {
        // Remove existing permissions
        await trx('user_role_permissions')
          .where('user_role_id', roleId)
          .del();
        
        // Add new permissions
        if (permissionIds && permissionIds.length > 0) {
          const rolePermissions = permissionIds.map((permissionId: string) => ({
            user_role_id: roleId,
            permission_id: permissionId
          }));
          
          await trx('user_role_permissions').insert(rolePermissions);
        }
      });

      // Log audit event for role permissions update
      if ((req as any).logAuditEvent) {
        await (req as any).logAuditEvent(
          'user_role_permissions',
          roleId,
          'UPDATE',
          { existing_permissions: existingPermissions },
          { new_permission_ids: permissionIds },
          `Role permissions updated for role ${role.name}`
        );
      }
      
      res.json({
        success: true,
        message: 'Role permissions updated successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to update role permissions');
    }
  }

  // Get user permissions (including role-based and individual overrides)
  async getUserPermissions(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      
      // Get user details
      const user = await this.db('people')
        .leftJoin('user_roles', 'people.user_role_id', 'user_roles.id')
        .select(
          'people.id',
          'people.name',
          'people.email',
          'people.user_role_id',
          'people.is_system_admin',
          'user_roles.name as role_name',
          'user_roles.is_system_admin as role_is_admin'
        )
        .where('people.id', userId)
        .first();
      
      if (!user) {
        return this.handleNotFound(res, 'User');
      }
      
      // Get role-based permissions
      const rolePermissions = user.user_role_id ? await this.db('user_role_permissions')
        .join('system_permissions', 'user_role_permissions.permission_id', 'system_permissions.id')
        .select(
          'system_permissions.id as permission_id',
          'system_permissions.name as permission_name',
          'system_permissions.description as permission_description',
          'system_permissions.category as permission_category',
          this.db.raw("'role' as source")
        )
        .where('user_role_permissions.user_role_id', user.user_role_id) : [];
      
      // Get individual permission overrides
      const individualPermissions = await this.db('user_permissions')
        .join('system_permissions', 'user_permissions.permission_id', 'system_permissions.id')
        .select(
          'system_permissions.id as permission_id',
          'system_permissions.name as permission_name',
          'system_permissions.description as permission_description',
          'system_permissions.category as permission_category',
          'user_permissions.granted',
          'user_permissions.reason',
          'user_permissions.granted_at',
          this.db.raw("'override' as source")
        )
        .where('user_permissions.person_id', userId);
      
      // Combine permissions (individual overrides take precedence)
      const permissionMap = new Map();
      
      // Add role permissions first
      rolePermissions.forEach(perm => {
        permissionMap.set(perm.permission_id, {
          ...perm,
          granted: true,
          source: 'role'
        });
      });
      
      // Override with individual permissions
      individualPermissions.forEach(perm => {
        permissionMap.set(perm.permission_id, {
          ...perm,
          source: 'override'
        });
      });
      
      const finalPermissions = Array.from(permissionMap.values());
      
      res.json({
        success: true,
        data: {
          user,
          permissions: finalPermissions,
          rolePermissions: rolePermissions.length,
          individualOverrides: individualPermissions.length
        }
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to fetch user permissions');
    }
  }

  // Update user role
  async updateUserRole(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { roleId } = req.body;
      
      // Validate user exists
      const user = await this.db('people')
        .where('id', userId)
        .first();
      
      if (!user) {
        return this.handleNotFound(res, 'User');
      }
      
      // Validate role exists if provided
      if (roleId) {
        const role = await this.db('user_roles')
          .where('id', roleId)
          .first();
        
        if (!role) {
          return this.handleNotFound(res, 'Role');
        }
      }
      
      // Update user role
      await this.db('people')
        .where('id', userId)
        .update({
          user_role_id: roleId || null,
          updated_at: new Date()
        });

      // Log audit event for user role update
      if ((req as any).logAuditEvent) {
        await (req as any).logAuditEvent(
          'people',
          userId,
          'UPDATE',
          { user_role_id: user.user_role_id },
          { user_role_id: roleId || null },
          `User role updated for ${user.name}`
        );
      }
      
      res.json({
        success: true,
        message: 'User role updated successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to update user role');
    }
  }

  // Grant or revoke individual permission
  async updateUserPermission(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { permissionId, granted, reason } = req.body;
      
      // Validate user exists
      const user = await this.db('people')
        .where('id', userId)
        .first();
      
      if (!user) {
        return this.handleNotFound(res, 'User');
      }
      
      // Validate permission exists
      const permission = await this.db('system_permissions')
        .where('id', permissionId)
        .first();
      
      if (!permission) {
        return this.handleNotFound(res, 'Permission');
      }
      
      // Check if override already exists
      const existingOverride = await this.db('user_permissions')
        .where({
          person_id: userId,
          permission_id: permissionId
        })
        .first();
      
      if (existingOverride) {
        // Update existing override
        await this.db('user_permissions')
          .where({
            person_id: userId,
            permission_id: permissionId
          })
          .update({
            granted: granted,
            reason: reason || null,
            granted_at: new Date(),
            updated_at: new Date()
          });

        // Log audit event for permission update
        if ((req as any).logAuditEvent) {
          await (req as any).logAuditEvent(
            'user_permissions',
            `${userId}-${permissionId}`,
            'UPDATE',
            existingOverride,
            { granted, reason, permission_name: permission.name },
            `User permission ${granted ? 'granted' : 'revoked'} for ${user.name}: ${permission.name}`
          );
        }
      } else {
        // Create new override
        const newPermission = {
          person_id: userId,
          permission_id: permissionId,
          granted: granted,
          reason: reason || null,
          granted_at: new Date()
        };
        
        await this.db('user_permissions').insert(newPermission);

        // Log audit event for permission creation
        if ((req as any).logAuditEvent) {
          await (req as any).logAuditEvent(
            'user_permissions',
            `${userId}-${permissionId}`,
            'CREATE',
            null,
            { ...newPermission, permission_name: permission.name },
            `User permission ${granted ? 'granted' : 'revoked'} for ${user.name}: ${permission.name}`
          );
        }
      }
      
      res.json({
        success: true,
        message: `Permission ${granted ? 'granted' : 'revoked'} successfully`
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to update user permission');
    }
  }

  // Remove individual permission override
  async removeUserPermissionOverride(req: Request, res: Response) {
    try {
      const { userId, permissionId } = req.params;
      
      // Get the existing permission override for audit trail
      const existingOverride = await this.db('user_permissions')
        .join('system_permissions', 'user_permissions.permission_id', 'system_permissions.id')
        .join('people', 'user_permissions.person_id', 'people.id')
        .where({
          'user_permissions.person_id': userId,
          'user_permissions.permission_id': permissionId
        })
        .select(
          'user_permissions.*',
          'system_permissions.name as permission_name',
          'people.name as user_name'
        )
        .first();
      
      if (!existingOverride) {
        return this.handleNotFound(res, 'Permission override');
      }
      
      const deleted = await this.db('user_permissions')
        .where({
          person_id: userId,
          permission_id: permissionId
        })
        .del();
      
      if (deleted === 0) {
        return this.handleNotFound(res, 'Permission override');
      }

      // Log audit event for permission override removal
      if ((req as any).logAuditEvent) {
        await (req as any).logAuditEvent(
          'user_permissions',
          `${userId}-${permissionId}`,
          'DELETE',
          existingOverride,
          null,
          `Permission override removed for ${existingOverride.user_name}: ${existingOverride.permission_name}`
        );
      }
      
      res.json({
        success: true,
        message: 'Permission override removed successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to remove permission override');
    }
  }

  // Get users with their roles and permissions summary
  async getUsersList(req: Request, res: Response) {
    try {
      const users = await this.db('people')
        .leftJoin('user_roles', 'people.user_role_id', 'user_roles.id')
        .leftJoin('person_roles as primary_person_role', 'people.primary_person_role_id', 'primary_person_role.id')
        .leftJoin('roles as primary_role', 'primary_person_role.role_id', 'primary_role.id')
        .select(
          'people.id',
          'people.name',
          'people.email',
          'people.is_system_admin',
          'people.is_active',
          'people.last_login',
          'user_roles.name as role_name',
          'user_roles.priority as role_priority',
          'primary_role.name as primary_role_name'
        )
        .orderBy('people.name', 'asc');
      
      // Get permission override counts for each user
      const userPermissionCounts = await this.db('user_permissions')
        .select('person_id')
        .count('* as override_count')
        .groupBy('person_id');
      
      const countMap = new Map(
        userPermissionCounts.map(row => [row.person_id, row.override_count])
      );
      
      const usersWithCounts = users.map(user => ({
        ...user,
        permission_overrides: countMap.get(user.id) || 0
      }));
      
      res.json({
        success: true,
        data: usersWithCounts
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to fetch users list');
    }
  }

  // Check if user has specific permission
  async checkUserPermission(req: Request, res: Response) {
    try {
      const { userId, permissionName } = req.params;
      
      const hasPermission = await this.hasPermission(userId, permissionName);
      
      res.json({
        success: true,
        data: {
          hasPermission,
          userId,
          permissionName
        }
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to check user permission');
    }
  }

  // Helper method to check if user has permission
  async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    // Check if user is system admin
    const user = await this.db('people')
      .where('id', userId)
      .first();
    
    if (!user) {
      return false;
    }
    
    if (user.is_system_admin) {
      return true;
    }
    
    // Check individual permission override first
    const individualPermission = await this.db('user_permissions')
      .join('system_permissions', 'user_permissions.permission_id', 'system_permissions.id')
      .where({
        'user_permissions.person_id': userId,
        'system_permissions.name': permissionName
      })
      .first();
    
    if (individualPermission) {
      return individualPermission.granted;
    }
    
    // Check role-based permission
    if (user.user_role_id) {
      const rolePermission = await this.db('user_role_permissions')
        .join('system_permissions', 'user_role_permissions.permission_id', 'system_permissions.id')
        .where({
          'user_role_permissions.user_role_id': user.user_role_id,
          'system_permissions.name': permissionName
        })
        .first();
      
      return !!rolePermission;
    }
    
    return false;
  }
}