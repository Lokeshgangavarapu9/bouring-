import { Request, Response, NextFunction } from 'express';
import { verifyToken, getUserById, SanitizedUser } from '../services/authService.ts';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: SanitizedUser;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // 1. Check Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded) {
      const user = getUserById(decoded.userId);
      if (user) {
        req.userId = user.id;
        req.user = user;
        return next();
      }
    }
  }

  // 2. Allow X-User-Id header for seamless multi-account demo testing / developer user switching
  const xUserId = req.headers['x-user-id'];
  if (typeof xUserId === 'string' && xUserId.trim()) {
    const user = getUserById(xUserId.trim());
    if (user) {
      req.userId = user.id;
      req.user = user;
      return next();
    }
  }

  res.status(401).json({ error: 'Unauthorized. Authentication token or user session required.' });
}

export function optionalAuthMiddleware(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded) {
      const user = getUserById(decoded.userId);
      if (user) {
        req.userId = user.id;
        req.user = user;
      }
    }
  }

  const xUserId = req.headers['x-user-id'];
  if (!req.userId && typeof xUserId === 'string' && xUserId.trim()) {
    const user = getUserById(xUserId.trim());
    if (user) {
      req.userId = user.id;
      req.user = user;
    }
  }

  next();
}
