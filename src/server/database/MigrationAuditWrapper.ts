import { Knex } from 'knex';
import { getAuditService } from '../services/audit/index.js';
import { getAuditConfig, isTableAudited } from '../config/auditConfig.js';

export interface MigrationAuditContext {
  migrationName: string;
  operation: 'migration' | 'seed' | 'rollback';
  comment?: string;
}

export class MigrationAuditWrapper {
  private db: Knex;
  private auditService: any;
  private context: MigrationAuditContext;

  constructor(db: Knex, context: MigrationAuditContext) {
    this.db = db;
    this.context = context;
    
    // Initialize audit service if available
    try {
      this.auditService = getAuditService();
    } catch (error) {
      // Audit service might not be available during early migrations
      console.warn('Audit service not available during migration:', this.context.migrationName);
      this.auditService = null;
    }
  }

  // Wrapper for audit-aware insert operations
  async insert(tableName: string, data: any): Promise<any> {
    const result = await this.db(tableName).insert(data).returning('*');
    
    if (this.auditService && this.shouldAuditTable(tableName)) {
      // Use the original data for record ID since returning('*') may not work in SQLite
      const recordForAudit = Array.isArray(result) && result.length > 0 ? result[0] : data;
      await this.logMigrationAudit(tableName, recordForAudit, 'CREATE', null, data);
    }
    
    return result;
  }

  // Wrapper for audit-aware update operations
  async update(tableName: string, where: any, data: any): Promise<any> {
    let oldRecords: any[] = [];
    
    if (this.auditService && this.shouldAuditTable(tableName)) {
      // Capture old values before update
      oldRecords = await this.db(tableName).where(where).select('*');
    }
    
    const result = await this.db(tableName).where(where).update(data).returning('*');
    
    if (this.auditService && this.shouldAuditTable(tableName) && oldRecords.length > 0) {
      for (let i = 0; i < oldRecords.length; i++) {
        const oldRecord = oldRecords[i];
        const newRecord = Array.isArray(result) ? result[i] : result;
        await this.logMigrationAudit(tableName, newRecord, 'UPDATE', oldRecord, { ...oldRecord, ...data });
      }
    }
    
    return result;
  }

  // Wrapper for audit-aware delete operations
  async delete(tableName: string, where: any): Promise<number> {
    let recordsToDelete: any[] = [];
    
    if (this.auditService && this.shouldAuditTable(tableName)) {
      // Capture records before deletion
      recordsToDelete = await this.db(tableName).where(where).select('*');
    }
    
    const deletedCount = await this.db(tableName).where(where).del();
    
    if (this.auditService && this.shouldAuditTable(tableName)) {
      for (const record of recordsToDelete) {
        await this.logMigrationAudit(tableName, record, 'DELETE', record, null);
      }
    }
    
    return deletedCount;
  }

  // Wrapper for audit-aware bulk insert operations
  async bulkInsert(tableName: string, data: any[]): Promise<any> {
    const result = await this.db(tableName).insert(data).returning('*');
    
    if (this.auditService && this.shouldAuditTable(tableName)) {
      // Use the original data for record IDs since returning('*') may not work reliably in SQLite
      for (const record of data) {
        await this.logMigrationAudit(tableName, record, 'CREATE', null, record);
      }
    }
    
    return result;
  }

  // Direct database access for non-audited operations
  get raw(): Knex {
    return this.db;
  }

  // Table access for read operations
  table(tableName: string) {
    return this.db(tableName);
  }

  // Schema operations (usually not audited)
  get schema() {
    return this.db.schema;
  }

  // Transaction support
  transaction(callback: (trx: Knex.Transaction) => Promise<any>) {
    return this.db.transaction(callback);
  }

  private shouldAuditTable(tableName: string): boolean {
    // Map table names similar to AuditedDatabase
    const auditTableMapping: Record<string, string> = {
      'person_availability_overrides': 'availability',
      'user_role_permissions': 'user_role_permissions', 
      'user_permissions': 'user_permissions',
      'role_planners': 'role_planners',
    };
    
    const auditTableName = auditTableMapping[tableName] || tableName;
    return isTableAudited(auditTableName);
  }

  private async logMigrationAudit(
    tableName: string, 
    record: any, 
    action: 'CREATE' | 'UPDATE' | 'DELETE', 
    oldValues?: any, 
    newValues?: any
  ): Promise<void> {
    if (!this.auditService) return;

    try {
      const recordId = record?.id || record?.pk || `migration-${Date.now()}`;
      
      await this.auditService.logChange({
        tableName: this.getAuditTableName(tableName),
        recordId: String(recordId),
        action,
        changedBy: `system:${this.context.operation}`,
        oldValues,
        newValues,
        requestId: `migration-${this.context.migrationName}`,
        ipAddress: 'localhost',
        userAgent: `Migration: ${this.context.migrationName}`,
        comment: `${this.context.operation}: ${this.context.migrationName}` + (this.context.comment ? ` - ${this.context.comment}` : '')
      });
    } catch (error) {
      console.error(`Failed to log migration audit for ${tableName}:`, error);
      // Don't throw - migration should continue even if audit logging fails
    }
  }

  private getAuditTableName(actualTableName: string): string {
    const auditTableMapping: Record<string, string> = {
      'person_availability_overrides': 'availability',
      'user_role_permissions': 'user_role_permissions',
      'user_permissions': 'user_permissions', 
      'role_planners': 'role_planners',
    };
    
    return auditTableMapping[actualTableName] || actualTableName;
  }
}

// Factory function to create migration audit wrapper
export function createMigrationAuditWrapper(db: Knex, context: MigrationAuditContext): MigrationAuditWrapper {
  return new MigrationAuditWrapper(db, context);
}

// Convenience function for migrations
export async function withMigrationAudit(
  db: Knex, 
  migrationName: string, 
  callback: (auditDb: MigrationAuditWrapper) => Promise<void>
): Promise<void> {
  // Use transactions in production but direct database access in test environment
  if (process.env.NODE_ENV === 'test') {
    const auditWrapper = createMigrationAuditWrapper(db, {
      migrationName,
      operation: 'migration',
      comment: `Schema migration: ${migrationName}`
    });
    
    return callback(auditWrapper);
  } else {
    return db.transaction(async (trx) => {
      const auditWrapper = createMigrationAuditWrapper(trx, {
        migrationName,
        operation: 'migration',
        comment: `Schema migration: ${migrationName}`
      });
      
      return callback(auditWrapper);
    });
  }
}

// Convenience function for seeds
export async function withSeedAudit(
  db: Knex, 
  seedName: string, 
  callback: (auditDb: MigrationAuditWrapper) => Promise<void>
): Promise<void> {
  // Use transactions in production but direct database access in test environment
  if (process.env.NODE_ENV === 'test') {
    const auditWrapper = createMigrationAuditWrapper(db, {
      migrationName: seedName,
      operation: 'seed',
      comment: `Data seeding: ${seedName}`
    });
    
    return callback(auditWrapper);
  } else {
    return db.transaction(async (trx) => {
      const auditWrapper = createMigrationAuditWrapper(trx, {
        migrationName: seedName,
        operation: 'seed',
        comment: `Data seeding: ${seedName}`
      });
      
      return callback(auditWrapper);
    });
  }
}