import { Router, type Response } from 'express';
import { signup, login, getAllUsers, getUserById } from '../services/authService.ts';
import {
  getPublicSupabaseConfig,
  supabaseRequestPasswordReset,
  supabaseUpdatePassword,
  isSupabaseConfigured,
} from '../services/supabaseService.ts';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/authMiddleware.ts';

export const authRouter = Router();

// GET /api/auth/supabase-config - Public Supabase configuration for client (URL and anon key only)
authRouter.get('/supabase-config', (_req, res) => {
  const config = getPublicSupabaseConfig();
  res.json(config);
});

// POST /api/auth/signup - Email/Password Account Creation
authRouter.post('/signup', async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = await signup(name, username, email, password);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Signup failed' });
  }
});

// POST /api/auth/login - Email/Password Authentication
authRouter.post('/login', async (req, res) => {
  try {
    const { emailOrUsername, email, username, password } = req.body;
    const identifier = emailOrUsername || email || username;
    if (!identifier) {
      return res.status(400).json({ error: 'Email or username is required' });
    }
    const result = await login(identifier, password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Login failed' });
  }
});

// POST /api/auth/forgot-password - Trigger Supabase Password Reset Email
authRouter.post('/forgot-password', async (req, res) => {
  try {
    const { email, redirectTo } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }

    if (isSupabaseConfigured()) {
      const result = await supabaseRequestPasswordReset(email.trim(), redirectTo);
      return res.json(result);
    }

    // Local development fallback: Safe response that does not leak user existence
    res.json({
      success: true,
      message: 'If an account exists with this email address, a password reset link has been sent.',
    });
  } catch (err: any) {
    // Return generic message even on error to prevent user enumeration
    res.json({
      success: true,
      message: 'If an account exists with this email address, a password reset link has been sent.',
    });
  }
});

// POST /api/auth/reset-password - Update User Password with Supabase Reset Token
authRouter.post('/reset-password', async (req, res) => {
  try {
    const { password, confirmPassword, accessToken } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'New password is required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (isSupabaseConfigured() && accessToken) {
      const result = await supabaseUpdatePassword(accessToken, password);
      return res.json(result);
    }

    // Local development fallback
    res.json({
      success: true,
      message: 'Password successfully updated. You can now sign in with your new password.',
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Unable to reset password' });
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
