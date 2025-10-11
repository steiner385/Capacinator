import type { Request, Response, NextFunction } from 'express';
import { getAuditedDb } from '../../database/index.js';
import { AuditContext } from '../../database/AuditedDatabase.js';

export abstract class AuditedBaseController {
  protected auditedDb: any;

  constructor() {
    this.auditedDb = getAuditedDb();
  }

  // Get database instance with audit context from request
  protected getDb(req?: Request): any {
    if (req) {
      // Extract audit context from enhanced audit middleware
      const auditContext: AuditContext = {
        userId: (req as any).user?.id,
        requestId: (req as any).requestId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      };

      // Set audit context on the database instance
      const auditedInstance = getAuditedDb();
      auditedInstance.setDefaultContext(auditContext);
      return auditedInstance;
    }

    return this.auditedDb;
  }

  // Legacy support - controllers can still access this.db but it won't have audit context
  protected get db(): any {
    return this.auditedDb;
  }

  protected handleError(error: any, res: Response, message = 'Internal server error') {
    console.error('Controller error:', error);
    if (error.code === 'SQLITE_ERROR') {
      console.error('SQL Error details:', error.message);
    }
    res.status(500).json({
      error: message,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  protected handleNotFound(res: Response, resource = 'Resource') {
    res.status(404).json({
      error: `${resource} not found`
    });
  }

  protected handleValidationError(res: Response, errors: any) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  protected async executeQuery<T>(
    queryFn: () => Promise<T>,
    res: Response,
    errorMessage?: string
  ): Promise<T | undefined> {
    try {
      return await queryFn();
    } catch (error) {
      this.handleError(error, res, errorMessage);
      return undefined;
    }
  }

  // Enhanced executeQuery that includes audit context
  protected async executeAuditedQuery<T>(
    req: Request,
    queryFn: (db: any) => Promise<T>,
    res: Response,
    errorMessage?: string
  ): Promise<T | undefined> {
    try {
      const auditedDb = this.getDb(req);
      return await queryFn(auditedDb);
    } catch (error) {
      this.handleError(error, res, errorMessage);
      return undefined;
    }
  }

  protected paginate(query: any, page: number = 1, limit: number = 50) {
    const offset = (page - 1) * limit;
    return query.limit(limit).offset(offset);
  }

  protected buildFilters(query: any, filters: Record<string, any>) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'string' && value.includes('%')) {
          query.where(key, 'like', value);
        } else {
          query.where(key, value);
        }
      }
    });
    return query;
  }
}