import { Knex } from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// E2E Database Configuration
const config: Knex.Config = {
  client: 'better-sqlite3',
  connection: {
    filename: path.join(process.cwd(), 'data', 'project-capacitizer-e2e.db'),
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    extension: 'ts',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: path.join(__dirname, 'seeds'),
    extension: 'ts',
  },
  pool: {
    afterCreate: (conn: any, cb: any) => {
      // Enable foreign key constraints
      conn.prepare('PRAGMA foreign_keys = ON').run();
      conn.prepare('PRAGMA defer_foreign_keys = OFF').run();
      
      // Performance optimizations for e2e tests
      conn.prepare('PRAGMA synchronous = OFF').run();
      conn.prepare('PRAGMA journal_mode = MEMORY').run();
      conn.prepare('PRAGMA temp_store = MEMORY').run();
      
      cb();
    },
  },
};

export default config;