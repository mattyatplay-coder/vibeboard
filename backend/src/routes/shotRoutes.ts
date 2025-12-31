/**
 * Shot Routes - Phase 4B: Shot Studio (Production)
 *
 * Endpoints for 3D-aware Spatia generation and ReCo compositional control.
 */

import { Router } from 'express';
import { shotController } from '../controllers/shotController';

const router = Router({ mergeParams: true });

// Main generation endpoint (dispatches to Spatia, ReCo, or standard 2D)
router.post('/generate', shotController.generateShot);

// List available Spatia locations (locked virtual sets)
router.get('/locations', shotController.listSpatiaLocations);

// Lock a location for consistent generation
router.post('/locations/:locationId/lock', shotController.lockLocation);

// Unlock a location
router.post('/locations/:locationId/unlock', shotController.unlockLocation);

export default router;
