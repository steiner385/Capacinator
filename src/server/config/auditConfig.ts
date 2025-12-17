import { AuditConfig } from '../services/audit/AuditService';
import { config as envConfig } from './environment.js';

export function getAuditConfig(): AuditConfig {
  // Parse enabled tables from centralized config
  const enabledTablesStr = envConfig.audit.enabledTables;
  const enabledTables = enabledTablesStr
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);

  // Parse sensitive fields from centralized config
  const sensitiveFieldsStr = envConfig.audit.sensitiveFields;
  const sensitiveFields = sensitiveFieldsStr
    .split(',')
    .map(f => f.trim())
    .filter(f => f.length > 0);

  const auditConfig: AuditConfig = {
    maxHistoryEntries: envConfig.audit.maxHistoryEntries,
    retentionDays: envConfig.audit.retentionDays,
    sensitiveFields,
    enabledTables
  };

  // Validation is already done in environment.ts, but validate here too for safety
  if (auditConfig.maxHistoryEntries < 1) {
    throw new Error('AUDIT_MAX_HISTORY_ENTRIES must be at least 1');
  }

  if (auditConfig.retentionDays < 1) {
    throw new Error('AUDIT_RETENTION_DAYS must be at least 1');
  }

  if (auditConfig.enabledTables.length === 0) {
    throw new Error('AUDIT_ENABLED_TABLES must include at least one table');
  }

  return auditConfig;
}

export function isAuditEnabled(): boolean {
  return envConfig.features.audit;
}

export function isTableAudited(tableName: string): boolean {
  if (!isAuditEnabled()) {
    return false;
  }
  
  const config = getAuditConfig();
  return config.enabledTables.includes(tableName);
}