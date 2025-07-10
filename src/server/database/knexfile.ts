import { Knex } from 'knex';
import path from 'path';
import fs from 'fs';

// Get the appropriate data directory based on platform
const getDataPath = () => {
  if (process.env.NODE_ENV === 'development') {
    return path.join(process.cwd(), 'data');
  }
  
  // In production, try to get electron path, fallback to current directory
  try {
    const { app } = require('electron');
    return app.getPath('userData');
  } catch {
    return path.join(process.cwd(), 'data');
  }
};

// Ensure data directory exists
const dataPath = getDataPath();
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}

const config: Knex.Config = {
  client: 'better-sqlite3',
  connection: {
    filename: path.join(dataPath, process.env.DB_FILENAME || 'project-capacitizer.db')
  },
  useNullAsDefault: true,
  migrations: {
    directory: './src/server/database/migrations'
  },
  seeds: {
    directory: './src/server/database/seeds'
  },
  // SQLite performance optimizations
  pool: {
    afterCreate: (conn: any, cb: any) => {
      conn.pragma('journal_mode = WAL');
      conn.pragma('synchronous = NORMAL');
      conn.pragma('cache_size = 10000');
      conn.pragma('mmap_size = 30000000000');
      conn.pragma('temp_store = MEMORY');
      cb();
    }
  }
};

export default config;