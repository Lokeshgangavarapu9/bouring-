# Boring Database & Social Graph Foundation Architecture

This document defines the authoritative database architecture, domain models, state machines, and graph pipeline for the **Boring** social graph foundation.

---

## 1. Architectural Principle: Database as Single Source of Truth

```
DATABASE (SQLite / node:sqlite)
        ↓
BACKEND DOMAIN MODEL
        ↓
RELATIONSHIP ENGINE (State Machine & Reciprocal Verification)
        ↓
MUTUAL GRAPH (Strictly Mutual Reciprocal Connections)
        ↓
GRAPH METRICS (Deterministic Calculation)
        ↓
CANONICAL GRAPH TOPOLOGY
        ↓
GRAPH VERSION (Cryptographic Content Hash)
        ↓
GRAPH SNAPSHOT
        ↓
AI-SAFE GRAPH SUMMARY (Guaranteed PII-Free)
        ↓
[STOP - AI NEVER MODIFIES DATABASE STATE]
```

**Key Invariant**: The database is the sole authoritative source of truth. Artificial Intelligence agents never dictate relationships, infer mutuality, or directly mutate the database.

---

## 2. Technology Stack & Database Connection

- **Provider**: Node.js built-in `node:sqlite` (`DatabaseSync` API).
- **Physical Storage**: `server/data/boring.db` (overrideable via `process.env.DATABASE_PATH`).
- **Pragmas**:
  - `PRAGMA foreign_keys = ON;` (Cascading referential integrity enforced by the SQLite engine)
  - `PRAGMA journal_mode = WAL;` (Write-Ahead Logging for high concurrency and crash resilience)
  - `PRAGMA synchronous = NORMAL;` (Optimal durability with minimal disk write stalls)
- **Transaction Safety**: All multi-step mutations are wrapped in atomic `BEGIN IMMEDIATE ... COMMIT / ROLLBACK` transaction wrappers via `transaction<T>()`.

---

## 3. Schema Entities & Fields

### A. `users`
Authoritative identity and profile storage.
- `id` (TEXT, PK): Unique stable user identifier (e.g. `user-1`).
- `name` (TEXT): Display name.
- `username` (TEXT, UNIQUE): Unique handle.
- `email` (TEXT, UNIQUE): Account email for login and notifications.
- `password_hash` (TEXT): Salted bcrypt hash (salt rounds = 10). Passwords are never plaintext.
- `avatar_url` (TEXT): Public avatar picture URL.
- `bio` (TEXT): Profile biography.
- `gender` (TEXT): Gender identity.
- `molecule_identity` (TEXT): Selected visual molecule motif (e.g. `Neptune`, `Aurora`, `Solar`, `Gemini`).
- `molecule_smoky` (INTEGER): Visual effect toggle (0 or 1).
- `molecule_twinkling` (INTEGER): Visual effect toggle (0 or 1).
- `showcase_suggestions` (TEXT): JSON array of personal highlight strings.
- `created_at` (TEXT): ISO 8601 creation timestamp.
- `updated_at` (TEXT): ISO 8601 update timestamp.

### B. `user_molecule_identities`
Independent personal molecule identity configuration (separated from social graph).
- `user_id` (TEXT, PK, FK -> `users.id` ON DELETE CASCADE).
- `identity_type` (TEXT): Molecule motif (e.g. `Neptune`, `Aurora`, `Solar`).
- `model_version` (TEXT): Configuration version (e.g. `v1`).
- `parameters` (TEXT): JSON payload storing shader parameters, effects, colors.
- `created_at` (TEXT): ISO 8601 timestamp.
- `updated_at` (TEXT): ISO 8601 timestamp.

### C. `privacy_settings`
Granular profile visibility rules.
- `user_id` (TEXT, PK, FK -> `users.id` ON DELETE CASCADE).
- `profile_visibility` (TEXT): `PUBLIC` | `CONNECTIONS_ONLY`.
- `email_visibility` (TEXT): `PUBLIC` | `CONNECTIONS_ONLY`.
- `social_links_visibility` (TEXT): `PUBLIC` | `CONNECTIONS_ONLY`.

