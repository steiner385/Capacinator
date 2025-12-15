/**
 * Audit Configuration
 *
 * This file provides audit-specific configuration functions.
 * The underlying config is now centralized in env.ts.
 */

import { env, AuditConfig as EnvAuditConfig } from './env.js';
import { AuditConfig } from '../services/audit/AuditService.js';

/**
 * Get audit configuration for the AuditService.
 * Converts from centralized env config to the AuditService expected format.
 */
export function getAuditConfig(): AuditConfig {
  const { audit } = env;

  const config: AuditConfig = {
    maxHistoryEntries: audit.maxHistoryEntries,
    retentionDays: audit.retentionDays,
    sensitiveFields: audit.sensitiveFields,
    enabledTables: audit.enabledTables
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

/**
 * Check if audit is enabled.
 * @deprecated Use env.audit.enabled instead
 */
export function isAuditEnabled(): boolean {
  return env.audit.enabled;
}

/**
 * Check if a table is audited.
 * @deprecated Use env.audit.enabledTables.includes(tableName) instead
 */
export function isTableAudited(tableName: string): boolean {
  return env.audit.enabled && env.audit.enabledTables.includes(tableName);
}
