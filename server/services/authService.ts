import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.ts';
import { getDatabaseAdapter } from '../db/adapter.ts';
import {
  isSupabaseConfigured,
  getSupabaseAdminClient,
  supabaseSignUp,
  supabaseSignIn,
  verifySupabaseToken,
} from './supabaseService.ts';

const userCache = new Map<string, SanitizedUser>();

export function clearUserCache(): void {
  userCache.clear();
}


const JWT_SECRET = process.env.JWT_SECRET || 'boring-secret-key-2026-antigravity';

export interface UserRow {
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

export interface SanitizedUser {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar_url: string;
  bio: string;
  gender: string;
  moleculeIdentity: string;
  molecule_identity: string;
  moleculeSmoky: boolean;
  moleculeTwinkling: boolean;
  showcase_suggestions: string[];
  created_at: string;
}

export function sanitizeUser(row: UserRow): SanitizedUser {
  let showcase: string[] = [];
  try {
    showcase = JSON.parse(row.showcase_suggestions || '[]');
  } catch {}

  const moleculeId = row.molecule_identity || 'default';

  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    avatar_url: row.avatar_url,
    bio: row.bio || '',
    gender: row.gender || '',
    moleculeIdentity: moleculeId,
    molecule_identity: moleculeId,
    moleculeSmoky: Boolean(row.molecule_smoky),
    moleculeTwinkling: Boolean(row.molecule_twinkling),
    showcase_suggestions: showcase,
    created_at: row.created_at,
  };
}

export function getUserById(id: string): SanitizedUser | null {
  if (userCache.has(id)) {
    return userCache.get(id)!;
  }
  const isProduction = Boolean(process.env.VERCEL || process.env.NODE_ENV === 'production');
  if (isProduction) {
    return null;
  }
  try {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id) as UserRow | undefined;
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

export async function getUserByIdAsync(id: string): Promise<SanitizedUser | null> {
  if (userCache.has(id)) {
    return userCache.get(id)!;
  }
  const isProduction = Boolean(process.env.VERCEL || process.env.NODE_ENV === 'production');
  const supabaseMode = isSupabaseConfigured() && process.env.NODE_ENV !== 'test';

  if (isProduction || supabaseMode) {
    try {
      const adapter = getDatabaseAdapter();
      const entity = await adapter.getUserById(id);
      if (entity) {
        const sanitized = sanitizeUser(entity as unknown as UserRow);
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

export function getUserByEmail(email: string): UserRow | null {
  try {
    const stmt = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)');
    const row = stmt.get(email) as UserRow | undefined;
    return row || null;
  } catch {
    return null;
  }
}

export function getUserByUsername(username: string): UserRow | null {
  try {
    const stmt = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)');
    const row = stmt.get(username) as UserRow | undefined;
    return row || null;
  } catch {
    return null;
  }
}

export function getAllUsers(): SanitizedUser[] {
  try {
    const stmt = db.prepare('SELECT * FROM users ORDER BY created_at ASC');
    const rows = stmt.all() as unknown as UserRow[];
    return rows.map(sanitizeUser);
  } catch {
    return [];
  }
}

export async function getAllUsersAsync(): Promise<SanitizedUser[]> {
  const isProduction = Boolean(process.env.VERCEL || process.env.NODE_ENV === 'production');
  const supabaseMode = isSupabaseConfigured() && process.env.NODE_ENV !== 'test';

  if (isProduction || supabaseMode) {
    const adapter = getDatabaseAdapter();
    const entities = await adapter.getAllUsers();
    return entities.map((u) => {
      const sanitized = sanitizeUser(u as unknown as UserRow);
      userCache.set(u.id, sanitized);
      return sanitized;
    });
  }

  return getAllUsers();
}


export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string } | null {
  // 1. Try local HMAC secret verification
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string; id?: string; sub?: string };
    const id = decoded.userId || decoded.id || decoded.sub;
    if (id) return { userId: id };
  } catch {
    // Not signed with local JWT secret; might be a Supabase Auth access token
  }

  // 2. Try decoding Supabase JWT (RS256 token signed by Supabase Auth with 'sub' claim)
  try {
    const decoded = jwt.decode(token) as { sub?: string; role?: string } | null;
    if (decoded && decoded.sub && (decoded.role === 'authenticated' || decoded.role === 'anon')) {
      return { userId: decoded.sub };
    }
  } catch {
    // Decoding failed
  }

  return null;
}

