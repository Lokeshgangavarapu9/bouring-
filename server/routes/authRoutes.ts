import { Router, Response } from 'express';
import { signup, login, getAllUsers, getUserById } from '../services/authService.ts';
import {
  getGoogleConfig,
  getGoogleAuthUrl,
  exchangeGoogleCode,
  verifyGoogleIdToken,
  handleGoogleUserIdentity,
} from '../services/googleAuthService.ts';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware.ts';

export const authRouter = Router();

// GET /api/auth/google/config - Public OAuth status check
authRouter.get('/google/config', (_req, res) => {
  const config = getGoogleConfig();
  res.json({
    configured: config.configured,
    clientId: config.clientId ? `${config.clientId.slice(0, 12)}...` : null,
  });
});

// GET /api/auth/google - Initiate OAuth redirect
authRouter.get('/google', (req, res) => {
  const config = getGoogleConfig();
  if (!config.configured) {
    return res.redirect('/auth?error=google_not_configured');
  }

  try {
    const redirectUrl = getGoogleAuthUrl();
    res.redirect(redirectUrl);
  } catch (err: any) {
    res.redirect(`/auth?error=${encodeURIComponent(err.message || 'google_auth_failed')}`);
  }
});

// GET /api/auth/google/callback - OAuth redirect callback handler
authRouter.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`/auth?error=${encodeURIComponent(String(error))}`);
  }

  if (!code || typeof code !== 'string') {
    return res.redirect('/auth?error=missing_auth_code');
  }

  try {
    const userInfo = await exchangeGoogleCode(code);
    const result = handleGoogleUserIdentity(userInfo);
    // Redirect to profile with token
    res.redirect(`/auth?token=${encodeURIComponent(result.token)}`);
  } catch (err: any) {
    res.redirect(`/auth?error=${encodeURIComponent(err.message || 'google_callback_failed')}`);
  }
});

// POST /api/auth/google - Direct token/payload authentication (GIS, popup, or test suite)
authRouter.post('/google', async (req, res) => {
  try {
    const { idToken, code, mockUserInfo } = req.body;

    let userInfo;

    if (idToken) {
      userInfo = await verifyGoogleIdToken(idToken);
    } else if (code) {
      userInfo = await exchangeGoogleCode(code);
    } else if (mockUserInfo && process.env.NODE_ENV === 'test') {
      // Allowed strictly during isolated test runs
      userInfo = mockUserInfo;
    } else {
      const config = getGoogleConfig();
      if (!config.configured) {
        return res.status(400).json({
          error: 'Google OAuth is not configured on this server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the server environment.',
        });
      }
      return res.status(400).json({ error: 'idToken or authorization code is required for Google login' });
    }

    const result = handleGoogleUserIdentity(userInfo);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Google authentication failed' });
  }
});

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
