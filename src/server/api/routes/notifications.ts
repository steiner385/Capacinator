import { Router } from 'express';
import { NotificationsController } from '../controllers/NotificationsController.js';
import { requirePermission, requireSystemAdmin } from '../../middleware/permissions.js';

const router = Router();
const controller = new NotificationsController();

// Send immediate notification - requires system admin
router.post('/send', requireSystemAdmin(), (req, res) => controller.sendNotification(req, res));

// Get user notification preferences - users can view their own or admins can view any
router.get('/preferences/:userId', requirePermission('people:view'), (req, res) => controller.getUserNotificationPreferences(req, res));

// Update user notification preferences - users can update their own or admins can update any
router.put('/preferences/:userId', requirePermission('people:edit'), (req, res) => controller.updateUserNotificationPreferences(req, res));

// Get available email templates - requires system admin
router.get('/templates', requireSystemAdmin(), (req, res) => controller.getEmailTemplates(req, res));

// Get notification history - requires system admin or user viewing their own
router.get('/history/:userId?', requirePermission('system:audit'), (req, res) => controller.getNotificationHistory(req, res));

// Send test email - requires system admin
router.post('/test', requireSystemAdmin(), (req, res) => controller.sendTestEmail(req, res));

// Check email service configuration - requires system admin
router.get('/config', requireSystemAdmin(), (req, res) => controller.checkEmailConfiguration(req, res));

// Get notification statistics - requires system admin
router.get('/stats/:userId?', requireSystemAdmin(), (req, res) => controller.getNotificationStats(req, res));

export default router;