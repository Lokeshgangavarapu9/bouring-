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

// Start Server
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`[Boring Backend Server] Running on http://localhost:${PORT}`);
    console.log(`[API Endpoints] /api/auth, /api/relationships, /api/users, /api/network`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
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
