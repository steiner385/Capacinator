import { Knex } from 'knex';
import path from 'path';
import fs from 'fs';

/**
 * E2E Test Database Configuration
 * Uses a file-based SQLite database for proper cross-process access
 */

// E2E database path
const E2E_DB_DIR = path.join(process.cwd(), '.e2e-data');
const E2E_DB_FILE = path.join(E2E_DB_DIR, 'e2e-test.db');

// Ensure E2E data directory exists
if (!fs.existsSync(E2E_DB_DIR)) {
  fs.mkdirSync(E2E_DB_DIR, { recursive: true });
}

const e2eConfig: Knex.Config = {
  client: 'better-sqlite3',
  connection: {
    filename: E2E_DB_FILE
  },
  useNullAsDefault: true,
  acquireConnectionTimeout: 10000, // 10 seconds for E2E
  migrations: {
    directory: path.resolve(process.cwd(), 'src/server/database/migrations'),
    loadExtensions: ['.ts', '.js'],
    extension: 'ts'
  },
  seeds: {
    directory: path.resolve(process.cwd(), 'src/server/database/seeds'),
    loadExtensions: ['.ts', '.js'], 
    extension: 'ts'
  },
  // SQLite configuration optimized for E2E tests
  pool: {
    min: 0,
    max: 1,
    afterCreate: (conn: any, cb: any) => {
      // E2E optimizations for speed
      conn.pragma('synchronous = OFF'); // Fastest, acceptable for tests
      conn.pragma('journal_mode = MEMORY'); // Keep journal in memory
      conn.pragma('foreign_keys = ON');
      conn.pragma('busy_timeout = 5000'); // 5 second timeout
      conn.pragma('cache_size = -32000'); // 32MB cache
      conn.pragma('temp_store = MEMORY'); // Use memory for temp tables
      cb();
    }
  }
};

export default e2eConfig;
export { E2E_DB_FILE, E2E_DB_DIR };