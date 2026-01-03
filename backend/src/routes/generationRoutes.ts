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
import {
  withAuth,
  withDevAuth,
  verifyProjectOwnership,
  requireGenerationQuota,
} from '../middleware/auth';

const router = Router({ mergeParams: true });

// Use dev auth in development, real auth in production
const authMiddleware = process.env.NODE_ENV === 'production' ? withAuth : withDevAuth;
const quotaMiddleware =
  process.env.NODE_ENV === 'production'
    ? requireGenerationQuota
    : (_req: any, _res: any, next: any) => next();
// Skip project ownership verification in dev (we use mock user)
const ownershipMiddleware =
  process.env.NODE_ENV === 'production'
    ? verifyProjectOwnership
    : (_req: any, _res: any, next: any) => next();

// =============================================================================
// P0 SECURITY: All generation routes require authentication
// Cost-bearing routes also require quota check
// =============================================================================

// Create generation - EXPENSIVE ($0.03-$0.40 per generation)
router.post(
  '/',
  authMiddleware,
  ownershipMiddleware,
  quotaMiddleware,
  (req, res, next) => {
    console.log(`[Generation Request] Body:`, JSON.stringify(req.body, null, 2));
    next();
  },
  validateBody(createGenerationSchema),
  createGeneration
);

// Read operations - require auth but no quota
router.get('/', authMiddleware, ownershipMiddleware, getGenerations);
router.get('/queue/status', authMiddleware, ownershipMiddleware, getQueueStatus);

// Update/Delete - require auth and ownership
router.patch(
  '/:generationId',
  authMiddleware,
  ownershipMiddleware,
  validateBody(updateGenerationSchema),
  updateGeneration
);
router.delete('/:generationId', authMiddleware, ownershipMiddleware, deleteGeneration);

// Download image with embedded generation metadata (EXIF/PNG chunks)
// Two routes: with and without outputIndex (Express 5 doesn't support ? optional params)
router.get('/:generationId/download', authMiddleware, ownershipMiddleware, downloadWithMetadata);
router.get(
  '/:generationId/download/:outputIndex',
  authMiddleware,
  ownershipMiddleware,
  downloadWithMetadata
);

// Enhance video with RIFE interpolation + MMAudio - EXPENSIVE (GPU compute)
router.post(
  '/:generationId/enhance',
  authMiddleware,
  ownershipMiddleware,
  quotaMiddleware,
  enhanceVideo
);

// Smart Learning Loop: Analyze failure - Uses Grok Vision ($)
router.post(
  '/:generationId/analyze',
  authMiddleware,
  ownershipMiddleware,
  validateBody(analyzeGenerationSchema),
  analyzeGeneration
);

// Smart Refine Generation - Uses AI ($)
router.post(
  '/:generationId/refine',
  authMiddleware,
  ownershipMiddleware,
  validateBody(refineGenerationSchema),
  refineGeneration
);

export default router;
