import { Router, type Response } from 'express';
import {
  getAuthorizedSocialProfile,
  updateProfile,
  updatePrivacySettings,
  addSocialProfile,
  updateSocialProfile,
  removeSocialProfile,
  getPrivacySettings,
} from '../services/profileService.ts';
import { processSocialLink } from '../services/socialLinkService.ts';
import { getUserById } from '../services/authService.ts';
import { authMiddleware, optionalAuthMiddleware, type AuthenticatedRequest } from '../middleware/authMiddleware.ts';

export const userRouter = Router();

// GET /api/users/:id - Public user details
userRouter.get('/users/:id', (req, res) => {
  try {
    const user = getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:id/social-profile - Server-side authorized profile access
// Protected: Only returns connected sections if viewer is mutual or self!
userRouter.get('/users/:id/social-profile', optionalAuthMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const viewerId = req.userId || null;
    const profile = getAuthorizedSocialProfile(viewerId, targetUserId);
    res.json(profile);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// PATCH /api/profile - Update current user profile
userRouter.patch('/profile', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = updateProfile(req.userId!, req.body);
    res.json({ user: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/profile/privacy - Get current user privacy settings
userRouter.get('/profile/privacy', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = getPrivacySettings(req.userId!);
    res.json({ privacy: settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/profile/privacy - Update privacy settings
userRouter.put('/profile/privacy', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = updatePrivacySettings(req.userId!, req.body);
    res.json({ privacy: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/profile/socials/classify - Preview / classify a URL in real-time
userRouter.post('/profile/socials/classify', async (req, res) => {
  try {
    const { url, display_username, platform } = req.body;
    const result = await processSocialLink(url || '', display_username, platform);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/profile/socials & /api/profile/social - Add a social profile link
const handleAddSocial = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { platform, profile_url, display_username, url } = req.body;
    const targetUrl = profile_url || url;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Profile URL is required' });
    }
    const created = await addSocialProfile(req.userId!, platform || '', targetUrl, display_username || '');
    res.status(201).json({ socialProfile: created });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
userRouter.post('/profile/socials', authMiddleware, handleAddSocial);
userRouter.post('/profile/social', authMiddleware, handleAddSocial);

// PUT /api/profile/socials/:profileId & /api/profile/social/:profileId - Update a social profile link
const handleUpdateSocial = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { platform, profile_url, display_username, url } = req.body;
    const targetUrl = profile_url || url;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Profile URL is required' });
    }
    const updated = await updateSocialProfile(
      req.userId!,
      req.params.profileId,
      targetUrl,
      display_username,
      platform
    );
    res.json({ socialProfile: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
userRouter.put('/profile/socials/:profileId', authMiddleware, handleUpdateSocial);
userRouter.put('/profile/social/:profileId', authMiddleware, handleUpdateSocial);

// DELETE /api/profile/socials/:profileId & /api/profile/social/:profileId - Remove a social profile link
const handleDeleteSocial = (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = removeSocialProfile(req.userId!, req.params.profileId);
    if (!success) {
      return res.status(404).json({ error: 'Social profile not found or already deleted' });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
userRouter.delete('/profile/socials/:profileId', authMiddleware, handleDeleteSocial);
userRouter.delete('/profile/social/:profileId', authMiddleware, handleDeleteSocial);