/**
 * Synchronize or create a public Boring user corresponding to a Supabase Auth identity (Synchronous)
 */
export function syncSupabaseUser(
  authUser: { id: string; email?: string; user_metadata?: any },
  fallbackName?: string,
  fallbackUsername?: string
): SanitizedUser {
  const existing = getUserById(authUser.id);
  if (existing) {
    return existing;
  }

  const userEmail = (authUser.email || '').toLowerCase().trim();
  if (userEmail) {
    const byEmail = getUserByEmail(userEmail);
    if (byEmail) {
      return sanitizeUser(byEmail);
    }
  }

  const now = new Date().toISOString();
  const rawMeta = authUser.user_metadata || {};
  const name = rawMeta.name || fallbackName || (userEmail ? userEmail.split('@')[0] : 'Boring User');
  const baseUsername = (rawMeta.username || fallbackUsername || (userEmail ? userEmail.split('@')[0] : 'user'))
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
  let username = baseUsername || `user_${Date.now()}`;

  if (getUserByUsername(username)) {
    username = `${username}_${Math.floor(1000 + Math.random() * 9000)}`;
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
    '',
    '',
    '',
    '',
    'default',
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

  return getUserById(authUser.id)!;
}

/**
 * Synchronize user to Supabase PostgreSQL (Production) and local database
 */
export async function syncSupabaseUserAsync(
  authUser: { id: string; email?: string; user_metadata?: any },
  fallbackName?: string,
  fallbackUsername?: string
): Promise<SanitizedUser> {
  const userEmail = (authUser.email || '').toLowerCase().trim();
  const rawMeta = authUser.user_metadata || {};
  const name = rawMeta.name || fallbackName || (userEmail ? userEmail.split('@')[0] : 'Boring User');
  const baseUsername = (rawMeta.username || fallbackUsername || (userEmail ? userEmail.split('@')[0] : 'user'))
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
  const now = new Date().toISOString();

  // Supabase PostgreSQL Production Mode
  if (isSupabaseConfigured() && process.env.NODE_ENV !== 'test') {
    const admin = getSupabaseAdminClient();
    if (admin) {
      const { data: byId } = await admin.from('users').select('*').eq('id', authUser.id).maybeSingle();
      if (byId) {
        return sanitizeUser(byId as UserRow);
      }

      if (userEmail) {
        const { data: byEmail } = await admin.from('users').select('*').ilike('email', userEmail).maybeSingle();
        if (byEmail) {
          return sanitizeUser(byEmail as UserRow);
        }
      }

      let username = baseUsername || `user_${Date.now()}`;
      const { data: byUname } = await admin.from('users').select('id').ilike('username', username).maybeSingle();
      if (byUname) {
        username = `${username}_${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const newUser: UserRow = {
        id: authUser.id,
        name,
        username,
        email: userEmail,
        password_hash: '',
        avatar_url: '',
        bio: '',
        gender: '',
        molecule_identity: 'default',
        molecule_smoky: 0,
        molecule_twinkling: 0,
        showcase_suggestions: JSON.stringify([]),
        created_at: now,
        updated_at: now,
      };

      await admin.from('users').upsert(newUser);
      await admin.from('privacy_settings').upsert({
        user_id: authUser.id,
        profile_visibility: 'PUBLIC',
        email_visibility: 'CONNECTIONS_ONLY',
        social_links_visibility: 'PUBLIC',
      });
      await admin.from('user_graph_versions').upsert({
        user_id: authUser.id,
        graph_version: 1,
        updated_at: now,
      });

      const sanitized = sanitizeUser(newUser);
      userCache.set(authUser.id, sanitized);
      return sanitized;
    }
  }

  return syncSupabaseUser(authUser, fallbackName, fallbackUsername);
}

export async function signup(
  name: string,
  username: string,
  email: string,
  password?: string
): Promise<{ user: SanitizedUser; token: string }> {
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!name.trim()) throw new Error('Name is required');
  if (!cleanUsername) throw new Error('Valid username is required');
  if (!email.trim() || !email.includes('@')) throw new Error('Valid email is required');

  const isProduction = Boolean(process.env.VERCEL || process.env.NODE_ENV === 'production');
  const supabaseMode = isSupabaseConfigured() && process.env.NODE_ENV !== 'test';

  // Production fail-safe: never attempt SQLite if Supabase configuration is missing in production
  if (isProduction && !supabaseMode) {
    throw new Error('Production database is not configured');
  }

  // Supabase Auth + PostgreSQL Production Mode
  if (supabaseMode) {
    const adapter = getDatabaseAdapter();
    const existingEmail = await adapter.getUserByEmail(email.trim());
    if (existingEmail) throw new Error('Email already registered');
    const existingUsername = await adapter.getUserByUsername(cleanUsername);
    if (existingUsername) throw new Error('Username already taken');

    const { authUser, session } = await supabaseSignUp(name.trim(), cleanUsername, email.trim(), password || 'password123');
    const user = await syncSupabaseUserAsync(authUser, name.trim(), cleanUsername);
    const token = session?.access_token || generateToken(user.id);
    return { user, token };
  }

  // Local SQLite Development Mode
  if (getUserByEmail(email)) throw new Error('Email already registered');
  if (getUserByUsername(cleanUsername)) throw new Error('Username already taken');

  const passwordHash = bcrypt.hashSync(password || 'password123', 10);
  const now = new Date().toISOString();
  const id = `user-${Date.now()}`;
  const avatarUrl = '';

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
    '',
    '',
    'default',
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

  const user = getUserById(id)!;
  const token = generateToken(id);
  return { user, token };
}

export async function login(
  emailOrUsername: string,
  password?: string
): Promise<{ user: SanitizedUser; token: string }> {
  const identifier = emailOrUsername.trim();
  if (!identifier) {
    throw new Error('Email or username is required');
  }

  const isProduction = Boolean(process.env.VERCEL || process.env.NODE_ENV === 'production');
  const supabaseMode = isSupabaseConfigured() && process.env.NODE_ENV !== 'test';

  // Production fail-safe: never attempt SQLite if Supabase configuration is missing in production
  if (isProduction && !supabaseMode) {
    throw new Error('Production database is not configured');
  }

  // Supabase Auth Integration (Production Mode)
  if (supabaseMode) {
    let email = identifier;
    if (!email.includes('@')) {
      const adapter = getDatabaseAdapter();
      const userByUname = await adapter.getUserByUsername(identifier);
      if (!userByUname || !userByUname.email) {
        throw new Error('Invalid credentials');
      }
      email = userByUname.email;
    }

    const { authUser, token } = await supabaseSignIn(email, password || '');
    const user = await syncSupabaseUserAsync(authUser);
    return { user, token };
  }

  // Local SQLite Development Mode
  let row = getUserByEmail(identifier);
  if (!row) {
    row = getUserByUsername(identifier);
  }
  if (!row) {
    throw new Error('User not found');
  }

  // If password provided, verify hash
  if (password && row.password_hash && !bcrypt.compareSync(password, row.password_hash)) {
    throw new Error('Invalid credentials');
  }

  const token = generateToken(row.id);
  return { user: sanitizeUser(row), token };
}
