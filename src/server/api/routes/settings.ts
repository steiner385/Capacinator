import { Router } from 'express';
import { SettingsController } from '../controllers/SettingsController.js';

const router = Router();
const settingsController = new SettingsController();

// System settings routes
router.get('/system', settingsController.getSystemSettings);
router.post('/system', settingsController.saveSystemSettings);
router.put('/system', settingsController.saveSystemSettings); // Use same handler for PUT

// Import settings routes
router.get('/import', settingsController.getImportSettings);
router.post('/import', settingsController.saveImportSettings);
router.put('/import', settingsController.saveImportSettings); // Use same handler for PUT

export default router;