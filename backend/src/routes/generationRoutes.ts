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

const router = Router({ mergeParams: true });

router.post(
  '/',
  (req, res, next) => {
    console.log(`[Generation Request] Body:`, JSON.stringify(req.body, null, 2));
    next();
  },
  createGeneration
);
router.get('/', getGenerations);
router.get('/queue/status', getQueueStatus);
router.patch('/:generationId', updateGeneration);
router.delete('/:generationId', deleteGeneration);

// Download image with embedded generation metadata (EXIF/PNG chunks)
// Two routes: with and without outputIndex (Express 5 doesn't support ? optional params)
router.get('/:generationId/download', downloadWithMetadata);
router.get('/:generationId/download/:outputIndex', downloadWithMetadata);

// Enhance video with RIFE interpolation + MMAudio
router.post('/:generationId/enhance', enhanceVideo);

// Smart Learning Loop: Analyze failure
router.post('/:generationId/analyze', analyzeGeneration);

// Smart Refine Generation
router.post('/:generationId/refine', refineGeneration);

export default router;
