import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

try {
  process.loadEnvFile();
} catch {}

import { authRouter } from './routes/authRoutes.ts';
import { relationshipRouter } from './routes/relationshipRoutes.ts';
import { userRouter } from './routes/userRoutes.ts';
import { networkRouter } from './routes/networkRoutes.ts';
import { getDatabaseType } from './db/adapter.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Normalize req.url for Vercel serverless rewrites
app.use((req, _res, next) => {
  if (req.url === '/api' || req.url === '/api/' || req.url === '') {
    const rawUrl = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.originalUrl;
    if (typeof rawUrl === 'string' && rawUrl.startsWith('/api') && rawUrl !== '/api' && rawUrl !== '/api/') {
      req.url = rawUrl;
    }
  }
  next();
});

// Serve static build assets if available
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    system: 'Boring Molecular Social Graph Engine',
    database: getDatabaseType(),
  });
});

// Mount API Routes
app.use('/api/auth', authRouter);
app.use('/api/relationships', relationshipRouter);
app.use('/api', userRouter);
app.use('/api/network', networkRouter);

// SPA client routing fallback for production (serve index.html for non-API GET requests)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    return res.sendFile(path.join(DIST_DIR, 'index.html'));
  }
  next();
});

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Boring Server Error]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Start Server (Only in standalone node environment, never during test or Vercel serverless invocation)
const isVercel = Boolean(process.env.VERCEL);
if (process.env.NODE_ENV !== 'test' && !isVercel) {
  const server = app.listen(PORT, () => {
    console.log(`[Boring Backend Server] Running on http://localhost:${PORT}`);
    console.log(`[API Endpoints] /api/auth, /api/relationships, /api/users, /api/network`);
  });

  server.on('error', async (err: any) => {
    if (err.code === 'EADDRINUSE') {
      try {
        const check = await fetch(`http://localhost:${PORT}/api/health`);
        if (check.ok) {
          console.log(`[Boring Backend Server] Port ${PORT} is already running an active Boring backend server.`);
          console.log(`[Boring Backend Server] Connected to existing backend on http://localhost:${PORT}`);
          // Stay alive so concurrently does not terminate Vite
          setInterval(() => {}, 1000 * 60 * 60);
          return;
        }
      } catch {}
      console.error(`[Boring Backend Server Error] Port ${PORT} is already in use by another process. Please terminate the conflicting process or set PORT to an available port.`);
      process.exit(1);
    } else {
      console.error('[Boring Backend Server Error]:', err);
      process.exit(1);
    }
  });

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

export default app;
