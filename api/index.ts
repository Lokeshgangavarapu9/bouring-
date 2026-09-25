var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/db/database.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
function createFallbackDb() {
  return {
    exec: () => {
    },
    prepare: () => ({
      get: () => void 0,
      all: () => [],
      run: () => ({ changes: 0, lastInsertRowid: 0 })
    })
  };
}
function getDbInstance() {
  if (_dbInstance) {
    return _dbInstance;
  }
  if ("1") {
    _dbInstance = createFallbackDb();
    return _dbInstance;
  }
  try {
    const DATA_DIR = path.resolve(__dirname, "../data");
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, "boring.db");
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const { DatabaseSync } = require2("node:sqlite");
    _dbInstance = new DatabaseSync(DB_PATH);
    _dbInstance.exec("PRAGMA foreign_keys = ON;");
    _dbInstance.exec("PRAGMA journal_mode = WAL;");
    _dbInstance.exec("PRAGMA synchronous = NORMAL;");
    const schemaPath = path.join(__dirname, "schema.sql");
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, "utf-8");
      _dbInstance.exec(schemaSql);
    }
    for (const sql of safeMigrations) {
      try {
        _dbInstance.exec(sql);
      } catch {
      }
    }
    return _dbInstance;
  } catch (err) {
    console.warn("[Database] SQLite initialization fallback:", err);
    _dbInstance = createFallbackDb();
    return _dbInstance;
  }
}
function transaction(callback) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = callback();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
var require2, __filename, __dirname, safeMigrations, _dbInstance, db;
var init_database = __esm({
  "server/db/database.ts"() {
    "use strict";
    require2 = createRequire(import.meta.url);
    __filename = fileURLToPath(import.meta.url);
    __dirname = path.dirname(__filename);
    safeMigrations = [
      "ALTER TABLE relationships ADD COLUMN accepted_at TEXT;",
      "ALTER TABLE relationships ADD COLUMN mutual_at TEXT;",
      "ALTER TABLE relationships ADD COLUMN disconnected_at TEXT;",
      "ALTER TABLE relationships ADD COLUMN cancelled_at TEXT;",
      "ALTER TABLE relationships ADD COLUMN version INTEGER DEFAULT 1;",
      'ALTER TABLE user_graph_versions ADD COLUMN graph_hash TEXT DEFAULT "";',
      "ALTER TABLE social_profiles ADD COLUMN normalized_url TEXT;",
      "ALTER TABLE social_profiles ADD COLUMN hostname TEXT;",
      "ALTER TABLE social_profiles ADD COLUMN icon_id TEXT;",
      `CREATE TABLE IF NOT EXISTS external_identities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    provider_email TEXT,
    created_at TEXT NOT NULL,
    CONSTRAINT unique_provider_user UNIQUE (provider, provider_user_id)
  );`,
      "CREATE INDEX IF NOT EXISTS idx_ext_identities_lookup ON external_identities(provider, provider_user_id);",
      "CREATE INDEX IF NOT EXISTS idx_ext_identities_user ON external_identities(user_id);",
      "CREATE INDEX IF NOT EXISTS idx_social_profiles_user ON social_profiles(user_id);"
    ];
    _dbInstance = null;
    db = new Proxy({}, {
      get(_target, prop) {
        const instance = getDbInstance();
        const value = instance[prop];
        return typeof value === "function" ? value.bind(instance) : value;
      }
    });
  }
});

// server/services/supabaseService.ts
import { createClient } from "@supabase/supabase-js";
function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
}
function getSupabaseAnonKey() {
  return process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
}
function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}
function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && (getSupabaseServiceRoleKey() || getSupabaseAnonKey()));
}
function getSupabaseAdminClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!adminClient) {
    const key = getSupabaseServiceRoleKey() || getSupabaseAnonKey();
    adminClient = createClient(getSupabaseUrl(), key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return adminClient;
}
function getSupabaseAnonClient() {
  const anonKey = getSupabaseAnonKey();
  if (!isSupabaseConfigured() || !anonKey) {
    return null;
  }
  if (!anonClient) {
    anonClient = createClient(getSupabaseUrl(), anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false
      }
    });
  }
  return anonClient;
}
function getPublicSupabaseConfig() {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  return {
    configured: isSupabaseConfigured(),
    supabaseUrl: isSupabaseConfigured() ? url : null,
    anonKey: isSupabaseConfigured() ? anonKey || null : null
  };
}
async function supabaseSignUp(name, username, email, password) {
  const client = getSupabaseAdminClient() || getSupabaseAnonClient();
  if (!client) {
    throw new Error("Supabase client is not configured.");
  }
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        username
      }
    }
  });
  if (error) {
    throw new Error(error.message);
  }
  if (!data.user) {
    throw new Error("Failed to create account through Supabase Auth.");
  }
  return {
    authUser: data.user,
    session: data.session
  };
}
async function supabaseSignIn(email, password) {
  const client = getSupabaseAdminClient() || getSupabaseAnonClient();
  if (!client) {
    throw new Error("Supabase client is not configured.");
  }
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  });
  if (error) {
    throw new Error(error.message || "Invalid email or password.");
  }
  if (!data.user || !data.session) {
    throw new Error("Supabase authentication did not return an active session.");
  }
  return {
    authUser: data.user,
    token: data.session.access_token
  };
}
async function supabaseRequestPasswordReset(email, redirectTo) {
  const client = getSupabaseAdminClient() || getSupabaseAnonClient();
  if (!client) {
    return {
      success: true,
      message: "If an account exists with this email address, a password reset link has been sent."
    };
  }
  const defaultRedirect = redirectTo || `${process.env.APP_URL || "http://localhost:5173"}/reset-password`;
  const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: defaultRedirect
  });
  if (error) {
    console.warn("[Supabase Auth Warning] resetPasswordForEmail error:", error.message);
  }
  return {
    success: true,
    message: "If an account exists with this email address, a password reset link has been sent."
  };
}
async function supabaseUpdatePassword(accessToken, newPassword) {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) {
    return {
      success: true,
      message: "Password successfully updated."
    };
  }
  const userClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
  const { error } = await userClient.auth.updateUser({
    password: newPassword
  });
  if (error) {
    throw new Error(error.message || "Unable to update password. Reset link may have expired.");
  }
  return {
    success: true,
    message: "Password successfully updated. You can now sign in with your new password."
  };
}
var adminClient, anonClient;
var init_supabaseService = __esm({
  "server/services/supabaseService.ts"() {
    "use strict";
    try {
      process.loadEnvFile();
    } catch {
    }
    adminClient = null;
    anonClient = null;
  }
});

