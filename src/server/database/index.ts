import knex from 'knex';
import knexConfig from './knexfile.js';
import path from 'path';
import fs from 'fs';
import { initializeAuditService } from '../services/audit/index.js';

// Create and export the database connection
export const db = knex(knexConfig);

// Test the connection
export async function testConnection(): Promise<boolean> {
  try {
    await db.raw('SELECT 1');
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
    // Run migrations
    await db.migrate.latest();
    console.log('Database migrations completed');
    
    // Initialize audit service after migrations
    initializeAuditService(db);
    
    // Seed initial data if needed
    const hasData = await db('roles').count('* as count').first();
    if (hasData?.count === 0) {
      await db.seed.run();
      console.log('Database seeded with initial data');
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