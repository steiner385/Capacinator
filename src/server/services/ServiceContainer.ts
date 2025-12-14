import type { Knex } from 'knex';
import type { AuditService } from './audit/AuditService.js';

/**
 * Service Container for Dependency Injection
 *
 * This container manages the lifecycle of services and provides them to controllers.
 * It follows a simple singleton pattern with lazy initialization.
 *
 * Usage:
 * ```typescript
 * // Initialize once at app startup
 * ServiceContainer.initialize({ db, auditService });
 *
 * // Get container instance anywhere
 * const container = ServiceContainer.getInstance();
 * const projectController = new ProjectsController(container);
 * ```
 */

export interface ServiceDependencies {
  /** Knex database instance */
  db: Knex;
  /** Optional audit service for audit logging */
  auditService?: AuditService | null;
}

export interface ControllerDependencies {
  /** Database access */
  db: Knex;
  /** Audit service (may be null if disabled) */
  auditService: AuditService | null;
}

export class ServiceContainer {
  private static instance: ServiceContainer | null = null;

  private db: Knex;
  private auditService: AuditService | null;

  private constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.auditService = deps.auditService || null;
  }

  /**
   * Initialize the service container with dependencies
   * Should be called once at application startup after database initialization
   */
  static initialize(deps: ServiceDependencies): ServiceContainer {
    if (ServiceContainer.instance) {
      console.warn('ServiceContainer already initialized. Use reset() first if re-initialization is needed.');
      return ServiceContainer.instance;
    }

    ServiceContainer.instance = new ServiceContainer(deps);
    return ServiceContainer.instance;
  }

  /**
   * Get the singleton instance
   * @throws Error if container not initialized
   */
  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      throw new Error('ServiceContainer not initialized. Call ServiceContainer.initialize() first.');
    }
    return ServiceContainer.instance;
  }

  /**
   * Check if container is initialized
   */
  static isInitialized(): boolean {
    return ServiceContainer.instance !== null;
  }

  /**
   * Reset the container (useful for testing)
   */
  static reset(): void {
    ServiceContainer.instance = null;
  }

  /**
   * Get the database instance
   */
  getDb(): Knex {
    return this.db;
  }

  /**
   * Get the audit service (may be null if disabled)
   */
  getAuditService(): AuditService | null {
    return this.auditService;
  }

  /**
   * Get all controller dependencies as a single object
   * Useful for controllers that need multiple dependencies
   */
  getControllerDependencies(): ControllerDependencies {
    return {
      db: this.db,
      auditService: this.auditService
    };
  }

  /**
   * Create a mock container for testing
   * Accepts partial dependencies and fills in mocks for the rest
   */
  static createMock(partialDeps: Partial<ServiceDependencies> = {}): ServiceContainer {
    let mockDb: Knex;

    if (partialDeps.db) {
      mockDb = partialDeps.db;
    } else {
      // Create a minimal mock for Knex
      // Note: The transaction callback receives a mock transaction object
      const mockDbInstance: Record<string, unknown> = {
        raw: jest.fn().mockResolvedValue({ rows: [] }),
        schema: {
          hasTable: jest.fn().mockResolvedValue(true),
          hasColumn: jest.fn().mockResolvedValue(true)
        }
      };
      // Add transaction method separately to avoid circular reference in type inference
      mockDbInstance.transaction = jest.fn((cb: (trx: Knex) => Promise<unknown>) =>
        cb(mockDbInstance as unknown as Knex)
      );
      mockDb = mockDbInstance as unknown as Knex;
    }

    const deps: ServiceDependencies = {
      db: mockDb,
      auditService: partialDeps.auditService !== undefined ? partialDeps.auditService : null
    };

    return new ServiceContainer(deps);
  }
}

/**
 * Helper type for controllers that use dependency injection
 */
export type DIController<T> = new (container: ServiceContainer) => T;

/**
 * Factory function type for creating controllers with dependencies
 */
export type ControllerFactory<T> = (container: ServiceContainer) => T;
