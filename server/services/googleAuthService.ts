/**
 * Google Authentication Service
 * Implements OpenID Connect / OAuth 2.0 verification and account linking with the Boring user architecture.
 *
 * Architecture:
 * Google Identity -> external_identities -> Boring User -> Boring JWT Session
 *
 * Security:
 * - Secrets stay strictly on the backend.
 * - Frontend claims are NEVER trusted without cryptographic token validation.
 * - Missing Google OAuth credentials fail gracefully with clear configuration guidance.
 */

import { db, transaction } from '../db/database.ts';
import {
  getUserByEmail,
  getUserById,
  getUserByUsername,
  generateToken,
  type SanitizedUser,
  sanitizeUser,
  type UserRow,
} from './authService.ts';

export interface GoogleUserInfo {
  googleId: string; // Google subject ID ('sub')
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
}

export interface ExternalIdentityRow {
  id: string;
  user_id: string;
  provider: string;
  provider_user_id: string;
  provider_email: string | null;
  created_at: string;
}

export function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback';

  return {
    clientId,
    clientSecret,
    redirectUri,
    configured: Boolean(clientId && clientSecret),
  };
}

/**
 * Returns whether Google OAuth is configured in the environment.
 */
export function isGoogleAuthConfigured(): boolean {
  return getGoogleConfig().configured;
}

/**
 * Generates the Google OAuth 2.0 authorization URL for client redirection.
 */
export function getGoogleAuthUrl(customRedirectUri?: string, state?: string): string {
  const config = getGoogleConfig();
  if (!config.configured) {
    throw new Error('Google OAuth is not configured on this server. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
  }

  const redirectUri = customRedirectUri || config.redirectUri;
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    ...(state ? { state } : {}),
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Validates a Google ID token with Google's tokeninfo API.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleUserInfo> {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Google ID token is required');
  }

  const config = getGoogleConfig();

  // Validate with Google OAuth2 tokeninfo endpoint
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google token validation failed (${res.status}): ${errText}`);
  }

  const payload = (await res.json()) as any;

  if (!payload.sub || !payload.email) {
    throw new Error('Google token did not contain valid identity claims');
  }

  // If client ID is configured, verify audience match
  if (config.clientId && payload.aud && payload.aud !== config.clientId) {
    throw new Error('Google token audience does not match configured GOOGLE_CLIENT_ID');
  }

  const emailVerified = payload.email_verified === 'true' || payload.email_verified === true;
  if (!emailVerified) {
    throw new Error('Google email address must be verified by Google to authenticate');
  }

  return {
    googleId: payload.sub,
    email: String(payload.email).toLowerCase().trim(),
    emailVerified: true,
    name: payload.name || payload.given_name || payload.email.split('@')[0],
    picture: payload.picture || '',
  };
}

/**
 * Exchanges authorization code for Google user information.
 */
export async function exchangeGoogleCode(code: string, customRedirectUri?: string): Promise<GoogleUserInfo> {
  const config = getGoogleConfig();
  if (!config.configured) {
    throw new Error('Google OAuth is not configured on this server. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
  }

  const redirectUri = customRedirectUri || config.redirectUri;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });

  if (!res.ok) {
    const errData = await res.text();
    throw new Error(`Google code exchange failed (${res.status}): ${errData}`);
  }

  const tokens = (await res.json()) as any;
  if (!tokens.id_token) {
    throw new Error('Google did not return an id_token in token response');
  }

  return verifyGoogleIdToken(tokens.id_token);
}

/**
 * Core Google Account Linking & User Mapping logic.
 *
 * Rules:
 * 1. If Google subject ID exists in external_identities -> Sign into existing Boring user.
 * 2. If Google email matches existing Boring user with verified email -> Link Google identity safely to existing account & sign in.
 * 3. If Google user is new -> Create Boring user + external_identities entry & sign in.
 */
export function handleGoogleUserIdentity(info: GoogleUserInfo): { user: SanitizedUser; token: string; isNewUser: boolean } {
  const cleanEmail = info.email.toLowerCase().trim();
  const now = new Date().toISOString();

  return transaction(() => {
    // 1. Check for existing external identity by provider + provider_user_id
    const identityStmt = db.prepare(`
      SELECT * FROM external_identities
      WHERE provider = 'google' AND provider_user_id = ?
    `);
    const existingIdentity = identityStmt.get(info.googleId) as ExternalIdentityRow | undefined;

    if (existingIdentity) {
      const user = getUserById(existingIdentity.user_id);
      if (user) {
        const token = generateToken(user.id);
        return { user, token, isNewUser: false };
      }
    }

    // 2. Check for existing Boring user by verified email (Safe Account Linking)
    const existingUserRow = getUserByEmail(cleanEmail);
    if (existingUserRow) {
      // Safe link Google provider identity to existing user account
      const extId = `ext-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      db.prepare(`
        INSERT INTO external_identities (id, user_id, provider, provider_user_id, provider_email, created_at)
        VALUES (?, ?, 'google', ?, ?, ?)
        ON CONFLICT(provider, provider_user_id) DO UPDATE SET
          user_id = excluded.user_id,
          provider_email = excluded.provider_email
      `).run(extId, existingUserRow.id, info.googleId, cleanEmail, now);

      const user = sanitizeUser(existingUserRow);
      const token = generateToken(user.id);
      return { user, token, isNewUser: false };
    }

    // 3. Create new Boring user for this Google account
    const baseUsername = cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || 'user';
    let uniqueUsername = baseUsername;
    let counter = 1;
    while (getUserByUsername(uniqueUsername)) {
      uniqueUsername = `${baseUsername}${counter}`;
      counter++;
    }

    const userId = `user-${Date.now()}`;
    const avatarUrl = info.picture || '';

    // Insert user into users table
    db.prepare(`
      INSERT INTO users (
        id, name, username, email, password_hash, avatar_url, bio, gender,
        molecule_identity, molecule_smoky, molecule_twinkling, showcase_suggestions,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      info.name || uniqueUsername,
      uniqueUsername,
      cleanEmail,
      'oauth_google_no_password',
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

    // Default privacy settings
    db.prepare(`
      INSERT INTO privacy_settings (user_id, profile_visibility, email_visibility, social_links_visibility)
      VALUES (?, 'PUBLIC', 'CONNECTIONS_ONLY', 'PUBLIC')
    `).run(userId);

    // Initial graph version
    db.prepare(`
      INSERT INTO user_graph_versions (user_id, graph_version, updated_at)
      VALUES (?, 1, ?)
    `).run(userId, now);

    // Link external identity
    const extId = `ext-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    db.prepare(`
      INSERT INTO external_identities (id, user_id, provider, provider_user_id, provider_email, created_at)
      VALUES (?, ?, 'google', ?, ?, ?)
    `).run(extId, userId, info.googleId, cleanEmail, now);

    const newUser = getUserById(userId)!;
    const token = generateToken(userId);
    return { user: newUser, token, isNewUser: true };
  });
}
