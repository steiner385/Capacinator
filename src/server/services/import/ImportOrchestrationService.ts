import type { Knex } from 'knex';
import { logger } from '../logging/config.js';
import fs from 'fs/promises';

export interface ImportOptions {
  clearExisting: boolean;
  useV2: boolean;
  validateDuplicates: boolean;
  autoCreateMissingRoles: boolean;
  autoCreateMissingLocations: boolean;
  defaultProjectPriority: number;
  dateFormat: string;
  dryRun?: boolean;
}

export interface ImportResult {
  success: boolean;
  message: string;
  imported: Record<string, number>;
  errors?: string[];
  warnings?: string[];
  duplicatesFound?: Record<string, unknown>;
  duration_ms?: number;
}

export interface FileUpload {
  path: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * ImportOrchestrationService
 * Coordinates multi-step import workflows including validation, cleanup, and orchestration
 */
export class ImportOrchestrationService {
  constructor(private db: Knex) {}

  /**
   * Validate Excel file structure and content
   */
  async validateExcelFile(filePath: string, useV2: boolean): Promise<{ valid: boolean; errors: string[]; canImport: boolean }> {
    try {
      logger.info('Starting Excel file validation', new Error(), { filePath, useV2 });

      // Dynamic imports for the importers (loaded on demand)
      const { ExcelImporter } = await import('./ExcelImporter.js');
      const { ExcelImporterV2 } = await import('./ExcelImporterV2.js');

      try {
        if (useV2) {
          const importer = new ExcelImporterV2();
          const result = await importer.validateExcelStructure(filePath);
          logger.info('Excel file validation completed', new Error(), { filePath, valid: result.valid, errorCount: result.errors?.length || 0 });
          return result;
        } else {
          const importer = new ExcelImporter();
          const result = await importer.validateExcelStructure(filePath);
          logger.info('Excel file validation completed', new Error(), { filePath, valid: result.valid, errorCount: result.errors?.length || 0 });
          return result;
        }
      } catch (validationError) {
        logger.error('Excel file validation failed', validationError as Error, { filePath, useV2 });
        return {
          valid: false,
          canImport: false,
          errors: [
            `Validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`,
            'Ensure the file is not corrupted and follows the expected format'
          ]
        };
      }
    } catch (error) {
      logger.error('Error validating Excel file', error as Error, { filePath });
      throw error;
    }
  }

  /**
   * Perform a dry-run analysis of an import
   */
  async analyzeImport(filePath: string, importOptions: ImportOptions): Promise<any> {
    try {
      logger.info('Starting import analysis (dry-run)', new Error(), { filePath, importOptions });

      // Dynamic imports for the importers
      const { ExcelImporter } = await import('./ExcelImporter.js');
      const { ExcelImporterV2 } = await import('./ExcelImporterV2.js');

      const analysisOptions = {
        ...importOptions,
        dryRun: true
      };

      try {
        if (importOptions.useV2) {
          const importer = new ExcelImporterV2();
          const result = await importer.analyzeImport(filePath, analysisOptions);
          logger.info('Import analysis completed', new Error(), {
            filePath,
            useV2: true,
            success: result.success,
            recordCount: result.analysis?.totalRecords || 0
          });
          return result;
        } else {
          const importer = new ExcelImporter();
          const result = await importer.analyzeImport(filePath, analysisOptions);
          logger.info('Import analysis completed', new Error(), {
            filePath,
            useV2: false,
            success: result.success,
            recordCount: result.analysis?.totalRecords || 0
          });
          return result;
        }
      } catch (analysisError) {
        logger.error('Import analysis failed', analysisError as Error, { filePath, importOptions });
        throw analysisError;
      }
    } catch (error) {
      logger.error('Error analyzing import', error as Error, { filePath });
      throw error;
    }
  }

