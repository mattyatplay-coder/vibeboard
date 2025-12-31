import { Router } from 'express';
import {
  createGeneration,
  getGenerations,
  updateGeneration,
  deleteGeneration,
  downloadWithMetadata,
  getQueueStatus,
  enhanceVideo,
  analyzeGeneration,
  refineGeneration,
} from '../controllers/generationController';
import {
  validateBody,
  createGenerationSchema,
  updateGenerationSchema,
  analyzeGenerationSchema,
  refineGenerationSchema,
} from '../middleware/validation';
import { withAuth, verifyProjectOwnership, requireGenerationQuota } from '../middleware/auth';

const router = Router({ mergeParams: true });

// =============================================================================
// P0 SECURITY: All generation routes require authentication
// Cost-bearing routes also require quota check
// =============================================================================

// Create generation - EXPENSIVE ($0.03-$0.40 per generation)
router.post(
  '/',
  withAuth,
  verifyProjectOwnership,
  requireGenerationQuota,
  (req, res, next) => {
    console.log(`[Generation Request] Body:`, JSON.stringify(req.body, null, 2));
    next();
  },
  validateBody(createGenerationSchema),
  createGeneration
);

// Read operations - require auth but no quota
router.get('/', withAuth, verifyProjectOwnership, getGenerations);
router.get('/queue/status', withAuth, verifyProjectOwnership, getQueueStatus);

// Update/Delete - require auth and ownership
router.patch(
  '/:generationId',
  withAuth,
  verifyProjectOwnership,
  validateBody(updateGenerationSchema),
  updateGeneration
);
router.delete('/:generationId', withAuth, verifyProjectOwnership, deleteGeneration);

// Download image with embedded generation metadata (EXIF/PNG chunks)
// Two routes: with and without outputIndex (Express 5 doesn't support ? optional params)
router.get('/:generationId/download', withAuth, verifyProjectOwnership, downloadWithMetadata);
router.get(
  '/:generationId/download/:outputIndex',
  withAuth,
  verifyProjectOwnership,
  downloadWithMetadata
);

// Enhance video with RIFE interpolation + MMAudio - EXPENSIVE (GPU compute)
router.post(
  '/:generationId/enhance',
  withAuth,
  verifyProjectOwnership,
  requireGenerationQuota,
  enhanceVideo
);

// Smart Learning Loop: Analyze failure - Uses Grok Vision ($)
router.post(
  '/:generationId/analyze',
  withAuth,
  verifyProjectOwnership,
  validateBody(analyzeGenerationSchema),
  analyzeGeneration
);

// Smart Refine Generation - Uses AI ($)
router.post(
  '/:generationId/refine',
  withAuth,
  verifyProjectOwnership,
  validateBody(refineGenerationSchema),
  refineGeneration
);

export default router;
