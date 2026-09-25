import { db } from './database.ts';
import { getSupabaseAdminClient, isSupabaseConfigured } from '../services/supabaseService.ts';

export interface UserEntity {
  id: string;
  name: string;
  username: string;
  email: string;
  password_hash: string;
  avatar_url: string;
  bio: string;
  gender: string;
  molecule_identity: string;
  molecule_smoky: number;
  molecule_twinkling: number;
  showcase_suggestions: string;
  created_at: string;
  updated_at: string;
}

export interface PrivacySettingsEntity {
  user_id: string;
  profile_visibility: string;
  email_visibility: string;
  social_links_visibility: string;
}

export interface SocialProfileEntity {
  id: string;
  user_id: string;
  platform: string;
  profile_url: string;
  display_username: string;
  normalized_url?: string;
  hostname?: string;
  icon_id?: string;
  created_at: string;
}

export interface RelationshipEntity {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'REQUESTED' | 'ACCEPTED_ONE_WAY' | 'REJECTED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
  accepted_at?: string | null;
  mutual_at?: string | null;
  disconnected_at?: string | null;
  cancelled_at?: string | null;
  version?: number;
}

export interface MutualRelationshipEntity {
  id: string;
  user_a_id: string;
  user_b_id: string;
  created_at: string;
}

export interface LayoutCacheEntity {
  id: string;
  host_user_id: string;
  graph_version: number;
  algorithm_version: string;
  structure_class: string;
  layout_data: string;
  quality_metrics: string;
  created_at: string;
}

export interface BoringDatabaseAdapter {
  readonly adapterType: 'sqlite' | 'supabase';

  // Users
  getUserById(id: string): Promise<UserEntity | null>;
  getUserByEmail(email: string): Promise<UserEntity | null>;
  getUserByUsername(username: string): Promise<UserEntity | null>;
  getAllUsers(): Promise<UserEntity[]>;
  createUser(user: UserEntity): Promise<UserEntity>;
  updateUser(id: string, updates: Partial<UserEntity>): Promise<UserEntity>;

  // Privacy
  getPrivacySettings(userId: string): Promise<PrivacySettingsEntity | null>;
  updatePrivacySettings(userId: string, updates: Partial<PrivacySettingsEntity>): Promise<PrivacySettingsEntity>;

  // Relationships
  getRelationshipById(id: string): Promise<RelationshipEntity | null>;
  getRelationshipBetween(userA: string, userB: string): Promise<RelationshipEntity | null>;
  listUserRelationships(userId: string): Promise<RelationshipEntity[]>;
  createRelationship(rel: RelationshipEntity): Promise<RelationshipEntity>;
  updateRelationship(id: string, updates: Partial<RelationshipEntity>): Promise<RelationshipEntity>;
  deleteRelationship(id: string): Promise<boolean>;

  // Mutual Relationships
  isMutual(userA: string, userB: string): Promise<boolean>;
  getMutualPartners(userId: string): Promise<string[]>;
  addMutual(userA: string, userB: string): Promise<void>;
  removeMutual(userA: string, userB: string): Promise<void>;

  // Graph Version & Layout Cache
  getGraphVersion(userId: string): Promise<number>;
  incrementGraphVersion(userId: string): Promise<number>;
  getCachedLayout(hostUserId: string, graphVersion: number, algorithmVersion: string): Promise<LayoutCacheEntity | null>;
  saveCachedLayout(cache: LayoutCacheEntity): Promise<void>;
  invalidateLayoutCache(hostUserId: string): Promise<void>;
}

/**
 * SQLite Database Adapter (for Local Development & Fast Testing)
 */
export class SqliteDatabaseAdapter implements BoringDatabaseAdapter {
  readonly adapterType = 'sqlite' as const;

  async getUserById(id: string): Promise<UserEntity | null> {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return (stmt.get(id) as UserEntity) || null;
  }

