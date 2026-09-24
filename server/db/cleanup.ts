import { db } from './database.ts';

export function purgeDemoData() {
  console.log('[Cleanup] Purging demo and test data from database...');
  
  // Delete mock and test users and their cascade data
  const delRel = db.prepare("DELETE FROM relationships WHERE requester_id LIKE 'user-%' OR receiver_id LIKE 'user-%'").run();
  const delMut = db.prepare("DELETE FROM mutual_relationships WHERE user_a_id LIKE 'user-%' OR user_b_id LIKE 'user-%'").run();
  const delVer = db.prepare("DELETE FROM user_graph_versions WHERE user_id LIKE 'user-%'").run();
  const delCache = db.prepare("DELETE FROM layout_cache WHERE host_user_id LIKE 'user-%'").run();
  const delPriv = db.prepare("DELETE FROM privacy_settings WHERE user_id LIKE 'user-%'").run();
  const delSoc = db.prepare("DELETE FROM social_profiles WHERE user_id LIKE 'user-%'").run();
  const delUsers = db.prepare("DELETE FROM users WHERE id LIKE 'user-%'").run();

  console.log('[Cleanup] Completed:', {
    deletedUsers: delUsers.changes,
    deletedRelationships: delRel.changes,
    deletedMutual: delMut.changes,
    deletedCache: delCache.changes,
  });

  const remaining = db.prepare('SELECT id, name, username, email FROM users').all();
  console.log('[Cleanup] Real registered users count:', remaining.length);
  console.log('[Cleanup] Real users:', remaining);
}

if (process.argv[1]?.includes('cleanup')) {
  purgeDemoData();
}