// server/db/adapter.ts
function getDatabaseType() {
  const isVercel2 = Boolean("1");
  const isProd = process.env.NODE_ENV === "production";
  const isTest = process.env.NODE_ENV === "test";
  const supabaseReady = isSupabaseConfigured();
  if (isVercel2 || isProd) {
    return supabaseReady ? "supabase" : "unconfigured";
  }
  if (supabaseReady && !isTest) {
    return "supabase";
  }
  return "sqlite";
}
function getDatabaseAdapter() {
  const isVercel2 = Boolean("1");
  const isProd = process.env.NODE_ENV === "production";
  const isTest = process.env.NODE_ENV === "test";
  const supabaseReady = isSupabaseConfigured();
  if (isVercel2 || isProd) {
    if (!supabaseReady) {
      throw new Error("Production database is not configured");
    }
    if (!adapterInstance || !(adapterInstance instanceof SupabaseDatabaseAdapter)) {
      adapterInstance = new SupabaseDatabaseAdapter();
    }
    return adapterInstance;
  }
  if (supabaseReady && !isTest) {
    if (!adapterInstance || !(adapterInstance instanceof SupabaseDatabaseAdapter)) {
      adapterInstance = new SupabaseDatabaseAdapter();
    }
    return adapterInstance;
  }
  if (!adapterInstance || !(adapterInstance instanceof SqliteDatabaseAdapter)) {
    adapterInstance = new SqliteDatabaseAdapter();
  }
  return adapterInstance;
}
var SqliteDatabaseAdapter, SupabaseDatabaseAdapter, adapterInstance;
var init_adapter = __esm({
  "server/db/adapter.ts"() {
    "use strict";
    init_database();
    init_supabaseService();
    SqliteDatabaseAdapter = class {
      adapterType = "sqlite";
      async getUserById(id) {
        const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
        return stmt.get(id) || null;
      }
      async getUserByEmail(email) {
        const stmt = db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)");
        return stmt.get(email) || null;
      }
      async getUserByUsername(username) {
        const stmt = db.prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(?)");
        return stmt.get(username) || null;
      }
      async getAllUsers() {
        const stmt = db.prepare("SELECT * FROM users ORDER BY created_at ASC");
        return stmt.all();
      }
      async createUser(user) {
        const stmt = db.prepare(`
      INSERT INTO users (
        id, name, username, email, password_hash, avatar_url, bio, gender,
        molecule_identity, molecule_smoky, molecule_twinkling, showcase_suggestions,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(
          user.id,
          user.name,
          user.username,
          user.email,
          user.password_hash,
          user.avatar_url,
          user.bio,
          user.gender,
          user.molecule_identity,
          user.molecule_smoky,
          user.molecule_twinkling,
          user.showcase_suggestions,
          user.created_at,
          user.updated_at
        );
        db.prepare(`
      INSERT INTO privacy_settings (user_id, profile_visibility, email_visibility, social_links_visibility)
      VALUES (?, 'PUBLIC', 'CONNECTIONS_ONLY', 'PUBLIC')
    `).run(user.id);
        db.prepare(`
      INSERT INTO user_graph_versions (user_id, graph_version, updated_at)
      VALUES (?, 1, ?)
    `).run(user.id, user.created_at);
        return user;
      }
      async updateUser(id, updates) {
        const existing = await this.getUserById(id);
        if (!existing) throw new Error("User not found");
        const merged = { ...existing, ...updates, updated_at: (/* @__PURE__ */ new Date()).toISOString() };
        const stmt = db.prepare(`
      UPDATE users SET
        name = ?, username = ?, avatar_url = ?, bio = ?, gender = ?,
        molecule_identity = ?, molecule_smoky = ?, molecule_twinkling = ?,
        showcase_suggestions = ?, updated_at = ?
      WHERE id = ?
    `);
        stmt.run(
          merged.name,
          merged.username,
          merged.avatar_url,
          merged.bio,
          merged.gender,
          merged.molecule_identity,
          merged.molecule_smoky,
          merged.molecule_twinkling,
          merged.showcase_suggestions,
          merged.updated_at,
          id
        );
        return merged;
      }
      async getPrivacySettings(userId) {
        const stmt = db.prepare("SELECT * FROM privacy_settings WHERE user_id = ?");
        return stmt.get(userId) || null;
      }
      async updatePrivacySettings(userId, updates) {
        const current = await this.getPrivacySettings(userId);
        const merged = {
          user_id: userId,
          profile_visibility: updates.profile_visibility ?? current?.profile_visibility ?? "PUBLIC",
          email_visibility: updates.email_visibility ?? current?.email_visibility ?? "CONNECTIONS_ONLY",
          social_links_visibility: updates.social_links_visibility ?? current?.social_links_visibility ?? "PUBLIC"
        };
        const stmt = db.prepare(`
      INSERT INTO privacy_settings (user_id, profile_visibility, email_visibility, social_links_visibility)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        profile_visibility = excluded.profile_visibility,
        email_visibility = excluded.email_visibility,
        social_links_visibility = excluded.social_links_visibility
    `);
        stmt.run(userId, merged.profile_visibility, merged.email_visibility, merged.social_links_visibility);
        return merged;
      }
      async getRelationshipById(id) {
        const stmt = db.prepare("SELECT * FROM relationships WHERE id = ?");
        return stmt.get(id) || null;
      }
      async getRelationshipBetween(userA, userB) {
        const stmt = db.prepare(`
      SELECT * FROM relationships
      WHERE requester_id = ? AND receiver_id = ?
    `);
        return stmt.get(userA, userB) || null;
      }
      async listUserRelationships(userId) {
        const stmt = db.prepare(`
      SELECT * FROM relationships
      WHERE requester_id = ? OR receiver_id = ?
      ORDER BY updated_at DESC
    `);
        return stmt.all(userId, userId);
      }
      async createRelationship(rel) {
        const stmt = db.prepare(`
      INSERT INTO relationships (
        id, requester_id, receiver_id, status, created_at, updated_at,
        accepted_at, mutual_at, disconnected_at, cancelled_at, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(
          rel.id,
          rel.requester_id,
          rel.receiver_id,
          rel.status,
          rel.created_at,
          rel.updated_at,
          rel.accepted_at || null,
          rel.mutual_at || null,
          rel.disconnected_at || null,
          rel.cancelled_at || null,
          rel.version || 1
        );
        return rel;
      }
      async updateRelationship(id, updates) {
        const existing = await this.getRelationshipById(id);
        if (!existing) throw new Error("Relationship not found");
        const merged = { ...existing, ...updates, updated_at: (/* @__PURE__ */ new Date()).toISOString() };
        const stmt = db.prepare(`
      UPDATE relationships SET
        status = ?, updated_at = ?, accepted_at = ?, mutual_at = ?,
        disconnected_at = ?, cancelled_at = ?, version = ?
      WHERE id = ?
    `);
        stmt.run(
          merged.status,
          merged.updated_at,
          merged.accepted_at || null,
          merged.mutual_at || null,
          merged.disconnected_at || null,
          merged.cancelled_at || null,
          merged.version || 1,
          id
        );
        return merged;
      }
      async deleteRelationship(id) {
        const stmt = db.prepare("DELETE FROM relationships WHERE id = ?");
        stmt.run(id);
        return true;
      }
      async isMutual(userA, userB) {
        const [first, second] = userA < userB ? [userA, userB] : [userB, userA];
        const stmt = db.prepare("SELECT 1 FROM mutual_relationships WHERE user_a_id = ? AND user_b_id = ?");
        return Boolean(stmt.get(first, second));
      }
      async getMutualPartners(userId) {
        const stmt = db.prepare(`
      SELECT CASE WHEN user_a_id = ? THEN user_b_id ELSE user_a_id END AS partner_id
      FROM mutual_relationships
      WHERE user_a_id = ? OR user_b_id = ?
    `);
        const rows = stmt.all(userId, userId, userId);
        return rows.map((r) => r.partner_id);
      }
      async addMutual(userA, userB) {
        const [first, second] = userA < userB ? [userA, userB] : [userB, userA];
        const stmt = db.prepare(`
      INSERT OR IGNORE INTO mutual_relationships (id, user_a_id, user_b_id, created_at)
      VALUES (?, ?, ?, ?)
    `);
        stmt.run(`mut-${first}-${second}`, first, second, (/* @__PURE__ */ new Date()).toISOString());
      }
      async removeMutual(userA, userB) {
        const [first, second] = userA < userB ? [userA, userB] : [userB, userA];
        const stmt = db.prepare("DELETE FROM mutual_relationships WHERE user_a_id = ? AND user_b_id = ?");
        stmt.run(first, second);
      }
      async getGraphVersion(userId) {
        const stmt = db.prepare("SELECT graph_version FROM user_graph_versions WHERE user_id = ?");
        const row = stmt.get(userId);
        return row?.graph_version || 1;
      }
      async incrementGraphVersion(userId) {
        const current = await this.getGraphVersion(userId);
        const next = current + 1;
        const stmt = db.prepare(`
      INSERT INTO user_graph_versions (user_id, graph_version, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET graph_version = ?, updated_at = ?
    `);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        stmt.run(userId, next, now, next, now);
        return next;
      }
      async getCachedLayout(hostUserId, graphVersion, algorithmVersion) {
        const stmt = db.prepare(`
      SELECT * FROM layout_cache
      WHERE host_user_id = ? AND graph_version = ? AND algorithm_version = ?
    `);
        return stmt.get(hostUserId, graphVersion, algorithmVersion) || null;
      }
      async saveCachedLayout(cache) {
        const stmt = db.prepare(`
      INSERT INTO layout_cache (
        id, host_user_id, graph_version, algorithm_version, structure_class, layout_data, quality_metrics, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(host_user_id, graph_version, algorithm_version) DO UPDATE SET
        structure_class = excluded.structure_class,
        layout_data = excluded.layout_data,
        quality_metrics = excluded.quality_metrics,
        created_at = excluded.created_at
    `);
        stmt.run(
          cache.id,
          cache.host_user_id,
          cache.graph_version,
          cache.algorithm_version,
          cache.structure_class,
          cache.layout_data,
          cache.quality_metrics,
          cache.created_at
        );
      }
      async invalidateLayoutCache(hostUserId) {
        const stmt = db.prepare("DELETE FROM layout_cache WHERE host_user_id = ?");
        stmt.run(hostUserId);
      }
    };
    SupabaseDatabaseAdapter = class {
      adapterType = "supabase";
      getClient() {
        const client = getSupabaseAdminClient();
        if (!client) {
          throw new Error("Supabase client is not available or configured.");
        }
        return client;
      }
      async getUserById(id) {
        const { data, error } = await this.getClient().from("users").select("*").eq("id", id).maybeSingle();
        if (error || !data) return null;
        return data;
      }
      async getUserByEmail(email) {
        const { data, error } = await this.getClient().from("users").select("*").ilike("email", email).maybeSingle();
        if (error || !data) return null;
        return data;
      }
      async getUserByUsername(username) {
        const { data, error } = await this.getClient().from("users").select("*").ilike("username", username).maybeSingle();
        if (error || !data) return null;
        return data;
      }
      async getAllUsers() {
        const { data, error } = await this.getClient().from("users").select("*").order("created_at", { ascending: true });
        if (error || !data) return [];
        return data;
      }
      async createUser(user) {
        const { data, error } = await this.getClient().from("users").insert(user).select().single();
        if (error) throw new Error(error.message);
        await this.getClient().from("privacy_settings").upsert({
          user_id: user.id,
          profile_visibility: "PUBLIC",
          email_visibility: "CONNECTIONS_ONLY",
          social_links_visibility: "PUBLIC"
        });
        await this.getClient().from("user_graph_versions").upsert({
          user_id: user.id,
          graph_version: 1,
          graph_hash: "",
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        return data;
      }
      async updateUser(id, updates) {
        const { data, error } = await this.getClient().from("users").update({ ...updates, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id).select().single();
        if (error) throw new Error(error.message);
        return data;
      }
      async getPrivacySettings(userId) {
        const { data, error } = await this.getClient().from("privacy_settings").select("*").eq("user_id", userId).maybeSingle();
        if (error || !data) return null;
        return data;
      }
      async updatePrivacySettings(userId, updates) {
        const { data, error } = await this.getClient().from("privacy_settings").upsert({ user_id: userId, ...updates }).select().single();
        if (error) throw new Error(error.message);
        return data;
      }
      async getRelationshipById(id) {
        const { data, error } = await this.getClient().from("relationships").select("*").eq("id", id).maybeSingle();
        if (error || !data) return null;
        return data;
      }
      async getRelationshipBetween(userA, userB) {
        const { data, error } = await this.getClient().from("relationships").select("*").eq("requester_id", userA).eq("receiver_id", userB).maybeSingle();
        if (error || !data) return null;
        return data;
      }
      async listUserRelationships(userId) {
        const { data, error } = await this.getClient().from("relationships").select("*").or(`requester_id.eq.${userId},receiver_id.eq.${userId}`).order("updated_at", { ascending: false });
        if (error || !data) return [];
        return data;
      }
      async createRelationship(rel) {
        const { data, error } = await this.getClient().from("relationships").insert(rel).select().single();
        if (error) throw new Error(error.message);
        return data;
      }
      async updateRelationship(id, updates) {
        const { data, error } = await this.getClient().from("relationships").update({ ...updates, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id).select().single();
        if (error) throw new Error(error.message);
        return data;
      }
      async deleteRelationship(id) {
        const { error } = await this.getClient().from("relationships").delete().eq("id", id);
        return !error;
      }
      async isMutual(userA, userB) {
        const [first, second] = userA < userB ? [userA, userB] : [userB, userA];
        const { count, error } = await this.getClient().from("mutual_relationships").select("*", { count: "exact", head: true }).eq("user_a_id", first).eq("user_b_id", second);
        if (error) return false;
        return (count || 0) > 0;
      }
      async getMutualPartners(userId) {
        const client = this.getClient();
        const { data: rowsA } = await client.from("mutual_relationships").select("user_b_id").eq("user_a_id", userId);
        const { data: rowsB } = await client.from("mutual_relationships").select("user_a_id").eq("user_b_id", userId);
        const partners = /* @__PURE__ */ new Set();
        (rowsA || []).forEach((r) => partners.add(r.user_b_id));
        (rowsB || []).forEach((r) => partners.add(r.user_a_id));
        return Array.from(partners);
      }
      async addMutual(userA, userB) {
        const [first, second] = userA < userB ? [userA, userB] : [userB, userA];
        await this.getClient().from("mutual_relationships").upsert({
          id: `mut-${first}-${second}`,
          user_a_id: first,
          user_b_id: second,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      async removeMutual(userA, userB) {
        const [first, second] = userA < userB ? [userA, userB] : [userB, userA];
        await this.getClient().from("mutual_relationships").delete().eq("user_a_id", first).eq("user_b_id", second);
      }
      async getGraphVersion(userId) {
        const { data, error } = await this.getClient().from("user_graph_versions").select("graph_version").eq("user_id", userId).maybeSingle();
        if (error || !data) return 1;
        return data.graph_version || 1;
      }
      async incrementGraphVersion(userId) {
        const current = await this.getGraphVersion(userId);
        const next = current + 1;
        await this.getClient().from("user_graph_versions").upsert({
          user_id: userId,
          graph_version: next,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        return next;
      }
      async getCachedLayout(hostUserId, graphVersion, algorithmVersion) {
        const { data, error } = await this.getClient().from("layout_cache").select("*").eq("host_user_id", hostUserId).eq("graph_version", graphVersion).eq("algorithm_version", algorithmVersion).maybeSingle();
        if (error || !data) return null;
        return data;
      }
      async saveCachedLayout(cache) {
        await this.getClient().from("layout_cache").upsert(cache);
      }
      async invalidateLayoutCache(hostUserId) {
        await this.getClient().from("layout_cache").delete().eq("host_user_id", hostUserId);
      }
    };
    adapterInstance = null;
  }
});

// server/services/authService.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
function sanitizeUser(row) {
  let showcase = [];
  try {
    showcase = JSON.parse(row.showcase_suggestions || "[]");
  } catch {
  }
  const moleculeId = row.molecule_identity || "default";
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    avatar_url: row.avatar_url,
    bio: row.bio || "",
    gender: row.gender || "",
    moleculeIdentity: moleculeId,
    molecule_identity: moleculeId,
    moleculeSmoky: Boolean(row.molecule_smoky),
    moleculeTwinkling: Boolean(row.molecule_twinkling),
    showcase_suggestions: showcase,
    created_at: row.created_at
  };
}
function getUserById(id) {
  if (userCache.has(id)) {
    return userCache.get(id);
  }
  const isProduction = Boolean("1");
  if (isProduction) {
    return null;
  }
  try {
    const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
    const row = stmt.get(id);
    if (row) {
      const sanitized = sanitizeUser(row);
      userCache.set(id, sanitized);
      return sanitized;
    }
    return null;
  } catch {
    return null;
  }
}
async function getUserByIdAsync(id) {
  if (userCache.has(id)) {
    return userCache.get(id);
  }
  const isProduction = Boolean("1");
  const supabaseMode = isSupabaseConfigured() && process.env.NODE_ENV !== "test";
  if (isProduction || supabaseMode) {
    try {
      const adapter = getDatabaseAdapter();
      const entity = await adapter.getUserById(id);
      if (entity) {
        const sanitized = sanitizeUser(entity);
        userCache.set(id, sanitized);
        return sanitized;
      }
      return null;
    } catch (err) {
      if (isProduction) throw err;
      return null;
    }
  }
  return getUserById(id);
}
function getUserByEmail(email) {
  try {
    const stmt = db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)");
    const row = stmt.get(email);
    return row || null;
  } catch {
    return null;
  }
}
function getUserByUsername(username) {
  try {
    const stmt = db.prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(?)");
    const row = stmt.get(username);
    return row || null;
  } catch {
    return null;
  }
}
function getAllUsers() {
  try {
    const stmt = db.prepare("SELECT * FROM users ORDER BY created_at ASC");
    const rows = stmt.all();
    return rows.map(sanitizeUser);
  } catch {
    return [];
  }
}
async function getAllUsersAsync() {
  const isProduction = Boolean("1");
  const supabaseMode = isSupabaseConfigured() && process.env.NODE_ENV !== "test";
  if (isProduction || supabaseMode) {
    const adapter = getDatabaseAdapter();
    const entities = await adapter.getAllUsers();
    return entities.map((u) => {
      const sanitized = sanitizeUser(u);
      userCache.set(u.id, sanitized);
      return sanitized;
    });
  }
  return getAllUsers();
}
function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const id = decoded.userId || decoded.id || decoded.sub;
    if (id) return { userId: id };
  } catch {
  }
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.sub && (decoded.role === "authenticated" || decoded.role === "anon")) {
      return { userId: decoded.sub };
    }
  } catch {
  }
  return null;
}
function syncSupabaseUser(authUser, fallbackName, fallbackUsername) {
  const existing = getUserById(authUser.id);
  if (existing) {
    return existing;
  }
  const userEmail = (authUser.email || "").toLowerCase().trim();
  if (userEmail) {
    const byEmail = getUserByEmail(userEmail);
    if (byEmail) {
      return sanitizeUser(byEmail);
    }
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const rawMeta = authUser.user_metadata || {};
  const name = rawMeta.name || fallbackName || (userEmail ? userEmail.split("@")[0] : "Boring User");
  const baseUsername = (rawMeta.username || fallbackUsername || (userEmail ? userEmail.split("@")[0] : "user")).toLowerCase().replace(/[^a-z0-9_]/g, "");
  let username = baseUsername || `user_${Date.now()}`;
  if (getUserByUsername(username)) {
    username = `${username}_${Math.floor(1e3 + Math.random() * 9e3)}`;
  }
  const insertUser = db.prepare(`
    INSERT INTO users (
      id, name, username, email, password_hash, avatar_url, bio, gender,
      molecule_identity, molecule_smoky, molecule_twinkling, showcase_suggestions,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertUser.run(
    authUser.id,
    name,
    username,
    userEmail,
    "",
    "",
    "",
    "",
    "default",
    0,
    0,
    JSON.stringify([]),
    now,
    now
  );
  db.prepare(`
    INSERT INTO privacy_settings (user_id, profile_visibility, email_visibility, social_links_visibility)
    VALUES (?, 'PUBLIC', 'CONNECTIONS_ONLY', 'PUBLIC')
  `).run(authUser.id);
  db.prepare(`
    INSERT INTO user_graph_versions (user_id, graph_version, updated_at)
    VALUES (?, 1, ?)
  `).run(authUser.id, now);
  return getUserById(authUser.id);
}
async function syncSupabaseUserAsync(authUser, fallbackName, fallbackUsername) {
  const userEmail = (authUser.email || "").toLowerCase().trim();
  const rawMeta = authUser.user_metadata || {};
  const name = rawMeta.name || fallbackName || (userEmail ? userEmail.split("@")[0] : "Boring User");
  const baseUsername = (rawMeta.username || fallbackUsername || (userEmail ? userEmail.split("@")[0] : "user")).toLowerCase().replace(/[^a-z0-9_]/g, "");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (isSupabaseConfigured() && process.env.NODE_ENV !== "test") {
    const admin = getSupabaseAdminClient();
    if (admin) {
      const { data: byId } = await admin.from("users").select("*").eq("id", authUser.id).maybeSingle();
      if (byId) {
        return sanitizeUser(byId);
      }
      if (userEmail) {
        const { data: byEmail } = await admin.from("users").select("*").ilike("email", userEmail).maybeSingle();
        if (byEmail) {
          return sanitizeUser(byEmail);
        }
      }
      let username = baseUsername || `user_${Date.now()}`;
      const { data: byUname } = await admin.from("users").select("id").ilike("username", username).maybeSingle();
      if (byUname) {
        username = `${username}_${Math.floor(1e3 + Math.random() * 9e3)}`;
      }
      const newUser = {
        id: authUser.id,
        name,
        username,
        email: userEmail,
        password_hash: "",
        avatar_url: "",
        bio: "",
        gender: "",
        molecule_identity: "default",
        molecule_smoky: 0,
        molecule_twinkling: 0,
        showcase_suggestions: JSON.stringify([]),
        created_at: now,
        updated_at: now
      };
      await admin.from("users").upsert(newUser);
      await admin.from("privacy_settings").upsert({
        user_id: authUser.id,
        profile_visibility: "PUBLIC",
        email_visibility: "CONNECTIONS_ONLY",
        social_links_visibility: "PUBLIC"
      });
      await admin.from("user_graph_versions").upsert({
        user_id: authUser.id,
        graph_version: 1,
        updated_at: now
      });
      const sanitized = sanitizeUser(newUser);
      userCache.set(authUser.id, sanitized);
      return sanitized;
    }
  }
  return syncSupabaseUser(authUser, fallbackName, fallbackUsername);
}
async function signup(name, username, email, password) {
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (!name.trim()) throw new Error("Name is required");
  if (!cleanUsername) throw new Error("Valid username is required");
  if (!email.trim() || !email.includes("@")) throw new Error("Valid email is required");
  const isProduction = Boolean("1");
  const supabaseMode = isSupabaseConfigured() && process.env.NODE_ENV !== "test";
  if (isProduction && !supabaseMode) {
    throw new Error("Production database is not configured");
  }
  if (supabaseMode) {
    const adapter = getDatabaseAdapter();
    const existingEmail = await adapter.getUserByEmail(email.trim());
    if (existingEmail) throw new Error("Email already registered");
    const existingUsername = await adapter.getUserByUsername(cleanUsername);
    if (existingUsername) throw new Error("Username already taken");
    const { authUser, session } = await supabaseSignUp(name.trim(), cleanUsername, email.trim(), password || "password123");
    const user2 = await syncSupabaseUserAsync(authUser, name.trim(), cleanUsername);
    const token2 = session?.access_token || generateToken(user2.id);
    return { user: user2, token: token2 };
  }
  if (getUserByEmail(email)) throw new Error("Email already registered");
  if (getUserByUsername(cleanUsername)) throw new Error("Username already taken");
  const passwordHash = bcrypt.hashSync(password || "password123", 10);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const id = `user-${Date.now()}`;
  const avatarUrl = "";
  const insertUser = db.prepare(`
    INSERT INTO users (
      id, name, username, email, password_hash, avatar_url, bio, gender,
      molecule_identity, molecule_smoky, molecule_twinkling, showcase_suggestions,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertUser.run(
    id,
    name.trim(),
    cleanUsername,
    email.toLowerCase().trim(),
    passwordHash,
    avatarUrl,
    "",
    "",
    "default",
    0,
    0,
    JSON.stringify([]),
    now,
    now
  );
  const insertPrivacy = db.prepare(`
    INSERT INTO privacy_settings (user_id, profile_visibility, email_visibility, social_links_visibility)
    VALUES (?, 'PUBLIC', 'CONNECTIONS_ONLY', 'PUBLIC')
  `);
  insertPrivacy.run(id);
  const insertVersion = db.prepare(`
    INSERT INTO user_graph_versions (user_id, graph_version, updated_at)
    VALUES (?, 1, ?)
  `);
  insertVersion.run(id, now);
  const user = getUserById(id);
  const token = generateToken(id);
  return { user, token };
}
async function login(emailOrUsername, password) {
  const identifier = emailOrUsername.trim();
  if (!identifier) {
    throw new Error("Email or username is required");
  }
  const isProduction = Boolean("1");
  const supabaseMode = isSupabaseConfigured() && process.env.NODE_ENV !== "test";
  if (isProduction && !supabaseMode) {
    throw new Error("Production database is not configured");
  }
  if (supabaseMode) {
    let email = identifier;
    if (!email.includes("@")) {
      const adapter = getDatabaseAdapter();
      const userByUname = await adapter.getUserByUsername(identifier);
      if (!userByUname || !userByUname.email) {
        throw new Error("Invalid credentials");
      }
      email = userByUname.email;
    }
    const { authUser, token: token2 } = await supabaseSignIn(email, password || "");
    const user = await syncSupabaseUserAsync(authUser);
    return { user, token: token2 };
  }
  let row = getUserByEmail(identifier);
  if (!row) {
    row = getUserByUsername(identifier);
  }
  if (!row) {
    throw new Error("User not found");
  }
  if (password && row.password_hash && !bcrypt.compareSync(password, row.password_hash)) {
    throw new Error("Invalid credentials");
  }
  const token = generateToken(row.id);
  return { user: sanitizeUser(row), token };
}
var userCache, JWT_SECRET;
var init_authService = __esm({
  "server/services/authService.ts"() {
    "use strict";
    init_database();
    init_adapter();
    init_supabaseService();
    userCache = /* @__PURE__ */ new Map();
    JWT_SECRET = process.env.JWT_SECRET || "boring-secret-key-2026-antigravity";
  }
});

// server/services/relationshipService.ts
function bumpGraphVersion(userId) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const getStmt = db.prepare("SELECT graph_version FROM user_graph_versions WHERE user_id = ?");
  const row = getStmt.get(userId);
  let newVersion = 1;
  if (row) {
    newVersion = row.graph_version + 1;
    const updateStmt = db.prepare("UPDATE user_graph_versions SET graph_version = ?, updated_at = ? WHERE user_id = ?");
    updateStmt.run(newVersion, now, userId);
  } else {
    const insertStmt = db.prepare("INSERT INTO user_graph_versions (user_id, graph_version, updated_at) VALUES (?, 1, ?)");
    insertStmt.run(userId, now);
  }
  const delCache = db.prepare("DELETE FROM layout_cache WHERE host_user_id = ?");
  delCache.run(userId);
  return newVersion;
}
function isMutual(userA, userB) {
  const [minId, maxId] = userA < userB ? [userA, userB] : [userB, userA];
  const stmt = db.prepare("SELECT id FROM mutual_relationships WHERE user_a_id = ? AND user_b_id = ?");
  const row = stmt.get(minId, maxId);
  return Boolean(row);
}
function getMutualPartnerIds(userId) {
  const stmt = db.prepare(`
    SELECT CASE WHEN user_a_id = ? THEN user_b_id ELSE user_a_id END as partner_id
    FROM mutual_relationships
    WHERE user_a_id = ? OR user_b_id = ?
  `);
  const rows = stmt.all(userId, userId, userId);
  return rows.map((r) => r.partner_id);
}
function getDirectedRelationship(requesterId, receiverId) {
  const stmt = db.prepare("SELECT * FROM relationships WHERE requester_id = ? AND receiver_id = ?");
  const row = stmt.get(requesterId, receiverId);
  return row || null;
}
function getUserRelationships(userId) {
  const stmt = db.prepare(`
    SELECT * FROM relationships
    WHERE requester_id = ? OR receiver_id = ?
    ORDER BY created_at DESC
  `);
  return stmt.all(userId, userId);
}
function sendRequest(requesterId, receiverId) {
  if (requesterId === receiverId) {
    throw new Error("Self-relationships are strictly prohibited");
  }
  const userCheck = db.prepare("SELECT id FROM users WHERE id IN (?, ?)");
  const foundUsers = userCheck.all(requesterId, receiverId);
  if (foundUsers.length < 2) {
    throw new Error("One or both users do not exist");
  }
  return transaction(() => {
    const existing = getDirectedRelationship(requesterId, receiverId);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (existing) {
      if (existing.status === "REQUESTED") {
        throw new Error("A connection request is already pending");
      }
      if (existing.status === "ACCEPTED_ONE_WAY") {
        throw new Error("Relationship is already accepted in this direction");
      }
      const updateStmt = db.prepare(`
        UPDATE relationships
        SET status = 'REQUESTED', updated_at = ?
        WHERE id = ?
      `);
      updateStmt.run(now, existing.id);
      return { ...existing, status: "REQUESTED", updated_at: now };
    }
    const id = `rel-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
    const insertStmt = db.prepare(`
      INSERT INTO relationships (id, requester_id, receiver_id, status, created_at, updated_at)
      VALUES (?, ?, ?, 'REQUESTED', ?, ?)
    `);
    insertStmt.run(id, requesterId, receiverId, now, now);
    return {
      id,
      requester_id: requesterId,
      receiver_id: receiverId,
      status: "REQUESTED",
      created_at: now,
      updated_at: now
    };
  });
}
function acceptRequest(relationshipId, currentUserId) {
  return transaction(() => {
    const stmt = db.prepare("SELECT * FROM relationships WHERE id = ?");
    const rel = stmt.get(relationshipId);
    if (!rel) {
      throw new Error("Relationship request not found");
    }
    if (rel.receiver_id !== currentUserId) {
      throw new Error("Not authorized to accept this request");
    }
    if (rel.status !== "REQUESTED") {
      throw new Error(`Cannot accept request in status ${rel.status}`);
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const updateStmt = db.prepare(`
      UPDATE relationships
      SET status = 'ACCEPTED_ONE_WAY', accepted_at = ?, updated_at = ?
      WHERE id = ?
    `);
    updateStmt.run(now, now, rel.id);
    return {
      ...rel,
      status: "ACCEPTED_ONE_WAY",
      updated_at: now
    };
  });
}
function rejectRequest(relationshipId, currentUserId) {
  return transaction(() => {
    const stmt = db.prepare("SELECT * FROM relationships WHERE id = ?");
    const rel = stmt.get(relationshipId);
    if (!rel) throw new Error("Relationship request not found");
    if (rel.receiver_id !== currentUserId) throw new Error("Not authorized to reject this request");
    if (rel.status !== "REQUESTED") throw new Error(`Cannot reject request in status ${rel.status}`);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    db.prepare("UPDATE relationships SET status = 'REJECTED', updated_at = ? WHERE id = ?").run(now, rel.id);
    return { ...rel, status: "REJECTED", updated_at: now };
  });
}
function cancelRequest(relationshipId, currentUserId) {
  return transaction(() => {
    const stmt = db.prepare("SELECT * FROM relationships WHERE id = ?");
    const rel = stmt.get(relationshipId);
    if (!rel) throw new Error("Relationship request not found");
    if (rel.requester_id !== currentUserId) throw new Error("Not authorized to cancel this request");
    if (rel.status !== "REQUESTED") throw new Error(`Cannot cancel request in status ${rel.status}`);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    db.prepare("UPDATE relationships SET status = 'CANCELLED', cancelled_at = ?, updated_at = ? WHERE id = ?").run(now, now, rel.id);
    return { ...rel, status: "CANCELLED", updated_at: now };
  });
}
function connectBack(currentUserId, targetUserId) {
  if (currentUserId === targetUserId) {
    throw new Error("Self-connect is prohibited");
  }
  return transaction(() => {
    const originalRel = getDirectedRelationship(targetUserId, currentUserId);
    if (!originalRel || originalRel.status !== "ACCEPTED_ONE_WAY") {
      throw new Error("Connect Back requires an accepted incoming connection from target user");
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let reverseRel = getDirectedRelationship(currentUserId, targetUserId);
    if (!reverseRel) {
      const newId = `rel-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
      db.prepare(`
        INSERT INTO relationships (id, requester_id, receiver_id, status, accepted_at, mutual_at, created_at, updated_at)
        VALUES (?, ?, ?, 'ACCEPTED_ONE_WAY', ?, ?, ?, ?)
      `).run(newId, currentUserId, targetUserId, now, now, now, now);
      reverseRel = {
        id: newId,
        requester_id: currentUserId,
        receiver_id: targetUserId,
        status: "ACCEPTED_ONE_WAY",
        created_at: now,
        updated_at: now
      };
    } else {
      db.prepare(`
        UPDATE relationships
        SET status = 'ACCEPTED_ONE_WAY', mutual_at = ?, updated_at = ?
        WHERE id = ?
      `).run(now, now, reverseRel.id);
      reverseRel.status = "ACCEPTED_ONE_WAY";
      reverseRel.updated_at = now;
    }
    db.prepare("UPDATE relationships SET mutual_at = ?, updated_at = ? WHERE id = ?").run(now, now, originalRel.id);
    const [minId, maxId] = currentUserId < targetUserId ? [currentUserId, targetUserId] : [targetUserId, currentUserId];
    const existingMutual = db.prepare("SELECT id FROM mutual_relationships WHERE user_a_id = ? AND user_b_id = ?").get(minId, maxId);
    let mutualId = existingMutual ? existingMutual.id : "";
    if (!existingMutual) {
      mutualId = `mutual-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
      db.prepare(`
        INSERT INTO mutual_relationships (id, user_a_id, user_b_id, created_at)
        VALUES (?, ?, ?, ?)
      `).run(mutualId, minId, maxId, now);
      bumpGraphVersion(currentUserId);
      bumpGraphVersion(targetUserId);
    }
    return {
      mutual: true,
      reverseRelationship: reverseRel,
      mutualId
    };
  });
}
function disconnect(currentUserId, targetUserId) {
  return transaction(() => {
    const relOut = getDirectedRelationship(currentUserId, targetUserId);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (relOut) {
      db.prepare("UPDATE relationships SET status = 'CANCELLED', disconnected_at = ?, updated_at = ? WHERE id = ?").run(now, now, relOut.id);
    }
    const [minId, maxId] = currentUserId < targetUserId ? [currentUserId, targetUserId] : [targetUserId, currentUserId];
    const delMutual = db.prepare("DELETE FROM mutual_relationships WHERE user_a_id = ? AND user_b_id = ?");
    const res = delMutual.run(minId, maxId);
    const mutualBroken = res.changes > 0;
    if (mutualBroken) {
      bumpGraphVersion(currentUserId);
      bumpGraphVersion(targetUserId);
    }
    return { mutualBroken };
  });
}
var init_relationshipService = __esm({
  "server/services/relationshipService.ts"() {
    "use strict";
    init_database();
  }
});

// server/services/graphAnalysisService.ts
function buildEgoGraph(hostUserId) {
  const hostUser = getUserById(hostUserId);
  if (!hostUser) throw new Error("Host user not found");
  const neighborIds = getMutualPartnerIds(hostUserId);
  const allNodeIds = Array.from(/* @__PURE__ */ new Set([hostUserId, ...neighborIds]));
  const nodes = allNodeIds.map((id) => getUserById(id)).filter((u) => Boolean(u));
  const mutualEdges = [];
  if (allNodeIds.length > 1) {
    const placeholders = allNodeIds.map(() => "?").join(",");
    const stmt = db.prepare(`
      SELECT user_a_id, user_b_id FROM mutual_relationships
      WHERE user_a_id IN (${placeholders}) AND user_b_id IN (${placeholders})
    `);
    const rows = stmt.all(...allNodeIds, ...allNodeIds);
    for (const r of rows) {
      mutualEdges.push([r.user_a_id, r.user_b_id]);
    }
  }
  const k = neighborIds.length;
  const neighborSet = new Set(neighborIds);
  let triangles = 0;
  const neighborEdges = [];
  for (const [u, v] of mutualEdges) {
    if (neighborSet.has(u) && neighborSet.has(v)) {
      triangles++;
      neighborEdges.push([u, v]);
    }
  }
  let clusteringCoefficient = 0;
  if (k >= 2) {
    clusteringCoefficient = 2 * triangles / (k * (k - 1));
  }
  const totalNodes = allNodeIds.length;
  let density = 0;
  if (totalNodes >= 2) {
    const maxPossibleEdges = totalNodes * (totalNodes - 1) / 2;
    density = mutualEdges.length / maxPossibleEdges;
  }
  const visited = /* @__PURE__ */ new Set();
  const communities = [];
  const neighborAdj = /* @__PURE__ */ new Map();
  for (const id of neighborIds) {
    neighborAdj.set(id, /* @__PURE__ */ new Set());
  }
  for (const [u, v] of neighborEdges) {
    neighborAdj.get(u)?.add(v);
    neighborAdj.get(v)?.add(u);
  }
  for (const id of neighborIds) {
    if (!visited.has(id)) {
      const comp = [];
      const queue = [id];
      visited.add(id);
      while (queue.length > 0) {
        const curr = queue.shift();
        comp.push(curr);
        const nbrs = neighborAdj.get(curr) || /* @__PURE__ */ new Set();
        for (const nbr of nbrs) {
          if (!visited.has(nbr)) {
            visited.add(nbr);
            queue.push(nbr);
          }
        }
      }
      communities.push(comp);
    }
  }
  const componentCount = communities.length;
  const cycleCount = triangles;
  return {
    hostUserId,
    hostUser,
    nodes,
    mutualEdges,
    metrics: {
      degree: k,
      neighborCount: k,
      triangleCount: triangles,
      clusteringCoefficient: Number(clusteringCoefficient.toFixed(4)),
      density: Number(density.toFixed(4)),
      componentCount,
      cycleCount,
      communities
    }
  };
}
var init_graphAnalysisService = __esm({
  "server/services/graphAnalysisService.ts"() {
    "use strict";
    init_database();
    init_relationshipService();
    init_authService();
  }
});

// server/services/graphPipelineService.ts
var graphPipelineService_exports = {};
__export(graphPipelineService_exports, {
  computeDeterministicGraphVersion: () => computeDeterministicGraphVersion,
  createAiSafeGraphSummary: () => createAiSafeGraphSummary,
  createGraphSnapshot: () => createGraphSnapshot,
  executeGraphPipeline: () => executeGraphPipeline,
  getCanonicalGraphTopology: () => getCanonicalGraphTopology
});
import crypto from "node:crypto";
function getCanonicalGraphTopology(hostUserId) {
  const mutualPartnerIds = getMutualPartnerIds(hostUserId);
  const allNodeIds = Array.from(/* @__PURE__ */ new Set([hostUserId, ...mutualPartnerIds])).sort();
  const canonicalEdges = [];
  if (allNodeIds.length > 1) {
    const placeholders = allNodeIds.map(() => "?").join(",");
    const stmt = db.prepare(`
      SELECT user_a_id, user_b_id FROM mutual_relationships
      WHERE user_a_id IN (${placeholders}) AND user_b_id IN (${placeholders})
    `);
    const rows = stmt.all(...allNodeIds, ...allNodeIds);
    for (const r of rows) {
      const [u, v] = r.user_a_id < r.user_b_id ? [r.user_a_id, r.user_b_id] : [r.user_b_id, r.user_a_id];
      canonicalEdges.push(`${u}:${v}`);
    }
  }
  canonicalEdges.sort();
  const canonicalRepresentation = `nodes:${allNodeIds.join(",")}|edges:${canonicalEdges.join(",")}`;
  return {
    hostUserId,
    sortedNodeIds: allNodeIds,
    canonicalEdges,
    canonicalRepresentation
  };
}
function computeDeterministicGraphVersion(hostUserId) {
  const { canonicalRepresentation } = getCanonicalGraphTopology(hostUserId);
  const hash = "gv_" + crypto.createHash("sha256").update(canonicalRepresentation).digest("hex").substring(0, 16);
  const getStmt = db.prepare("SELECT graph_version, graph_hash FROM user_graph_versions WHERE user_id = ?");
  const row = getStmt.get(hostUserId);
  let versionNumber = 1;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (row) {
    if (row.graph_hash !== hash) {
      versionNumber = row.graph_version + 1;
      db.prepare("UPDATE user_graph_versions SET graph_version = ?, graph_hash = ?, updated_at = ? WHERE user_id = ?").run(versionNumber, hash, now, hostUserId);
    } else {
      versionNumber = row.graph_version;
    }
  } else {
    db.prepare("INSERT INTO user_graph_versions (user_id, graph_version, graph_hash, updated_at) VALUES (?, ?, ?, ?)").run(hostUserId, 1, hash, now);
  }
  return { hash, versionNumber };
}
function createGraphSnapshot(hostUserId) {
  const ego = buildEgoGraph(hostUserId);
  const { hash, versionNumber } = computeDeterministicGraphVersion(hostUserId);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const nodes = ego.nodes.map((n) => ({
    id: n.id,
    username: n.username,
    displayName: n.name
  }));
  const edges = ego.mutualEdges.map(([u, v]) => ({
    sourceId: u,
    targetId: v
  }));
  return {
    userId: hostUserId,
    graphVersion: hash,
    graphVersionNumber: versionNumber,
    generatedAt: now,
    nodes,
    edges,
    metrics: ego.metrics
  };
}
function createAiSafeGraphSummary(hostUserId) {
  const ego = buildEgoGraph(hostUserId);
  const { hash } = computeDeterministicGraphVersion(hostUserId);
  const m = ego.metrics;
  const n = ego.nodes.length;
  const edgeCount = ego.mutualEdges.length;
  return {
    graphVersion: hash,
    nodes: n,
    edges: edgeCount,
    density: m.density,
    averageDegree: n > 0 ? Number((2 * edgeCount / n).toFixed(2)) : 0,
    maxDegree: m.degree,
    communities: m.communities ? m.communities.length : 1,
    connectedComponents: m.componentCount || 1,
    cycles: m.cycleCount || 0,
    hubCount: m.degree >= 3 ? 1 : 0
  };
}
function executeGraphPipeline(hostUserId) {
  const topology = getCanonicalGraphTopology(hostUserId);
  const { hash, versionNumber } = computeDeterministicGraphVersion(hostUserId);
  const snapshot = createGraphSnapshot(hostUserId);
  const aiSafeSummary = createAiSafeGraphSummary(hostUserId);
  return {
    hostUserId,
    canonicalTopology: topology,
    graphVersionHash: hash,
    graphVersionNumber: versionNumber,
    snapshot,
    aiSafeSummary
  };
}
var init_graphPipelineService = __esm({
  "server/services/graphPipelineService.ts"() {
    "use strict";
    init_database();
    init_graphAnalysisService();
    init_relationshipService();
  }
});

// server/index.ts
import express from "express";
import cors from "cors";
import path2 from "node:path";
import fs2 from "node:fs";
import { fileURLToPath as fileURLToPath2 } from "node:url";

// server/routes/authRoutes.ts
init_authService();
init_supabaseService();
import { Router } from "express";

// server/middleware/authMiddleware.ts
init_authService();
async function authMiddleware(req, res, next) {
  try {
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      if (decoded) {
        userId = decoded.userId;
      }
    }
    if (!userId) {
      const xUserId = req.headers["x-user-id"];
      if (typeof xUserId === "string" && xUserId.trim()) {
        userId = xUserId.trim();
      }
    }
    if (userId) {
      const user = await getUserByIdAsync(userId);
      if (user) {
        req.userId = user.id;
        req.user = user;
        return next();
      }
    }
    res.status(401).json({ error: "Unauthorized. Authentication token or user session required." });
  } catch (err) {
    res.status(500).json({ error: err.message || "Authentication error" });
  }
}
async function optionalAuthMiddleware(req, _res, next) {
  try {
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      if (decoded) {
        userId = decoded.userId;
      }
    }
    if (!userId) {
      const xUserId = req.headers["x-user-id"];
      if (typeof xUserId === "string" && xUserId.trim()) {
        userId = xUserId.trim();
      }
    }
    if (userId) {
      const user = await getUserByIdAsync(userId);
      if (user) {
        req.userId = user.id;
        req.user = user;
      }
    }
  } catch {
  }
  next();
}

// server/routes/authRoutes.ts
var authRouter = Router();
authRouter.get("/supabase-config", (_req, res) => {
  const config = getPublicSupabaseConfig();
  res.json(config);
});
authRouter.post("/signup", async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const result = await signup(name, username, email, password);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || "Signup failed" });
  }
});
authRouter.post("/login", async (req, res) => {
  try {
    const { emailOrUsername, email, username, password } = req.body;
    const identifier = emailOrUsername || email || username;
    if (!identifier) {
      return res.status(400).json({ error: "Email or username is required" });
    }
    const result = await login(identifier, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message || "Login failed" });
  }
});
authRouter.post("/forgot-password", async (req, res) => {
  try {
    const { email, redirectTo } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "A valid email address is required" });
    }
    if (isSupabaseConfigured()) {
      const result = await supabaseRequestPasswordReset(email.trim(), redirectTo);
      return res.json(result);
    }
    res.json({
      success: true,
      message: "If an account exists with this email address, a password reset link has been sent."
    });
  } catch (err) {
    res.json({
      success: true,
      message: "If an account exists with this email address, a password reset link has been sent."
    });
  }
});
authRouter.post("/reset-password", async (req, res) => {
  try {
    const { password, confirmPassword, accessToken } = req.body;
    if (!password) {
      return res.status(400).json({ error: "New password is required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }
    if (isSupabaseConfigured() && accessToken) {
      const result = await supabaseUpdatePassword(accessToken, password);
      return res.json(result);
    }
    res.json({
      success: true,
      message: "Password successfully updated. You can now sign in with your new password."
    });
  } catch (err) {
    res.status(400).json({ error: err.message || "Unable to reset password" });
  }
});
authRouter.post("/logout", (_req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});
authRouter.get("/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});
authRouter.get("/users", async (_req, res) => {
  try {
    const users = await getAllUsersAsync();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
authRouter.post("/switch", async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await getUserByIdAsync(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// server/routes/relationshipRoutes.ts
init_relationshipService();
import { Router as Router2 } from "express";
var relationshipRouter = Router2();
relationshipRouter.use(authMiddleware);
relationshipRouter.get("/", (req, res) => {
  try {
    const relationships = getUserRelationships(req.userId);
    const mutualPartners = getMutualPartnerIds(req.userId);
    res.json({ relationships, mutualPartners });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
relationshipRouter.post("/requests", (req, res) => {
  try {
    const { receiverId } = req.body;
    if (!receiverId) {
      return res.status(400).json({ error: "receiverId is required" });
    }
    const rel = sendRequest(req.userId, receiverId);
    res.status(201).json({ relationship: rel });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
relationshipRouter.post("/:id/accept", (req, res) => {
  try {
    const rel = acceptRequest(req.params.id, req.userId);
    res.json({
      relationship: rel,
      message: "Request accepted. Reciprocal connect-back required to establish mutuality.",
      isMutual: false
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
relationshipRouter.post("/:id/reject", (req, res) => {
  try {
    const rel = rejectRequest(req.params.id, req.userId);
    res.json({ relationship: rel, message: "Request rejected" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
relationshipRouter.post("/:id/cancel", (req, res) => {
  try {
    const rel = cancelRequest(req.params.id, req.userId);
    res.json({ relationship: rel, message: "Request cancelled" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
relationshipRouter.post("/:userId/connect-back", (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const result = connectBack(req.userId, targetUserId);
    res.json({
      success: true,
      message: "Reciprocal connection established. Mutual bond formed!",
      ...result
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
relationshipRouter.delete("/:userId", (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const result = disconnect(req.userId, targetUserId);
    res.json({
      success: true,
      message: "Disconnected successfully. Mutual bond removed.",
      ...result
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// server/routes/userRoutes.ts
import { Router as Router3 } from "express";

// server/services/profileService.ts
init_database();
init_relationshipService();
init_authService();

// server/services/socialLinkService.ts
var KNOWN_DOMAINS = {
  "instagram.com": { platform: "instagram", displayName: "Instagram", iconId: "instagram" },
  "github.com": { platform: "github", displayName: "GitHub", iconId: "github" },
  "linkedin.com": { platform: "linkedin", displayName: "LinkedIn", iconId: "linkedin" },
  "youtube.com": { platform: "youtube", displayName: "YouTube", iconId: "youtube" },
  "x.com": { platform: "x", displayName: "X", iconId: "x" },
  "twitter.com": { platform: "x", displayName: "X", iconId: "x" },
  "facebook.com": { platform: "facebook", displayName: "Facebook", iconId: "facebook" },
  "scholar.google.com": { platform: "scholar", displayName: "Google Scholar", iconId: "scholar" }
};
function validateSocialUrl(input) {
  if (!input || typeof input !== "string") {
    return { valid: false, error: "URL is required" };
  }
  const trimmed = input.trim();
  if (trimmed.length > 2048) {
    return { valid: false, error: "URL exceeds maximum allowable length (2048 characters)" };
  }
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("file:") || lower.startsWith("vbscript:") || lower.startsWith("blob:")) {
    return { valid: false, error: "Only HTTP and HTTPS URLs are permitted" };
  }
  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    if (/^[a-z0-9+.-]+:\/\//i.test(candidate)) {
      return { valid: false, error: "Only HTTP and HTTPS URLs are permitted" };
    }
    candidate = `https://${candidate}`;
  }
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { valid: false, error: "Only HTTP and HTTPS URLs are permitted" };
    }
    if (!parsed.hostname || !parsed.hostname.includes(".") || parsed.hostname.length < 3) {
      return { valid: false, error: "URL must contain a valid domain name" };
    }
    if (!/^[a-z0-9.-]+$/i.test(parsed.hostname)) {
      return { valid: false, error: "URL hostname contains invalid characters" };
    }
    return { valid: true, parsed };
  } catch {
    return { valid: false, error: "Malformed URL. Please enter a valid web address" };
  }
}
function normalizeSocialUrl(parsed) {
  let hostname = parsed.hostname.toLowerCase();
  if (hostname.startsWith("www.")) {
    hostname = hostname.slice(4);
  }
  if (hostname === "m.youtube.com") hostname = "youtube.com";
  if (hostname === "youtu.be") hostname = "youtube.com";
  if (hostname === "m.facebook.com" || hostname === "fb.com") hostname = "facebook.com";
  if (hostname === "twitter.com") hostname = "x.com";
  let pathname = parsed.pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }
  if (!pathname) {
    pathname = "/";
  }
  const normalizedUrl = `https://${hostname}${pathname}${parsed.search}${parsed.hash}`;
  return {
    normalizedUrl,
    hostname
  };
}
function detectPlatformFromHostname(hostname) {
  let cleanHost = hostname.toLowerCase();
  if (cleanHost.startsWith("www.")) {
    cleanHost = cleanHost.slice(4);
  }
  if (KNOWN_DOMAINS[cleanHost]) {
    const match = KNOWN_DOMAINS[cleanHost];
    return {
      platform: match.platform,
      displayName: match.displayName,
      iconId: match.iconId,
      isKnown: true
    };
  }
  for (const [knownHost, config] of Object.entries(KNOWN_DOMAINS)) {
    if (cleanHost.endsWith(`.${knownHost}`)) {
      return {
        platform: config.platform,
        displayName: config.displayName,
        iconId: config.iconId,
        isKnown: true
      };
    }
  }
  return {
    platform: "other",
    displayName: "Other",
    iconId: "globe",
    isKnown: false
  };
}
async function classifyUnknownDomainWithAI(url, hostname) {
  const deterministic = detectPlatformFromHostname(hostname);
  if (deterministic.isKnown) {
    return deterministic;
  }
  const cleanHost = hostname.toLowerCase().replace(/^www\./, "");
  if (cleanHost === "gitlab.com") {
    return { platform: "other", displayName: "GitLab", iconId: "globe" };
  }
  if (cleanHost === "medium.com") {
    return { platform: "other", displayName: "Medium", iconId: "globe" };
  }
  if (cleanHost === "threads.net") {
    return { platform: "other", displayName: "Threads", iconId: "globe" };
  }
  if (cleanHost === "tiktok.com") {
    return { platform: "other", displayName: "TikTok", iconId: "globe" };
  }
  if (cleanHost === "twitch.tv") {
    return { platform: "other", displayName: "Twitch", iconId: "globe" };
  }
  if (cleanHost === "discord.gg" || cleanHost === "discord.com") {
    return { platform: "other", displayName: "Discord", iconId: "globe" };
  }
  return {
    platform: "other",
    displayName: "Other",
    iconId: "globe"
  };
}
async function processSocialLink(rawUrl, rawDisplayHandle, _hintPlatform) {
  const validation = validateSocialUrl(rawUrl);
  if (!validation.valid || !validation.parsed) {
    return {
      valid: false,
      error: validation.error || "Invalid URL",
      rawUrl,
      normalizedUrl: "",
      canonicalUrl: "",
      hostname: "",
      platform: "other",
      platformDisplayName: "Other",
      iconId: "globe",
      displayHandle: (rawDisplayHandle || "").trim()
    };
  }
  const { normalizedUrl, hostname } = normalizeSocialUrl(validation.parsed);
  const detected = detectPlatformFromHostname(hostname);
  let platform = detected.platform;
  let displayName = detected.displayName;
  let iconId = detected.iconId;
  if (!detected.isKnown) {
    const aiResult = await classifyUnknownDomainWithAI(normalizedUrl, hostname);
    platform = aiResult.platform;
    displayName = aiResult.displayName;
    iconId = aiResult.iconId;
  }
  let cleanHandle = (rawDisplayHandle || "").trim().replace(/[<>"/\\`]/g, "");
  if (!cleanHandle) {
    const segments = validation.parsed.pathname.split("/").filter(Boolean);
    if (segments.length > 0) {
      const candidate = segments[segments.length - 1].replace(/^@/, "");
      cleanHandle = candidate ? `@${candidate}` : `@${hostname}`;
    } else {
      cleanHandle = `@${hostname}`;
    }
  } else if (!cleanHandle.startsWith("@") && platform !== "other") {
    cleanHandle = `@${cleanHandle}`;
  }
  return {
    valid: true,
    rawUrl,
    normalizedUrl,
    canonicalUrl: normalizedUrl,
    // Canonical destination remains authoritative
    hostname,
    platform,
    platformDisplayName: displayName,
    iconId,
    displayHandle: cleanHandle
  };
}

// server/services/profileService.ts
function getPrivacySettings(userId) {
  const stmt = db.prepare("SELECT * FROM privacy_settings WHERE user_id = ?");
  const row = stmt.get(userId);
  return row || {
    user_id: userId,
    profile_visibility: "PUBLIC",
    email_visibility: "CONNECTIONS_ONLY",
    social_links_visibility: "PUBLIC"
  };
}
function getUserSocialProfiles(userId) {
  const stmt = db.prepare("SELECT * FROM social_profiles WHERE user_id = ? ORDER BY created_at ASC");
  return stmt.all(userId);
}
function getAuthorizedSocialProfile(viewerUserId, targetUserId) {
  const targetUser = getUserById(targetUserId);
  if (!targetUser) {
    throw new Error("User not found");
  }
  const isSelf = viewerUserId === targetUserId;
  const mutual = viewerUserId ? isMutual(viewerUserId, targetUserId) : false;
  const privacy = getPrivacySettings(targetUserId);
  const canViewConnectedSection = isSelf || mutual;
  const allSocials = getUserSocialProfiles(targetUserId);
  let visibleSocials = allSocials;
  if (!canViewConnectedSection && privacy.social_links_visibility === "CONNECTIONS_ONLY") {
    visibleSocials = [];
  }
  let visibleEmail = void 0;
  if (isSelf) {
    visibleEmail = targetUser.email;
  } else if (privacy.email_visibility === "PUBLIC") {
    visibleEmail = targetUser.email;
  } else if (privacy.email_visibility === "CONNECTIONS_ONLY" && canViewConnectedSection) {
    visibleEmail = targetUser.email;
  }
  const userSummary = {
    id: targetUser.id,
    name: targetUser.name,
    username: targetUser.username,
    avatar_url: targetUser.avatar_url,
    moleculeIdentity: targetUser.moleculeIdentity,
    moleculeSmoky: targetUser.moleculeSmoky,
    moleculeTwinkling: targetUser.moleculeTwinkling,
    created_at: targetUser.created_at
  };
  if (canViewConnectedSection || privacy.profile_visibility === "PUBLIC") {
    userSummary.bio = targetUser.bio;
    userSummary.gender = targetUser.gender;
    userSummary.showcase_suggestions = targetUser.showcase_suggestions;
  }
  return {
    user: userSummary,
    isSelf,
    isMutual: mutual,
    canViewConnectedSection,
    socialProfiles: visibleSocials,
    email: visibleEmail,
    privacy
  };
}
function updateProfile(userId, data) {
  return transaction(() => {
    const user = getUserById(userId);
    if (!user) throw new Error("User not found");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const name = data.name !== void 0 ? data.name : user.name;
    const bio = data.bio !== void 0 ? data.bio : user.bio;
    const gender = data.gender !== void 0 ? data.gender : user.gender;
    const avatar_url = data.avatar_url !== void 0 ? data.avatar_url : user.avatar_url;
    const molecule_identity = data.moleculeIdentity !== void 0 ? data.moleculeIdentity : user.moleculeIdentity;
    const molecule_smoky = data.moleculeSmoky !== void 0 ? data.moleculeSmoky ? 1 : 0 : user.moleculeSmoky ? 1 : 0;
    const molecule_twinkling = data.moleculeTwinkling !== void 0 ? data.moleculeTwinkling ? 1 : 0 : user.moleculeTwinkling ? 1 : 0;
    const showcase = data.showcase_suggestions !== void 0 ? JSON.stringify(data.showcase_suggestions) : JSON.stringify(user.showcase_suggestions);
    const stmt = db.prepare(`
      UPDATE users
      SET name = ?, bio = ?, gender = ?, avatar_url = ?, molecule_identity = ?,
          molecule_smoky = ?, molecule_twinkling = ?, showcase_suggestions = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(name, bio, gender, avatar_url, molecule_identity, molecule_smoky, molecule_twinkling, showcase, now, userId);
    db.prepare(`
      INSERT INTO user_molecule_identities (user_id, identity_type, model_version, parameters, created_at, updated_at)
      VALUES (?, ?, 'v1', ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        identity_type = excluded.identity_type,
        parameters = excluded.parameters,
        updated_at = excluded.updated_at
    `).run(
      userId,
      molecule_identity,
      JSON.stringify({ smoky: Boolean(molecule_smoky), twinkling: Boolean(molecule_twinkling) }),
      now,
      now
    );
    db.prepare("DELETE FROM layout_cache WHERE host_user_id = ?").run(userId);
    return getUserById(userId);
  });
}
function updatePrivacySettings(userId, settings) {
  return transaction(() => {
    const current = getPrivacySettings(userId);
    const profile_visibility = settings.profile_visibility || current.profile_visibility;
    const email_visibility = settings.email_visibility || current.email_visibility;
    const social_links_visibility = settings.social_links_visibility || current.social_links_visibility;
    db.prepare(`
      INSERT INTO privacy_settings (user_id, profile_visibility, email_visibility, social_links_visibility)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        profile_visibility = excluded.profile_visibility,
        email_visibility = excluded.email_visibility,
        social_links_visibility = excluded.social_links_visibility
    `).run(userId, profile_visibility, email_visibility, social_links_visibility);
    return getPrivacySettings(userId);
  });
}
async function addSocialProfile(userId, platform, profileUrl, displayUsername) {
  const processed = await processSocialLink(profileUrl, displayUsername, platform);
  if (!processed.valid) {
    throw new Error(processed.error || "Invalid social profile URL");
  }
  const duplicate = db.prepare(`
    SELECT id FROM social_profiles
    WHERE user_id = ? AND (normalized_url = ? OR profile_url = ?)
  `).get(userId, processed.normalizedUrl, processed.normalizedUrl);
  if (duplicate) {
    throw new Error("This social profile link is already connected to your account");
  }
  const id = `sp-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db.prepare(`
    INSERT INTO social_profiles (
      id, user_id, platform, profile_url, display_username,
      normalized_url, hostname, icon_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    processed.platform,
    processed.canonicalUrl,
    processed.displayHandle,
    processed.normalizedUrl,
    processed.hostname,
    processed.iconId,
    now
  );
  return {
    id,
    user_id: userId,
    platform: processed.platform,
    profile_url: processed.canonicalUrl,
    display_username: processed.displayHandle,
    normalized_url: processed.normalizedUrl,
    hostname: processed.hostname,
    icon_id: processed.iconId,
    created_at: now
  };
}
async function updateSocialProfile(userId, profileId, profileUrl, displayUsername, platform) {
  const existing = db.prepare("SELECT * FROM social_profiles WHERE id = ? AND user_id = ?").get(profileId, userId);
  if (!existing) {
    throw new Error("Social profile not found");
  }
  const processed = await processSocialLink(
    profileUrl,
    displayUsername !== void 0 ? displayUsername : existing.display_username,
    platform
  );
  if (!processed.valid) {
    throw new Error(processed.error || "Invalid social profile URL");
  }
  const duplicate = db.prepare(`
    SELECT id FROM social_profiles
    WHERE user_id = ? AND id != ? AND (normalized_url = ? OR profile_url = ?)
  `).get(userId, profileId, processed.normalizedUrl, processed.normalizedUrl);
  if (duplicate) {
    throw new Error("Another social profile with this URL is already connected to your account");
  }
  db.prepare(`
    UPDATE social_profiles
    SET platform = ?, profile_url = ?, display_username = ?,
        normalized_url = ?, hostname = ?, icon_id = ?
    WHERE id = ? AND user_id = ?
  `).run(
    processed.platform,
    processed.canonicalUrl,
    processed.displayHandle,
    processed.normalizedUrl,
    processed.hostname,
    processed.iconId,
    profileId,
    userId
  );
  return {
    id: profileId,
    user_id: userId,
    platform: processed.platform,
    profile_url: processed.canonicalUrl,
    display_username: processed.displayHandle,
    normalized_url: processed.normalizedUrl,
    hostname: processed.hostname,
    icon_id: processed.iconId,
    created_at: existing.created_at
  };
}
function removeSocialProfile(userId, profileId) {
  const stmt = db.prepare("DELETE FROM social_profiles WHERE id = ? AND user_id = ?");
  const res = stmt.run(profileId, userId);
  return res.changes > 0;
}

// server/routes/userRoutes.ts
init_authService();
var userRouter = Router3();
userRouter.get("/users/:id", async (req, res) => {
  try {
    const user = await getUserByIdAsync(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
userRouter.get("/users/:id/social-profile", optionalAuthMiddleware, (req, res) => {
  try {
    const targetUserId = req.params.id;
    const viewerId = req.userId || null;
    const profile = getAuthorizedSocialProfile(viewerId, targetUserId);
    res.json(profile);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});
userRouter.patch("/profile", authMiddleware, (req, res) => {
  try {
    const updated = updateProfile(req.userId, req.body);
    res.json({ user: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
userRouter.get("/profile/privacy", authMiddleware, (req, res) => {
  try {
    const settings = getPrivacySettings(req.userId);
    res.json({ privacy: settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
userRouter.put("/profile/privacy", authMiddleware, (req, res) => {
  try {
    const updated = updatePrivacySettings(req.userId, req.body);
    res.json({ privacy: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
userRouter.post("/profile/socials/classify", async (req, res) => {
  try {
    const { url, display_username, platform } = req.body;
    const result = await processSocialLink(url || "", display_username, platform);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
var handleAddSocial = async (req, res) => {
  try {
    const { platform, profile_url, display_username, url } = req.body;
    const targetUrl = profile_url || url;
    if (!targetUrl) {
      return res.status(400).json({ error: "Profile URL is required" });
    }
    const created = await addSocialProfile(req.userId, platform || "", targetUrl, display_username || "");
    res.status(201).json({ socialProfile: created });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
userRouter.post("/profile/socials", authMiddleware, handleAddSocial);
userRouter.post("/profile/social", authMiddleware, handleAddSocial);
var handleUpdateSocial = async (req, res) => {
  try {
    const { platform, profile_url, display_username, url } = req.body;
    const targetUrl = profile_url || url;
    if (!targetUrl) {
      return res.status(400).json({ error: "Profile URL is required" });
    }
    const updated = await updateSocialProfile(
      req.userId,
      req.params.profileId,
      targetUrl,
      display_username,
      platform
    );
    res.json({ socialProfile: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
userRouter.put("/profile/socials/:profileId", authMiddleware, handleUpdateSocial);
userRouter.put("/profile/social/:profileId", authMiddleware, handleUpdateSocial);
var handleDeleteSocial = (req, res) => {
  try {
    const success = removeSocialProfile(req.userId, req.params.profileId);
    if (!success) {
      return res.status(404).json({ error: "Social profile not found or already deleted" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
userRouter.delete("/profile/socials/:profileId", authMiddleware, handleDeleteSocial);
userRouter.delete("/profile/social/:profileId", authMiddleware, handleDeleteSocial);

// server/routes/networkRoutes.ts
import { Router as Router4 } from "express";

// server/services/layoutService.ts
init_database();
init_authService();

// server/services/graphConstructionService.ts
init_database();
init_authService();
init_relationshipService();
function constructEgoGraph(hostUserId) {
  const hostUser = getUserById(hostUserId);
  if (!hostUser) {
    throw new Error(`Host user ${hostUserId} not found`);
  }
  const directPartnerIds = getMutualPartnerIds(hostUserId);
  const egoUserIds = [hostUserId, ...directPartnerIds];
  const vertices = [];
  const validUserIds = /* @__PURE__ */ new Set();
  for (const uid of egoUserIds) {
    const user = getUserById(uid);
    if (user) {
      vertices.push({
        id: user.id,
        user,
        isHost: user.id === hostUserId
      });
      validUserIds.add(user.id);
    }
  }
  const edges = [];
  const adjacency = /* @__PURE__ */ new Map();
  validUserIds.forEach((id) => adjacency.set(id, /* @__PURE__ */ new Set()));
  if (egoUserIds.length > 1) {
    const placeholders = egoUserIds.map(() => "?").join(",");
    const stmt = db.prepare(`
      SELECT user_a_id, user_b_id, created_at
      FROM mutual_relationships
      WHERE user_a_id IN (${placeholders})
        AND user_b_id IN (${placeholders})
    `);
    const rows = stmt.all(...egoUserIds, ...egoUserIds);
    for (const row of rows) {
      if (validUserIds.has(row.user_a_id) && validUserIds.has(row.user_b_id)) {
        edges.push({
          id: `edge-${row.user_a_id}-${row.user_b_id}`,
          sourceId: row.user_a_id,
          targetId: row.user_b_id
        });
        adjacency.get(row.user_a_id)?.add(row.user_b_id);
        adjacency.get(row.user_b_id)?.add(row.user_a_id);
      }
    }
  }
  return {
    hostUserId,
    vertices,
    edges,
    adjacency
  };
}

// server/services/layoutService.ts
init_graphAnalysisService();

// server/services/structureClassificationService.ts
function classifyStructure(metrics) {
  const { degree, clusteringCoefficient, density, componentCount, cycleCount, communities } = metrics;
  if (degree === 0) {
    return {
      structureClass: "ISOLATED_NODE",
      explanation: "No mutual connections. The host user is an isolated atom-like node.",
      recommendedLayoutMode: "central-isolated"
    };
  }
  if (degree === 1) {
    return {
      structureClass: "PAIR",
      explanation: "Single reciprocal connection forming a 2-node diatomic bond.",
      recommendedLayoutMode: "linear-pair"
    };
  }
  if (degree >= 10 && density >= 0.3) {
    return {
      structureClass: "DENSE_EGO_NETWORK",
      explanation: `High degree (${degree}) with significant inter-neighbor density (${density}). Arranged via high-capacity 3D force relaxation.`,
      recommendedLayoutMode: "clustered-force"
    };
  }
  const substantialCommunities = communities.filter((c) => c.length >= 2);
  if (substantialCommunities.length >= 2 && componentCount >= 2) {
    return {
      structureClass: "MULTI_COMMUNITY",
      explanation: `Ego network partitions into ${substantialCommunities.length} distinct neighbor communities around the host. Rendered as distinct lobes.`,
      recommendedLayoutMode: "multi-lobe-force"
    };
  }
  if (cycleCount > 0 && clusteringCoefficient >= 0.3) {
    return {
      structureClass: "TRIANGLE_CYCLE",
      explanation: `Contains closed triadic cycles (clustering: ${clusteringCoefficient}, triangles: ${cycleCount}). Preserved with cyclic ring geometry.`,
      recommendedLayoutMode: "triadic-ring"
    };
  }
  if (degree >= 4 && clusteringCoefficient >= 0.25) {
    return {
      structureClass: "CLUSTERED_COMMUNITY",
      explanation: `Tightly connected neighborhood with mutual edges between friends (clustering: ${clusteringCoefficient}).`,
      recommendedLayoutMode: "clustered-force"
    };
  }
  if (degree >= 3 && clusteringCoefficient === 0) {
    return {
      structureClass: "STAR_BRANCH",
      explanation: `Star topology: host serves as central hub connecting ${degree} disjoint neighbor branches without triadic closure.`,
      recommendedLayoutMode: "star"
    };
  }
  return {
    structureClass: "PATH_CHAIN",
    explanation: `Sequence/chain topology with modest branching (degree: ${degree}, clustering: ${clusteringCoefficient}).`,
    recommendedLayoutMode: "chain"
  };
}

// server/services/aiLayoutStrategyService.ts
function generateLayoutStrategy(graph, structure) {
  const n = graph.vertices.length;
  const m = graph.edges.length;
  const maxPossibleEdges = n > 1 ? n * (n - 1) / 2 : 1;
  const graphDensity = n > 1 ? m / maxPossibleEdges : 0;
  const candidates = [];
  if (n <= 1) {
    candidates.push({
      strategyId: "isolated-single-v1",
      family: "ISOLATED_SINGLE",
      name: "Single Identity Equilibrium",
      description: "Host user centered at spatial origin with zero bond tension.",
      rationale: "Ego network has 0 mutual connections; no relational forces required.",
      parameters: {
        repulsion: 0,
        springLength: 0,
        damping: 1,
        iterations: 0,
        baseRadius: 0,
        centerAttraction: 1
      },
      source: "DETERMINISTIC_HEURISTIC"
    });
    return candidates;
  }
  if (n === 2) {
    candidates.push({
      strategyId: "diatomic-pair-v1",
      family: "DIATOMIC_PAIR",
      name: "Diatomic Mutual Pair",
      description: "Symmetric dual-atom bond along the principal transverse axis.",
      rationale: "Single mutual relationship forms a stable collinear 1D bond in 3D space.",
      parameters: {
        repulsion: 40,
        springLength: 3.5,
        damping: 0.9,
        iterations: 15,
        baseRadius: 3.5,
        centerAttraction: 0.05
      },
      source: "DETERMINISTIC_HEURISTIC"
    });
    return candidates;
  }
  if (structure.structureClass === "TRIANGLE_CYCLE" && n === 3) {
    candidates.push({
      strategyId: "triadic-ring-v1",
      family: "TRIADIC_RING",
      name: "Triadic Planar Ring",
      description: "Equilateral triangular cyclic molecular arrangement in XY plane.",
      rationale: "Complete 3-way mutual closure achieves maximum stability in a 120-degree planar polygon.",
      parameters: {
        repulsion: 60,
        springLength: 4.2,
        damping: 0.88,
        iterations: 20,
        baseRadius: 2.8,
        centerAttraction: 0.08
      },
      source: "DETERMINISTIC_HEURISTIC"
    });
    return candidates;
  }
  if (structure.structureClass === "STAR" || structure.structureClass === "TREE") {
    candidates.push({
      strategyId: "star-cluster-v1",
      family: "STAR_CLUSTER",
      name: "Radial Star Shell",
      description: "Host at center with radial satellite bonds uniformly distributed on a spherical shell.",
      rationale: "Low clustering and star topology; radial spherical shells minimize edge crossing.",
      parameters: {
        repulsion: 90,
        springLength: 4.5,
        damping: 0.85,
        iterations: 45,
        baseRadius: Math.max(3.8, Math.cbrt(n) * 3),
        centerAttraction: 0.12
      },
      source: "DETERMINISTIC_HEURISTIC"
    });
  }
  candidates.push({
    strategyId: "spherical-force-relaxation-v1",
    family: "SPHERICAL_GOLDEN_SPIRAL",
    name: "Spherical Golden Spiral Relaxation",
    description: "Fibonacci-distributed spherical seeding followed by Fruchterman-Reingold energy minimization.",
    rationale: `Graph has ${n} nodes and ${m} mutual bonds (density: ${graphDensity.toFixed(2)}). Fibonacci seeding avoids planar collapse.`,
    parameters: {
      repulsion: 85,
      springLength: 4.2,
      damping: 0.85,
      iterations: n <= 5 ? 30 : 60,
      baseRadius: Math.max(3.8, Math.cbrt(n) * 3.2),
      centerAttraction: 0.1
    },
    source: "DETERMINISTIC_HEURISTIC"
  });
  return candidates;
}

// server/services/layoutScoringService.ts
function score3DLayout(graph, positions, targetBondLength = 4.2) {
  const nodeIds = Array.from(positions.keys());
  const n = nodeIds.length;
  if (n <= 1) {
    return {
      score: 0,
      overlapCount: 0,
      minSeparation: Infinity,
      edgeLengthVariance: 0,
      visualDensity: 0,
      isAcceptable: true
    };
  }
  let minSeparation = Infinity;
  let overlapCount = 0;
  const MIN_ALLOWED_DISTANCE = 1.6;
  for (let i = 0; i < n; i++) {
    const p1 = positions.get(nodeIds[i]);
    for (let j = i + 1; j < n; j++) {
      const p2 = positions.get(nodeIds[j]);
      const dx = p1[0] - p2[0];
      const dy = p1[1] - p2[1];
      const dz = p1[2] - p2[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < minSeparation) minSeparation = dist;
      if (dist < MIN_ALLOWED_DISTANCE) overlapCount++;
    }
  }
  const edgeLengths = [];
  let totalEdgeStress = 0;
  for (const edge of graph.edges) {
    const p1 = positions.get(edge.sourceId);
    const p2 = positions.get(edge.targetId);
    if (p1 && p2) {
      const dx = p1[0] - p2[0];
      const dy = p1[1] - p2[1];
      const dz = p1[2] - p2[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      edgeLengths.push(dist);
      const strain = dist - targetBondLength;
      totalEdgeStress += strain * strain;
    }
  }
  const m = edgeLengths.length;
  let edgeVariance = 0;
  if (m > 1) {
    const meanLen = edgeLengths.reduce((a, b) => a + b, 0) / m;
    edgeVariance = edgeLengths.reduce((acc, l) => acc + Math.pow(l - meanLen, 2), 0) / m;
  }
  let maxR = 0;
  for (const pos of positions.values()) {
    const r = Math.sqrt(pos[0] * pos[0] + pos[1] * pos[1] + pos[2] * pos[2]);
    if (r > maxR) maxR = r;
  }
  const boundingVolume = 4 / 3 * Math.PI * Math.pow(Math.max(maxR, 1), 3);
  const visualDensity = Number((n / boundingVolume).toFixed(4));
  const overlapPenalty = overlapCount * 1e3;
  const stressPenalty = totalEdgeStress * 2.5;
  const separationPenalty = minSeparation < 2 ? (2 - minSeparation) * 50 : 0;
  const compositeScore = Number((overlapPenalty + stressPenalty + separationPenalty + edgeVariance).toFixed(2));
  return {
    score: compositeScore,
    overlapCount,
    minSeparation: Number((minSeparation === Infinity ? 0 : minSeparation).toFixed(2)),
    edgeLengthVariance: Number(edgeVariance.toFixed(3)),
    visualDensity,
    isAcceptable: overlapCount === 0
  };
}

// server/services/optimizationService.ts
function createDeterministicRng(seedStr) {
  let h = 4022871197;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 2654435769);
  }
  let s = h >>> 0;
  return function next() {
    s = s + 1831565813 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var ClassicalForceDirectedOptimizer = class {
  name = "ClassicalForceDirectedOptimizer-v1";
  type = "CLASSICAL";
  optimize(graph, candidate, seedStr) {
    const startTime = performance.now();
    const rng = createDeterministicRng(seedStr);
    const nodes = graph.vertices;
    const n = nodes.length;
    const hostUserId = graph.hostUserId;
    const positions = /* @__PURE__ */ new Map();
    const velocities = /* @__PURE__ */ new Map();
    if (n <= 1) {
      positions.set(hostUserId, [0, 0, 0]);
      velocities.set(hostUserId, [0, 0, 0]);
      return {
        positions,
        optimizerUsed: this.name,
        isExperimental: false,
        iterationsCompleted: 0,
        computationTimeMs: Number((performance.now() - startTime).toFixed(2))
      };
    }
    if (candidate.family === "DIATOMIC_PAIR" && n === 2) {
      const other = nodes.find((u) => u.id !== hostUserId);
      positions.set(hostUserId, [-1.75, 0, 0]);
      positions.set(other.id, [1.75, 0, 0]);
      velocities.set(hostUserId, [0, 0, 0]);
      velocities.set(other.id, [0, 0, 0]);
    } else if (candidate.family === "TRIADIC_RING" && n === 3) {
      const radius = candidate.parameters.baseRadius;
      nodes.forEach((u, i) => {
        const angle = 2 * Math.PI * i / 3 - Math.PI / 2;
        positions.set(u.id, [radius * Math.cos(angle), radius * Math.sin(angle), 0]);
        velocities.set(u.id, [0, 0, 0]);
      });
    } else {
      positions.set(hostUserId, [0, 0, 0]);
      velocities.set(hostUserId, [0, 0, 0]);
      const neighbors = nodes.filter((u) => u.id !== hostUserId);
      const count = neighbors.length;
      const baseRadius = candidate.parameters.baseRadius;
      neighbors.forEach((u, i) => {
        const phi = Math.acos(1 - 2 * (i + 0.5) / Math.max(count, 1));
        const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5) + rng() * 0.1;
        const r = baseRadius + (rng() * 0.4 - 0.2);
        positions.set(u.id, [
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        ]);
        velocities.set(u.id, [0, 0, 0]);
      });
    }
    const { iterations, repulsion, springLength, damping, centerAttraction } = candidate.parameters;
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < n; i++) {
        const u1 = nodes[i].id;
        const p1 = positions.get(u1);
        const v1 = velocities.get(u1);
        for (let j = i + 1; j < n; j++) {
          const u2 = nodes[j].id;
          const p2 = positions.get(u2);
          const v2 = velocities.get(u2);
          let dx = p1[0] - p2[0];
          let dy = p1[1] - p2[1];
          let dz = p1[2] - p2[2];
          let distSq = dx * dx + dy * dy + dz * dz;
          if (distSq < 1e-4) {
            dx = (rng() - 0.5) * 0.1;
            dy = (rng() - 0.5) * 0.1;
            dz = (rng() - 0.5) * 0.1;
            distSq = dx * dx + dy * dy + dz * dz;
          }
          const dist = Math.sqrt(distSq);
          const force = repulsion / (distSq + 0.5);
          const fx = dx / dist * force;
          const fy = dy / dist * force;
          const fz = dz / dist * force;
          if (u1 !== hostUserId) {
            v1[0] += fx;
            v1[1] += fy;
            v1[2] += fz;
          }
          if (u2 !== hostUserId) {
            v2[0] -= fx;
            v2[1] -= fy;
            v2[2] -= fz;
          }
        }
      }
      for (const edge of graph.edges) {
        const p1 = positions.get(edge.sourceId);
        const p2 = positions.get(edge.targetId);
        const v1 = velocities.get(edge.sourceId);
        const v2 = velocities.get(edge.targetId);
        if (!p1 || !p2 || !v1 || !v2) continue;
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const dz = p2[2] - p1[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-3;
        const displacement = dist - springLength;
        const force = displacement * 0.12;
        const fx = dx / dist * force;
        const fy = dy / dist * force;
        const fz = dz / dist * force;
        if (edge.sourceId !== hostUserId) {
          v1[0] += fx;
          v1[1] += fy;
          v1[2] += fz;
        }
        if (edge.targetId !== hostUserId) {
          v2[0] -= fx;
          v2[1] -= fy;
          v2[2] -= fz;
        }
      }
      for (const u of nodes) {
        if (u.id === hostUserId) continue;
        const p = positions.get(u.id);
        const v = velocities.get(u.id);
        v[0] -= p[0] * centerAttraction;
        v[1] -= p[1] * centerAttraction;
        v[2] -= p[2] * centerAttraction;
      }
      for (const u of nodes) {
        if (u.id === hostUserId) continue;
        const p = positions.get(u.id);
        const v = velocities.get(u.id);
        p[0] += v[0];
        p[1] += v[1];
        p[2] += v[2];
        v[0] *= damping;
        v[1] *= damping;
        v[2] *= damping;
      }
    }
    return {
      positions,
      optimizerUsed: this.name,
      isExperimental: false,
      iterationsCompleted: iterations,
      computationTimeMs: Number((performance.now() - startTime).toFixed(2))
    };
  }
};
var defaultOptimizer = new ClassicalForceDirectedOptimizer();

// server/services/cacheService.ts
init_database();
function getCachedLayout(hostUserId, graphVersion, algorithmVersion) {
  const stmt = db.prepare(`
    SELECT * FROM layout_cache
    WHERE host_user_id = ? AND graph_version = ? AND algorithm_version = ?
  `);
  const row = stmt.get(hostUserId, graphVersion, algorithmVersion);
  return row || null;
}
function saveCachedLayout(hostUserId, graphVersion, algorithmVersion, structureClass, layoutData, qualityMetrics) {
  const id = `cache-${hostUserId}-${graphVersion}-${algorithmVersion}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const stmt = db.prepare(`
    INSERT INTO layout_cache (
      id, host_user_id, graph_version, algorithm_version, structure_class, layout_data, quality_metrics, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(host_user_id, graph_version, algorithm_version) DO UPDATE SET
      structure_class = excluded.structure_class,
      layout_data = excluded.layout_data,
      quality_metrics = excluded.quality_metrics,
      created_at = excluded.created_at
  `);
  stmt.run(
    id,
    hostUserId,
    graphVersion,
    algorithmVersion,
    structureClass,
    JSON.stringify(layoutData),
    JSON.stringify(qualityMetrics),
    now
  );
}

// server/services/remoteAgentClient.ts
function getRemoteAgentUrl() {
  return process.env.REMOTE_AGENT_URL || "";
}
function getAuthToken() {
  return process.env.BORING_AGENT_AUTH_TOKEN || "boring-dev-agent-token-2026";
}
function getTimeoutMs() {
  return Number(process.env.REMOTE_AGENT_TIMEOUT_MS) || 15e3;
}
function buildCompactGraphSummary(graph, metrics, graphVersion) {
  const n = graph.vertices.length;
  const m = graph.edges.length;
  return {
    graphVersion: `v${graphVersion}`,
    nodes: n,
    edges: m,
    density: Number(metrics.density.toFixed(4)),
    averageDegree: n > 0 ? Number((2 * m / n).toFixed(2)) : 0,
    maxDegree: metrics.degree,
    communities: metrics.communities ? metrics.communities.length : 1,
    connectedComponents: metrics.componentCount || 1,
    cycles: metrics.cycleCount || 0,
    hubCount: metrics.degree >= 3 ? 1 : 0
  };
}
async function requestRemoteAgentLayout(userId, summary) {
  const remoteUrl = getRemoteAgentUrl();
  if (!remoteUrl) {
    return null;
  }
  const timeoutMs = getTimeoutMs();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const endpoint = `${remoteUrl.replace(/\/$/, "")}/agent/layout`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId,
        graphVersion: summary.graphVersion,
        graphSummary: summary,
        task: "layout_recommendation",
        algorithm_version: "boring-pipeline-v1",
        constraints: {
          maxOverlap: 0,
          maxIterations: 200
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      console.warn(`[Remote Agent] Returned status ${res.status}. Using classical fallback.`);
      return null;
    }
    console.log("[Agent] Colab reachable");
    const rawData = await res.json();
    if (rawData && rawData.success === false) {
      console.warn(`[Remote Agent] AI reported error. Using classical fallback.`);
      return null;
    }
    let strategyName = "";
    let paramsRaw = {};
    let reasonText = "";
    let agentName = "Qwen/Qwen3.5-9B";
    if (rawData.recommendation) {
      const rec = rawData.recommendation;
      strategyName = rec.layout_strategy || rec.layoutStrategy || "";
      paramsRaw = rec.parameters || {};
      reasonText = rec.reason || "";
      agentName = rawData.model || agentName;
    } else {
      strategyName = rawData.layoutStrategy || "";
      paramsRaw = rawData.parameters || {};
      reasonText = (rawData.reasonCodes || []).join(", ") || rawData.reason || "";
      agentName = rawData.agent || agentName;
    }
    const supportedStrategies = [
      "force_directed",
      "spherical_shell",
      "spectral_cluster",
      "hierarchical_layered",
      "community_clustered",
      "radial",
      "hierarchical",
      "hub_centered"
    ];
    if (!strategyName || !supportedStrategies.includes(strategyName)) {
      console.warn(`[Remote Agent] Unsupported layout strategy '${strategyName}'. Using classical fallback.`);
      return null;
    }
    const isNum = (v) => typeof v === "number" && Number.isFinite(v) && !Number.isNaN(v);
    if (paramsRaw.repulsion !== void 0 && !isNum(paramsRaw.repulsion)) return null;
    if (paramsRaw.springLength !== void 0 && !isNum(paramsRaw.springLength)) return null;
    if (paramsRaw.edge_length !== void 0 && !isNum(paramsRaw.edge_length)) return null;
    if (paramsRaw.iterations !== void 0 && !isNum(paramsRaw.iterations)) return null;
    if (paramsRaw.damping !== void 0 && !isNum(paramsRaw.damping)) return null;
    if (paramsRaw.centerAttraction !== void 0 && !isNum(paramsRaw.centerAttraction)) return null;
    const repulsionVal = paramsRaw.repulsion ?? 0.8;
    const springLengthVal = paramsRaw.springLength ?? paramsRaw.edge_length ?? 1.1;
    const iterationsVal = paramsRaw.iterations ?? 120;
    const dampingVal = paramsRaw.damping ?? 0.85;
    const centerAttractionVal = paramsRaw.centerAttraction ?? 0.1;
    const boundedParams = {
      repulsion: Math.max(0.1, Math.min(5, Number(repulsionVal) || 0.8)),
      springLength: Math.max(0.5, Math.min(10, Number(springLengthVal) || 1.1)),
      iterations: Math.max(20, Math.min(300, Number(iterationsVal) || 120)),
      damping: Math.max(0.5, Math.min(0.99, Number(dampingVal) || 0.85)),
      centerAttraction: Math.max(0.01, Math.min(0.5, Number(centerAttractionVal) || 0.1)),
      baseRadius: 3.5
    };
    let family = "COMMUNITY_FORCE_RELAXATION";
    if (strategyName === "spherical_shell" || strategyName === "radial") {
      family = "SPHERICAL_GOLDEN_SPIRAL";
    } else if (strategyName === "spectral_cluster" || strategyName === "community_clustered" || strategyName === "hub_centered") {
      family = "STAR_CLUSTER";
    }
    return {
      strategyId: `ai-${agentName}-${strategyName}`,
      family,
      name: `Qwen3.5: ${strategyName.replace(/_/g, " ")}`,
      description: `Remote AI layout decision from ${agentName}`,
      rationale: reasonText || "Optimized layout via topological analysis",
      parameters: boundedParams,
      source: "AI_PROVIDER"
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      console.warn(`[Remote Agent] Timed out after ${timeoutMs}ms. Using classical fallback.`);
    } else {
      console.warn(`[Remote Agent] Connection failed (${err.message}). Using classical fallback.`);
    }
    return null;
  }
}

// server/services/layoutService.ts
var ALGORITHM_VERSION = "boring-pipeline-v1";
function getCurrentGraphVersion(userId) {
  const stmt = db.prepare("SELECT graph_version FROM user_graph_versions WHERE user_id = ?");
  const row = stmt.get(userId);
  return row ? row.graph_version : 1;
}
function getOrComputeLayout(hostUserId, optimizer = defaultOptimizer, aiStrategyOverride) {
  const startTime = performance.now();
  const graphVersion = getCurrentGraphVersion(hostUserId);
  const cached = getCachedLayout(hostUserId, graphVersion, ALGORITHM_VERSION);
  if (cached) {
    try {
      const layoutData = JSON.parse(cached.layout_data);
      const qualityMetrics2 = JSON.parse(cached.quality_metrics);
      const structure2 = JSON.parse(cached.structure_class);
      const hydratedNodes = (layoutData.nodes || []).map((n) => {
        const fresh = getUserById(n.id);
        return {
          ...n,
          user: fresh || n.user
        };
      });
      return {
        hostUserId,
        graphVersion,
        algorithmVersion: ALGORITHM_VERSION,
        structure: structure2,
        strategyUsed: layoutData.strategyUsed,
        nodes: hydratedNodes,
        bonds: layoutData.bonds,
        qualityMetrics: {
          ...qualityMetrics2,
          computationTimeMs: Number((performance.now() - startTime).toFixed(2))
        },
        fromCache: true
      };
    } catch {
    }
  }
  const constructedGraph = constructEgoGraph(hostUserId);
  const ego = buildEgoGraph(hostUserId);
  const structure = classifyStructure(ego.metrics);
  let selectedStrategy;
  if (aiStrategyOverride) {
    selectedStrategy = aiStrategyOverride;
  } else {
    const candidates = generateLayoutStrategy(constructedGraph, structure);
    selectedStrategy = candidates[0];
  }
  const seed = `${hostUserId}-v${graphVersion}`;
  const optimizationResult = optimizer.optimize(constructedGraph, selectedStrategy, seed);
  const scoring = score3DLayout(constructedGraph, optimizationResult.positions, selectedStrategy.parameters.springLength || 4.2);
  const layoutNodes = constructedGraph.vertices.map((v) => {
    const pos = optimizationResult.positions.get(v.id) || [0, 0, 0];
    return {
      id: v.id,
      user: v.user,
      position: [
        Number(pos[0].toFixed(3)),
        Number(pos[1].toFixed(3)),
        Number(pos[2].toFixed(3))
      ],
      size: v.isHost ? 1.15 : 0.82,
      isHost: v.isHost
    };
  });
  const layoutBonds = constructedGraph.edges.map((e) => {
    const p1 = optimizationResult.positions.get(e.sourceId) || [0, 0, 0];
    const p2 = optimizationResult.positions.get(e.targetId) || [0, 0, 0];
    return {
      id: e.id,
      sourceId: e.sourceId,
      targetId: e.targetId,
      sourcePos: [
        Number(p1[0].toFixed(3)),
        Number(p1[1].toFixed(3)),
        Number(p1[2].toFixed(3))
      ],
      targetPos: [
        Number(p2[0].toFixed(3)),
        Number(p2[1].toFixed(3)),
        Number(p2[2].toFixed(3))
      ]
    };
  });
  const qualityMetrics = {
    overlapCount: scoring.overlapCount,
    minSeparation: scoring.minSeparation,
    edgeLengthVariance: scoring.edgeLengthVariance,
    visualDensity: scoring.visualDensity,
    score: scoring.score,
    computationTimeMs: Number((performance.now() - startTime).toFixed(2))
  };
  try {
    saveCachedLayout(
      hostUserId,
      graphVersion,
      ALGORITHM_VERSION,
      JSON.stringify(structure),
      {
        nodes: layoutNodes,
        bonds: layoutBonds,
        strategyUsed: selectedStrategy
      },
      qualityMetrics
    );
  } catch (err) {
    console.error("Failed to cache layout:", err);
  }
  return {
    hostUserId,
    graphVersion,
    algorithmVersion: ALGORITHM_VERSION,
    structure,
    strategyUsed: selectedStrategy,
    nodes: layoutNodes,
    bonds: layoutBonds,
    qualityMetrics,
    fromCache: false
  };
}
async function getOrComputeLayoutAsync(hostUserId, optimizer = defaultOptimizer) {
  const graphVersion = getCurrentGraphVersion(hostUserId);
  const cached = getCachedLayout(hostUserId, graphVersion, ALGORITHM_VERSION);
  if (cached) {
    return getOrComputeLayout(hostUserId, optimizer);
  }
  try {
    const constructedGraph = constructEgoGraph(hostUserId);
    const ego = buildEgoGraph(hostUserId);
    const structure = classifyStructure(ego.metrics);
    const summary = buildCompactGraphSummary(constructedGraph, ego.metrics, graphVersion);
    const remoteCandidate = await requestRemoteAgentLayout(hostUserId, summary);
    if (remoteCandidate) {
      return getOrComputeLayout(hostUserId, optimizer, remoteCandidate);
    }
  } catch (err) {
    console.warn("[LayoutService] Remote AI invocation error, using classical baseline:", err);
  }
  return getOrComputeLayout(hostUserId, optimizer);
}

// server/routes/networkRoutes.ts
init_graphAnalysisService();
init_relationshipService();
init_authService();
var networkRouter = Router4();
networkRouter.get("/me", authMiddleware, (req, res) => {
  try {
    const userId = req.userId;
    const mutualPartnerIds = getMutualPartnerIds(userId);
    const relationships = getUserRelationships(userId);
    const followerIds = /* @__PURE__ */ new Set();
    relationships.forEach((r) => {
      if (r.receiver_id === userId && (r.status === "ACCEPTED_ONE_WAY" || r.status === "REQUESTED")) {
        followerIds.add(r.requester_id);
      }
    });
    const followingIds = /* @__PURE__ */ new Set();
    relationships.forEach((r) => {
      if (r.requester_id === userId && (r.status === "ACCEPTED_ONE_WAY" || r.status === "REQUESTED")) {
        followingIds.add(r.receiver_id);
      }
    });
    const allUsers = getAllUsers();
    const mutualUsers = allUsers.filter((u) => mutualPartnerIds.includes(u.id));
    const followerUsers = allUsers.filter((u) => followerIds.has(u.id));
    const followingUsers = allUsers.filter((u) => followingIds.has(u.id));
    res.json({
      stats: {
        mutualCount: mutualPartnerIds.length,
        followerCount: followerIds.size,
        followingCount: followingIds.size
      },
      mutualUsers,
      followerUsers,
      followingUsers
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
networkRouter.get("/:userId", optionalAuthMiddleware, (req, res) => {
  try {
    const userId = req.params.userId;
    const ego = buildEgoGraph(userId);
    const structure = classifyStructure(ego.metrics);
    res.json({
      hostUserId: userId,
      metrics: ego.metrics,
      structure,
      nodeCount: ego.nodes.length,
      edgeCount: ego.mutualEdges.length
    });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});
networkRouter.get("/:userId/layout", optionalAuthMiddleware, async (req, res) => {
  try {
    const userId = req.params.userId;
    const layout = await getOrComputeLayoutAsync(userId);
    res.json(layout);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
networkRouter.get("/:userId/snapshot", optionalAuthMiddleware, async (req, res) => {
  try {
    const userId = req.params.userId;
    const { createGraphSnapshot: createGraphSnapshot2 } = await Promise.resolve().then(() => (init_graphPipelineService(), graphPipelineService_exports));
    const snapshot = createGraphSnapshot2(userId);
    res.json(snapshot);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});
networkRouter.get("/:userId/summary", optionalAuthMiddleware, async (req, res) => {
  try {
    const userId = req.params.userId;
    const { createAiSafeGraphSummary: createAiSafeGraphSummary2 } = await Promise.resolve().then(() => (init_graphPipelineService(), graphPipelineService_exports));
    const summary = createAiSafeGraphSummary2(userId);
    res.json(summary);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// server/index.ts
init_adapter();
try {
  process.loadEnvFile();
} catch {
}
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path2.dirname(__filename2);
var DIST_DIR = path2.resolve(__dirname2, "../dist");
var app = express();
var PORT = process.env.PORT || 3001;
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use((req, _res, next) => {
  if (req.url === "/api" || req.url === "/api/" || req.url === "") {
    const rawUrl = req.headers["x-matched-path"] || req.headers["x-forwarded-uri"] || req.originalUrl;
    if (typeof rawUrl === "string" && rawUrl.startsWith("/api") && rawUrl !== "/api" && rawUrl !== "/api/") {
      req.url = rawUrl;
    }
  }
  next();
});
if (fs2.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
}
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    system: "Boring Molecular Social Graph Engine",
    database: getDatabaseType()
  });
});
app.use("/api/auth", authRouter);
app.use("/api/relationships", relationshipRouter);
app.use("/api", userRouter);
app.use("/api/network", networkRouter);
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api") && fs2.existsSync(path2.join(DIST_DIR, "index.html"))) {
    return res.sendFile(path2.join(DIST_DIR, "index.html"));
  }
  next();
});
app.use((err, _req, res, _next) => {
  console.error("[Boring Server Error]:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error"
  });
});
var isVercel = Boolean("1");
if (process.env.NODE_ENV !== "test" && !isVercel) {
  const server = app.listen(PORT, () => {
    console.log(`[Boring Backend Server] Running on http://localhost:${PORT}`);
    console.log(`[API Endpoints] /api/auth, /api/relationships, /api/users, /api/network`);
  });
  server.on("error", async (err) => {
    if (err.code === "EADDRINUSE") {
      try {
        const check = await fetch(`http://localhost:${PORT}/api/health`);
        if (check.ok) {
          console.log(`[Boring Backend Server] Port ${PORT} is already running an active Boring backend server.`);
          console.log(`[Boring Backend Server] Connected to existing backend on http://localhost:${PORT}`);
          setInterval(() => {
          }, 1e3 * 60 * 60);
          return;
        }
      } catch {
      }
      console.error(`[Boring Backend Server Error] Port ${PORT} is already in use by another process. Please terminate the conflicting process or set PORT to an available port.`);
      process.exit(1);
    } else {
      console.error("[Boring Backend Server Error]:", err);
      process.exit(1);
    }
  });
  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
var server_default = app;
export {
  server_default as default
};
