/**
 * Character Foundry Routes
 *
 * AI-driven character performance generation endpoints.
 */

import { Router } from 'express';
import { foundryController } from '../controllers/foundryController';

const router = Router();

// Performance Generation
router.post('/projects/:projectId/foundry/performance', foundryController.generatePerformance);
router.get('/projects/:projectId/foundry/performance/:generationId', foundryController.getPerformanceStatus);

// Asset Listing
router.get('/projects/:projectId/foundry/characters', foundryController.listCharacters);
router.get('/projects/:projectId/foundry/audio', foundryController.listAudio);

export default router;
