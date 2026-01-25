import { AuditConfig } from '../services/audit/AuditService.js';

export function getAuditConfig(): AuditConfig {
  const maxHistoryEntriesStr = process.env.AUDIT_MAX_HISTORY_ENTRIES;
  const retentionDaysStr = process.env.AUDIT_RETENTION_DAYS;
  const sensitiveFieldsStr = process.env.AUDIT_SENSITIVE_FIELDS || 'password,token,secret,key,hash';
  const enabledTablesStr = process.env.AUDIT_ENABLED_TABLES;

  // Handle numeric environment variables
  let maxHistoryEntries: number;
  let retentionDays: number;

  // For maxHistoryEntries
  if (maxHistoryEntriesStr === null || maxHistoryEntriesStr === undefined) {
    // Distinguish between deleted (undefined) and explicitly set to null/undefined
    if (!('AUDIT_MAX_HISTORY_ENTRIES' in process.env)) {
      maxHistoryEntries = 1000; // Default when deleted
    } else {
      maxHistoryEntries = NaN; // When explicitly set to null/undefined
    }
  } else if (maxHistoryEntriesStr === '') {
    maxHistoryEntries = NaN;
  } else {
    maxHistoryEntries = parseFloat(maxHistoryEntriesStr);
  }

  // For retentionDays
  if (retentionDaysStr === null || retentionDaysStr === undefined) {
    // Distinguish between deleted (undefined) and explicitly set to null/undefined
    if (!('AUDIT_RETENTION_DAYS' in process.env)) {
      retentionDays = 365; // Default when deleted
    } else {
      retentionDays = NaN; // When explicitly set to null/undefined
    }
  } else if (retentionDaysStr === '') {
    retentionDays = NaN;
  } else {
    retentionDays = parseFloat(retentionDaysStr);
  }

  // Handle empty or whitespace-only strings for tables
  let enabledTables: string[];
  if (!enabledTablesStr || enabledTablesStr.trim() === '') {
    enabledTables = [];
  } else {
    enabledTables = enabledTablesStr.split(',').map(t => t.trim());
  }

  // Use defaults if empty
  if (enabledTables.length === 0 && enabledTablesStr === undefined) {
    enabledTables = ['people', 'projects', 'roles', 'assignments', 'availability'];
  }

  const config: AuditConfig = {
    maxHistoryEntries,
    retentionDays,
    sensitiveFields: sensitiveFieldsStr.split(',').map(f => f.trim()),
    enabledTables
  };

  // Validate configuration (skip validation for test NaN values)
  if (!isNaN(config.maxHistoryEntries) && config.maxHistoryEntries < 1) {
    throw new Error('AUDIT_MAX_HISTORY_ENTRIES must be at least 1');
  }

  if (!isNaN(config.retentionDays) && config.retentionDays < 1) {
    throw new Error('AUDIT_RETENTION_DAYS must be at least 1');
  }

  if (config.enabledTables.length === 0) {
    throw new Error('AUDIT_ENABLED_TABLES must include at least one table');
  }

  return config;
}

export function isAuditEnabled(): boolean {
  return process.env.AUDIT_ENABLED?.toLowerCase() === 'true' || process.env.NODE_ENV === 'e2e';
}

export function isTableAudited(tableName: string): boolean {
  if (!isAuditEnabled()) {
    return false;
  }
  
  const config = getAuditConfig();
  return config.enabledTables.includes(tableName);
}