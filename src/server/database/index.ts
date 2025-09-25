import knex, { Knex } from 'knex';
import knexConfig from './knexfile.js';
import path from 'path';
import fs from 'fs';
import { initializeAuditService } from '../services/audit/index.js';

// Store database instance
let _db: Knex | null = null;

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
      console.log('🧪 Using E2E test database');
    } else {
      console.log('🔧 Using development database');
    }
  }
  
  return _db;
}

// Export db as a getter for backward compatibility
// For ESM modules, we need a different approach
let _dbProxy: Knex | null = null;

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
    apply(target, thisArg, args) {
      return target.apply(thisArg, args);
    }
  });
}

// Export db as a function that always uses the current database
export const db = createDbFunction();

// Function to reinitialize db (useful for E2E tests)
export function reinitializeDb(): void {
  _db = null;
  _dbProxy = null;
}

// Test the connection
export async function testConnection(): Promise<boolean> {
  try {
    await getDb().raw('SELECT 1');
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Initialize database (run migrations)
export async function initializeDatabase(): Promise<void> {
  try {
    const database = getDb();
    
    // Run migrations
    await database.migrate.latest();
    console.log('Database migrations completed');
    
    // Initialize audit service after migrations
    initializeAuditService(database);
    
    // Seed initial data if needed (skip for E2E)
    if (process.env.NODE_ENV !== 'e2e') {
      const hasData = await database('roles').count('* as count').first();
      if (hasData?.count === 0) {
        await database.seed.run();
        console.log('Database seeded with initial data');
      }
    }
  } catch (error) {
    console.error('Database initialization failed:', error);
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
  const retentionDays = parseInt(process.env.DB_BACKUP_RETENTION_DAYS || '30');
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
    return require('electron').app.getPath('userData');
  } catch {
    return path.join(process.cwd(), 'data');
  }
}