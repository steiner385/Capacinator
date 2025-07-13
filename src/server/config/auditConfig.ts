import { AuditConfig } from '../services/audit/AuditService';

export function getAuditConfig(): AuditConfig {
  const config: AuditConfig = {
    maxHistoryEntries: parseInt(process.env.AUDIT_MAX_HISTORY_ENTRIES || '1000'),
    retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '365'),
    sensitiveFields: (process.env.AUDIT_SENSITIVE_FIELDS || 'password,token,secret,key,hash').split(',').map(f => f.trim()),
    enabledTables: (process.env.AUDIT_ENABLED_TABLES || 'people,projects,roles,assignments,availability').split(',').map(t => t.trim())
  };

  // Validate configuration
  if (config.maxHistoryEntries < 1) {
    throw new Error('AUDIT_MAX_HISTORY_ENTRIES must be at least 1');
  }

  if (config.retentionDays < 1) {
    throw new Error('AUDIT_RETENTION_DAYS must be at least 1');
  }

  if (config.enabledTables.length === 0) {
    throw new Error('AUDIT_ENABLED_TABLES must include at least one table');
  }

  return config;
}

export function isAuditEnabled(): boolean {
  return process.env.AUDIT_ENABLED?.toLowerCase() === 'true';
}

export function isTableAudited(tableName: string): boolean {
  if (!isAuditEnabled()) {
    return false;
  }
  
  const config = getAuditConfig();
  return config.enabledTables.includes(tableName);
}