/**
 * Asset Routes - Phase 3: Asset Bin
 *
 * Endpoints for 3D scene deconstruction and PBR material extraction
 */

import { Router } from 'express';
import { assetController } from '../controllers/assetController';

const router = Router();

// Scene Deconstruction (2D → 3D)
router.post('/projects/:projectId/assets/deconstruct', assetController.deconstructScene);

// PBR Material Extraction
router.post('/projects/:projectId/assets/extract-materials', assetController.extractMaterials);

// Get asset processing status
router.get('/projects/:projectId/assets/:elementId/status', assetController.getAssetStatus);

// Get children created from deconstruction
router.get('/projects/:projectId/assets/:elementId/children', assetController.getDeconstructedChildren);

export default router;
