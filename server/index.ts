import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/authRoutes.ts';
import { relationshipRouter } from './routes/relationshipRoutes.ts';
import { userRouter } from './routes/userRoutes.ts';
import { networkRouter } from './routes/networkRoutes.ts';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Production database starts empty for real registered users (seedDatabase only called in test or manual migration)
console.log('[Boring Backend] Database ready for production users.');

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    system: 'Boring Molecular Social Graph Engine',
  });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/relationships', relationshipRouter);
app.use('/api', userRouter);
app.use('/api/network', networkRouter);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Boring Server Error]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Boring Backend Server] Running on http://localhost:${PORT}`);
    console.log(`[API Endpoints] /api/auth, /api/relationships, /api/users, /api/network`);
  });
}

export default app;