### D. `social_profiles`
External social profile links attached to user profiles.
- `id` (TEXT, PK).
- `user_id` (TEXT, FK -> `users.id` ON DELETE CASCADE).
- `platform` (TEXT): e.g. `GITHUB`, `TWITTER`, `LINKEDIN`.
- `profile_url` (TEXT): External profile hyperlink.
- `display_username` (TEXT): Handle on external network.
- `created_at` (TEXT): ISO 8601 timestamp.

### E. `relationships`
Directed connection state between two distinct users.
- `id` (TEXT, PK).
- `requester_id` (TEXT, FK -> `users.id` ON DELETE CASCADE).
- `receiver_id` (TEXT, FK -> `users.id` ON DELETE CASCADE).
- `status` (TEXT): `REQUESTED` | `ACCEPTED_ONE_WAY` | `REJECTED` | `CANCELLED`.
- `created_at` (TEXT): Timestamp when request was initiated.
- `updated_at` (TEXT): Timestamp of last state change.
- `accepted_at` (TEXT, nullable): Timestamp when receiver accepted.
- `mutual_at` (TEXT, nullable): Timestamp when reciprocal connect-back completed.
- `disconnected_at` (TEXT, nullable): Timestamp when relationship was severed.
- `cancelled_at` (TEXT, nullable): Timestamp when request was cancelled.
- `version` (INTEGER DEFAULT 1): Optimistic locking / transition version counter.
- **Constraints**:
  - `CONSTRAINT unique_directed_pair UNIQUE (requester_id, receiver_id)`
  - `CONSTRAINT no_self_relation CHECK (requester_id != receiver_id)`

### F. `mutual_relationships`
Canonical reciprocal connection index (strictly derived from mutual agreement).
- `id` (TEXT, PK).
- `user_a_id` (TEXT, FK -> `users.id` ON DELETE CASCADE).
- `user_b_id` (TEXT, FK -> `users.id` ON DELETE CASCADE).
- `created_at` (TEXT): ISO 8601 timestamp.
- **Constraints**:
  - `CONSTRAINT canonical_order CHECK (user_a_id < user_b_id)`
  - `CONSTRAINT unique_mutual_pair UNIQUE (user_a_id, user_b_id)`

### G. `user_graph_versions`
Tracks deterministic graph topology hash and version number per user.
- `user_id` (TEXT, PK, FK -> `users.id` ON DELETE CASCADE).
- `graph_version` (INTEGER DEFAULT 1).
- `graph_hash` (TEXT): SHA-256 hash of canonicalized mutual topology.
- `updated_at` (TEXT): ISO 8601 timestamp.

### H. `layout_cache`
Validated 3D physical layout cache.
- `id` (TEXT, PK).
- `host_user_id` (TEXT, FK -> `users.id` ON DELETE CASCADE).
- `graph_version` (INTEGER).
- `algorithm_version` (TEXT): Layout profile/algorithm key (e.g. `hybrid-FR-spherical-v1`).
- `structure_class` (TEXT): Topological structure class (e.g. `TRIANGLE_CYCLE`).
- `layout_data` (TEXT): JSON storing 3D coordinates and geometries.
- `quality_metrics` (TEXT): Physical validation scoring (overlap count, edge lengths).
- `created_at` (TEXT): ISO 8601 timestamp.
- **Constraints**:
  - `CONSTRAINT unique_layout_cache UNIQUE (host_user_id, graph_version, algorithm_version)`

---

## 4. Indexing Strategy

