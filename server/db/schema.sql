-- Boring Database Schema (SQLite)
-- Source of Truth: Social Relationships
-- Derived State: Mutual Relationships, Graph Versions, Layout Cache

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  bio TEXT DEFAULT '',
  gender TEXT DEFAULT '',
  molecule_identity TEXT DEFAULT 'default',
  molecule_smoky INTEGER DEFAULT 0,
  molecule_twinkling INTEGER DEFAULT 0,
  showcase_suggestions TEXT DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS privacy_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  profile_visibility TEXT DEFAULT 'PUBLIC',
  email_visibility TEXT DEFAULT 'CONNECTIONS_ONLY',
  social_links_visibility TEXT DEFAULT 'PUBLIC'
);

CREATE TABLE IF NOT EXISTS social_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  profile_url TEXT NOT NULL,
  display_username TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS relationships (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('REQUESTED', 'ACCEPTED_ONE_WAY', 'REJECTED', 'CANCELLED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CONSTRAINT unique_directed_pair UNIQUE (requester_id, receiver_id),
  CONSTRAINT no_self_relation CHECK (requester_id != receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_rel_requester ON relationships(requester_id);
CREATE INDEX IF NOT EXISTS idx_rel_receiver ON relationships(receiver_id);
CREATE INDEX IF NOT EXISTS idx_rel_lookup ON relationships(requester_id, receiver_id, status);

CREATE TABLE IF NOT EXISTS mutual_relationships (
  id TEXT PRIMARY KEY,
  user_a_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  CONSTRAINT canonical_order CHECK (user_a_id < user_b_id),
  CONSTRAINT unique_mutual_pair UNIQUE (user_a_id, user_b_id)
);

CREATE INDEX IF NOT EXISTS idx_mutual_a ON mutual_relationships(user_a_id);
CREATE INDEX IF NOT EXISTS idx_mutual_b ON mutual_relationships(user_b_id);

CREATE TABLE IF NOT EXISTS user_graph_versions (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  graph_version INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS layout_cache (
  id TEXT PRIMARY KEY,
  host_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  graph_version INTEGER NOT NULL,
  algorithm_version TEXT NOT NULL,
  structure_class TEXT NOT NULL,
  layout_data TEXT NOT NULL,
  quality_metrics TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CONSTRAINT unique_layout_cache UNIQUE (host_user_id, graph_version, algorithm_version)
);

CREATE INDEX IF NOT EXISTS idx_cache_lookup ON layout_cache(host_user_id, graph_version, algorithm_version);
