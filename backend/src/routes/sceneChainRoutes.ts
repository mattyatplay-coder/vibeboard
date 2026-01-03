import { Router } from 'express';
import multer from 'multer';
import {
  getSceneChains,
  createSceneChain,
  getSceneChain,
  updateSceneChain,
  deleteSceneChain,
  addSegment,
  updateSegment,
  deleteSegment,
  reorderSegments,
  addCharacterToChain,
  removeCharacterFromChain,
  generateChain,
  getChainStatus,
  uploadSegmentFrame,
  getSegment,
  generateSegment,
  stitchChain,
  generateFrame,
  generateAllFrames,
} from '../controllers/sceneChainController';

const router = Router({ mergeParams: true });

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Scene Chain CRUD
router.get('/', getSceneChains);
router.post('/', createSceneChain);
router.get('/:id', getSceneChain);
router.put('/:id', updateSceneChain);
router.delete('/:id', deleteSceneChain);

// Segment management
router.post('/:id/segments', addSegment);
router.get('/:id/segments/:segmentId', getSegment);
router.put('/:id/segments/:segmentId', updateSegment);
router.patch('/:id/segments/:segmentId', updateSegment);
router.delete('/:id/segments/:segmentId', deleteSegment);
router.post('/:id/reorder', reorderSegments);

// Frame uploads
router.post('/:id/segments/:segmentId/frame', upload.single('file'), uploadSegmentFrame);

// Segment generation
router.post('/:id/segments/:segmentId/generate', generateSegment);

// Frame image generation
router.post('/:id/segments/:segmentId/generate-frame', generateFrame);
router.post('/:id/generate-all-frames', generateAllFrames);

// Character associations
router.post('/:id/characters', addCharacterToChain);
router.delete('/:id/characters/:characterId', removeCharacterFromChain);

// Chain generation
router.post('/:id/generate', generateChain);
router.get('/:id/status', getChainStatus);

// Video stitching
router.post('/:id/stitch', stitchChain);

export default router;
