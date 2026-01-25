import { Knex } from 'knex';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import e2eConfig from './knexfile.e2e.js';

// Create a require function that works in both CJS and ESM environments
// Uses createRequire with process.cwd() which is always available
const safeRequire = createRequire(path.join(process.cwd(), 'package.json'));

// Determine which config to use based on environment
const getConfig = (): Knex.Config => {
  // Use E2E config when in E2E mode
  if (process.env.NODE_ENV === 'e2e') {
    console.log('🧪 Using E2E database configuration');
    return e2eConfig;
  }

  // Get the appropriate data directory based on platform
  const getDataPath = () => {
  if (process.env.NODE_ENV === 'development') {
    return path.join(process.cwd(), 'data');
  }
  
  // In production (Electron), try to get electron userData path, fallback to cwd
  try {
    const electron = safeRequire('electron');
    return electron.app.getPath('userData');
  } catch {
    return path.join(process.cwd(), 'data');
  }
};

// Ensure data directory exists (skip for in-memory database)
const dataPath = getDataPath();
if (!process.env.DATABASE_URL && !fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}

  const config: Knex.Config = {
    client: 'better-sqlite3',
    connection: process.env.DATABASE_URL ? {
      filename: process.env.DATABASE_URL
    } : {
      filename: path.join(dataPath, process.env.DB_FILENAME || 'capacinator.db')
    },
    useNullAsDefault: true,
    acquireConnectionTimeout: 30000, // Increased to 30 seconds for bulk operations
    migrations: {
      directory: path.resolve(process.cwd(), 'src/server/database/migrations')
    },
    seeds: {
      directory: path.resolve(process.cwd(), 'src/server/database/seeds')
    },
    // SQLite configuration for stability
    pool: {
      min: 0,
      max: 1,
      afterCreate: (conn: any, cb: any) => {
        // Keep existing journal mode to avoid conflicts
        conn.pragma('synchronous = NORMAL'); // Better performance while maintaining durability
        conn.pragma('foreign_keys = ON');
        conn.pragma('busy_timeout = 30000'); // 30 second timeout for busy database
        conn.pragma('cache_size = -64000'); // 64MB cache
        cb();
      }
    }
  };

  return config;
};

export default getConfig();