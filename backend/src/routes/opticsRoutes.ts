/**
 * Optics Routes - Phase 4A: Optics Engine
 *
 * Endpoints for real-time focus control and lens character simulation.
 */

import { Router } from 'express';
import { opticsController } from '../controllers/opticsController';

const router = Router();

// Rack Focus - Generate focus shift video from image
router.post('/rack-focus', opticsController.generateRackFocus);

// Lens Character - Apply lens optical effects
router.post('/lens-character', opticsController.applyLensCharacter);

// Get available lens presets
router.get('/presets', opticsController.getPresets);

export default router;
