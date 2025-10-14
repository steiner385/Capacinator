// Jest setup for server unit tests
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock audit system before any modules are imported
jest.mock('../../../src/server/services/audit/index.js', () => {
  const mockAuditService = {
    audit: jest.fn(),
    getHistory: jest.fn(),
    cleanup: jest.fn()
  };
  
  return {
    initializeAuditService: jest.fn(() => mockAuditService),
    getAuditService: jest.fn(() => mockAuditService),
    AuditService: jest.fn(() => mockAuditService)
  };
});

// Create a comprehensive mock for the database that includes all Knex methods
const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  whereIn: jest.fn().mockReturnThis(),
  whereNotIn: jest.fn().mockReturnThis(),
  whereNull: jest.fn().mockReturnThis(),
  whereNotNull: jest.fn().mockReturnThis(),
  whereBetween: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  having: jest.fn().mockReturnThis(),
  join: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  rightJoin: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  fullOuterJoin: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  distinct: jest.fn().mockReturnThis(),
  union: jest.fn().mockReturnThis(),
  unionAll: jest.fn().mockReturnThis(),
  as: jest.fn().mockReturnThis(),
  insert: jest.fn().mockResolvedValue([1]),
  update: jest.fn().mockResolvedValue(1),
  delete: jest.fn().mockResolvedValue(1),
  del: jest.fn().mockResolvedValue(1),
  first: jest.fn().mockResolvedValue({}),
  count: jest.fn().mockResolvedValue([{ count: 0 }]),
  sum: jest.fn().mockResolvedValue([{ sum: 0 }]),
  avg: jest.fn().mockResolvedValue([{ avg: 0 }]),
  min: jest.fn().mockResolvedValue([{ min: 0 }]),
  max: jest.fn().mockResolvedValue([{ max: 0 }]),
  clone: jest.fn().mockReturnThis(),
  then: jest.fn().mockResolvedValue([]),
  catch: jest.fn().mockReturnThis(),
  finally: jest.fn().mockReturnThis()
};

const mockDb = jest.fn(() => mockQueryBuilder);

// Add the query builder methods to the main function too
Object.assign(mockDb, mockQueryBuilder);

// Add Knex-specific methods
mockDb.transaction = jest.fn((callback) => callback(mockDb));
mockDb.raw = jest.fn().mockResolvedValue({ rows: [] });
mockDb.schema = {
  createTable: jest.fn().mockReturnThis(),
  dropTable: jest.fn().mockReturnThis(),
  hasTable: jest.fn().mockResolvedValue(true),
  hasColumn: jest.fn().mockResolvedValue(true)
};

// Mock AuditedBaseController to avoid the getAuditedDb issue
jest.mock('../../../src/server/api/controllers/AuditedBaseController.ts', () => {
  return {
    AuditedBaseController: class AuditedBaseController {
      protected auditedDb: any;
      protected db: any;
      
      constructor() {
        this.auditedDb = mockDb;
        this.db = mockDb;
      }
      
      protected getDb() {
        return this.auditedDb;
      }
      
      protected handleError(error: any, res: any, message = 'Internal server error') {
        console.error('Controller error:', error);
        res.status(500).json({
          error: message,
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
      
      protected handleNotFound(res: any, resource = 'Resource') {
        res.status(404).json({
          error: `${resource} not found`
        });
      }
      
      protected handleValidationError(res: any, errors: any) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors
        });
      }
      
      protected async executeQuery<T>(
        queryFn: () => Promise<T>,
        res: any,
        errorMessage?: string
      ): Promise<T | undefined> {
        try {
          return await queryFn();
        } catch (error) {
          this.handleError(error, res, errorMessage);
          return undefined;
        }
      }
      
      protected async executeAuditedQuery<T>(
        req: any,
        queryFn: (db: any) => Promise<T>,
        res: any,
        errorMessage?: string
      ): Promise<T | undefined> {
        try {
          return await queryFn(this.auditedDb);
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
  };
});

// Setup test database or mocks as needed
beforeAll(() => {
  // Global test setup
});

afterAll(() => {
  // Global test cleanup
});