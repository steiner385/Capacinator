import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { ExcelImporter } from '../../services/import/ExcelImporter.js';
import { ExcelImporterV2 } from '../../services/import/ExcelImporterV2.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

interface ImportSettings {
  clearExistingData: boolean;
  validateDuplicates: boolean;
  autoCreateMissingRoles: boolean;
  autoCreateMissingLocations: boolean;
  defaultProjectPriority: number;
  dateFormat: string;
}

/**
 * ImportController
 * 
 * ADMIN/UTILITY USE ONLY
 * 
 * This controller is maintained for administrative utility access only.
 * The Excel import functionality has been removed from the main UI to
 * streamline the user experience. Import operations should now be performed
 * using the command-line utility script: scripts/import-excel.js
 * 
 * Usage: npm run import:excel -- --file=data.xlsx [options]
 */
export class ImportController extends BaseController {
  private upload = multer({
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
        cb(null, true);
      } else {
        cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
      }
    },
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800') // 50MB default
    }
  });

  getUploadMiddleware() {
    return this.upload.single('excelFile');
  }

  private async getImportSettings(): Promise<ImportSettings> {
    try {
      const result = await this.db('settings')
        .where('category', 'import')
        .first();

      if (!result) {
        // Return default settings if none found
        return {
          clearExistingData: false,
          validateDuplicates: true,
          autoCreateMissingRoles: false,
          autoCreateMissingLocations: false,
          defaultProjectPriority: 2,
          dateFormat: 'MM/DD/YYYY'
        };
      }

      return JSON.parse(result.settings);
    } catch (error) {
      console.error('Failed to load import settings:', error);
      // Return default settings on error
      return {
        clearExistingData: false,
        validateDuplicates: true,
        autoCreateMissingRoles: false,
        autoCreateMissingLocations: false,
        defaultProjectPriority: 2,
        dateFormat: 'MM/DD/YYYY'
      };
    }
  }

  async getImportSettingsEndpoint(req: Request, res: Response) {
    try {
      const settings = await this.getImportSettings();
      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to get import settings');
    }
  }

  async uploadExcel(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please select an Excel file to upload'
        });
      }

      // Load saved import settings from database
      const savedSettings = await this.getImportSettings();
      
      // Parse import options from request body with fallback to saved settings
      const importOptions = {
        clearExisting: req.body.clearExisting === 'true' || req.body.clearExisting === true || savedSettings.clearExistingData,
        useV2: req.body.useV2 === 'true' || req.body.useV2 === true,
        validateDuplicates: req.body.validateDuplicates === 'true' || req.body.validateDuplicates === true || savedSettings.validateDuplicates,
        autoCreateMissingRoles: req.body.autoCreateMissingRoles === 'true' || req.body.autoCreateMissingRoles === true || savedSettings.autoCreateMissingRoles,
        autoCreateMissingLocations: req.body.autoCreateMissingLocations === 'true' || req.body.autoCreateMissingLocations === true || savedSettings.autoCreateMissingLocations,
        defaultProjectPriority: req.body.defaultProjectPriority ? parseInt(req.body.defaultProjectPriority) : savedSettings.defaultProjectPriority,
        dateFormat: req.body.dateFormat || savedSettings.dateFormat
      };
      
      console.log(`Starting Excel import from: ${req.file.path}`);
      console.log(`Import options:`, importOptions);
      
      const result = importOptions.useV2 
        ? await new ExcelImporterV2().importFromFile(req.file.path, importOptions.clearExisting)
        : await new ExcelImporter().importFromFile(req.file.path, importOptions.clearExisting);

      // Clean up uploaded file
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to clean up uploaded file:', cleanupError);
      }

      if (result.success) {
        res.json({
          success: true,
          message: 'Excel import completed successfully',
          imported: result.imported,
          warnings: result.warnings
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Excel import completed with errors',
          imported: result.imported,
          errors: result.errors,
          warnings: result.warnings
        });
      }

    } catch (error) {
      // Clean up uploaded file on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.warn('Failed to clean up uploaded file:', cleanupError);
        }
      }

      this.handleError(error, res, 'Excel import failed');
    }
  }

  async downloadTemplate(req: Request, res: Response) {
    try {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      
      // Create Projects worksheet
      const projectsSheet = workbook.addWorksheet('Projects');
      projectsSheet.columns = [
        { header: 'Project Name', key: 'name', width: 30 },
        { header: 'Project Type', key: 'type', width: 20 },
        { header: 'Location', key: 'location', width: 20 },
        { header: 'Priority', key: 'priority', width: 15 },
        { header: 'Description', key: 'description', width: 40 },
        { header: 'Start Date', key: 'startDate', width: 15 },
        { header: 'End Date', key: 'endDate', width: 15 },
        { header: 'Owner', key: 'owner', width: 25 }
      ];
      
      // Style the header row
      projectsSheet.getRow(1).font = { bold: true };
      projectsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6E6FA' }
      };
      
      // Add sample data
      projectsSheet.addRow({
        name: 'Sample Project',
        type: 'Development',
        location: 'San Francisco',
        priority: 'High',
        description: 'This is a sample project description',
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        owner: 'John Doe'
      });
      
      // Create Rosters worksheet
      const rostersSheet = workbook.addWorksheet('Rosters');
      rostersSheet.columns = [
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Primary Role', key: 'role', width: 20 },
        { header: 'Worker Type', key: 'workerType', width: 15 },
        { header: 'Supervisor', key: 'supervisor', width: 25 },
        { header: 'Availability %', key: 'availability', width: 15 },
        { header: 'Hours Per Day', key: 'hoursPerDay', width: 15 }
      ];
      
      // Style the header row
      rostersSheet.getRow(1).font = { bold: true };
      rostersSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6E6FA' }
      };
      
      // Add sample data
      rostersSheet.addRow({
        name: 'Alice Johnson',
        email: 'alice@example.com',
        role: 'Developer',
        workerType: 'Full-time',
        supervisor: 'Bob Smith',
        availability: 100,
        hoursPerDay: 8
      });
      
      // Create Standard Allocations worksheet
      const allocationsSheet = workbook.addWorksheet('Standard Allocations');
      allocationsSheet.columns = [
        { header: 'Project Type', key: 'projectType', width: 20 },
        { header: 'Phase', key: 'phase', width: 20 },
        { header: 'Role', key: 'role', width: 20 },
        { header: 'Allocation %', key: 'allocation', width: 15 }
      ];
      
      // Style the header row
      allocationsSheet.getRow(1).font = { bold: true };
      allocationsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6E6FA' }
      };
      
      // Add sample data
      allocationsSheet.addRow({
        projectType: 'Development',
        phase: 'Planning',
        role: 'Project Manager',
        allocation: 25
      });
      
      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();
      
      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=capacinator-import-template.xlsx');
      
      // Send the file
      res.send(buffer);

    } catch (error) {
      this.handleError(error, res, 'Failed to generate template');
    }
  }

  async getImportHistory(req: Request, res: Response) {
    try {
      // TODO: Implement import history tracking
      // For now, return empty array
      res.json({
        imports: [],
        message: 'Import history tracking not yet implemented'
      });

    } catch (error) {
      this.handleError(error, res, 'Failed to fetch import history');
    }
  }

  async validateFile(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please select an Excel file to validate'
        });
      }

      // TODO: Implement file validation without importing
      // For now, just check the file format
      const allowedExtensions = ['.xlsx', '.xls'];
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      
      if (!allowedExtensions.includes(fileExtension)) {
        return res.status(400).json({
          valid: false,
          errors: ['File must be an Excel file (.xlsx or .xls)']
        });
      }

      // Clean up uploaded file
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to clean up uploaded file:', cleanupError);
      }

      res.json({
        valid: true,
        message: 'File format is valid',
        filename: req.file.originalname,
        size: req.file.size
      });

    } catch (error) {
      // Clean up uploaded file on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.warn('Failed to clean up uploaded file:', cleanupError);
        }
      }

      this.handleError(error, res, 'File validation failed');
    }
  }
}