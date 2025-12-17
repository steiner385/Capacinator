import type { Knex } from 'knex';
import { logger } from '../logging/config.js';

export interface ImportSettings {
  clearExistingData: boolean;
  validateDuplicates: boolean;
  autoCreateMissingRoles: boolean;
  autoCreateMissingLocations: boolean;
  defaultProjectPriority: number;
  dateFormat: string;
}

const DEFAULT_SETTINGS: ImportSettings = {
  clearExistingData: false,
  validateDuplicates: true,
  autoCreateMissingRoles: false,
  autoCreateMissingLocations: false,
  defaultProjectPriority: 2,
  dateFormat: 'MM/DD/YYYY'
};

/**
 * ImportSettingsService
 * Manages import configuration settings persisted in the database
 */
export class ImportSettingsService {
  constructor(private db: Knex) {}

  /**
   * Fetch import settings from database or return defaults
   */
  async getImportSettings(): Promise<ImportSettings> {
    try {
      const tableExists = await this.db.schema.hasTable('settings');

      if (!tableExists) {
        logger.debug('Settings table does not exist, returning defaults');
        return DEFAULT_SETTINGS;
      }

      const result = await this.db('settings')
        .where('category', 'import')
        .first();

      if (!result) {
        logger.debug('No import settings found, returning defaults');
        return DEFAULT_SETTINGS;
      }

      const settings = JSON.parse(result.settings || '{}');
      return this.mergeWithDefaults(settings);
    } catch (error) {
      logger.error('Error fetching import settings', error as Error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Save import settings to database
   */
  async saveImportSettings(settings: Partial<ImportSettings>): Promise<void> {
    try {
      const tableExists = await this.db.schema.hasTable('settings');

      if (!tableExists) {
        logger.warn('Settings table does not exist, cannot save import settings');
        return;
      }

      const merged = this.mergeWithDefaults(settings);

      const existing = await this.db('settings')
        .where('category', 'import')
        .first();

      if (existing) {
        await this.db('settings')
          .where('category', 'import')
          .update({
            settings: JSON.stringify(merged),
            updated_at: new Date()
          });
        logger.info('Updated import settings');
      } else {
        await this.db('settings').insert({
          category: 'import',
          settings: JSON.stringify(merged),
          created_at: new Date(),
          updated_at: new Date()
        });
        logger.info('Created import settings');
      }
    } catch (error) {
      logger.error('Error saving import settings', error as Error);
      throw error;
    }
  }

  /**
   * Validate import settings meet requirements
   */
  validateSettings(settings: Partial<ImportSettings>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (settings.dateFormat && typeof settings.dateFormat !== 'string') {
      errors.push('dateFormat must be a string');
    }

    if (settings.defaultProjectPriority !== undefined) {
      if (typeof settings.defaultProjectPriority !== 'number') {
        errors.push('defaultProjectPriority must be a number');
      } else if (settings.defaultProjectPriority < 1 || settings.defaultProjectPriority > 10) {
        errors.push('defaultProjectPriority must be between 1 and 10');
      }
    }

    if (settings.clearExistingData !== undefined && typeof settings.clearExistingData !== 'boolean') {
      errors.push('clearExistingData must be a boolean');
    }

    if (settings.validateDuplicates !== undefined && typeof settings.validateDuplicates !== 'boolean') {
      errors.push('validateDuplicates must be a boolean');
    }

    if (settings.autoCreateMissingRoles !== undefined && typeof settings.autoCreateMissingRoles !== 'boolean') {
      errors.push('autoCreateMissingRoles must be a boolean');
    }

    if (settings.autoCreateMissingLocations !== undefined && typeof settings.autoCreateMissingLocations !== 'boolean') {
      errors.push('autoCreateMissingLocations must be a boolean');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Merge provided settings with defaults
   */
  private mergeWithDefaults(settings: Partial<ImportSettings>): ImportSettings {
    return {
      ...DEFAULT_SETTINGS,
      ...settings
    };
  }
}
