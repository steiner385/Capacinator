import type { Request, Response, NextFunction } from 'express';
import type { Knex } from 'knex';
import { AuditService } from '../services/audit/AuditService.js';
import { getAuditConfig, isTableAudited } from '../config/auditConfig.js';
import { RequestWithLogging } from './requestLogger.js';

export interface AuditContext {
  tableName?: string;
  recordId?: string;
  action?: 'CREATE' | 'UPDATE' | 'DELETE';
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

// Extend request to include audit context
export interface RequestWithAudit extends RequestWithLogging {
  auditContext?: AuditContext;
  auditService?: AuditService;
}

// Factory function to create auto audit middleware with dependency injection
export function createAutoAuditMiddleware(database: Knex, tableName: string) {
  return async (req: RequestWithAudit, res: Response, next: NextFunction) => {
    if (!isTableAudited(tableName)) {
      return next();
    }

    // Ensure audit service is available
    if (!req.auditService) {
      const auditConfig = getAuditConfig();
      req.auditService = new AuditService(database, auditConfig);
    }

    // Set up the logging function if not already available
    if (!req.logAuditEvent) {
      req.logAuditEvent = async (tableName: string, recordId: string, action: string, oldValues: any, newValues: any, comment?: string) => {
        await req.auditService.logChange({
          tableName,
          recordId,
          action: action as 'CREATE' | 'UPDATE' | 'DELETE',
          changedBy: req.user?.id || 'system',
          oldValues,
          newValues,
          requestId: req.requestId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          comment
        });
      };
    }

    const originalSend = res.send;
    let auditLogged = false;

    res.send = function(body: any) {
      if (!auditLogged && res.statusCode >= 200 && res.statusCode < 300) {
        (async () => {
          try {
            const recordId = req.params.id || extractRecordIdFromResponse(body);
            if (recordId) {
              let action: 'CREATE' | 'UPDATE' | 'DELETE';
              
              if (req.method === 'POST') {
                action = 'CREATE';
              } else if (req.method === 'PUT' || req.method === 'PATCH') {
                action = 'UPDATE';
              } else if (req.method === 'DELETE') {
                action = 'DELETE';
              } else {
                return; // Don't audit GET requests
              }

              await (req as any).logAuditEvent(
                tableName,
                recordId,
                action,
                req.auditContext?.oldValues,
                req.auditContext?.newValues || extractNewValuesFromRequest(req),
                `Auto-audit: ${req.method} ${req.url}`
              );
            }
          } catch (error) {
            req.logger?.error('Auto-audit failed', error);
          }
        })();
      }

      auditLogged = true;
      return originalSend.call(this, body);
    };

    next();
  };
}

// Factory function to create enhanced audit middleware with dependency injection
export function createEnhancedAuditMiddleware(database: Knex) {
  return (req: RequestWithAudit, res: Response, next: NextFunction) => {
    // Initialize audit service with provided database
    const auditConfig = getAuditConfig();
    req.auditService = new AuditService(database, auditConfig);

    // Add audit logging helpers to request
    req.auditContext = {};

    // Helper function to log audit events
    (req as any).logAuditEvent = async (
      tableName: string,
      recordId: string,
      action: 'CREATE' | 'UPDATE' | 'DELETE',
      oldValues?: Record<string, any>,
      newValues?: Record<string, any>,
      comment?: string
    ) => {
      if (!isTableAudited(tableName)) {
        req.logger.debug('Table not audited, skipping audit log', { tableName });
        return;
      }

      try {
        const auditId = await req.auditService!.logChange({
          tableName,
          recordId,
          action,
          changedBy: (req as any).user?.id,
          oldValues,
          newValues,
          requestId: req.requestId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          comment
        });

        req.logger.info('Audit event logged', {
          auditId,
          tableName,
          recordId,
          action,
          userId: (req as any).user?.id
        });

        return auditId;
      } catch (error) {
        req.logger.error('Failed to log audit event', error, {
          tableName,
          recordId,
          action
        });
        throw error;
      }
    };

    // Helper function for bulk audit logging
    (req as any).logBulkAuditEvents = async (events: Array<{
      tableName: string;
      recordId: string;
      action: 'CREATE' | 'UPDATE' | 'DELETE';
      oldValues?: Record<string, any>;
      newValues?: Record<string, any>;
      comment?: string;
    }>) => {
      const auditIds = [];
      
      for (const event of events) {
        try {
          const auditId = await (req as any).logAuditEvent(
            event.tableName,
            event.recordId,
            event.action,
            event.oldValues,
            event.newValues,
            event.comment
          );
          auditIds.push(auditId);
        } catch (error) {
          req.logger.error('Failed to log bulk audit event', error, event);
          // Continue with other events
        }
      }

      req.logger.info('Bulk audit events logged', {
        count: auditIds.length,
        totalRequested: events.length
      });

      return auditIds;
    };

    // Helper function to track entity changes
    (req as any).trackEntityChange = (
      tableName: string,
      recordId: string,
      oldValues?: Record<string, any>,
      newValues?: Record<string, any>
    ) => {
      req.auditContext = {
        tableName,
        recordId,
        oldValues,
        newValues
      };
    };

    next();
  };
}

// Backward compatibility: export a default middleware that uses the global database
export function enhancedAuditMiddleware(req: RequestWithAudit, res: Response, next: NextFunction) {
  // Import database dynamically to avoid import issues in tests
  const { getDb } = require('../database/index.js');
  const database = getDb();
  
  const middleware = createEnhancedAuditMiddleware(database);
  return middleware(req, res, next);
}

// Middleware to automatically log audit events based on HTTP methods
export function autoAuditMiddleware(tableName: string) {
  return async (req: RequestWithAudit, res: Response, next: NextFunction) => {
    if (!isTableAudited(tableName)) {
      return next();
    }

    const originalSend = res.send;
    let auditLogged = false;

    res.send = function(body: any) {
      // Only log audit for successful responses and if not already logged
      if (!auditLogged && res.statusCode >= 200 && res.statusCode < 300) {
        (async () => {
          try {
            const recordId = req.params.id || extractRecordIdFromResponse(body);
            
            if (recordId) {
              let action: 'CREATE' | 'UPDATE' | 'DELETE';
              
              if (req.method === 'POST') {
                action = 'CREATE';
              } else if (req.method === 'PUT' || req.method === 'PATCH') {
                action = 'UPDATE';
              } else if (req.method === 'DELETE') {
                action = 'DELETE';
              } else {
                return; // Don't audit GET requests
              }

              await (req as any).logAuditEvent(
                tableName,
                recordId,
                action,
                req.auditContext?.oldValues,
                req.auditContext?.newValues || extractNewValuesFromRequest(req),
                `Auto-audit: ${req.method} ${req.url}`
              );
            }
          } catch (error) {
            req.logger.error('Auto-audit failed', error);
          }
        })();
      }

      auditLogged = true;
      return originalSend.call(this, body);
    };

    next();
  };
}

function extractRecordIdFromResponse(body: any): string | undefined {
  try {
    const parsed = typeof body === 'string' ? JSON.parse(body) : body;
    return parsed?.data?.id || parsed?.id;
  } catch {
    return undefined;
  }
}

function extractNewValuesFromRequest(req: Request): Record<string, any> | undefined {
  // Return request body as new values for CREATE/UPDATE operations
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    return req.body;
  }
  return undefined;
}