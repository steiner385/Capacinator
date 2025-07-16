import { Router } from 'express';
import { ExportController } from '../controllers/ExportController.js';

const router = Router();
const exportController = new ExportController();

// Export routes
router.post('/reports/excel', exportController.exportReportAsExcel.bind(exportController));
router.post('/reports/csv', exportController.exportReportAsCSV.bind(exportController));
router.post('/reports/pdf', exportController.exportReportAsPDF.bind(exportController));

export default router;