  /**
   * Execute the full import workflow with error handling and cleanup
   */
  async executeImport(
    filePath: string,
    importOptions: ImportOptions,
    historyRecordId?: string
  ): Promise<ImportResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting import execution', new Error(), {
        filePath,
        importOptions,
        historyRecordId
      });

      // Dynamic imports for the importers
      const { ExcelImporter } = await import('./ExcelImporter.js');
      const { ExcelImporterV2 } = await import('./ExcelImporterV2.js');

      let result: ImportResult;

      try {
        if (importOptions.useV2) {
          const importer = new ExcelImporterV2();
          result = await importer.importFromFile(filePath, importOptions);
        } else {
          const importer = new ExcelImporter();
          result = await importer.importFromFile(filePath, importOptions);
        }

        result.duration_ms = Date.now() - startTime;

        logger.info('Import execution completed successfully', new Error(), {
          filePath,
          success: result.success,
          durationMs: result.duration_ms,
          importedCount: Object.values(result.imported).reduce((sum, count) => sum + count, 0)
        });

        return result;
      } catch (importError) {
        const duration = Date.now() - startTime;

        logger.error('Import execution failed', importError as Error, {
          filePath,
          importOptions,
          durationMs: duration,
          historyRecordId
        });

        return {
          success: false,
          message: `Import failed: ${importError instanceof Error ? importError.message : 'Unknown error'}`,
          imported: {},
          errors: [importError instanceof Error ? importError.message : 'Unknown import error'],
          duration_ms: duration
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Error executing import', error as Error, {
        filePath,
        importOptions,
        durationMs: duration,
        historyRecordId
      });

      return {
        success: false,
        message: `Import execution error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        imported: {},
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        duration_ms: duration
      };
    }
  }

  /**
   * Clean up uploaded file after processing
   */
  async cleanupUploadedFile(filePath: string): Promise<boolean> {
    try {
      await fs.unlink(filePath);
      logger.debug('Uploaded file cleaned up', new Error(), { filePath });
      return true;
    } catch (error) {
      logger.warn('Failed to clean up uploaded file', error as Error, { filePath });
      return false;
    }
  }

  /**
   * Validate file extension and MIME type
   */
  validateFileType(file: FileUpload): { valid: boolean; error?: string } {
    try {
      const allowedExtensions = ['.xlsx', '.xls'];
      const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];

      // Check extension
      const extension = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();
      if (!allowedExtensions.includes(extension)) {
        const error = `Invalid file extension: ${extension}. Only .xlsx and .xls files are allowed.`;
        logger.warn('File validation failed: invalid extension', new Error(), { fileName: file.originalname, extension });
        return { valid: false, error };
      }

      // Check MIME type
      if (!allowedMimeTypes.includes(file.mimetype) && !file.originalname.match(/\.(xlsx|xls)$/i)) {
        const error = `Invalid file type: ${file.mimetype}. Only Excel files are allowed.`;
        logger.warn('File validation failed: invalid MIME type', new Error(), { fileName: file.originalname, mimeType: file.mimetype });
        return { valid: false, error };
      }

      logger.debug('File validation passed', new Error(), { fileName: file.originalname });
      return { valid: true };
    } catch (error) {
      logger.error('Error validating file type', error as Error, { fileName: file.originalname });
      throw error;
    }
  }

  /**
   * Prepare import options with defaults from settings
   */
  prepareImportOptions(
    requestBody: any,
    savedSettings: any
  ): ImportOptions {
    try {
      const options: ImportOptions = {
        clearExisting: requestBody.clearExisting === 'true' || requestBody.clearExisting === true || savedSettings.clearExistingData,
        useV2: requestBody.useV2 === 'true' || requestBody.useV2 === true,
        validateDuplicates: requestBody.validateDuplicates === 'true' || requestBody.validateDuplicates === true || savedSettings.validateDuplicates,
        autoCreateMissingRoles: requestBody.autoCreateMissingRoles === 'true' || requestBody.autoCreateMissingRoles === true || savedSettings.autoCreateMissingRoles,
        autoCreateMissingLocations: requestBody.autoCreateMissingLocations === 'true' || requestBody.autoCreateMissingLocations === true || savedSettings.autoCreateMissingLocations,
        defaultProjectPriority: requestBody.defaultProjectPriority ? parseInt(requestBody.defaultProjectPriority, 10) : savedSettings.defaultProjectPriority,
        dateFormat: requestBody.dateFormat || savedSettings.dateFormat
      };

      logger.debug('Import options prepared', new Error(), {
        clearExisting: options.clearExisting,
        useV2: options.useV2,
        validateDuplicates: options.validateDuplicates
      });

      return options;
    } catch (error) {
      logger.error('Error preparing import options', error as Error, { requestBody });
      throw error;
    }
  }

  /**
   * Handle import completion - update history and return response
   */
  async handleImportCompletion(result: ImportResult): Promise<any> {
    try {
      if (result.success) {
        logger.info('Import completed successfully', new Error(), {
          importedCount: Object.values(result.imported).reduce((sum, count) => sum + count, 0),
          warningCount: result.warnings?.length || 0
        });

        return {
          success: true,
          message: 'Excel import completed successfully',
          imported: result.imported,
          warnings: result.warnings
        };
      } else {
        logger.warn('Import completed with errors', new Error(), {
          errorCount: result.errors?.length || 0,
          message: result.message
        });

        return {
          success: false,
          message: 'Excel import completed with errors',
          imported: result.imported,
          errors: result.errors,
          warnings: result.warnings
        };
      }
    } catch (error) {
      logger.error('Error handling import completion', error as Error);
      throw error;
    }
  }

  /**
   * Handle import error - cleanup and return error response
   */
  async handleImportError(error: Error, filePath?: string): Promise<any> {
    try {
      logger.error('Import error occurred', error, { filePath });

      // Attempt cleanup if file path provided
      if (filePath) {
        await this.cleanupUploadedFile(filePath);
      }

      return {
        success: false,
        message: 'Excel import failed',
        error: error.message,
        imported: {}
      };
    } catch (cleanupError) {
      logger.error('Error handling import error', cleanupError as Error);
      throw cleanupError;
    }
  }
}
