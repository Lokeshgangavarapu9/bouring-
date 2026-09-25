import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, 'boring.db');
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(DB_PATH);

// Configure SQLite for high performance and integrity
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');

// Initialize schema
const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schemaSql);

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
];

for (const sql of safeMigrations) {
  try {
    db.exec(sql);
  } catch {
    // Column already exists
  }
}

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
