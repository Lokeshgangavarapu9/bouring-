import { Router, Response } from 'express';
import { signup, login, getAllUsers, getUserById } from '../services/authService.ts';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware.ts';

export const authRouter = Router();

// POST /api/auth/signup
authRouter.post('/signup', (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    const result = signup(name, username, email, password);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Signup failed' });
  }
});

// POST /api/auth/login
authRouter.post('/login', (req, res) => {
  try {
    const { emailOrUsername, email, username, password } = req.body;
    const identifier = emailOrUsername || email || username;
    if (!identifier) {
      return res.status(400).json({ error: 'Email or username is required' });
    }
    const result = login(identifier, password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Login failed' });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', (_req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me
authRouter.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// GET /api/auth/users (Directory of users for peer discovery & dev switching)
authRouter.get('/users', (_req, res) => {
  try {
    const users = getAllUsers();
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/switch (Developer / demo convenience user switcher)
authRouter.post('/switch', (req, res) => {
  try {
    const { userId } = req.body;
    const user = getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
