import { db, transaction } from '../db/database.ts';
import { isMutual } from './relationshipService.ts';
import { getUserById, SanitizedUser } from './authService.ts';

export interface PrivacySettingsRow {
  user_id: string;
  profile_visibility: 'PUBLIC' | 'CONNECTIONS_ONLY';
  email_visibility: 'PUBLIC' | 'CONNECTIONS_ONLY';
  social_links_visibility: 'PUBLIC' | 'CONNECTIONS_ONLY';
}

export interface SocialProfileRow {
  id: string;
  user_id: string;
  platform: string;
  profile_url: string;
  display_username: string;
  created_at: string;
}

export interface AuthorizedSocialProfileResponse {
  user: Partial<SanitizedUser>;
  isSelf: boolean;
  isMutual: boolean;
  canViewConnectedSection: boolean;
  socialProfiles: SocialProfileRow[];
  email?: string;
  privacy: PrivacySettingsRow;
}

export function getPrivacySettings(userId: string): PrivacySettingsRow {
  const stmt = db.prepare('SELECT * FROM privacy_settings WHERE user_id = ?');
  const row = stmt.get(userId) as PrivacySettingsRow | undefined;
  return row || {
    user_id: userId,
    profile_visibility: 'PUBLIC',
    email_visibility: 'CONNECTIONS_ONLY',
    social_links_visibility: 'PUBLIC',
  };
}

export function getUserSocialProfiles(userId: string): SocialProfileRow[] {
  const stmt = db.prepare('SELECT * FROM social_profiles WHERE user_id = ? ORDER BY created_at ASC');
  return stmt.all(userId) as SocialProfileRow[];
}

/**
 * Server-side authorized profile access
 * Strictly gates connected sections unless mutual relationship exists or viewer is self.
 */
export function getAuthorizedSocialProfile(
  viewerUserId: string | null,
  targetUserId: string
): AuthorizedSocialProfileResponse {
  const targetUser = getUserById(targetUserId);
  if (!targetUser) {
    throw new Error('User not found');
  }

  const isSelf = viewerUserId === targetUserId;
  const mutual = viewerUserId ? isMutual(viewerUserId, targetUserId) : false;
  const privacy = getPrivacySettings(targetUserId);

  // Connected profile access condition: viewer is self OR viewer is MUTUAL
  const canViewConnectedSection = isSelf || mutual;

  const allSocials = getUserSocialProfiles(targetUserId);

  // If socialLinksVisibility is CONNECTIONS_ONLY and not mutual, hide them
  let visibleSocials: SocialProfileRow[] = allSocials;
  if (!canViewConnectedSection && privacy.social_links_visibility === 'CONNECTIONS_ONLY') {
    visibleSocials = [];
  }

  // Filter email
  let visibleEmail: string | undefined = undefined;
  if (isSelf) {
    visibleEmail = targetUser.email;
  } else if (privacy.email_visibility === 'PUBLIC') {
    visibleEmail = targetUser.email;
  } else if (privacy.email_visibility === 'CONNECTIONS_ONLY' && canViewConnectedSection) {
    visibleEmail = targetUser.email;
  }

  // Sanitized view
  const userSummary: Partial<SanitizedUser> = {
    id: targetUser.id,
    name: targetUser.name,
    username: targetUser.username,
    avatar_url: targetUser.avatar_url,
    moleculeIdentity: targetUser.moleculeIdentity,
    moleculeSmoky: targetUser.moleculeSmoky,
    moleculeTwinkling: targetUser.moleculeTwinkling,
    created_at: targetUser.created_at,
  };

  if (canViewConnectedSection || privacy.profile_visibility === 'PUBLIC') {
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
    privacy,
  };
}

export function updateProfile(
  userId: string,
  data: {
    name?: string;
    bio?: string;
    gender?: string;
    avatar_url?: string;
    moleculeIdentity?: string;
    moleculeSmoky?: boolean;
    moleculeTwinkling?: boolean;
    showcase_suggestions?: string[];
  }
): SanitizedUser {
  return transaction(() => {
    const user = getUserById(userId);
    if (!user) throw new Error('User not found');

    const now = new Date().toISOString();
    const name = data.name !== undefined ? data.name : user.name;
    const bio = data.bio !== undefined ? data.bio : user.bio;
    const gender = data.gender !== undefined ? data.gender : user.gender;
    const avatar_url = data.avatar_url !== undefined ? data.avatar_url : user.avatar_url;
    const molecule_identity = data.moleculeIdentity !== undefined ? data.moleculeIdentity : user.moleculeIdentity;
    const molecule_smoky = data.moleculeSmoky !== undefined ? (data.moleculeSmoky ? 1 : 0) : (user.moleculeSmoky ? 1 : 0);
    const molecule_twinkling = data.moleculeTwinkling !== undefined ? (data.moleculeTwinkling ? 1 : 0) : (user.moleculeTwinkling ? 1 : 0);
    const showcase = data.showcase_suggestions !== undefined ? JSON.stringify(data.showcase_suggestions) : JSON.stringify(user.showcase_suggestions);

    const stmt = db.prepare(`
      UPDATE users
      SET name = ?, bio = ?, gender = ?, avatar_url = ?, molecule_identity = ?,
          molecule_smoky = ?, molecule_twinkling = ?, showcase_suggestions = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(name, bio, gender, avatar_url, molecule_identity, molecule_smoky, molecule_twinkling, showcase, now, userId);

    return getUserById(userId)!;
  });
}

export function updatePrivacySettings(
  userId: string,
  settings: Partial<Omit<PrivacySettingsRow, 'user_id'>>
): PrivacySettingsRow {
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

export function addSocialProfile(
  userId: string,
  platform: string,
  profileUrl: string,
  displayUsername: string
): SocialProfileRow {
  const id = `sp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO social_profiles (id, user_id, platform, profile_url, display_username, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, platform, profileUrl, displayUsername, now);

  return { id, user_id: userId, platform, profile_url: profileUrl, display_username: displayUsername, created_at: now };
}

export function removeSocialProfile(userId: string, profileId: string): boolean {
  const stmt = db.prepare('DELETE FROM social_profiles WHERE id = ? AND user_id = ?');
  const res = stmt.run(profileId, userId);
  return res.changes > 0;
}
