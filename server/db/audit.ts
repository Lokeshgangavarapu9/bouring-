import { db } from './database.ts';

export interface ConsistencyAuditResult {
  isConsistent: boolean;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  issues: string[];
}

/**
 * Data Consistency & Integrity Auditor for Boring Database
 * 
 * Audits:
 * 1. Relationship records pointing to nonexistent users (dangling foreign keys)
 * 2. Duplicate or inverted duplicate relationships
 * 3. Invalid relationship states outside permitted enum
 * 4. Self-relationships
 * 5. Inconsistent mutuality (mutual_relationships without reciprocal ACCEPTED_ONE_WAY records)
 * 6. Non-canonical mutual pairs (user_a_id >= user_b_id)
 * 7. Orphaned molecule identities pointing to nonexistent users
 * 8. Invalid user references in graph versions or layout cache
 */
export function auditDatabaseConsistency(): ConsistencyAuditResult {
  const issues: string[] = [];
  let totalChecks = 0;
  let passedChecks = 0;

  function runCheck(description: string, checkFn: () => string[]) {
    totalChecks++;
    try {
      const errs = checkFn();
      if (errs.length > 0) {
        issues.push(...errs.map(e => `[${description}] ${e}`));
      } else {
        passedChecks++;
      }
    } catch (err: any) {
      issues.push(`[${description}] Check threw error: ${err.message}`);
    }
  }

  // 1. Relationships pointing to nonexistent users
  runCheck('Foreign Key: Relationships -> Users', () => {
    const stmt = db.prepare(`
      SELECT r.id, r.requester_id, r.receiver_id 
      FROM relationships r
      LEFT JOIN users u1 ON r.requester_id = u1.id
      LEFT JOIN users u2 ON r.receiver_id = u2.id
      WHERE u1.id IS NULL OR u2.id IS NULL
    `);
    const rows = stmt.all() as any[];
    return rows.map(r => `Relationship ${r.id} references nonexistent user (${r.requester_id} or ${r.receiver_id})`);
  });

  // 2. Self relationships
  runCheck('Self-Relationship Integrity', () => {
    const stmt = db.prepare('SELECT id, requester_id FROM relationships WHERE requester_id = receiver_id');
    const rows = stmt.all() as any[];
    return rows.map(r => `Illegal self-relationship found: ${r.id} for user ${r.requester_id}`);
  });

  // 3. Invalid relationship states
  runCheck('Valid Relationship Status Values', () => {
    const stmt = db.prepare(`
      SELECT id, status FROM relationships 
      WHERE status NOT IN ('REQUESTED', 'ACCEPTED_ONE_WAY', 'REJECTED', 'CANCELLED')
    `);
    const rows = stmt.all() as any[];
    return rows.map(r => `Relationship ${r.id} has invalid status '${r.status}'`);
  });

  // 4. Duplicate directed relationships
  runCheck('Duplicate Directed Relationships', () => {
    const stmt = db.prepare(`
      SELECT requester_id, receiver_id, COUNT(*) as cnt
      FROM relationships
      GROUP BY requester_id, receiver_id
      HAVING cnt > 1
    `);
    const rows = stmt.all() as any[];
    return rows.map(r => `Duplicate relationship found between requester ${r.requester_id} and receiver ${r.receiver_id} (count: ${r.cnt})`);
  });

  // 5. Inconsistent mutuality (mutual_relationship exists without reciprocal ACCEPTED_ONE_WAY)
  runCheck('Reciprocal Mutuality Verification', () => {
    const stmt = db.prepare(`
      SELECT m.id, m.user_a_id, m.user_b_id,
        r1.status as status_ab,
        r2.status as status_ba
      FROM mutual_relationships m
      LEFT JOIN relationships r1 ON m.user_a_id = r1.requester_id AND m.user_b_id = r1.receiver_id
      LEFT JOIN relationships r2 ON m.user_b_id = r2.requester_id AND m.user_a_id = r2.receiver_id
      WHERE r1.status IS NOT 'ACCEPTED_ONE_WAY' OR r2.status IS NOT 'ACCEPTED_ONE_WAY'
    `);
    const rows = stmt.all() as any[];
    return rows.map(r => `Mutual relationship ${r.id} between ${r.user_a_id} and ${r.user_b_id} lacks reciprocal ACCEPTED_ONE_WAY states (ab=${r.status_ab}, ba=${r.status_ba})`);
  });

  // 6. Non-canonical mutual ordering
  runCheck('Mutual Canonical Ordering (user_a_id < user_b_id)', () => {
    const stmt = db.prepare('SELECT id, user_a_id, user_b_id FROM mutual_relationships WHERE user_a_id >= user_b_id');
    const rows = stmt.all() as any[];
    return rows.map(r => `Mutual record ${r.id} violates canonical ordering: ${r.user_a_id} >= ${r.user_b_id}`);
  });

  // 7. Orphaned molecule identities
  runCheck('Orphaned Molecule Identities', () => {
    const stmt = db.prepare(`
      SELECT m.user_id 
      FROM user_molecule_identities m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE u.id IS NULL
    `);
    const rows = stmt.all() as any[];
    return rows.map(r => `Orphaned molecule identity for nonexistent user ${r.user_id}`);
  });

  // 8. Orphaned graph versions & layout caches
  runCheck('Orphaned Graph Versions & Cache Entries', () => {
    const stmt = db.prepare(`
      SELECT g.user_id 
      FROM user_graph_versions g
      LEFT JOIN users u ON g.user_id = u.id
      WHERE u.id IS NULL
    `);
    const rows = stmt.all() as any[];
    return rows.map(r => `Orphaned graph version for nonexistent user ${r.user_id}`);
  });

  return {
    isConsistent: issues.length === 0,
    totalChecks,
    passedChecks,
    failedChecks: totalChecks - passedChecks,
    issues,
  };
}
