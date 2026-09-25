import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Safe migrations for newly added audit & metadata columns
const safeMigrations = [
  'ALTER TABLE relationships ADD COLUMN accepted_at TEXT;',
  'ALTER TABLE relationships ADD COLUMN mutual_at TEXT;',
  'ALTER TABLE relationships ADD COLUMN disconnected_at TEXT;',
  'ALTER TABLE relationships ADD COLUMN cancelled_at TEXT;',
  'ALTER TABLE relationships ADD COLUMN version INTEGER DEFAULT 1;',
  'ALTER TABLE user_graph_versions ADD COLUMN graph_hash TEXT DEFAULT "";',
  'ALTER TABLE social_profiles ADD COLUMN normalized_url TEXT;',
  'ALTER TABLE social_profiles ADD COLUMN hostname TEXT;',
  'ALTER TABLE social_profiles ADD COLUMN icon_id TEXT;',
  `CREATE TABLE IF NOT EXISTS external_identities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    provider_email TEXT,
    created_at TEXT NOT NULL,
    CONSTRAINT unique_provider_user UNIQUE (provider, provider_user_id)
  );`,
  'CREATE INDEX IF NOT EXISTS idx_ext_identities_lookup ON external_identities(provider, provider_user_id);',
  'CREATE INDEX IF NOT EXISTS idx_ext_identities_user ON external_identities(user_id);',
  'CREATE INDEX IF NOT EXISTS idx_social_profiles_user ON social_profiles(user_id);',
  'ALTER TABLE users ADD COLUMN date_of_birth TEXT;',
];

function createFallbackDb() {
  return {
    exec: () => {},
    prepare: () => ({
      get: () => undefined,
      all: () => [],
      run: () => ({ changes: 0, lastInsertRowid: 0 }),
    }),
  };
}

let _dbInstance: any = null;

function getDbInstance() {
  if (_dbInstance) {
    return _dbInstance;
  }

  // In Vercel serverless environment, primary database is Supabase PostgreSQL.
  // SQLite must NOT be instantiated or selected.
  if (process.env.VERCEL) {
    _dbInstance = createFallbackDb();
    return _dbInstance;
  }


  // Local development / testing: Persistent SQLite
  try {
    const DATA_DIR = path.resolve(__dirname, '../data');
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, 'boring.db');
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const { DatabaseSync } = require('node:sqlite');
    _dbInstance = new DatabaseSync(DB_PATH);

    // Configure SQLite for high performance and integrity
    _dbInstance.exec('PRAGMA foreign_keys = ON;');
    _dbInstance.exec('PRAGMA journal_mode = WAL;');
    _dbInstance.exec('PRAGMA synchronous = NORMAL;');

    // Initialize schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      _dbInstance.exec(schemaSql);
    }

    for (const sql of safeMigrations) {
      try {
        _dbInstance.exec(sql);
      } catch {
        // Column or table already exists
      }
    }

    return _dbInstance;
  } catch (err) {
    console.warn('[Database] SQLite initialization fallback:', err);
    _dbInstance = createFallbackDb();
    return _dbInstance;
  }
}

export const db: any = new Proxy({}, {
  get(_target, prop) {
    const instance = getDbInstance();
    const value = instance[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

/**
 * Run a callback inside an atomic SQLite transaction
 */
export function transaction<T>(callback: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = callback();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
