/**
 * Character Foundry Routes
 *
 * AI-driven character performance generation endpoints.
 */

import { Router } from 'express';
import { foundryController } from '../controllers/foundryController';
import { withAuth, requireGenerationQuota } from '../middleware/auth';

const router = Router();

// =============================================================================
// P0 SECURITY: All Character Foundry routes require authentication
// Performance generation uses AI ($$$ - GPU + LLM) - requires quota
// =============================================================================

// Performance Generation - EXPENSIVE (GPU + LLM)
router.post(
  '/projects/:projectId/foundry/performance',
  withAuth,
  requireGenerationQuota,
  foundryController.generatePerformance
);
router.get(
  '/projects/:projectId/foundry/performance/:generationId',
  withAuth,
  foundryController.getPerformanceStatus
);

// Asset Listing - requires auth but no quota (read-only)
router.get('/projects/:projectId/foundry/characters', withAuth, foundryController.listCharacters);
router.get('/projects/:projectId/foundry/audio', withAuth, foundryController.listAudio);

export default router;
