import type { Request, Response } from 'express';
import { BaseController } from './BaseController.js';

interface SystemSettings {
  defaultWorkHoursPerWeek: number;
  defaultVacationDaysPerYear: number;
  fiscalYearStartMonth: number;
  allowOverAllocation: boolean;
  maxAllocationPercentage: number;
  requireApprovalForOverrides: boolean;
  autoArchiveCompletedProjects: boolean;
  archiveAfterDays: number;
  enableEmailNotifications: boolean;
}

interface ImportSettings {
  clearExistingData: boolean;
  validateDuplicates: boolean;
  autoCreateMissingRoles: boolean;
  autoCreateMissingLocations: boolean;
  defaultProjectPriority: number;
  dateFormat: string;
}

export class SettingsController extends BaseController {
  
  // Get system settings
  getSystemSettings = async (req: Request, res: Response): Promise<void> => {
    await this.executeQuery(async () => {
      const result = await this.db('settings')
        .where('category', 'system')
        .first();

      if (!result) {
        return res.status(404).json({
          error: 'System settings not found'
        });
      }

      return res.json({
        success: true,
        data: JSON.parse(result.settings)
      });
    }, res);
  };

  // Save system settings
  saveSystemSettings = async (req: Request, res: Response): Promise<void> => {
    await this.executeQuery(async () => {
      const settings: SystemSettings = req.body;

      // Validate required fields
      const requiredFields = [
        'defaultWorkHoursPerWeek',
        'defaultVacationDaysPerYear',
        'fiscalYearStartMonth',
        'allowOverAllocation',
        'maxAllocationPercentage',
        'requireApprovalForOverrides',
        'autoArchiveCompletedProjects',
        'archiveAfterDays',
        'enableEmailNotifications'
      ];

      for (const field of requiredFields) {
        if (settings[field as keyof SystemSettings] === undefined) {
          return res.status(400).json({
            error: `Missing required field: ${field}`
          });
        }
      }

      // Validate field values
      if (settings.defaultWorkHoursPerWeek < 1 || settings.defaultWorkHoursPerWeek > 80) {
        return res.status(400).json({
          error: 'defaultWorkHoursPerWeek must be between 1 and 80'
        });
      }

      if (settings.fiscalYearStartMonth < 1 || settings.fiscalYearStartMonth > 12) {
        return res.status(400).json({
          error: 'fiscalYearStartMonth must be between 1 and 12'
        });
      }

      if (settings.maxAllocationPercentage < 100 || settings.maxAllocationPercentage > 200) {
        return res.status(400).json({
          error: 'maxAllocationPercentage must be between 100 and 200'
        });
      }

      // Upsert settings
      await this.db('settings')
        .insert({
          category: 'system',
          settings: JSON.stringify(settings)
        })
        .onConflict(['category'])
        .merge({
          settings: JSON.stringify(settings),
          updated_at: this.db.fn.now()
        });

      return res.json({
        success: true,
        message: 'System settings saved successfully'
      });
    }, res);
  };

  // Get import settings
  getImportSettings = async (req: Request, res: Response): Promise<void> => {
    await this.executeQuery(async () => {
      const result = await this.db('settings')
        .where('category', 'import')
        .first();

      if (!result) {
        return res.status(404).json({
          error: 'Import settings not found'
        });
      }

      return res.json({
        success: true,
        data: JSON.parse(result.settings)
      });
    }, res);
  };

  // Save import settings
  saveImportSettings = async (req: Request, res: Response): Promise<void> => {
    await this.executeQuery(async () => {
      const settings: ImportSettings = req.body;

      // Validate required fields
      const requiredFields = [
        'clearExistingData',
        'validateDuplicates',
        'autoCreateMissingRoles',
        'autoCreateMissingLocations',
        'defaultProjectPriority',
        'dateFormat'
      ];

      for (const field of requiredFields) {
        if (settings[field as keyof ImportSettings] === undefined) {
          return res.status(400).json({
            error: `Missing required field: ${field}`
          });
        }
      }

      // Validate field values
      if (settings.defaultProjectPriority < 1 || settings.defaultProjectPriority > 3) {
        return res.status(400).json({
          error: 'defaultProjectPriority must be between 1 and 3'
        });
      }

      const validDateFormats = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];
      if (!validDateFormats.includes(settings.dateFormat)) {
        return res.status(400).json({
          error: `dateFormat must be one of: ${validDateFormats.join(', ')}`
        });
      }

      // Upsert settings
      await this.db('settings')
        .insert({
          category: 'import',
          settings: JSON.stringify(settings)
        })
        .onConflict(['category'])
        .merge({
          settings: JSON.stringify(settings),
          updated_at: this.db.fn.now()
        });

      return res.json({
        success: true,
        message: 'Import settings saved successfully'
      });
    }, res);
  };
}