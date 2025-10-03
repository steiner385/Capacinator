import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuditService } from '../services/audit/AuditService';

export interface AuditContext {
  requestId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  auditService: AuditService;
}

declare global {
  namespace Express {
    interface Request {
      audit?: AuditContext;
    }
  }
}

export function createAuditMiddleware(auditService: AuditService) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Generate unique request ID for correlation
    const requestId = uuidv4();
    
    // Extract user info (assumes JWT middleware has run)
    const userId = (req as any).user?.id;
    
    // Get client info
    const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
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

export async function auditModelChanges(
  req: Request,
  tableName: string,
  recordId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>,
  comment?: string
): Promise<string | null> {
  if (!req.audit) {
    console.warn('Audit context not available - audit middleware may not be configured');
    return null;
  }

  try {
    const auditId = await req.audit.auditService.logChange({
      tableName,
      recordId,
      action,
      changedBy: req.audit.userId,
      oldValues,
      newValues,
      requestId: req.audit.requestId,
      ipAddress: req.audit.ipAddress,
      userAgent: req.audit.userAgent,
      comment
    });
    
    return auditId;
  } catch (error) {
    console.error('Failed to log audit entry:', error);
    return null;
  }
}

export function auditableController<T = any>(
  controllerFn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controllerFn(req, res, next);
      return result;
    } catch (error) {
      // Log error in audit trail (fire-and-forget)
      if (req.audit) {
        req.audit.auditService.logChange({
          tableName: 'system_errors',
          recordId: req.audit.requestId,
          action: 'CREATE',
          changedBy: req.audit.userId,
          newValues: {
            error: (error as Error).message,
            stack: (error as Error).stack,
            url: req.url,
            method: req.method,
            body: req.body,
            query: req.query,
            params: req.params
          },
          requestId: req.audit.requestId,
          ipAddress: req.audit.ipAddress,
          userAgent: req.audit.userAgent,
          comment: 'System error occurred'
        }).catch(() => {
          // Ignore audit logging errors - we still want to throw the original error
        });
      }
      throw error;
    }
  };
}