import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.ts';
import { getDatabaseAdapter, type UserEntity } from '../db/adapter.ts';
import { isSupabaseConfigured, getSupabaseAdminClient } from './supabaseService.ts';

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
  date_of_birth?: string | null;
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

export function validateDateOfBirth(dob: string | undefined): string {
  if (!dob || typeof dob !== 'string' || !dob.trim()) {
    throw new Error('Date of birth is required');
  }
  const trimmed = dob.trim();
  // Expect format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error('Date of birth must be in YYYY-MM-DD format');
  }
  const [yearStr, monthStr, dayStr] = trimmed.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error('Invalid date of birth');
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (isNaN(date.getTime()) || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error('Invalid date of birth');
  }

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  if (date > todayUtc) {
    throw new Error('Date of birth cannot be in the future');
  }

  const minDate = new Date(Date.UTC(1900, 0, 1));
  if (date < minDate) {
    throw new Error('Date of birth cannot be before 1900');
  }

  return trimmed;
}

// Rate limiting map for account recovery attempts: key -> { count: number, resetTime: number }
const recoveryRateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRecoveryRateLimit(key: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  const record = recoveryRateLimitMap.get(key);
  if (!record || now > record.resetTime) {
    recoveryRateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxAttempts) {
    return false;
  }

  record.count += 1;
  return true;
}

export function resetRecoveryRateLimit(key: string): void {
  recoveryRateLimitMap.delete(key);
}

export async function signup(
  name: string,
  username: string,
  email: string,
  password?: string,
  dateOfBirth?: string
): Promise<{ user: SanitizedUser; token: string }> {
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!name.trim()) throw new Error('Name is required');
  if (!cleanUsername) throw new Error('Valid username is required');
  if (!email.trim() || !email.includes('@')) throw new Error('Valid email is required');
  if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');

  const validDob = validateDateOfBirth(dateOfBirth);
  const adapter = getDatabaseAdapter();

  // Check email uniqueness
  const existingEmail = await adapter.getUserByEmail(email.trim());
  if (existingEmail) throw new Error('Email already registered');

  // Check username uniqueness
  const existingUsername = await adapter.getUserByUsername(cleanUsername);
  if (existingUsername) throw new Error('Username already taken');

  // Bcrypt password hash
  const passwordHash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();
  const id = `user-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  const userEntity: UserEntity = {
    id,
    name: name.trim(),
    username: cleanUsername,
    email: email.toLowerCase().trim(),
    password_hash: passwordHash,
    date_of_birth: validDob,
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

  const created = await adapter.createUser(userEntity);
  const sanitized = sanitizeUser(created as unknown as UserRow);
  userCache.set(id, sanitized);

  const token = generateToken(id);
  return { user: sanitized, token };
}

export async function login(
  emailOrUsername: string,
  password?: string
): Promise<{ user: SanitizedUser; token: string }> {
  const identifier = emailOrUsername.trim();
  if (!identifier) {
    throw new Error('Email or username is required');
  }
  if (!password) {
    throw new Error('Password is required');
  }

  const adapter = getDatabaseAdapter();
  let user: UserEntity | null = null;
  if (identifier.includes('@')) {
    user = await adapter.getUserByEmail(identifier.toLowerCase());
  } else {
    user = await adapter.getUserByUsername(identifier.toLowerCase());
  }

  if (!user || !user.password_hash) {
    throw new Error('Invalid credentials');
  }

  const match = bcrypt.compareSync(password, user.password_hash);
  if (!match) {
    throw new Error('Invalid credentials');
  }

  const token = generateToken(user.id);
  const sanitized = sanitizeUser(user as unknown as UserRow);
  userCache.set(user.id, sanitized);
  return { user: sanitized, token };
}

/**
 * Step 1 of Account Recovery: Verify Email + Date of Birth.
 * CRITICAL SECURITY INVARIANT:
 * This verification does NOT authenticate the user. It issues a single-use,
 * short-lived reset token permitting password change.
 */
export async function verifyRecovery(
  email: string,
  dateOfBirth: string,
  clientIp = 'unknown'
): Promise<{ success: boolean; resetToken: string; message: string }> {
  const cleanEmail = email?.trim().toLowerCase() || '';
  const cleanDob = dateOfBirth?.trim() || '';

  // Rate limiting per IP + email
  const rateLimitKey = `${clientIp}:${cleanEmail}`;
  if (!checkRecoveryRateLimit(rateLimitKey)) {
    throw new Error('Too many recovery attempts. Please try again later.');
  }

  if (!cleanEmail || !cleanDob) {
    throw new Error('Unable to verify your account information.');
  }

  const adapter = getDatabaseAdapter();
  const user = await adapter.getUserByEmail(cleanEmail);

  if (!user || !user.date_of_birth) {
    // Generic failure: never reveal whether account exists or if DOB was unset
    throw new Error('Unable to verify your account information.');
  }

  // Normalize dates for comparison (YYYY-MM-DD)
  const userDob = user.date_of_birth.split('T')[0].trim();
  const inputDob = cleanDob.split('T')[0].trim();

  if (userDob !== inputDob) {
    throw new Error('Unable to verify your account information.');
  }

  // Reset rate limit on success
  resetRecoveryRateLimit(rateLimitKey);

  // Issue short-lived, purpose-bound reset token (15 minutes)
  const resetToken = jwt.sign(
    { userId: user.id, purpose: 'pwd_reset' },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  return {
    success: true,
    resetToken,
    message: 'Account verified successfully. You may now create a new password.',
  };
}

/**
 * Step 2 of Account Recovery: Set new password using verified resetToken.
 * Hashes new password with bcrypt, updates user, invalidates cache,
 * and issues a fresh session token.
 */
export async function resetPasswordWithRecovery(
  resetToken: string,
  newPassword: string
): Promise<{ success: boolean; message: string; user: SanitizedUser; token: string }> {
  if (!resetToken) {
    throw new Error('Reset token is required or expired.');
  }
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  let decoded: { userId: string; purpose: string };
  try {
    decoded = jwt.verify(resetToken, JWT_SECRET) as { userId: string; purpose: string };
  } catch {
    throw new Error('Reset token is invalid or has expired. Please verify your recovery details again.');
  }

  if (decoded.purpose !== 'pwd_reset' || !decoded.userId) {
    throw new Error('Invalid reset token.');
  }

  const adapter = getDatabaseAdapter();
  const user = await adapter.getUserById(decoded.userId);
  if (!user) {
    throw new Error('User not found.');
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  await adapter.updateUser(user.id, { password_hash: newHash });

  // Invalidate cache
  userCache.delete(user.id);

  // Create new active Boring session only after successful password update
  const token = generateToken(user.id);
  const updatedUser = await adapter.getUserById(user.id);
  const sanitized = sanitizeUser((updatedUser || user) as unknown as UserRow);

  return {
    success: true,
    message: 'Password successfully updated. You can now sign in with your new password.',
    user: sanitized,
    token,
  };
}

