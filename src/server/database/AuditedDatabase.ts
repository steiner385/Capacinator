import { Knex } from 'knex';
import { AuditService } from '../services/audit/AuditService.js';
import { getAuditConfig, isTableAudited } from '../config/auditConfig.js';

/**
 * Generic database record type
 */
interface DatabaseRecord {
  id?: string | number;
  pk?: string | number;
  [key: string]: unknown;
}

// Table name mapping for audit configuration
const AUDIT_TABLE_MAPPING: Record<string, string> = {
  'person_availability_overrides': 'availability',
  'user_role_permissions': 'user_role_permissions',
  'user_permissions': 'user_permissions',
  'role_planners': 'role_planners',
  // Add more mappings as needed
};

// Helper function to get audit table name
function getAuditTableName(actualTableName: string): string {
  return AUDIT_TABLE_MAPPING[actualTableName] || actualTableName;
}

// Helper function to check if a table should be audited
function shouldAuditTable(actualTableName: string): boolean {
  const auditTableName = getAuditTableName(actualTableName);
  return isTableAudited(auditTableName);
}

export interface AuditContext {
  userId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  comment?: string;
}

export interface AuditableQueryBuilder extends Knex.QueryBuilder {
  // Add audit context to query builder
  auditContext(context: AuditContext): this;
  // Disable audit for specific operation (use sparingly)
  skipAudit(): this;
}

export class AuditedDatabase {
  private db: Knex;
  private auditService: AuditService;
  private defaultContext: AuditContext = {};

  constructor(db: Knex, auditService?: AuditService) {
    this.db = db;
    this.auditService = auditService || new AuditService(db, getAuditConfig());
  }

  // Set default audit context (typically from middleware)
  setDefaultContext(context: AuditContext): void {
    this.defaultContext = context;
  }

  // Get a table query builder with audit capabilities
  table(tableName: string): AuditableQueryBuilder {
    const queryBuilder = this.db(tableName) as AuditableQueryBuilder & {
      insert: (data: DatabaseRecord | DatabaseRecord[]) => Promise<unknown>;
      update: (data: Record<string, unknown>) => Promise<unknown>;
      del: () => Promise<number>;
      delete: () => Promise<number>;
      clone: () => Knex.QueryBuilder;
      select: (...args: string[]) => Promise<DatabaseRecord[]>;
    };
    const auditedDbInstance = this;

    // Add audit context storage
    let auditContext: AuditContext = { ...this.defaultContext };
    let skipAuditFlag = false;

    // Add audit context method
    queryBuilder.auditContext = function(context: AuditContext) {
      auditContext = { ...auditContext, ...context };
      return this;
    };

    // Add skip audit method
    queryBuilder.skipAudit = function() {
      skipAuditFlag = true;
      return this;
    };

    // Wrap insert method
    const originalInsert = queryBuilder.insert.bind(queryBuilder);
    queryBuilder.insert = async function(data: DatabaseRecord | DatabaseRecord[]) {
      const result = await originalInsert(data);

      if (!skipAuditFlag && shouldAuditTable(tableName)) {
        await auditedDbInstance._auditInsert(tableName, data, result, auditContext);
      }

      return result;
    };

    // Wrap update method
    const originalUpdate = queryBuilder.update.bind(queryBuilder);
    queryBuilder.update = async function(data: Record<string, unknown>) {
      if (!skipAuditFlag && shouldAuditTable(tableName)) {
        // Get old values before update
        const oldRecords = await queryBuilder.clone().select('*') as DatabaseRecord[];

        const result = await originalUpdate(data);

        // Log audit for each updated record
        for (const oldRecord of oldRecords) {
          await auditedDbInstance._auditUpdate(tableName, oldRecord, data, auditContext);
        }

        return result;
      } else {
        return await originalUpdate(data);
      }
    };

    // Wrap delete method
    const originalDel = queryBuilder.del.bind(queryBuilder);
    queryBuilder.del = queryBuilder.delete = async function() {
      if (!skipAuditFlag && shouldAuditTable(tableName)) {
        // Get records before deletion
        const recordsToDelete = await queryBuilder.clone().select('*') as DatabaseRecord[];

        const result = await originalDel();

        // Log audit for each deleted record
        for (const record of recordsToDelete) {
          await auditedDbInstance._auditDelete(tableName, record, auditContext);
        }

        return result;
      } else {
        return await originalDel();
      }
    };

    return queryBuilder;
  }

