import knex, { Knex } from 'knex';
import knexConfig from './knexfile.js';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { initializeAuditService, getAuditService } from '../services/audit/index.js';
import { createAuditedDatabase } from './AuditedDatabase.js';
import { logger } from '../services/logging/config.js';
import { ScenarioExporter } from '../services/git/ScenarioExporter.js';

// Store database instance
let _db: Knex | null = null;
let _auditedDb: any = null;

// Create and export the database connection
export function getDb(): Knex {
  // In E2E mode, use the file-based database configuration
  if (process.env.NODE_ENV === 'e2e') {
    // Check for global E2E DB first (set during init) - for backward compatibility
    const globalE2EDb = (global as any).__E2E_DB__;
    if (globalE2EDb) {
      return globalE2EDb;
    }
    // For E2E, we now use file-based database through knexConfig
    // which already handles E2E mode internally
  }
  
  if (!_db) {
    _db = knex(knexConfig);
    
    // Log which database we're using (only on first connection)
    if (process.env.NODE_ENV === 'e2e') {
      logger.info('Using E2E test database');
    } else {
      logger.info('Using development database');
    }
  }
  
  return _db;
}

// Get audited database instance
export function getAuditedDb(): any {
  if (!_auditedDb) {
    const rawDb = getDb();
    const auditService = getAuditService();
    _auditedDb = createAuditedDatabase(rawDb, auditService ?? undefined);
  }
  return _auditedDb;
}

// Export db as a getter for backward compatibility
// For ESM modules, we need a different approach

// Create a function that returns the current database instance
// This allows controllers to use this.db() or this.db('table')
export function createDbFunction(): any {
  const dbFunction = function(tableName?: string) {
    const actualDb = getDb();
    if (tableName) {
      return actualDb(tableName);
    }
    return actualDb;
  };
  
  // Copy all properties and methods from Knex to the function
  return new Proxy(dbFunction, {
    get(target, prop) {
      const actualDb = getDb();
      if (prop in target) {
        return target[prop as keyof typeof target];
      }
      return actualDb[prop as keyof Knex];
    },
    has(target, prop) {
      const actualDb = getDb();
      return (prop in target) || (prop in actualDb);
    },
    apply(target, thisArg, args: [tableName?: string]) {
      return target.apply(thisArg, args);
    }
  });
}

// Export db as a function that always uses the current database
export const db = createDbFunction();

// Export audited database - this should be used for all new code
export const auditedDb = new Proxy(() => getAuditedDb(), {
  get(target, prop) {
    const auditedInstance = getAuditedDb();
    if (prop in auditedInstance) {
      const value = auditedInstance[prop];
      return typeof value === 'function' ? value.bind(auditedInstance) : value;
    }
    return undefined;
  },
  has(target, prop) {
    const auditedInstance = getAuditedDb();
    return prop in auditedInstance;
  },
  apply(target, thisArg, args) {
    const auditedInstance = getAuditedDb();
    return auditedInstance.apply(thisArg, args);
  }
});

// Function to reinitialize db (useful for E2E tests)
export function reinitializeDb(): void {
  _db = null;
  _auditedDb = null;
}

// Test the connection
export async function testConnection(): Promise<boolean> {
  try {
    await getDb().raw('SELECT 1');
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection failed', error instanceof Error ? error : undefined);
    return false;
  }
}

// Initialize database (run migrations)
/**
 * Rebuild SQLite cache from Git repository JSON files
 * Task: T039
 * Feature: 001-git-sync-integration
 */
async function rebuildCacheFromGit(database: Knex): Promise<void> {
  // Check if Git sync is enabled
  if (process.env.ENABLE_GIT_SYNC !== 'true') {
    return;
  }

  // Check if auto-pull on startup is enabled
  if (process.env.GIT_SYNC_AUTO_PULL_ON_STARTUP !== 'true') {
    logger.info('Git sync auto-pull disabled, skipping cache rebuild');
    return;
  }

  try {
    const repoPath = process.env.GIT_REPO_PATH || path.join(os.homedir(), '.capacinator', 'git-repo');
    const exporter = new ScenarioExporter(database, repoPath);

    // Check if repository exists
    const scenarioExists = await exporter.scenarioExists('working');
    if (!scenarioExists) {
      logger.info('Git repository not found, skipping cache rebuild');
      return;
    }

    // Import scenario data from JSON
    logger.info('Rebuilding SQLite cache from Git repository...');
    await exporter.importFromJSON('working');
    logger.info('✅ SQLite cache rebuilt from Git repository');
  } catch (error) {
    logger.error('⚠️  Failed to rebuild cache from Git:', error instanceof Error ? error : undefined);
    // Don't fail database initialization if Git rebuild fails
    // Continue with existing database
  }
}

export async function initializeDatabase(): Promise<void> {
  try {
    const database = getDb();

    // Run migrations
    await database.migrate.latest();
    logger.info('Database migrations completed');

    // Initialize audit service after migrations
    initializeAuditService(database);

    // Rebuild cache from Git repository if enabled
    await rebuildCacheFromGit(database);

    // Seed initial data if needed (skip for E2E)
    if (process.env.NODE_ENV !== 'e2e') {
      const hasData = await database('roles').count('* as count').first();
      if (hasData?.count === 0) {
        await database.seed.run();
        logger.info('Database seeded with initial data');
      }
    }
  } catch (error) {
    logger.error('Database initialization failed', error instanceof Error ? error : undefined);
    throw error;
  }
}

// Backup database
export async function backupDatabase(): Promise<string> {
  const backupDir = path.join(getDataPath(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupFile = path.join(backupDir, `backup-${timestamp}.db`);
  
  // SQLite backup is just a file copy
  const sourceFile = path.join(getDataPath(), process.env.DB_FILENAME || 'capacinator.db');
  fs.copyFileSync(sourceFile, backupFile);
  
  // Clean old backups
  const retentionDays = parseInt(process.env.DB_BACKUP_RETENTION_DAYS || '30', 10);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  const backups = fs.readdirSync(backupDir);
  for (const backup of backups) {
    const backupPath = path.join(backupDir, backup);
    const stats = fs.statSync(backupPath);
    if (stats.mtime < cutoffDate) {
      fs.unlinkSync(backupPath);
    }
  }
  
  return backupFile;
}

// Helper functions
function getDataPath(): string {
  if (process.env.NODE_ENV === 'development') {
    return path.join(process.cwd(), 'data');
  }
  // In production, try to get electron path, fallback to current directory
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('electron').app.getPath('userData');
  } catch {
    return path.join(process.cwd(), 'data');
  }
}