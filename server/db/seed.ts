import bcrypt from 'bcryptjs';
import { db, transaction } from './database.ts';

export function seedDatabase() {
  const userCountStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const row = userCountStmt.get() as { count: number };

  if (row && row.count > 0) {
    return; // Database already seeded
  }

  const passwordHash = bcrypt.hashSync('password123', 10);
  const now = new Date().toISOString();

  transaction(() => {
    // 1. Insert Seed Users
    const insertUser = db.prepare(`
      INSERT INTO users (
        id, name, username, email, password_hash, avatar_url, bio, gender,
        molecule_identity, molecule_smoky, molecule_twinkling, showcase_suggestions,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertPrivacy = db.prepare(`
      INSERT INTO privacy_settings (user_id, profile_visibility, email_visibility, social_links_visibility)
      VALUES (?, ?, ?, ?)
    `);

    const insertVersion = db.prepare(`
      INSERT INTO user_graph_versions (user_id, graph_version, updated_at)
      VALUES (?, 1, ?)
    `);

    const users = [
      {
        id: 'user-1',
        name: 'Alex Vance',
        username: 'alexv',
        email: 'alex@example.com',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        bio: 'Computational systems designer exploring high-dimensional network topologies & human interfaces.',
        molecule_identity: 'aquarius',
        molecule_smoky: 1,
        molecule_twinkling: 0,
      },
      {
        id: 'user-2',
        name: 'Maya Chen',
        username: 'mayac',
        email: 'maya@example.com',
        avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        bio: 'Graph theorist and spatial audio researcher. Focused on interactive generative structures.',
        molecule_identity: 'pisces',
        molecule_smoky: 0,
        molecule_twinkling: 1,
      },
      {
        id: 'user-3',
        name: 'Arjun Mehta',
        username: 'arjunm',
        email: 'arjun@example.com',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        bio: 'Software architect studying self-organizing clusters and distributed consensus dynamics.',
        molecule_identity: 'leo',
        molecule_smoky: 0,
        molecule_twinkling: 0,
      },
      {
        id: 'user-4',
        name: 'Sophia Laurent',
        username: 'sophial',
        email: 'sophia@example.com',
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        bio: 'Visual artist and creative technologist bridging physical architecture with kinetic 3D web art.',
        molecule_identity: 'libra',
        molecule_smoky: 0,
        molecule_twinkling: 0,
      },
      {
        id: 'user-5',
        name: 'Daniel Kim',
        username: 'danielk',
        email: 'daniel@example.com',
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        bio: 'Data visualization engineer researching force-directed spatial layouts and aesthetic legibility.',
        molecule_identity: 'aries',
        molecule_smoky: 0,
        molecule_twinkling: 0,
      },
      {
        id: 'user-6',
        name: 'Emma Watson-Reid',
        username: 'emmar',
        email: 'emma@example.com',
        avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
        bio: 'Cognitive scientist studying how humans perceive organic network structures in spatial computing.',
        molecule_identity: 'cancer',
        molecule_smoky: 0,
        molecule_twinkling: 0,
      },
      {
        id: 'user-7',
        name: "Ryan O'Connor",
        username: 'ryano',
        email: 'ryan@example.com',
        avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
        bio: 'Interactive graphics programmer interested in WebGL shaders, crystal materials, and physical metaphors.',
        molecule_identity: 'scorpio',
        molecule_smoky: 0,
        molecule_twinkling: 0,
      },
      {
        id: 'user-8',
        name: 'Ava Morales',
        username: 'avam',
        email: 'ava@example.com',
        avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        bio: 'Product designer focusing on quiet interfaces, calm software, and restrained typography.',
        molecule_identity: 'gemini',
        molecule_smoky: 0,
        molecule_twinkling: 0,
      },
    ];

    for (const u of users) {
      insertUser.run(
        u.id,
        u.name,
        u.username,
        u.email,
        passwordHash,
        u.avatar_url,
        u.bio,
        '',
        u.molecule_identity,
        u.molecule_smoky,
        u.molecule_twinkling,
        JSON.stringify(['Spatial Graph Theory', 'Aesthetic Computing']),
        now,
        now
      );
      insertPrivacy.run(u.id, 'PUBLIC', 'CONNECTIONS_ONLY', 'PUBLIC');
      insertVersion.run(u.id, now);
    }

    // 2. Insert Social Profiles
    const insertSocial = db.prepare(`
      INSERT INTO social_profiles (id, user_id, platform, profile_url, display_username, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const socials = [
      { id: 'sp-1', user_id: 'user-1', platform: 'github', url: 'https://github.com/alexvance', handle: 'alexv-dev' },
      { id: 'sp-2', user_id: 'user-1', platform: 'linkedin', url: 'https://linkedin.com/in/alexvance', handle: 'linkedin.com/in/alexvance' },
      { id: 'sp-3', user_id: 'user-1', platform: 'instagram', url: 'https://instagram.com/alexvance', handle: '@alexvance' },
      { id: 'sp-4', user_id: 'user-1', platform: 'youtube', url: 'https://youtube.com/@alexvance-spatial', handle: '@alexvance-spatial' },
      { id: 'sp-5', user_id: 'user-2', platform: 'scholar', url: 'https://scholar.google.com/example', handle: 'm.chen-research' },
      { id: 'sp-6', user_id: 'user-3', platform: 'github', url: 'https://github.com/example/arjun', handle: 'arjun-mehta' },
      { id: 'sp-7', user_id: 'user-4', platform: 'website', url: 'https://sophialaurent.example', handle: 'sophia-studio' },
    ];

    for (const s of socials) {
      insertSocial.run(s.id, s.user_id, s.platform, s.url, s.handle, now);
    }

    // 3. Insert Relationships
    const insertRel = db.prepare(`
      INSERT INTO relationships (id, requester_id, receiver_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertMutual = db.prepare(`
      INSERT INTO mutual_relationships (id, user_a_id, user_b_id, created_at)
      VALUES (?, ?, ?, ?)
    `);

    // Helper to add mutual (bidirectional ACCEPTED_ONE_WAY)
    let relIndex = 1;
    let mutualIndex = 1;
    const addMutual = (u1: string, u2: string) => {
      insertRel.run(`rel-${relIndex++}`, u1, u2, 'ACCEPTED_ONE_WAY', now, now);
      insertRel.run(`rel-${relIndex++}`, u2, u1, 'ACCEPTED_ONE_WAY', now, now);
      const [userA, userB] = u1 < u2 ? [u1, u2] : [u2, u1];
      insertMutual.run(`mutual-${mutualIndex++}`, userA, userB, now);
    };

    // Mutual cluster: Triangle user-1 <-> user-2 <-> user-3
    addMutual('user-1', 'user-2');
    addMutual('user-1', 'user-3');
    addMutual('user-2', 'user-3');

    // Additional branches
    addMutual('user-2', 'user-4');
    addMutual('user-3', 'user-5');

    // 4. One-way relationships
    // User-6 sent a request to User-1 (PENDING/REQUESTED) -> incoming to User-1
    insertRel.run(`rel-${relIndex++}`, 'user-6', 'user-1', 'REQUESTED', now, now);

    // User-1 sent a request to User-7 (PENDING/REQUESTED) -> sent by User-1
    insertRel.run(`rel-${relIndex++}`, 'user-1', 'user-7', 'REQUESTED', now, now);

    // User-1 -> User-8: User 1 requested User 8, User 8 accepted, but has NOT connected back yet!
    // So status is ACCEPTED_ONE_WAY, but NOT mutual!
    insertRel.run(`rel-${relIndex++}`, 'user-1', 'user-8', 'ACCEPTED_ONE_WAY', now, now);
  });
}
