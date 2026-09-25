import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.ts';

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
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const row = stmt.get(id) as UserRow | undefined;
  return row ? sanitizeUser(row) : null;
}

export function getUserByEmail(email: string): UserRow | null {
  const stmt = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)');
  const row = stmt.get(email) as UserRow | undefined;
  return row || null;
}

export function getUserByUsername(username: string): UserRow | null {
  const stmt = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)');
  const row = stmt.get(username) as UserRow | undefined;
  return row || null;
}

export function getAllUsers(): SanitizedUser[] {
  const stmt = db.prepare('SELECT * FROM users ORDER BY created_at ASC');
  const rows = stmt.all() as unknown as UserRow[];
  return rows.map(sanitizeUser);
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export function signup(name: string, username: string, email: string, password?: string): { user: SanitizedUser; token: string } {
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!name.trim()) throw new Error('Name is required');
  if (!cleanUsername) throw new Error('Valid username is required');
  if (!email.trim() || !email.includes('@')) throw new Error('Valid email is required');

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

export function login(emailOrUsername: string, password?: string): { user: SanitizedUser; token: string } {
  let row = getUserByEmail(emailOrUsername);
  if (!row) {
    row = getUserByUsername(emailOrUsername);
  }
  if (!row) {
    throw new Error('User not found');
  }

  // If password provided, verify hash
  if (password && !bcrypt.compareSync(password, row.password_hash)) {
    throw new Error('Invalid credentials');
  }

  const token = generateToken(row.id);
  return { user: sanitizeUser(row), token };
}
