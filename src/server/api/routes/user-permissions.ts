import { Router } from 'express';
import { UserPermissionsController } from '../controllers/UserPermissionsController.js';
import { requirePermission, requireSystemAdmin } from '../../middleware/permissions.js';

const router = Router();
const controller = new UserPermissionsController();

// System permissions
router.get('/permissions', requirePermission('system:users'), (req, res) => controller.getSystemPermissions(req, res));

// User roles
router.get('/roles', requirePermission('system:users'), (req, res) => controller.getUserRoles(req, res));
router.get('/roles/:roleId/permissions', requirePermission('system:users'), (req, res) => controller.getRolePermissions(req, res));
router.put('/roles/:roleId/permissions', requireSystemAdmin(), (req, res) => controller.updateRolePermissions(req, res));

// User permissions
router.get('/users', requirePermission('system:users'), (req, res) => controller.getUsersList(req, res));
router.get('/users/:userId/permissions', requirePermission('system:users'), (req, res) => controller.getUserPermissions(req, res));
router.put('/users/:userId/role', requireSystemAdmin(), (req, res) => controller.updateUserRole(req, res));
router.put('/users/:userId/permissions', requireSystemAdmin(), (req, res) => controller.updateUserPermission(req, res));
router.delete('/users/:userId/permissions/:permissionId', requireSystemAdmin(), (req, res) => controller.removeUserPermissionOverride(req, res));

// Permission checking (allow users to check their own permissions)
router.get('/users/:userId/check/:permissionName', (req, res) => controller.checkUserPermission(req, res));

export default router;