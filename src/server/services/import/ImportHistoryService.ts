import type { Knex } from 'knex';
import { logger } from '../logging/config.js';

export interface ImportHistoryRecord {
  id?: string;
  file_name: string;
  file_size: string;
  file_mime_type: string;
  import_type: 'v1' | 'v2';
  clear_existing: boolean;
  validate_duplicates: boolean;
  auto_create_missing_roles: boolean;
  auto_create_missing_locations: boolean;
  default_project_priority: number;
  date_format: string;
  status: 'processing' | 'success' | 'failed';
  imported_by: string;
  started_at: Date;
  completed_at?: Date;
  request_id?: string;
  ip_address?: string;
  duration_ms?: number;
  imported_counts?: Record<string, number>;
  errors?: string[];
  warnings?: string[];
  duplicates_found?: Record<string, unknown>;
}

export interface ImportHistoryQuery {
  page?: number;
  limit?: number;
  status?: 'processing' | 'success' | 'failed';
  startDate?: Date;
  endDate?: Date;
}

export interface ImportHistoryResponse {
  imports: ImportHistoryRecord[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * ImportHistoryService
 * Manages import operation history tracking, querying, and record management
 */
export class ImportHistoryService {
  constructor(private db: Knex) {}

  /**
   * Create a new import history record
   */
  async createImportRecord(record: ImportHistoryRecord): Promise<string> {
    try {
      const [id] = await this.db('import_history').insert(record).returning('id');
      logger.info('Import history record created', new Error(), {
        recordId: id.id || id,
        fileName: record.file_name,
        importType: record.import_type
      });
      return id.id || id;
    } catch (error) {
      logger.error('Error creating import history record', error as Error, { fileName: record.file_name });
      throw error;
    }
  }

  /**
   * Update an existing import history record
   */
  async updateImportRecord(
    recordId: string,
    updates: Partial<ImportHistoryRecord>
  ): Promise<void> {
    try {
      // Convert objects to JSON strings if needed
      const updateData = {
        ...updates,
        imported_counts: updates.imported_counts ? JSON.stringify(updates.imported_counts) : undefined,
        errors: updates.errors ? JSON.stringify(updates.errors) : undefined,
        warnings: updates.warnings ? JSON.stringify(updates.warnings) : undefined,
        duplicates_found: updates.duplicates_found ? JSON.stringify(updates.duplicates_found) : undefined
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => updateData[key as keyof typeof updateData] === undefined && delete updateData[key as keyof typeof updateData]);

      await this.db('import_history')
        .where('id', recordId)
        .update(updateData);

      logger.info('Import history record updated', new Error(), { recordId, updateCount: Object.keys(updateData).length });
    } catch (error) {
      logger.error('Error updating import history record', error as Error, { recordId });
      throw error;
    }
  }

  /**
   * Fetch import history with pagination and filtering
   */
  async getImportHistory(query: ImportHistoryQuery): Promise<ImportHistoryResponse> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 50;
      const offset = (page - 1) * limit;

      // Build query with filters
      let baseQuery = this.db('import_history');

      if (query.status) {
        baseQuery = baseQuery.where('status', query.status);
      }

      if (query.startDate) {
        baseQuery = baseQuery.where('started_at', '>=', query.startDate);
      }

      if (query.endDate) {
        baseQuery = baseQuery.where('started_at', '<=', query.endDate);
      }

      // Get total count
      const totalCountResult = await baseQuery.clone().count('* as count').first();
      const totalCount = parseInt(totalCountResult.count, 10);

      // Get paginated records
      const imports = await baseQuery
        .select('*')
        .orderBy('started_at', 'desc')
        .limit(limit)
        .offset(offset);

      // Parse JSON fields
      const formattedImports = imports.map(record => this.parseImportRecord(record));

      return {
        imports: formattedImports,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      logger.error('Error fetching import history', error as Error, { query });
      throw error;
    }
  }

  /**
   * Get a single import history record by ID
   */
  async getImportRecordById(recordId: string): Promise<ImportHistoryRecord | null> {
    try {
      const record = await this.db('import_history')
        .where('id', recordId)
        .first();

      if (!record) {
        logger.debug('Import history record not found', new Error(), { recordId });
        return null;
      }

      return this.parseImportRecord(record);
    } catch (error) {
      logger.error('Error fetching import history record', error as Error, { recordId });
      throw error;
    }
  }

  /**
   * Get import statistics for a date range
   */
  async getImportStatistics(startDate?: Date, endDate?: Date): Promise<{
    totalImports: number;
    successfulImports: number;
    failedImports: number;
    processingImports: number;
    successRate: number;
    totalRecordsImported: number;
    averageDurationMs: number;
  }> {
    try {
      let query = this.db('import_history');

      if (startDate) {
        query = query.where('started_at', '>=', startDate);
      }

      if (endDate) {
        query = query.where('started_at', '<=', endDate);
      }

      const records = await query.select('*');

      const totalImports = records.length;
      const successfulImports = records.filter(r => r.status === 'success').length;
      const failedImports = records.filter(r => r.status === 'failed').length;
      const processingImports = records.filter(r => r.status === 'processing').length;

      // Calculate success rate
      const completedImports = successfulImports + failedImports;
      const successRate = completedImports > 0 ? (successfulImports / completedImports) * 100 : 0;

      // Calculate total records imported
      let totalRecordsImported = 0;
      for (const record of records) {
        if (record.imported_counts) {
          try {
            const counts = typeof record.imported_counts === 'string'
              ? JSON.parse(record.imported_counts)
              : record.imported_counts;
            totalRecordsImported += Object.values(counts).reduce((sum, count) => sum + (typeof count === 'number' ? count : 0), 0);
          } catch (parseError) {
            logger.debug('Error parsing imported counts', parseError as Error, { recordId: record.id });
          }
        }
      }

      // Calculate average duration
      const completedWithDuration = records.filter(r => r.duration_ms && r.status !== 'processing');
      const averageDurationMs = completedWithDuration.length > 0
        ? completedWithDuration.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / completedWithDuration.length
        : 0;

      logger.info('Import statistics calculated', new Error(), {
        totalImports,
        successfulImports,
        failedImports,
        successRate: `${successRate.toFixed(2)}%`,
        dateRange: { startDate, endDate }
      });

      return {
        totalImports,
        successfulImports,
        failedImports,
        processingImports,
        successRate: Math.round(successRate * 100) / 100,
        totalRecordsImported,
        averageDurationMs: Math.round(averageDurationMs)
      };
    } catch (error) {
      logger.error('Error calculating import statistics', error as Error, { startDate, endDate });
      throw error;
    }
  }

  /**
   * Clean up old import history records (older than specified days)
   */
  async cleanupOldRecords(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deletedCount = await this.db('import_history')
        .where('started_at', '<', cutoffDate)
        .del();

      logger.info('Old import history records cleaned up', new Error(), {
        deletedCount,
        cutoffDate,
        daysOld
      });

      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up import history', error as Error, { daysOld });
      throw error;
    }
  }

  /**
   * Helper: Parse import record, converting JSON fields back to objects
   */
  private parseImportRecord(record: any): ImportHistoryRecord {
    return {
      ...record,
      imported_counts: record.imported_counts ? this.safeJsonParse(record.imported_counts, {}) : undefined,
      errors: record.errors ? this.safeJsonParse(record.errors, []) : [],
      warnings: record.warnings ? this.safeJsonParse(record.warnings, []) : [],
      duplicates_found: record.duplicates_found ? this.safeJsonParse(record.duplicates_found, null) : null
    };
  }

  /**
   * Helper: Safe JSON parsing with fallback
   */
  private safeJsonParse(jsonString: string, fallback: any): any {
    try {
      return typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    } catch (error) {
      logger.debug('Error parsing JSON field', error as Error, { jsonString });
      return fallback;
    }
  }
}
