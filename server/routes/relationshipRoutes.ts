import { Router, Response } from 'express';
import {
  sendRequest,
  acceptRequest,
  rejectRequest,
  cancelRequest,
  connectBack,
  disconnect,
  getUserRelationships,
  getMutualPartnerIds,
} from '../services/relationshipService.ts';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware.ts';

export const relationshipRouter = Router();

// Apply auth to all relationship routes
relationshipRouter.use(authMiddleware);

// GET /api/relationships - Get all relationships for current user
relationshipRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const relationships = getUserRelationships(req.userId!);
    const mutualPartners = getMutualPartnerIds(req.userId!);
    res.json({ relationships, mutualPartners });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/relationships/requests - Send a connection request
relationshipRouter.post('/requests', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { receiverId } = req.body;
    if (!receiverId) {
      return res.status(400).json({ error: 'receiverId is required' });
    }
    const rel = sendRequest(req.userId!, receiverId);
    res.status(201).json({ relationship: rel });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/relationships/:id/accept - Accept an incoming request (transitions to ACCEPTED_ONE_WAY)
// Acceptance alone does NOT create mutuality or 3D bonds!
relationshipRouter.post('/:id/accept', (req: AuthenticatedRequest, res: Response) => {
  try {
    const rel = acceptRequest(req.params.id, req.userId!);
    res.json({
      relationship: rel,
      message: 'Request accepted. Reciprocal connect-back required to establish mutuality.',
      isMutual: false,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/relationships/:id/reject - Reject an incoming request
relationshipRouter.post('/:id/reject', (req: AuthenticatedRequest, res: Response) => {
  try {
    const rel = rejectRequest(req.params.id, req.userId!);
    res.json({ relationship: rel, message: 'Request rejected' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/relationships/:id/cancel - Cancel a pending outgoing request
relationshipRouter.post('/:id/cancel', (req: AuthenticatedRequest, res: Response) => {
  try {
    const rel = cancelRequest(req.params.id, req.userId!);
    res.json({ relationship: rel, message: 'Request cancelled' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/relationships/:userId/connect-back - Perform Connect Back
// This creates the reverse edge and triggers mutual detection & 3D bond creation!
relationshipRouter.post('/:userId/connect-back', (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.params.userId;
    const result = connectBack(req.userId!, targetUserId);
    res.json({
      success: true,
      message: 'Reciprocal connection established. Mutual bond formed!',
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/relationships/:userId - Disconnect from a user
// Breaks mutuality, removes bond, updates graph_version
relationshipRouter.delete('/:userId', (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.params.userId;
    const result = disconnect(req.userId!, targetUserId);
    res.json({
      success: true,
      message: 'Disconnected successfully. Mutual bond removed.',
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
