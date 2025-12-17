import type { Request, Response, NextFunction } from 'express';
import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import { AuditService } from '../services/audit/AuditService.js';
import { getAuditConfig, isTableAudited } from '../config/auditConfig.js';
import { RequestWithLogging } from './requestLogger.js';

/**
 * Unified Audit Middleware
 *
 * This module consolidates the dual audit middleware systems into a single,
 * consistent implementation. It provides:
 *
 * 1. Legacy-compatible `auditModelChanges` function for direct audit logging
 * 2. Enhanced middleware with dependency injection for the audit service
 * 3. Auto-audit middleware for automatic HTTP method-based auditing
 * 4. Request-attached helper functions for flexible audit logging
 *
 * Migration from legacy auditMiddleware.ts:
 * - `createAuditMiddleware` -> `createEnhancedAuditMiddleware`
 * - `auditModelChanges` -> `auditModelChanges` (backward compatible)
 * - `auditableController` -> `auditableController` (backward compatible)
 */

export interface AuditContext {
  tableName?: string;
  recordId?: string;
  action?: 'CREATE' | 'UPDATE' | 'DELETE';
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

/**
 * Legacy-compatible audit context interface
 * Used by createAuditMiddleware for backward compatibility
 */
export interface LegacyAuditContext {
  requestId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  auditService: AuditService;
}

// Extend Express Request type globally for legacy compatibility
declare global {
  namespace Express {
    interface Request {
      audit?: LegacyAuditContext;
    }
  }
}

// Extend request to include audit context
export interface RequestWithAudit extends RequestWithLogging {
  auditContext?: AuditContext;
  auditService?: AuditService;
  audit?: LegacyAuditContext;
  logAuditEvent?: (
    tableName: string,
    recordId: string,
    action: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    comment?: string
  ) => Promise<string | undefined>;
  logBulkAuditEvents?: (events: Array<{
    tableName: string;
    recordId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    comment?: string;
  }>) => Promise<(string | undefined)[]>;
  trackEntityChange?: (
    tableName: string,
    recordId: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>
  ) => void;
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
      req.logAuditEvent = async (tableName: string, recordId: string, action: string, oldValues?: Record<string, unknown>, newValues?: Record<string, unknown>, comment?: string): Promise<string | undefined> => {
        if (!req.auditService) {
          return undefined;
        }
        return await req.auditService.logChange({
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

    res.send = function(body: string | Buffer | object) {
      if (!auditLogged && res.statusCode >= 200 && res.statusCode < 300) {
        (async () => {
          try {
            const recordId = req.params.id || extractRecordIdFromResponse(body);
            if (recordId && req.logAuditEvent) {
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

              await req.logAuditEvent(
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

/**
 * Extended Request with user information
 */
interface RequestWithUser extends Request {
  user?: {
    id: string;
    [key: string]: unknown;
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
    req.logAuditEvent = async (
      tableName: string,
      recordId: string,
      action: 'CREATE' | 'UPDATE' | 'DELETE',
      oldValues?: Record<string, unknown>,
      newValues?: Record<string, unknown>,
      comment?: string
    ) => {
      if (!isTableAudited(tableName)) {
        req.logger.debug('Table not audited, skipping audit log', { tableName });
        return;
      }

      const reqWithUser = req as RequestWithAudit & RequestWithUser;

      try {
        const auditId = await req.auditService!.logChange({
          tableName,
          recordId,
          action,
          changedBy: reqWithUser.user?.id,
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
          userId: reqWithUser.user?.id
        });

        return auditId;
      } catch (error) {
        req.logger.error('Failed to log audit event', error instanceof Error ? error : new Error(String(error)), {
          tableName,
          recordId,
          action
        });
        throw error;
      }
    };

    // Helper function for bulk audit logging
    req.logBulkAuditEvents = async (events: Array<{
      tableName: string;
      recordId: string;
      action: 'CREATE' | 'UPDATE' | 'DELETE';
      oldValues?: Record<string, unknown>;
      newValues?: Record<string, unknown>;
      comment?: string;
    }>) => {
      const auditIds: (string | undefined)[] = [];

      for (const event of events) {
        try {
          const auditId = req.logAuditEvent ? await req.logAuditEvent(
            event.tableName,
            event.recordId,
            event.action,
            event.oldValues,
            event.newValues,
            event.comment
          ) : undefined;
          auditIds.push(auditId);
        } catch (error) {
          req.logger.error('Failed to log bulk audit event', error instanceof Error ? error : new Error(String(error)), event);
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
    req.trackEntityChange = (
      tableName: string,
      recordId: string,
      oldValues?: Record<string, unknown>,
      newValues?: Record<string, unknown>
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
export async function enhancedAuditMiddleware(req: RequestWithAudit, res: Response, next: NextFunction) {
  // Import database dynamically to avoid import issues in tests
  const { getDb } = await import('../database/index.js');
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

    res.send = function(body: string | Buffer | object) {
      // Only log audit for successful responses and if not already logged
      if (!auditLogged && res.statusCode >= 200 && res.statusCode < 300) {
        (async () => {
          try {
            const recordId = req.params.id || extractRecordIdFromResponse(body);

            if (recordId && req.logAuditEvent) {
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

              await req.logAuditEvent(
                tableName,
                recordId,
                action,
                req.auditContext?.oldValues,
                req.auditContext?.newValues || extractNewValuesFromRequest(req),
                `Auto-audit: ${req.method} ${req.url}`
              );
            }
          } catch (error) {
            req.logger.error('Auto-audit failed', error instanceof Error ? error : new Error(String(error)));
          }
        })();
      }

      auditLogged = true;
      return originalSend.call(this, body);
    };

    next();
  };
}

interface ApiResponseBody {
  data?: { id?: string };
  id?: string;
}

function extractRecordIdFromResponse(body: string | Buffer | object): string | undefined {
  try {
    const parsed: ApiResponseBody = typeof body === 'string' ? JSON.parse(body) : body as ApiResponseBody;
    return parsed?.data?.id || parsed?.id;
  } catch {
    return undefined;
  }
}

function extractNewValuesFromRequest(req: Request): Record<string, unknown> | undefined {
  // Return request body as new values for CREATE/UPDATE operations
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    return req.body;
  }
  return undefined;
}

// ============================================================================
// LEGACY COMPATIBILITY FUNCTIONS
// These functions provide backward compatibility with the original auditMiddleware.ts
// ============================================================================

/**
 * Legacy-compatible middleware factory that creates audit context on requests.
 * This is the original createAuditMiddleware from auditMiddleware.ts.
 *
 * @param auditService - The AuditService instance to use for logging
 * @returns Express middleware function
 */
export function createAuditMiddleware(auditService: AuditService) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Generate unique request ID for correlation
    const requestId = uuidv4();

    // Extract user info (assumes JWT middleware has run)
    const reqWithUser = req as RequestWithUser;
    const userId = reqWithUser.user?.id;

    // Get client info - use connection.remoteAddress as fallback
    const reqWithSocket = req as Request & { connection?: { remoteAddress?: string } };
    const ipAddress = req.ip || reqWithSocket.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Attach audit context to request
    req.audit = {
      requestId,
      userId,
      ipAddress,
      userAgent,
      auditService
    };

    // Add request ID to response headers for tracing
    res.setHeader('X-Request-ID', requestId);

    next();
  };
}

/**
 * Audit model changes with support for both legacy signature and new object-based signature.
 *
 * Legacy signature (backward compatible):
 *   auditModelChanges(req, tableName, recordId, action, oldValues, newValues, comment)
 *
 * New object-based signature:
 *   auditModelChanges(req, { tableName, recordId, action, oldValues, newValues, comment })
 *
 * @returns Promise<string | null> - The audit ID or null if logging failed
 */
export async function auditModelChanges(
  req: Request,
  tableNameOrOptions: string | {
    tableName: string;
    recordId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'INSERT';
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
    comment?: string;
  },
  recordId?: string,
  action?: 'CREATE' | 'UPDATE' | 'DELETE',
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>,
  comment?: string
): Promise<string | null> {
  // Normalize arguments - support both old positional and new object-based signatures
  let tableName: string;
  let finalRecordId: string;
  let finalAction: 'CREATE' | 'UPDATE' | 'DELETE';
  let finalOldValues: Record<string, unknown> | undefined;
  let finalNewValues: Record<string, unknown> | undefined;
  let finalComment: string | undefined;

  if (typeof tableNameOrOptions === 'object') {
    // New object-based signature
    tableName = tableNameOrOptions.tableName;
    finalRecordId = tableNameOrOptions.recordId;
    // Map 'INSERT' to 'CREATE' for consistency
    finalAction = tableNameOrOptions.action === 'INSERT' ? 'CREATE' : tableNameOrOptions.action as 'CREATE' | 'UPDATE' | 'DELETE';
    finalOldValues = tableNameOrOptions.oldValues ?? undefined;
    finalNewValues = tableNameOrOptions.newValues ?? undefined;
    finalComment = tableNameOrOptions.comment;
  } else {
    // Legacy positional signature
    tableName = tableNameOrOptions;
    finalRecordId = recordId!;
    finalAction = action!;
    finalOldValues = oldValues;
    finalNewValues = newValues;
    finalComment = comment;
  }

  // Try to get audit service from multiple sources
  const auditService = req.audit?.auditService || (req as RequestWithAudit).auditService;

  if (!auditService) {
    console.warn('Audit context not available - audit middleware may not be configured');
    return null;
  }

  // Get request context from either legacy or enhanced middleware
  const reqWithUser = req as RequestWithUser;
  const requestId = req.audit?.requestId || (req as RequestWithAudit).requestId;
  const userId = req.audit?.userId || reqWithUser.user?.id;
  const ipAddress = req.audit?.ipAddress || req.ip;
  const userAgent = req.audit?.userAgent || req.headers['user-agent'];

  try {
    const auditId = await auditService.logChange({
      tableName,
      recordId: finalRecordId,
      action: finalAction,
      changedBy: userId,
      oldValues: finalOldValues,
      newValues: finalNewValues,
      requestId,
      ipAddress,
      userAgent,
      comment: finalComment
    });

    return auditId;
  } catch (error) {
    console.error('Failed to log audit entry:', error);
    return null;
  }
}

/**
 * Wrapper for controller functions that provides automatic error logging.
 * Errors are logged to the audit trail before being re-thrown.
 *
 * @param controllerFn - The controller function to wrap
 * @returns Wrapped controller function with error logging
 */
export function auditableController<T = unknown>(
  controllerFn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controllerFn(req, res, next);
      return result;
    } catch (error) {
      // Log error in audit trail (fire-and-forget)
      const auditService = req.audit?.auditService || (req as RequestWithAudit).auditService;
      const requestId = req.audit?.requestId || (req as RequestWithAudit).requestId;
      const reqWithUser = req as RequestWithUser;
      const userId = req.audit?.userId || reqWithUser.user?.id;
      const ipAddress = req.audit?.ipAddress || req.ip;
      const userAgent = req.audit?.userAgent || req.headers['user-agent'];

      if (auditService) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        auditService.logChange({
          tableName: 'system_errors',
          recordId: requestId || uuidv4(),
          action: 'CREATE',
          changedBy: userId,
          newValues: {
            error: errorObj.message,
            stack: errorObj.stack,
            url: req.url,
            method: req.method,
            body: req.body as Record<string, unknown>,
            query: req.query,
            params: req.params
          },
          requestId,
          ipAddress,
          userAgent,
          comment: 'System error occurred'
        }).catch(() => {
          // Ignore audit logging errors - we still want to throw the original error
        });
      }
      throw error;
    }
  };
}