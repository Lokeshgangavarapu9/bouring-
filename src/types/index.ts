import type { MoleculeIdentityId } from './moleculeIdentity';

export * from './moleculeIdentity';
export type ConnectionStatus =
  | 'PENDING'
  | 'REQUESTED'
  | 'ACCEPTED_ONE_WAY'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED';

export interface MutualRelationship {
  id: string;
  user_a_id: string;
  user_b_id: string;
  created_at: string;
}

export type VisibilityLevel = 'PUBLIC' | 'CONNECTIONS_ONLY';

export interface PrivacySettings {
  profileVisibility: VisibilityLevel;
  emailVisibility: VisibilityLevel;
  socialLinksVisibility: VisibilityLevel;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar_url: string;
  bio: string;
  created_at: string;
  privacy_settings?: PrivacySettings;
  /**
   * Personal molecule identity for this user.
   * Controls how THIS USER'S NODE appears in all 3D social graphs.
   * Stored per-user. The currently-logged-in user's node is displayed larger (1.75x).
   */
  moleculeIdentity?: MoleculeIdentityId;
  moleculeSmoky?: boolean;
  moleculeTwinkling?: boolean;
  gender?: string;
  showcase_suggestions?: string[];
}

export interface SocialProfile {
  id: string;
  user_id: string;
  platform: 'github' | 'x' | 'linkedin' | 'website' | 'scholar' | 'instagram' | 'youtube' | 'facebook' | 'other';
  profile_url: string;
  display_username: string;
}

export interface Connection {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: ConnectionStatus;
  created_at: string;
  updated_at: string;
}

export interface GraphNode3D {
  id: string;
  user: User;
  position: [number, number, number];
  color?: string;
  size?: number;
  isSelected?: boolean;
  isNeighbor?: boolean;
}

export interface GraphBond3D {
  id: string;
  sourceId: string;
  targetId: string;
  sourcePos: [number, number, number];
  targetPos: [number, number, number];
  connection: Connection;
  isHighlighted?: boolean;
}
