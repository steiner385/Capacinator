/**
 * Import/Export Routes
 * 
 * Handles Excel import and export functionality for scenario data.
 * Import routes are primarily for administrative utility access.
 * Export routes provide enhanced data export capabilities for scenarios.
 * 
 * Import via command-line utility:
 * npm run import:excel -- --file=data.xlsx [options]
 */
import { Router } from 'express';
import { ImportController } from '../controllers/ImportController.js';

const router = Router();
const controller = new ImportController();

// Excel import endpoints
router.post('/excel', controller.getUploadMiddleware(), (req, res) => controller.uploadExcel(req, res));
router.post('/validate', controller.getUploadMiddleware(), (req, res) => controller.validateFile(req, res));
router.post('/analyze', controller.getUploadMiddleware(), (req, res) => controller.analyzeImport(req, res)); // Dry-run import analysis

// Settings endpoint
router.get('/settings', (req, res) => controller.getImportSettingsEndpoint(req, res));

// Template and history endpoints
router.get('/template', (req, res) => controller.downloadTemplate(req, res));
router.get('/history', (req, res) => controller.getImportHistory(req, res));

// Export endpoints
router.get('/export/scenario', (req, res) => controller.exportScenarioData(req, res)); // Export current scenario data in re-importable format
router.get('/export/template', (req, res) => controller.downloadTemplate(req, res)); // Download enhanced blank template with formatting and instructions

export default router;