  async getUserByEmail(email: string): Promise<UserEntity | null> {
    const stmt = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)');
    return (stmt.get(email) as UserEntity) || null;
  }

  async getUserByUsername(username: string): Promise<UserEntity | null> {
    const stmt = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)');
    return (stmt.get(username) as UserEntity) || null;
  }

  async getAllUsers(): Promise<UserEntity[]> {
    const stmt = db.prepare('SELECT * FROM users ORDER BY created_at ASC');
    return stmt.all() as unknown as UserEntity[];
  }

  async createUser(user: UserEntity): Promise<UserEntity> {
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

    // Default privacy settings
    db.prepare(`
      INSERT INTO privacy_settings (user_id, profile_visibility, email_visibility, social_links_visibility)
      VALUES (?, 'PUBLIC', 'CONNECTIONS_ONLY', 'PUBLIC')
    `).run(user.id);

    // Default version
    db.prepare(`
      INSERT INTO user_graph_versions (user_id, graph_version, updated_at)
      VALUES (?, 1, ?)
    `).run(user.id, user.created_at);

    return user;
  }

  async updateUser(id: string, updates: Partial<UserEntity>): Promise<UserEntity> {
    const existing = await this.getUserById(id);
    if (!existing) throw new Error('User not found');

    const merged = { ...existing, ...updates, updated_at: new Date().toISOString() };
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

  async getPrivacySettings(userId: string): Promise<PrivacySettingsEntity | null> {
    const stmt = db.prepare('SELECT * FROM privacy_settings WHERE user_id = ?');
    return (stmt.get(userId) as PrivacySettingsEntity) || null;
  }

  async updatePrivacySettings(userId: string, updates: Partial<PrivacySettingsEntity>): Promise<PrivacySettingsEntity> {
    const current = await this.getPrivacySettings(userId);
    const merged: PrivacySettingsEntity = {
      user_id: userId,
      profile_visibility: updates.profile_visibility ?? current?.profile_visibility ?? 'PUBLIC',
      email_visibility: updates.email_visibility ?? current?.email_visibility ?? 'CONNECTIONS_ONLY',
      social_links_visibility: updates.social_links_visibility ?? current?.social_links_visibility ?? 'PUBLIC',
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

  async getRelationshipById(id: string): Promise<RelationshipEntity | null> {
    const stmt = db.prepare('SELECT * FROM relationships WHERE id = ?');
    return (stmt.get(id) as RelationshipEntity) || null;
  }

  async getRelationshipBetween(userA: string, userB: string): Promise<RelationshipEntity | null> {
    const stmt = db.prepare(`
      SELECT * FROM relationships
      WHERE requester_id = ? AND receiver_id = ?
    `);
    return (stmt.get(userA, userB) as RelationshipEntity) || null;
  }

  async listUserRelationships(userId: string): Promise<RelationshipEntity[]> {
    const stmt = db.prepare(`
      SELECT * FROM relationships
      WHERE requester_id = ? OR receiver_id = ?
      ORDER BY updated_at DESC
    `);
    return stmt.all(userId, userId) as unknown as RelationshipEntity[];
  }

  async createRelationship(rel: RelationshipEntity): Promise<RelationshipEntity> {
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

  async updateRelationship(id: string, updates: Partial<RelationshipEntity>): Promise<RelationshipEntity> {
    const existing = await this.getRelationshipById(id);
    if (!existing) throw new Error('Relationship not found');
    const merged = { ...existing, ...updates, updated_at: new Date().toISOString() };

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

  async deleteRelationship(id: string): Promise<boolean> {
    const stmt = db.prepare('DELETE FROM relationships WHERE id = ?');
    stmt.run(id);
    return true;
  }

  async isMutual(userA: string, userB: string): Promise<boolean> {
    const [first, second] = userA < userB ? [userA, userB] : [userB, userA];
    const stmt = db.prepare('SELECT 1 FROM mutual_relationships WHERE user_a_id = ? AND user_b_id = ?');
    return Boolean(stmt.get(first, second));
  }

  async getMutualPartners(userId: string): Promise<string[]> {
    const stmt = db.prepare(`
      SELECT CASE WHEN user_a_id = ? THEN user_b_id ELSE user_a_id END AS partner_id
      FROM mutual_relationships
      WHERE user_a_id = ? OR user_b_id = ?
    `);
    const rows = stmt.all(userId, userId, userId) as unknown as { partner_id: string }[];
    return rows.map(r => r.partner_id);
  }

  async addMutual(userA: string, userB: string): Promise<void> {
    const [first, second] = userA < userB ? [userA, userB] : [userB, userA];
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO mutual_relationships (id, user_a_id, user_b_id, created_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(`mut-${first}-${second}`, first, second, new Date().toISOString());
  }

  async removeMutual(userA: string, userB: string): Promise<void> {
    const [first, second] = userA < userB ? [userA, userB] : [userB, userA];
    const stmt = db.prepare('DELETE FROM mutual_relationships WHERE user_a_id = ? AND user_b_id = ?');
    stmt.run(first, second);
  }

  async getGraphVersion(userId: string): Promise<number> {
    const stmt = db.prepare('SELECT graph_version FROM user_graph_versions WHERE user_id = ?');
    const row = stmt.get(userId) as { graph_version: number } | undefined;
    return row?.graph_version || 1;
  }

  async incrementGraphVersion(userId: string): Promise<number> {
    const current = await this.getGraphVersion(userId);
    const next = current + 1;
    const stmt = db.prepare(`
      INSERT INTO user_graph_versions (user_id, graph_version, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET graph_version = ?, updated_at = ?
    `);
    const now = new Date().toISOString();
    stmt.run(userId, next, now, next, now);
    return next;
  }

  async getCachedLayout(hostUserId: string, graphVersion: number, algorithmVersion: string): Promise<LayoutCacheEntity | null> {
    const stmt = db.prepare(`
      SELECT * FROM layout_cache
      WHERE host_user_id = ? AND graph_version = ? AND algorithm_version = ?
    `);
    return (stmt.get(hostUserId, graphVersion, algorithmVersion) as LayoutCacheEntity) || null;
  }

  async saveCachedLayout(cache: LayoutCacheEntity): Promise<void> {
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

  async invalidateLayoutCache(hostUserId: string): Promise<void> {
    const stmt = db.prepare('DELETE FROM layout_cache WHERE host_user_id = ?');
    stmt.run(hostUserId);
  }
}

/**
 * Supabase Database Adapter (for Production Deployment on PostgreSQL)
 */
export class SupabaseDatabaseAdapter implements BoringDatabaseAdapter {
  readonly adapterType = 'supabase' as const;

  private getClient() {
    const client = getSupabaseAdminClient();
    if (!client) {
      throw new Error('Supabase client is not available or configured.');
    }
    return client;
  }

  async getUserById(id: string): Promise<UserEntity | null> {
    const { data, error } = await this.getClient()
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return data as UserEntity;
  }

  async getUserByEmail(email: string): Promise<UserEntity | null> {
    const { data, error } = await this.getClient()
      .from('users')
      .select('*')
      .ilike('email', email)
      .maybeSingle();
    if (error || !data) return null;
    return data as UserEntity;
  }

  async getUserByUsername(username: string): Promise<UserEntity | null> {
    const { data, error } = await this.getClient()
      .from('users')
      .select('*')
      .ilike('username', username)
      .maybeSingle();
    if (error || !data) return null;
    return data as UserEntity;
  }

  async getAllUsers(): Promise<UserEntity[]> {
    const { data, error } = await this.getClient()
      .from('users')
      .select('*')
      .order('created_at', { ascending: true });
    if (error || !data) return [];
    return data as UserEntity[];
  }

  async createUser(user: UserEntity): Promise<UserEntity> {
    const { data, error } = await this.getClient()
      .from('users')
      .insert(user)
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Initialize default privacy
    await this.getClient()
      .from('privacy_settings')
      .upsert({
        user_id: user.id,
        profile_visibility: 'PUBLIC',
        email_visibility: 'CONNECTIONS_ONLY',
        social_links_visibility: 'PUBLIC',
      });

    // Initialize default graph version
    await this.getClient()
      .from('user_graph_versions')
      .upsert({
        user_id: user.id,
        graph_version: 1,
        graph_hash: '',
        updated_at: new Date().toISOString(),
      });

    return data as UserEntity;
  }

  async updateUser(id: string, updates: Partial<UserEntity>): Promise<UserEntity> {
    const { data, error } = await this.getClient()
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as UserEntity;
  }

  async getPrivacySettings(userId: string): Promise<PrivacySettingsEntity | null> {
    const { data, error } = await this.getClient()
      .from('privacy_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return data as PrivacySettingsEntity;
  }

  async updatePrivacySettings(userId: string, updates: Partial<PrivacySettingsEntity>): Promise<PrivacySettingsEntity> {
    const { data, error } = await this.getClient()
      .from('privacy_settings')
      .upsert({ user_id: userId, ...updates })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as PrivacySettingsEntity;
  }

  async getRelationshipById(id: string): Promise<RelationshipEntity | null> {
    const { data, error } = await this.getClient()
      .from('relationships')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return data as RelationshipEntity;
  }

  async getRelationshipBetween(userA: string, userB: string): Promise<RelationshipEntity | null> {
    const { data, error } = await this.getClient()
      .from('relationships')
      .select('*')
      .eq('requester_id', userA)
      .eq('receiver_id', userB)
      .maybeSingle();
    if (error || !data) return null;
    return data as RelationshipEntity;
  }

  async listUserRelationships(userId: string): Promise<RelationshipEntity[]> {
    const { data, error } = await this.getClient()
      .from('relationships')
      .select('*')
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('updated_at', { ascending: false });
    if (error || !data) return [];
    return data as RelationshipEntity[];
  }

  async createRelationship(rel: RelationshipEntity): Promise<RelationshipEntity> {
    const { data, error } = await this.getClient()
      .from('relationships')
      .insert(rel)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as RelationshipEntity;
  }

  async updateRelationship(id: string, updates: Partial<RelationshipEntity>): Promise<RelationshipEntity> {
    const { data, error } = await this.getClient()
      .from('relationships')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as RelationshipEntity;
  }

  async deleteRelationship(id: string): Promise<boolean> {
    const { error } = await this.getClient()
      .from('relationships')
      .delete()
      .eq('id', id);
    return !error;
  }

  async isMutual(userA: string, userB: string): Promise<boolean> {
    const [first, second] = userA < userB ? [userA, userB] : [userB, userA];
    const { count, error } = await this.getClient()
      .from('mutual_relationships')
      .select('*', { count: 'exact', head: true })
      .eq('user_a_id', first)
      .eq('user_b_id', second);
    if (error) return false;
    return (count || 0) > 0;
  }

  async getMutualPartners(userId: string): Promise<string[]> {
    const client = this.getClient();
    const { data: rowsA } = await client
      .from('mutual_relationships')
      .select('user_b_id')
      .eq('user_a_id', userId);
    const { data: rowsB } = await client
      .from('mutual_relationships')
      .select('user_a_id')
      .eq('user_b_id', userId);

    const partners = new Set<string>();
    (rowsA || []).forEach((r: any) => partners.add(r.user_b_id));
    (rowsB || []).forEach((r: any) => partners.add(r.user_a_id));
    return Array.from(partners);
  }

  async addMutual(userA: string, userB: string): Promise<void> {
    const [first, second] = userA < userB ? [userA, userB] : [userB, userA];
    await this.getClient()
      .from('mutual_relationships')
      .upsert({
        id: `mut-${first}-${second}`,
        user_a_id: first,
        user_b_id: second,
        created_at: new Date().toISOString(),
      });
  }

  async removeMutual(userA: string, userB: string): Promise<void> {
    const [first, second] = userA < userB ? [userA, userB] : [userB, userA];
    await this.getClient()
      .from('mutual_relationships')
      .delete()
      .eq('user_a_id', first)
      .eq('user_b_id', second);
  }

  async getGraphVersion(userId: string): Promise<number> {
    const { data, error } = await this.getClient()
      .from('user_graph_versions')
      .select('graph_version')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return 1;
    return data.graph_version || 1;
  }

  async incrementGraphVersion(userId: string): Promise<number> {
    const current = await this.getGraphVersion(userId);
    const next = current + 1;
    await this.getClient()
      .from('user_graph_versions')
      .upsert({
        user_id: userId,
        graph_version: next,
        updated_at: new Date().toISOString(),
      });
    return next;
  }

  async getCachedLayout(hostUserId: string, graphVersion: number, algorithmVersion: string): Promise<LayoutCacheEntity | null> {
    const { data, error } = await this.getClient()
      .from('layout_cache')
      .select('*')
      .eq('host_user_id', hostUserId)
      .eq('graph_version', graphVersion)
      .eq('algorithm_version', algorithmVersion)
      .maybeSingle();
    if (error || !data) return null;
    return data as LayoutCacheEntity;
  }

  async saveCachedLayout(cache: LayoutCacheEntity): Promise<void> {
    await this.getClient()
      .from('layout_cache')
      .upsert(cache);
  }

  async invalidateLayoutCache(hostUserId: string): Promise<void> {
    await this.getClient()
      .from('layout_cache')
      .delete()
      .eq('host_user_id', hostUserId);
  }
}

// Singleton adapter instance
let adapterInstance: BoringDatabaseAdapter | null = null;

export type DatabaseType = 'supabase' | 'sqlite' | 'unconfigured';

export function getDatabaseType(): DatabaseType {
  const isVercel = Boolean(process.env.VERCEL);
  const isProd = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';
  const supabaseReady = isSupabaseConfigured();

  if (isVercel || isProd) {
    return supabaseReady ? 'supabase' : 'unconfigured';
  }

  if (supabaseReady && !isTest) {
    return 'supabase';
  }

  return 'sqlite';
}

export function resetDatabaseAdapter(): void {
  adapterInstance = null;
}

export function getDatabaseAdapter(): BoringDatabaseAdapter {
  const isVercel = Boolean(process.env.VERCEL);
  const isProd = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';
  const supabaseReady = isSupabaseConfigured();

  // VERCEL / PRODUCTION policy: Supabase MUST be selected; NEVER fall back to SQLite
  if (isVercel || isProd) {
    if (!supabaseReady) {
      throw new Error('Production database is not configured');
    }
    if (!adapterInstance || !(adapterInstance instanceof SupabaseDatabaseAdapter)) {
      adapterInstance = new SupabaseDatabaseAdapter();
    }
    return adapterInstance;
  }

  // LOCAL DEVELOPMENT policy: Supabase if configured and not test, else SQLite allowed
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

