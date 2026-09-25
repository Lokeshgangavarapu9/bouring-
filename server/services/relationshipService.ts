import { db, transaction } from '../db/database.ts';

export type RelationshipStatus = 'REQUESTED' | 'ACCEPTED_ONE_WAY' | 'REJECTED' | 'CANCELLED';

export interface RelationshipRow {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: RelationshipStatus;
  created_at: string;
  updated_at: string;
}

export interface MutualRelationshipRow {
  id: string;
  user_a_id: string;
  user_b_id: string;
  created_at: string;
}

/**
 * Increment graph_version for a user and invalidate affected layout caches
 */
export function bumpGraphVersion(userId: string): number {
  const now = new Date().toISOString();
  const getStmt = db.prepare('SELECT graph_version FROM user_graph_versions WHERE user_id = ?');
  const row = getStmt.get(userId) as { graph_version: number } | undefined;

  let newVersion = 1;
  if (row) {
    newVersion = row.graph_version + 1;
    const updateStmt = db.prepare('UPDATE user_graph_versions SET graph_version = ?, updated_at = ? WHERE user_id = ?');
    updateStmt.run(newVersion, now, userId);
  } else {
    const insertStmt = db.prepare('INSERT INTO user_graph_versions (user_id, graph_version, updated_at) VALUES (?, 1, ?)');
    insertStmt.run(userId, now);
  }

  // Invalidate any cached layouts for this user
  const delCache = db.prepare('DELETE FROM layout_cache WHERE host_user_id = ?');
  delCache.run(userId);

  return newVersion;
}

/**
 * Check if two users are currently mutual
 */
export function isMutual(userA: string, userB: string): boolean {
  const [minId, maxId] = userA < userB ? [userA, userB] : [userB, userA];
  const stmt = db.prepare('SELECT id FROM mutual_relationships WHERE user_a_id = ? AND user_b_id = ?');
  const row = stmt.get(minId, maxId);
  return Boolean(row);
}

/**
 * Deterministically verify that mutual relationship is backed by reciprocal ACCEPTED_ONE_WAY records
 */
export function isMutualVerified(userA: string, userB: string): boolean {
  if (!isMutual(userA, userB)) return false;
  const rel1 = getDirectedRelationship(userA, userB);
  const rel2 = getDirectedRelationship(userB, userA);
  return Boolean(rel1 && rel1.status === 'ACCEPTED_ONE_WAY' && rel2 && rel2.status === 'ACCEPTED_ONE_WAY');
}

/**
 * Get all mutual partner IDs for a given user
 */
export function getMutualPartnerIds(userId: string): string[] {
  const stmt = db.prepare(`
    SELECT CASE WHEN user_a_id = ? THEN user_b_id ELSE user_a_id END as partner_id
    FROM mutual_relationships
    WHERE user_a_id = ? OR user_b_id = ?
  `);
  const rows = stmt.all(userId, userId, userId) as unknown as { partner_id: string }[];
  return rows.map(r => r.partner_id);
}

/**
 * Get directed relationship from requester to receiver
 */
export function getDirectedRelationship(requesterId: string, receiverId: string): RelationshipRow | null {
  const stmt = db.prepare('SELECT * FROM relationships WHERE requester_id = ? AND receiver_id = ?');
  const row = stmt.get(requesterId, receiverId) as RelationshipRow | undefined;
  return row || null;
}

/**
 * Get all relationships (in either direction) involving userId
 */
export function getUserRelationships(userId: string): RelationshipRow[] {
  const stmt = db.prepare(`
    SELECT * FROM relationships
    WHERE requester_id = ? OR receiver_id = ?
    ORDER BY created_at DESC
  `);
  return stmt.all(userId, userId) as unknown as RelationshipRow[];
}

/**
 * Step 1: User A sends connection/follow request to User B
 */
