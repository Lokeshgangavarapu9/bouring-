import { Router, type Response } from 'express';
import {
  signup,
  login,
  verifyRecovery,
  resetPasswordWithRecovery,
  getAllUsersAsync,
  getUserByIdAsync,
} from '../services/authService.ts';
import { getPublicSupabaseConfig } from '../services/supabaseService.ts';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/authMiddleware.ts';

export const authRouter = Router();

// GET /api/auth/supabase-config - Public Supabase configuration for client (URL and anon key only)
authRouter.get('/supabase-config', (_req, res) => {
  const config = getPublicSupabaseConfig();
  res.json(config);
});

// POST /api/auth/signup - Email/Password/DOB Account Creation
authRouter.post('/signup', async (req, res) => {
  try {
    const { name, username, email, password, dateOfBirth, dob } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const birthDate = dateOfBirth || dob;
    if (!birthDate) {
      return res.status(400).json({ error: 'Date of birth is required' });
    }
    const result = await signup(name, username, email, password, birthDate);
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

// POST /api/auth/forgot-password - Step 1: Verify Email + Date of Birth for Account Recovery
authRouter.post('/forgot-password', async (req, res) => {
  try {
    const { email, dateOfBirth, dob } = req.body;
    const birthDate = dateOfBirth || dob;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Unable to verify your account information.' });
    }
    if (!birthDate || typeof birthDate !== 'string') {
      return res.status(400).json({ error: 'Unable to verify your account information.' });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
    const result = await verifyRecovery(email.trim(), birthDate.trim(), clientIp);
    res.json(result);
  } catch (err: any) {
    // Return safe generic message without leaking account existence
    res.status(400).json({
      error: err.message || 'Unable to verify your account information.',
    });
  }
});

// POST /api/auth/reset-password - Step 2: Reset Password with Verified Recovery Token
authRouter.post('/reset-password', async (req, res) => {
  try {
    const { password, newPassword, confirmPassword, resetToken, accessToken, token } = req.body;
    const targetPassword = newPassword || password;
    const targetToken = resetToken || token || accessToken;

    if (!targetPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    if (targetPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (confirmPassword && targetPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (!targetToken) {
      return res.status(400).json({ error: 'Reset token is required or has expired' });
    }

    const result = await resetPasswordWithRecovery(targetToken, targetPassword);
    res.json(result);
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
authRouter.get('/users', async (_req, res) => {
  try {
    const users = await getAllUsersAsync();
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/switch (Developer / demo convenience user switcher)
authRouter.post('/switch', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await getUserByIdAsync(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
