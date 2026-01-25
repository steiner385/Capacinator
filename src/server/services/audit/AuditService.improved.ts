import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

// This is an improved version of AuditService that fixes the undo functionality
// The main improvements are:
// 1. undoLastChange now skips undo operations to find the actual last user change
// 2. Added undoSpecificChange to undo a specific audit entry
// 3. Better handling of cascading undos

export interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  changed_by: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  changed_fields: string[] | null;
  request_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  comment: string | null;
  changed_at: Date;
}

interface AuditLogDbEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  changed_by: string | null;
  old_values: string | null;
  new_values: string | null;
  changed_fields: string | null;
  request_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  comment: string | null;
  changed_at: Date;
}

export interface AuditConfig {
  maxHistoryEntries: number;
  enabledTables: string[];
  sensitiveFields: string[];
  retentionDays: number;
}

export class ImprovedAuditService {
  private db: Knex;
  private config: AuditConfig;

  constructor(db: Knex, config: AuditConfig) {
    this.db = db;
    this.config = config;
  }

  async logChange(params: {
    tableName: string;
    recordId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    changedBy?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    requestId?: string;
    ipAddress?: string;
    userAgent?: string;
    comment?: string;
  }): Promise<string> {
    const auditId = uuidv4();
    
    // Filter sensitive fields
    const filteredOldValues = this.filterSensitiveFields(params.oldValues);
    const filteredNewValues = this.filterSensitiveFields(params.newValues);
    
    // Calculate changed fields for UPDATE operations
    const changedFields = params.action === 'UPDATE' 
      ? this.getChangedFields(filteredOldValues || undefined, filteredNewValues || undefined)
      : null;

    const auditEntry: Partial<AuditLogDbEntry> = {
      id: auditId,
      table_name: params.tableName,
      record_id: params.recordId,
      action: params.action,
      changed_by: params.changedBy || null,
      old_values: filteredOldValues ? JSON.stringify(filteredOldValues) : null,
      new_values: filteredNewValues ? JSON.stringify(filteredNewValues) : null,
      changed_fields: changedFields ? JSON.stringify(changedFields) : null,
      request_id: params.requestId || null,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      comment: params.comment || null,
      changed_at: new Date()
    };

    await this.db('audit_log').insert(auditEntry);
    
    // Cleanup old entries if needed
    await this.cleanupOldEntries(params.tableName, params.recordId);
    
    return auditId;
  }

  async getAuditHistory(
    tableName: string, 
    recordId: string, 
    limit?: number
  ): Promise<AuditLogEntry[]> {
    const query = this.db('audit_log')
      .where('table_name', tableName)
      .where('record_id', recordId)
      .orderBy('changed_at', 'desc');
    
    if (limit) {
      query.limit(limit);
    }
    
    const results = await query;
    return results.map(this.parseAuditEntry);
  }

