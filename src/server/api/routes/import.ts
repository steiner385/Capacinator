/**
 * Import Routes - ADMIN/UTILITY USE ONLY
 * 
 * These routes are maintained for administrative utility access only.
 * The Excel import functionality has been removed from the main UI.
 * 
 * Use the command-line utility instead:
 * npm run import:excel -- --file=data.xlsx [options]
 */
import { Router } from 'express';
import { ImportController } from '../controllers/ImportController.js';

const router = Router();
const controller = new ImportController();

// Excel import endpoints
router.post('/excel', controller.getUploadMiddleware(), (req, res) => controller.uploadExcel(req, res));
router.post('/validate', controller.getUploadMiddleware(), (req, res) => controller.validateFile(req, res));

// Settings endpoint
router.get('/settings', (req, res) => controller.getImportSettingsEndpoint(req, res));

// Template and history endpoints
router.get('/template', (req, res) => controller.downloadTemplate(req, res));
router.get('/history', (req, res) => controller.getImportHistory(req, res));

export default router;