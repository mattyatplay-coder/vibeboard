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

const router = Router({ mergeParams: true });

router.post(
  '/',
  (req, res, next) => {
    console.log(`[Generation Request] Body:`, JSON.stringify(req.body, null, 2));
    next();
  },
  validateBody(createGenerationSchema),
  createGeneration
);
router.get('/', getGenerations);
router.get('/queue/status', getQueueStatus);
router.patch('/:generationId', validateBody(updateGenerationSchema), updateGeneration);
router.delete('/:generationId', deleteGeneration);

// Download image with embedded generation metadata (EXIF/PNG chunks)
// Two routes: with and without outputIndex (Express 5 doesn't support ? optional params)
router.get('/:generationId/download', downloadWithMetadata);
router.get('/:generationId/download/:outputIndex', downloadWithMetadata);

// Enhance video with RIFE interpolation + MMAudio
router.post('/:generationId/enhance', enhanceVideo);

// Smart Learning Loop: Analyze failure
router.post('/:generationId/analyze', validateBody(analyzeGenerationSchema), analyzeGeneration);

// Smart Refine Generation
router.post('/:generationId/refine', validateBody(refineGenerationSchema), refineGeneration);

export default router;
