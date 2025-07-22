import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { AuditService } from '../../services/audit/AuditService.js';

export class AuditController extends BaseController {
  private auditService: AuditService;

  constructor(auditService: AuditService) {
    super();
    this.auditService = auditService;
  }

  getAuditHistory = async (req: Request, res: Response): Promise<void> => {
    await this.executeQuery(async () => {
      const { tableName, recordId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      if (!tableName || !recordId) {
        return res.status(400).json({
          error: 'tableName and recordId are required'
        });
      }

      const history = await this.auditService.getAuditHistory(tableName, recordId, limit);
      
      return res.json({
        success: true,
        data: history,
        meta: {
          count: history.length,
          tableName,
          recordId
        }
      });
    }, res);
  };

  getRecentChanges = async (req: Request, res: Response): Promise<void> => {
    await this.executeQuery(async () => {
      const changedBy = req.query.changedBy as string;
      const limit = parseInt((req.query.limit as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');

      const changes = await this.auditService.getRecentChanges(changedBy, limit, offset);
      
      return res.json({
        success: true,
        data: changes,
        meta: {
          count: changes.length,
          limit,
          offset,
          changedBy
        }
      });
    }, res);
  };

  searchAuditLog = async (req: Request, res: Response): Promise<void> => {
    await this.executeQuery(async () => {
      const filters = {
        tableName: req.query.tableName as string,
        recordId: req.query.recordId as string,
        changedBy: req.query.changedBy as string,
        action: req.query.action as string,
        requestId: req.query.requestId as string,
        fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
        toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
        limit: parseInt((req.query.limit as string) || '50'),
        offset: parseInt((req.query.offset as string) || '0')
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] === undefined) {
          delete filters[key as keyof typeof filters];
        }
      });

      const result = await this.auditService.searchAuditLog(filters);
      
      return res.json({
        success: true,
        data: result.entries,
        meta: {
          total: result.total,
          count: result.entries.length,
          limit: filters.limit,
          offset: filters.offset,
          filters
        }
      });
    }, res);
  };

  undoLastChange = async (req: Request, res: Response): Promise<void> => {
    await this.executeQuery(async () => {
      const { tableName, recordId } = req.params;
      const { comment } = req.body;
      const undoneBy = req.audit?.userId;

      if (!tableName || !recordId) {
        return res.status(400).json({
          error: 'tableName and recordId are required'
        });
      }

      if (!undoneBy) {
        return res.status(401).json({
          error: 'User authentication required for undo operations'
        });
      }

      try {
        const success = await this.auditService.undoLastChange(
          tableName,
          recordId,
          undoneBy,
          comment
        );

        return res.json({
          success: true,
          data: {
            undone: success,
            tableName,
            recordId,
            undoneBy,
            comment
          }
        });
      } catch (error) {
        return res.status(400).json({
          error: (error as Error).message
        });
      }
    }, res);
  };

  undoLastNChanges = async (req: Request, res: Response): Promise<void> => {
    await this.executeQuery(async () => {
      const { changedBy, count } = req.params;
      const { comment } = req.body;
      const undoneBy = req.audit?.userId;

      if (!changedBy || !count) {
        return res.status(400).json({
          error: 'changedBy and count are required'
        });
      }

      if (!undoneBy) {
        return res.status(401).json({
          error: 'User authentication required for undo operations'
        });
      }

      const countNum = parseInt(count);
      if (isNaN(countNum) || countNum <= 0 || countNum > 100) {
        return res.status(400).json({
          error: 'count must be a number between 1 and 100'
        });
      }

      const result = await this.auditService.undoLastNChanges(
        changedBy,
        countNum,
        undoneBy,
        comment
      );

      return res.json({
        success: true,
        data: {
          undone: result.undone,
          errors: result.errors,
          changedBy,
          count: countNum,
          undoneBy,
          comment
        }
      });
    }, res);
  };

  getAuditStats = async (req: Request, res: Response): Promise<void> => {
    await this.executeQuery(async () => {
      const stats = await this.auditService.getAuditStats();
      
      return res.json({
        success: true,
        data: stats
      });
    }, res);
  };

  cleanupExpiredEntries = async (req: Request, res: Response): Promise<void> => {
    await this.executeQuery(async () => {
      const deletedCount = await this.auditService.cleanupExpiredEntries();
      
      return res.json({
        success: true,
        data: {
          deletedCount,
          message: `Cleaned up ${deletedCount} expired audit entries`
        }
      });
    }, res);
  };
}