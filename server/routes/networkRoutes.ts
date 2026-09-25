import { Router, Response } from 'express';
import { getOrComputeLayoutAsync } from '../services/layoutService.ts';
import { buildEgoGraph } from '../services/graphAnalysisService.ts';
import { classifyStructure } from '../services/structureClassificationService.ts';
import { getMutualPartnerIds, getUserRelationships } from '../services/relationshipService.ts';
import { authMiddleware, optionalAuthMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { getAllUsers } from '../services/authService.ts';

export const networkRouter = Router();

// GET /api/network/me - Returns accurate profile stats for current authenticated user
// Exactly 3 statistics per specifications: Mutuals, Followers, Following
networkRouter.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const mutualPartnerIds = getMutualPartnerIds(userId);
    const relationships = getUserRelationships(userId);

    // Followers: Users who sent incoming connection requests or are accepted
    const followerIds = new Set<string>();
    relationships.forEach(r => {
      if (r.receiver_id === userId && (r.status === 'ACCEPTED_ONE_WAY' || r.status === 'REQUESTED')) {
        followerIds.add(r.requester_id);
      }
    });

    // Following: Users whom current user reached out to or are accepted
    const followingIds = new Set<string>();
    relationships.forEach(r => {
      if (r.requester_id === userId && (r.status === 'ACCEPTED_ONE_WAY' || r.status === 'REQUESTED')) {
        followingIds.add(r.receiver_id);
      }
    });

    const allUsers = getAllUsers();
    const mutualUsers = allUsers.filter(u => mutualPartnerIds.includes(u.id));
    const followerUsers = allUsers.filter(u => followerIds.has(u.id));
    const followingUsers = allUsers.filter(u => followingIds.has(u.id));

    res.json({
      stats: {
        mutualCount: mutualPartnerIds.length,
        followerCount: followerIds.size,
        followingCount: followingIds.size,
      },
      mutualUsers,
      followerUsers,
      followingUsers,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/network/:userId - Ego-network overview, graph metrics, structure classification
networkRouter.get('/:userId', optionalAuthMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.userId;
    const ego = buildEgoGraph(userId);
    const structure = classifyStructure(ego.metrics);

    res.json({
      hostUserId: userId,
      metrics: ego.metrics,
      structure,
      nodeCount: ego.nodes.length,
      edgeCount: ego.mutualEdges.length,
    });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// GET /api/network/:userId/layout - Deterministic 3D layout computation & caching
networkRouter.get('/:userId/layout', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.userId;
    const layout = await getOrComputeLayoutAsync(userId);
    res.json(layout);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/network/:userId/snapshot - Canonical graph snapshot
networkRouter.get('/:userId/snapshot', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.userId;
    const { createGraphSnapshot } = await import('../services/graphPipelineService.ts');
    const snapshot = createGraphSnapshot(userId);
    res.json(snapshot);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// GET /api/network/:userId/summary - PII-free AI-safe summary
networkRouter.get('/:userId/summary', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.userId;
    const { createAiSafeGraphSummary } = await import('../services/graphPipelineService.ts');
    const summary = createAiSafeGraphSummary(userId);
    res.json(summary);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

