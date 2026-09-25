# 🚀 Boring Web Platform — Deployment Guide

This document specifies the production deployment architecture and runtime configuration for the **Boring** molecular social network platform.

---

## 1. System Architecture

```text
Internet / Reverse Proxy (Port 80 / 443)
              │
              ▼
   Node.js Server (server/index.ts)
   ├── Serves compiled frontend assets (dist/)
   ├── Handles SPA client routing fallback (index.html)
   ├── Exposes REST APIs (/api/auth, /api/network, /api/relationships, /api/users)
   ├── Executes SQLite database transactions (node:sqlite)
   └── Connects to Remote Google Colab AI Agent (optional layout acceleration)
```

---

## 2. Environment Variables

The application is configured using environment variables. Configure these in your production host environment (e.g. Docker, Railway, Render, Fly.io, VPS):

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3001` | HTTP listening port for Express backend server. |
| `NODE_ENV` | `development` | Set to `production` in production deployment. |
| `DATABASE_PATH` | `./server/data/boring.db` | Absolute or relative path to the persistent SQLite database file. |
| `JWT_SECRET` | `boring-secret-key-2026-antigravity` | Cryptographic secret for signing and verifying user authentication tokens. **Change in production.** |
| `GOOGLE_CLIENT_ID` | *Empty* | Google OAuth 2.0 Web Client ID from Google Cloud Console. |
| `GOOGLE_CLIENT_SECRET` | *Empty* | Google OAuth 2.0 Client Secret (Server-side ONLY. Never expose to client). |
| `GOOGLE_REDIRECT_URI` | `http://localhost:3001/api/auth/google/callback` | OAuth 2.0 callback URL registered in Google Cloud Console. |
| `BORING_AGENT_AUTH_TOKEN` | `boring-dev-agent-token-2026` | Shared secret token for authenticating calls between the Windows/Node backend and the Colab AI service. |
| `REMOTE_AGENT_URL` | *Empty* | Public URL (e.g., `https://xxxx.ngrok-free.app`) of the remote Colab AI agent hosting `Qwen/Qwen3.5-9B`. If omitted or unreachable, classical layout fallback operates seamlessly. |
| `REMOTE_AGENT_TIMEOUT_MS` | `15000` | Timeout threshold in milliseconds before aborting remote AI layout calls and defaulting to classical layout. |

---

## 3. Google OAuth & Vercel Compatibility Configuration

### Architecture & Security Rule
Google authentication follows an authoritative backend verification flow:
```text
Boring Frontend (Vercel or Vite)
      ↓
Google OAuth / OpenID Connect
      ↓
Boring Backend (/api/auth/google/callback)
      ↓
Boring User (external_identities table linked to users)
      ↓
Existing Boring JWT Session
```

- **Client-Side Security:** Google client secrets, backend JWT secrets, and `BORING_AGENT_AUTH_TOKEN` are strictly server-side environment variables and must NEVER be placed in `VITE_*` variables or exposed to the client.
- **Graceful Local Development:** If `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are not set during local development, the "Continue with Google" button remains visible on `/auth` and displays a clear configuration banner rather than crashing the application.

### Google Cloud Console Setup:
1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. Create **OAuth 2.0 Client ID** (Application type: *Web application*).
3. Under **Authorized redirect URIs**, add:
   - For local development: `http://localhost:3001/api/auth/google/callback`
   - For production backend: `https://your-backend-domain.com/api/auth/google/callback`
4. Copy the Client ID and Client Secret into your server environment:
   ```bash
   export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   export GOOGLE_CLIENT_SECRET="your-client-secret"
   export GOOGLE_REDIRECT_URI="https://your-backend-domain.com/api/auth/google/callback"
   ```

---

## 4. Database Persistence Requirement (SQLite)

> **CRITICAL PRODUCTION STORAGE RULE:**
> SQLite (`server/data/boring.db`) is the **authoritative single source of truth** for all users, relationships, and layout caches.
>
> If deploying to containerized or serverless hosting platforms (e.g. AWS ECS, Render, Railway, Fly.io, Kubernetes), you **MUST** attach a **persistent disk volume** to the container directory hosting `DATABASE_PATH` (e.g. mount `/data` to `/app/server/data`).
>
> **Do not deploy SQLite onto ephemeral, non-persistent container layers.**

---

## 5. Build and Production Run Commands

```bash
# 1. Install production dependencies
npm install

# 2. Compile TypeScript and build production frontend bundle
npm run build

# 3. Start production server
npm start
```

When started with `NODE_ENV=production`:

- Express serves production-optimized static assets directly from `dist/`.
- Client-side navigation (`/`, `/auth`, `/dashboard`, `/profile`, `/people`, `/network`, `/3d-lab`, `/settings`, `/requests`, `/molecule`) falls back cleanly to `dist/index.html`.
- REST APIs are mounted under `/api/*`.

---

## 6. Remote AI Agent (Google Colab) Setup

1. Open `agent/notebooks/Boring_Agent_Lab.ipynb` in [Google Colab](https://colab.research.google.com/).
2. Select a GPU runtime (`Runtime → Change runtime type → T4 GPU`).
3. Run all cells:
   - Cells 1–7 install dependencies and load `Qwen/Qwen3.5-9B` into GPU VRAM.
   - Cell 20 starts the authenticated FastAPI service and generates a public ngrok tunnel URL.
4. Set the `REMOTE_AGENT_URL` environment variable on your backend server:

   ```bash
   export REMOTE_AGENT_URL="https://xxxx.ngrok-free.app"
   export BORING_AGENT_AUTH_TOKEN="boring-dev-agent-token-2026"
   ```

5. If the Colab runtime is offline or restarts, the Boring backend automatically defaults to the deterministic classical layout solver without throwing errors or breaking the 3D Lab.