- `idx_users_username` on `users(username)` — Fast user lookups during login/profile views.
- `idx_users_email` on `users(email)` — Fast email credential lookups.
- `idx_rel_requester` on `relationships(requester_id)` — Outgoing relationship retrieval.
- `idx_rel_receiver` on `relationships(receiver_id)` — Incoming request queries.
- `idx_rel_status` on `relationships(status)` — Filtering pending requests.
- `idx_rel_lookup` on `relationships(requester_id, receiver_id, status)` — Fast pair status check.
- `idx_mutual_a` on `mutual_relationships(user_a_id)` — Ego-network partner lookups.
- `idx_mutual_b` on `mutual_relationships(user_b_id)` — Ego-network partner lookups.
- `idx_cache_lookup` on `layout_cache(host_user_id, graph_version, algorithm_version)` — Instant layout cache retrieval.

---

## 5. Relationship State Machine (Frozen Specification)

```
        sendRequest(A, B)
NO_RELATIONSHIP ───────────────► REQUESTED
                                     │
                                     │ acceptRequest(B, A)
                                     ▼
                              ACCEPTED_ONE_WAY  (CRITICAL: NOT MUTUAL)
                                     │
                                     │ connectBack(B, A)
                                     ▼
                                  MUTUAL        (CREATES 3D MOLECULAR BOND)
                                     │
                                     │ disconnect(A, B) or disconnect(B, A)
                                     ▼
                                 CANCELLED / NO MUTUAL BOND
```

### Invariants:
1. `ACCEPTED_ONE_WAY != MUTUAL`: When User B accepts User A's request, User A is connected to User B in one direction. Mutuality is **FALSE**. No 3D molecular bond is rendered.
2. `connectBack(B, A)`: Occurs only after `ACCEPTED_ONE_WAY`. B sends a reciprocal connection. The relationship engine verifies reciprocal acceptance ($A \to B$ and $B \to A$) and atomically materializes the canonical record in `mutual_relationships`.
3. `MUTUAL` is the only state that produces:
   - Reciprocal mutual graph edges
   - 3D molecular cylinder bonds
   - Connected profile access subject to privacy settings.
4. AI has **ZERO** authority over mutuality transitions.

---

## 6. Deterministic Graph Construction & Versioning

### Canonical Topology Hashing
The `graphVersion` must change if and only if graph topology changes.
1. Retrieve all mutual partners for `userId`.
2. Construct sorted node ID list: `[userId, ...partnerIds].sort()`.
3. Retrieve all mutual edges within this ego-network.
4. Normalize each edge such that `u < v`, format as `u:v`, and sort lexicographically.
5. Create canonical string: `nodes:u1,u2,...|edges:e1,e2,...`.
6. Compute SHA-256 hash: `gv_${sha256(canonicalString).slice(0, 16)}`.

### What Changes `graphVersion`:
- User A establishes a new mutual connection with User B.
- A mutual connection is disconnected.
- Two mutual neighbors of User A establish a mutual connection between themselves (triangle closure).

### What NEVER Changes `graphVersion`:
- User changes avatar, bio, or display name.
- User changes their personal molecule identity motif.
- Camera rotation, panning, or zoom in the 3D Lab.
- Non-mutual requests are sent, accepted one-way, or rejected.

---

## 7. AI-Safe Privacy Boundary

When preparing graph data for AI layout optimization (Qwen3.5-9B), the backend enforces strict filtering:

### Included in `GraphSummaryForAI`:
- `graphVersion`: Deterministic topology hash.
- `nodes`: Number of vertices.
- `edges`: Number of mutual bonds.
- `density`: Mathematical edge density $[0, 1]$.
- `averageDegree`: Average degree of vertices.
- `maxDegree`: Degree of highest-degree node.
- `communities`: Number of partition communities.
- `connectedComponents`: Number of disjoint subcomponents.
- `cycles`: Number of independent 3-cycles / triangles.
- `hubCount`: Number of hub nodes with degree $\ge 3$.

### Explicitly Excluded (Zero PII):
- Names, usernames, display names
- Email addresses
- Passwords and auth tokens
- Biographies and genders
- Avatar URLs
- External social profile links
- Private messages and timestamps