  // Helper method to audit insert operations
  async _auditInsert(tableName: string, data: DatabaseRecord | DatabaseRecord[], result: unknown, context: AuditContext): Promise<void> {
    try {
      // For single inserts, data might be an object, for bulk inserts, an array
      const records = Array.isArray(data) ? data : [data];
      const resultArray = Array.isArray(result) ? result as DatabaseRecord[] : [];

      for (let i = 0; i < records.length; i++) {
        const record = records[i];

        // Try to get the record ID from various sources
        let recordId: string;
        if (record.id) {
          recordId = String(record.id);
        } else if (resultArray[i]) {
          recordId = String(resultArray[i].id || resultArray[i]);
        } else if (result && typeof result === 'object' && 'id' in result) {
          recordId = String((result as DatabaseRecord).id);
        } else {
          recordId = `unknown-${Date.now()}-${i}`;
        }

        await this.auditService.logChange({
          tableName: getAuditTableName(tableName),
          recordId: String(recordId),
          action: 'CREATE',
          changedBy: context.userId,
          newValues: record,
          requestId: context.requestId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          comment: context.comment || `Record created in ${tableName}`
        });
      }
    } catch (error) {
      console.error('Failed to log audit for insert operation:', error);
      // Don't throw - audit failure shouldn't break the operation
    }
  }

  // Helper method to audit update operations
  async _auditUpdate(tableName: string, oldRecord: DatabaseRecord, newData: Record<string, unknown>, context: AuditContext): Promise<void> {
    try {
      const recordId = oldRecord.id || oldRecord.pk || `unknown-${Date.now()}`;

      // Merge old record with new data to get complete new values
      const newValues = { ...oldRecord, ...newData };

      await this.auditService.logChange({
        tableName: getAuditTableName(tableName),
        recordId: String(recordId),
        action: 'UPDATE',
        changedBy: context.userId,
        oldValues: oldRecord,
        newValues: newValues,
        requestId: context.requestId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        comment: context.comment || `Record updated in ${tableName}`
      });
    } catch (error) {
      console.error('Failed to log audit for update operation:', error);
      // Don't throw - audit failure shouldn't break the operation
    }
  }

  // Helper method to audit delete operations
  async _auditDelete(tableName: string, record: DatabaseRecord, context: AuditContext): Promise<void> {
    try {
      const recordId = record.id || record.pk || `unknown-${Date.now()}`;

      await this.auditService.logChange({
        tableName: getAuditTableName(tableName),
        recordId: String(recordId),
        action: 'DELETE',
        changedBy: context.userId,
        oldValues: record,
        requestId: context.requestId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        comment: context.comment || `Record deleted from ${tableName}`
      });
    } catch (error) {
      console.error('Failed to log audit for delete operation:', error);
      // Don't throw - audit failure shouldn't break the operation
    }
  }

  // Expose raw database for non-table operations (migrations, etc.)
  get raw(): Knex {
    return this.db;
  }

  // Proxy method to handle direct calls like db('table')
  __call(tableName: string): AuditableQueryBuilder {
    return this.table(tableName);
  }

  // Proxy other Knex methods
  get transaction() {
    return this.db?.transaction?.bind(this.db);
  }
  
  get migrate() {
    return this.db?.migrate;
  }
  
  get seed() {
    return this.db?.seed;
  }
  
  get schema() {
    return this.db?.schema;
  }
  
  get fn() {
    return this.db?.fn;
  }
  
  get ref() {
    return this.db?.ref;
  }
  
  get destroy() {
    return this.db?.destroy?.bind(this.db);
  }
}

/**
 * Audited database callable interface
 */
type AuditedDbFunction = ((tableName?: string) => AuditableQueryBuilder | Knex) & {
  setDefaultContext: (context: AuditContext) => void;
  table: (tableName: string) => AuditableQueryBuilder;
  raw: Knex;
  transaction: Knex['transaction'] | undefined;
  migrate: Knex['migrate'] | undefined;
  seed: Knex['seed'] | undefined;
  schema: Knex['schema'] | undefined;
  fn: Knex['fn'] | undefined;
  ref: Knex['ref'] | undefined;
  destroy: (() => Promise<void>) | undefined;
};

// Factory function to create audited database with proper proxy
export function createAuditedDatabase(db: Knex, auditService?: AuditService): AuditedDbFunction {
  const auditedDb = new AuditedDatabase(db, auditService);

  // Create a function that acts like Knex but with audit capabilities
  const dbFunction = function(tableName?: string) {
    if (tableName) {
      return auditedDb.table(tableName);
    }
    return auditedDb.raw;
  };

  // Proxy to forward all properties and methods
  return new Proxy(dbFunction, {
    get(target, prop: string) {
      // Handle direct method calls on the audited database
      if (prop in auditedDb) {
        const value = (auditedDb as unknown as Record<string, unknown>)[prop];
        return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(auditedDb) : value;
      }

      // Handle calls to the underlying database
      if (prop in auditedDb.raw) {
        const value = (auditedDb.raw as unknown as Record<string, unknown>)[prop];
        return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(auditedDb.raw) : value;
      }

      return undefined;
    },
    has(target, prop) {
      return (prop in auditedDb) || (prop in auditedDb.raw);
    },
    apply(target, thisArg, args) {
      return target.apply(thisArg, args as [string?]);
    }
  }) as AuditedDbFunction;
}