import { Knex } from 'knex';
import { AuditService } from './AuditService.js';
import { getAuditConfig, isAuditEnabled } from '../../config/auditConfig.js';
import { logger } from '../logging/config.js';

let auditServiceInstance: AuditService | null = null;

export function initializeAuditService(db: Knex): AuditService | null {
  if (!isAuditEnabled()) {
    logger.info('Audit service disabled');
    return null;
  }

  try {
    const config = getAuditConfig();
    auditServiceInstance = new AuditService(db, config);
    logger.info('Audit service initialized successfully', {
      maxHistoryEntries: config.maxHistoryEntries,
      retentionDays: config.retentionDays,
      auditedTables: config.enabledTables.join(', '),
      sensitiveFields: config.sensitiveFields.join(', ')
    });

    return auditServiceInstance;
  } catch (error) {
    logger.error('Failed to initialize audit service', error instanceof Error ? error : undefined);
    return null;
  }
}

export function getAuditService(): AuditService | null {
  return auditServiceInstance;
}

export { AuditService, type AuditConfig } from './AuditService.js';

// Export unified audit middleware functions (consolidated from legacy auditMiddleware.ts)
export {
  auditModelChanges,
  createAuditMiddleware,
  auditableController,
  createEnhancedAuditMiddleware,
  createAutoAuditMiddleware,
  autoAuditMiddleware,
  enhancedAuditMiddleware,
  type AuditContext,
  type LegacyAuditContext,
  type RequestWithAudit,
} from '../../middleware/enhancedAuditMiddleware.js';