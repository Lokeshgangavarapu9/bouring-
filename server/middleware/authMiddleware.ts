import type { Request, Response, NextFunction } from 'express';
import { verifyToken, getUserByIdAsync, type SanitizedUser } from '../services/authService.ts';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: SanitizedUser;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    let userId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      if (decoded) {
        userId = decoded.userId;
      }
    }

    if (!userId) {
      const xUserId = req.headers['x-user-id'];
      if (typeof xUserId === 'string' && xUserId.trim()) {
        userId = xUserId.trim();
      }
    }

    if (userId) {
      const user = await getUserByIdAsync(userId);
      if (user) {
        req.userId = user.id;
        req.user = user;
        return next();
      }
    }

    res.status(401).json({ error: 'Unauthorized. Authentication token or user session required.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Authentication error' });
  }
}

export async function optionalAuthMiddleware(req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    let userId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      if (decoded) {
        userId = decoded.userId;
      }
    }

    if (!userId) {
      const xUserId = req.headers['x-user-id'];
      if (typeof xUserId === 'string' && xUserId.trim()) {
        userId = xUserId.trim();
      }
    }

    if (userId) {
      const user = await getUserByIdAsync(userId);
      if (user) {
        req.userId = user.id;
        req.user = user;
      }
    }
  } catch {}

  next();
}