  async getRecentChanges(
    changedBy?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AuditLogEntry[]> {
    const query = this.db('audit_log')
      .orderBy('changed_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    if (changedBy) {
      query.where('changed_by', changedBy);
    }
    
    const results = await query;
    return results.map(this.parseAuditEntry);
  }

  // Improved undo function that skips undo operations
  async undoLastChange(
    tableName: string,
    recordId: string,
    undoneBy: string,
    comment?: string
  ): Promise<boolean> {
    // Find the last non-undo change
    const lastChangeRaw = await this.db('audit_log')
      .where('table_name', tableName)
      .where('record_id', recordId)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - whereNotLike not in Knex types but works at runtime
      .whereNotLike('comment', '%Undo%')
      .orderBy('changed_at', 'desc')
      .first();

    if (!lastChangeRaw) {
      throw new Error('No changes found to undo');
    }

    const lastChange = this.parseAuditEntry(lastChangeRaw);
    return this.undoSpecificChange(lastChange, undoneBy, comment);
  }

  // New method to undo a specific change
  async undoSpecificChange(
    change: AuditLogEntry,
    undoneBy: string,
    comment?: string
  ): Promise<boolean> {
    const { table_name: tableName, record_id: recordId } = change;

    if (change.action === 'DELETE') {
      // For DELETE operations, we could recreate the record if we have the old values
      if (change.old_values) {
        await this.db(tableName).insert({
          id: recordId,
          ...change.old_values
        });

        await this.logChange({
          tableName,
          recordId,
          action: 'CREATE',
          changedBy: undoneBy,
          newValues: change.old_values,
          comment: comment || `Undo DELETE operation (audit_id: ${change.id})`
        });

        return true;
      }
      throw new Error('Cannot undo DELETE operations without old values');
    }

    // For CREATE operations, delete the record
    if (change.action === 'CREATE') {
      // Get current record state before deleting
      const currentRecord = await this.db(tableName).where('id', recordId).first();
      
      await this.db(tableName).where('id', recordId).del();
      
      await this.logChange({
        tableName,
        recordId,
        action: 'DELETE',
        changedBy: undoneBy,
        oldValues: currentRecord || change.new_values || undefined,
        comment: comment || `Undo CREATE operation (audit_id: ${change.id})`
      });
      
      return true;
    }

    // For UPDATE operations, restore old values
    if (change.action === 'UPDATE' && change.old_values) {
      // Get current state before reverting
      const currentRecord = await this.db(tableName).where('id', recordId).first();
      
      await this.db(tableName)
        .where('id', recordId)
        .update(change.old_values);
      
      await this.logChange({
        tableName,
        recordId,
        action: 'UPDATE',
        changedBy: undoneBy,
        oldValues: currentRecord || change.new_values || undefined,
        newValues: change.old_values,
        comment: comment || `Undo UPDATE operation (audit_id: ${change.id})`
      });
      
      return true;
    }

    return false;
  }

  // Improved method that properly handles cascading undos
  async undoLastNChanges(
    changedBy: string,
    count: number,
    undoneBy: string,
    comment?: string
  ): Promise<{ undone: number; errors: string[] }> {
    // Get only non-undo changes by the specified user
    const changes = await this.db('audit_log')
      .where('changed_by', changedBy)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - whereNotLike not in Knex types but works at runtime
      .whereNotLike('comment', '%Undo%')
      .orderBy('changed_at', 'desc')
      .limit(count);

    let undone = 0;
    const errors: string[] = [];

    // Process in reverse order (oldest first) to maintain consistency
    for (const change of changes.reverse()) {
      try {
        const parsedChange = this.parseAuditEntry(change);
        await this.undoSpecificChange(
          parsedChange,
          undoneBy,
          comment || `Bulk undo operation (${count} changes)`
        );
        undone++;
      } catch (error) {
        errors.push(`Failed to undo change ${change.id}: ${(error as Error).message}`);
      }
    }

    return { undone, errors };
  }

  async searchAuditLog(filters: {
    tableName?: string;
    recordId?: string;
    changedBy?: string;
    action?: string;
    fromDate?: Date;
    toDate?: Date;
    requestId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; entries: AuditLogEntry[] }> {
    let query = this.db('audit_log');
    
    if (filters.tableName) query = query.where('table_name', filters.tableName);
    if (filters.recordId) query = query.where('record_id', filters.recordId);
    if (filters.changedBy) query = query.where('changed_by', filters.changedBy);
    if (filters.action) query = query.where('action', filters.action);
    if (filters.requestId) query = query.where('request_id', filters.requestId);
    if (filters.fromDate) query = query.where('changed_at', '>=', filters.fromDate);
    if (filters.toDate) query = query.where('changed_at', '<=', filters.toDate);

    const total = await query.clone().count('* as count').first();
    
    const entries = await query
      .orderBy('changed_at', 'desc')
      .limit(filters.limit || 50)
      .offset(filters.offset || 0);

    return {
      total: (total as any)?.count || 0,
      entries: entries.map(this.parseAuditEntry)
    };
  }

  // Get the history of actual changes (excluding undo operations)
  async getActualChangeHistory(
    tableName: string,
    recordId: string,
    limit?: number
  ): Promise<AuditLogEntry[]> {
    const query = this.db('audit_log')
      .where('table_name', tableName)
      .where('record_id', recordId)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - whereNotLike not in Knex types but works at runtime
      .whereNotLike('comment', '%Undo%')
      .orderBy('changed_at', 'desc');
    
    if (limit) {
      query.limit(limit);
    }
    
    const results = await query;
    return results.map(this.parseAuditEntry);
  }

  private filterSensitiveFields(values?: Record<string, any>): Record<string, any> | null {
    if (!values) return null;
    
    const filtered = { ...values };
    this.config.sensitiveFields.forEach(field => {
      if (field in filtered) {
        filtered[field] = '[REDACTED]';
      }
    });
    
    return filtered;
  }

  private getChangedFields(
    oldValues?: Record<string, any>, 
    newValues?: Record<string, any>
  ): string[] | null {
    if (!oldValues || !newValues) return null;
    
    const changed: string[] = [];
    const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
    
    for (const key of allKeys) {
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
        changed.push(key);
      }
    }
    
    return changed.length > 0 ? changed : null;
  }

  private async cleanupOldEntries(tableName: string, recordId: string): Promise<void> {
    const entryCount = await this.db('audit_log')
      .where('table_name', tableName)
      .where('record_id', recordId)
      .count('* as count')
      .first();

    const count = (entryCount as any)?.count || 0;
    
    if (count > this.config.maxHistoryEntries) {
      const excessCount = count - this.config.maxHistoryEntries;
      const oldestEntries = await this.db('audit_log')
        .where('table_name', tableName)
        .where('record_id', recordId)
        .orderBy('changed_at', 'asc')
        .limit(excessCount)
        .pluck('id');

      if (oldestEntries.length > 0) {
        await this.db('audit_log').whereIn('id', oldestEntries).del();
      }
    }
  }

  async cleanupExpiredEntries(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    
    const deletedCount = await this.db('audit_log')
      .where('changed_at', '<', cutoffDate)
      .del();
    
    return deletedCount;
  }

  async getAuditStats(): Promise<{
    totalEntries: number;
    entriesByAction: Record<string, number>;
    entriesByTable: Record<string, number>;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    const total = await this.db('audit_log').count('* as count').first();
    
    const byAction = await this.db('audit_log')
      .select('action')
      .count('* as count')
      .groupBy('action');
    
    const byTable = await this.db('audit_log')
      .select('table_name')
      .count('* as count')
      .groupBy('table_name');
    
    const oldest = await this.db('audit_log')
      .min('changed_at as min_date')
      .first();
    
    const newest = await this.db('audit_log')
      .max('changed_at as max_date')
      .first();

    const entriesByAction: Record<string, number> = {};
    byAction.forEach((row: any) => {
      entriesByAction[row.action] = Number(row.count);
    });

    const entriesByTable: Record<string, number> = {};
    byTable.forEach((row: any) => {
      entriesByTable[row.table_name] = Number(row.count);
    });

    return {
      totalEntries: (total as any)?.count || 0,
      entriesByAction,
      entriesByTable,
      oldestEntry: (oldest as any)?.min_date || null,
      newestEntry: (newest as any)?.max_date || null
    };
  }

  private parseAuditEntry(entry: AuditLogDbEntry): AuditLogEntry {
    return {
      ...entry,
      old_values: entry.old_values ? JSON.parse(entry.old_values) : null,
      new_values: entry.new_values ? JSON.parse(entry.new_values) : null,
      changed_fields: entry.changed_fields ? JSON.parse(entry.changed_fields) : null
    };
  }
}