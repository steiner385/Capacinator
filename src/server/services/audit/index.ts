import { Knex } from 'knex';
import { AuditService } from './AuditService.js';
import { getAuditConfig, isAuditEnabled } from '../../config/auditConfig.js';

let auditServiceInstance: AuditService | null = null;

export function initializeAuditService(db: Knex): AuditService | null {
  if (!isAuditEnabled()) {
    console.log('Audit service disabled');
    return null;
  }

  try {
    const config = getAuditConfig();
    auditServiceInstance = new AuditService(db, config);
    console.log('Audit service initialized successfully');
    console.log(`- Max history entries per record: ${config.maxHistoryEntries}`);
    console.log(`- Retention period: ${config.retentionDays} days`);
    console.log(`- Audited tables: ${config.enabledTables.join(', ')}`);
    console.log(`- Sensitive fields: ${config.sensitiveFields.join(', ')}`);
    
    return auditServiceInstance;
  } catch (error) {
    console.error('Failed to initialize audit service:', error);
    return null;
  }
}

export function getAuditService(): AuditService | null {
  return auditServiceInstance;
}

export { AuditService, type AuditConfig } from './AuditService.js';
export { auditModelChanges, createAuditMiddleware } from '../../middleware/auditMiddleware.js';