export function sendRequest(requesterId: string, receiverId: string): RelationshipRow {
  if (requesterId === receiverId) {
    throw new Error('Self-relationships are strictly prohibited');
  }

  // Check if users exist
  const userCheck = db.prepare('SELECT id FROM users WHERE id IN (?, ?)');
  const foundUsers = userCheck.all(requesterId, receiverId) as unknown as { id: string }[];
  if (foundUsers.length < 2) {
    throw new Error('One or both users do not exist');
  }

  return transaction(() => {
    const existing = getDirectedRelationship(requesterId, receiverId);
    const now = new Date().toISOString();

    if (existing) {
      if (existing.status === 'REQUESTED') {
        throw new Error('A connection request is already pending');
      }
      if (existing.status === 'ACCEPTED_ONE_WAY') {
        throw new Error('Relationship is already accepted in this direction');
      }
      // If previous request was REJECTED or CANCELLED, allow re-requesting
      const updateStmt = db.prepare(`
        UPDATE relationships
        SET status = 'REQUESTED', updated_at = ?
        WHERE id = ?
      `);
      updateStmt.run(now, existing.id);
      return { ...existing, status: 'REQUESTED' as const, updated_at: now };
    }

    const id = `rel-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const insertStmt = db.prepare(`
      INSERT INTO relationships (id, requester_id, receiver_id, status, created_at, updated_at)
      VALUES (?, ?, ?, 'REQUESTED', ?, ?)
    `);
    insertStmt.run(id, requesterId, receiverId, now, now);

    return {
      id,
      requester_id: requesterId,
      receiver_id: receiverId,
      status: 'REQUESTED',
      created_at: now,
      updated_at: now,
    };
  });
}

/**
 * Step 2: User B accepts User A's request
 * IMPORTANT CONTRACT RULE:
 * Acceptance alone transitions to ACCEPTED_ONE_WAY.
 * Acceptance alone DOES NOT create mutuality and DOES NOT create a 3D bond.
 */
export function acceptRequest(relationshipId: string, currentUserId: string): RelationshipRow {
  return transaction(() => {
    const stmt = db.prepare('SELECT * FROM relationships WHERE id = ?');
    const rel = stmt.get(relationshipId) as RelationshipRow | undefined;

    if (!rel) {
      throw new Error('Relationship request not found');
    }

    if (rel.receiver_id !== currentUserId) {
      throw new Error('Not authorized to accept this request');
    }

    if (rel.status !== 'REQUESTED') {
      throw new Error(`Cannot accept request in status ${rel.status}`);
    }

    const now = new Date().toISOString();
    const updateStmt = db.prepare(`
      UPDATE relationships
      SET status = 'ACCEPTED_ONE_WAY', accepted_at = ?, updated_at = ?
      WHERE id = ?
    `);
    updateStmt.run(now, now, rel.id);

    return {
      ...rel,
      status: 'ACCEPTED_ONE_WAY',
      updated_at: now,
    };
  });
}

/**
 * Reject a pending incoming request
 */
export function rejectRequest(relationshipId: string, currentUserId: string): RelationshipRow {
  return transaction(() => {
    const stmt = db.prepare('SELECT * FROM relationships WHERE id = ?');
    const rel = stmt.get(relationshipId) as RelationshipRow | undefined;

    if (!rel) throw new Error('Relationship request not found');
    if (rel.receiver_id !== currentUserId) throw new Error('Not authorized to reject this request');
    if (rel.status !== 'REQUESTED') throw new Error(`Cannot reject request in status ${rel.status}`);

    const now = new Date().toISOString();
    db.prepare("UPDATE relationships SET status = 'REJECTED', updated_at = ? WHERE id = ?").run(now, rel.id);

    return { ...rel, status: 'REJECTED', updated_at: now };
  });
}

/**
 * Cancel a pending outgoing request
 */
export function cancelRequest(relationshipId: string, currentUserId: string): RelationshipRow {
  return transaction(() => {
    const stmt = db.prepare('SELECT * FROM relationships WHERE id = ?');
    const rel = stmt.get(relationshipId) as RelationshipRow | undefined;

    if (!rel) throw new Error('Relationship request not found');
    if (rel.requester_id !== currentUserId) throw new Error('Not authorized to cancel this request');
    if (rel.status !== 'REQUESTED') throw new Error(`Cannot cancel request in status ${rel.status}`);

    const now = new Date().toISOString();
    db.prepare("UPDATE relationships SET status = 'CANCELLED', cancelled_at = ?, updated_at = ? WHERE id = ?").run(now, now, rel.id);

    return { ...rel, status: 'CANCELLED', updated_at: now };
  });
}

/**
 * Step 3: User B "Connects Back" to User A
 * CONTRACT RULE:
 * 1. Requires incoming A -> B to be ACCEPTED_ONE_WAY.
 * 2. Creates or sets B -> A to ACCEPTED_ONE_WAY.
 * 3. Detects reciprocal acceptance (A <-> B).
 * 4. Materializes canonical mutual_relationships record.
 * 5. Bumps graph_version and invalidates layout cache for both users.
 * 6. Creates the molecular 3D bond.
 */
export function connectBack(currentUserId: string, targetUserId: string): {
  mutual: boolean;
  reverseRelationship: RelationshipRow;
  mutualId: string;
} {
  if (currentUserId === targetUserId) {
    throw new Error('Self-connect is prohibited');
  }

  return transaction(() => {
    // 1. Verify original direction: targetUserId -> currentUserId must be ACCEPTED_ONE_WAY
    const originalRel = getDirectedRelationship(targetUserId, currentUserId);
    if (!originalRel || originalRel.status !== 'ACCEPTED_ONE_WAY') {
      throw new Error('Connect Back requires an accepted incoming connection from target user');
    }

    const now = new Date().toISOString();

    // 2. Create or activate reverse relationship: currentUserId -> targetUserId
    let reverseRel = getDirectedRelationship(currentUserId, targetUserId);
    if (!reverseRel) {
      const newId = `rel-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      db.prepare(`
        INSERT INTO relationships (id, requester_id, receiver_id, status, accepted_at, mutual_at, created_at, updated_at)
        VALUES (?, ?, ?, 'ACCEPTED_ONE_WAY', ?, ?, ?, ?)
      `).run(newId, currentUserId, targetUserId, now, now, now, now);

      reverseRel = {
        id: newId,
        requester_id: currentUserId,
        receiver_id: targetUserId,
        status: 'ACCEPTED_ONE_WAY',
        created_at: now,
        updated_at: now,
      };
    } else {
      db.prepare(`
        UPDATE relationships
        SET status = 'ACCEPTED_ONE_WAY', mutual_at = ?, updated_at = ?
        WHERE id = ?
      `).run(now, now, reverseRel.id);
      reverseRel.status = 'ACCEPTED_ONE_WAY';
      reverseRel.updated_at = now;
    }

    // Also update original relationship mutual_at timestamp
    db.prepare('UPDATE relationships SET mutual_at = ?, updated_at = ? WHERE id = ?').run(now, now, originalRel.id);

    // 3. Mutual detection & canonical insertion
    const [minId, maxId] = currentUserId < targetUserId ? [currentUserId, targetUserId] : [targetUserId, currentUserId];
    const existingMutual = db.prepare('SELECT id FROM mutual_relationships WHERE user_a_id = ? AND user_b_id = ?').get(minId, maxId) as { id: string } | undefined;

    let mutualId = existingMutual ? existingMutual.id : '';
    if (!existingMutual) {
      mutualId = `mutual-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      db.prepare(`
        INSERT INTO mutual_relationships (id, user_a_id, user_b_id, created_at)
        VALUES (?, ?, ?, ?)
      `).run(mutualId, minId, maxId, now);

      // 4. Invalidate and bump versions for both users
      bumpGraphVersion(currentUserId);
      bumpGraphVersion(targetUserId);
    }

    return {
      mutual: true,
      reverseRelationship: reverseRel,
      mutualId,
    };
  });
}

/**
 * Step 4: Disconnect / Remove relationship
 * Removes one direction. Mutual tie is broken, bond is removed, caches invalidated.
 */
export function disconnect(currentUserId: string, targetUserId: string): { mutualBroken: boolean } {
  return transaction(() => {
    // 1. Mark directed relationship cancelled/deleted
    const relOut = getDirectedRelationship(currentUserId, targetUserId);
    const now = new Date().toISOString();

    if (relOut) {
      db.prepare("UPDATE relationships SET status = 'CANCELLED', disconnected_at = ?, updated_at = ? WHERE id = ?").run(now, now, relOut.id);
    }

    // 2. Remove from mutual_relationships if present
    const [minId, maxId] = currentUserId < targetUserId ? [currentUserId, targetUserId] : [targetUserId, currentUserId];
    const delMutual = db.prepare('DELETE FROM mutual_relationships WHERE user_a_id = ? AND user_b_id = ?');
    const res = delMutual.run(minId, maxId);

    const mutualBroken = res.changes > 0;
    if (mutualBroken) {
      bumpGraphVersion(currentUserId);
      bumpGraphVersion(targetUserId);
    }

    return { mutualBroken };
  });
}
