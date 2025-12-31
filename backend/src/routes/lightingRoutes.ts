/**
 * Lighting Analysis Routes
 *
 * Endpoints for the Virtual Gaffer's "Inverse Gaffing" feature
 */

import { Router, Request, Response } from 'express';
import { lightingAnalysisService } from '../services/lighting/LightingAnalysisService';
import { withAuth, requireGenerationQuota } from '../middleware/auth';

const router = Router();

/**
 * POST /api/lighting/analyze
 * Analyze a reference image and extract its lighting setup
 *
 * Body: { imageUrl: string }
 * Returns: LightingAnalysisResult
 */
// P0 SECURITY: Uses Grok Vision (LLM $) - requires auth
router.post('/analyze', withAuth, requireGenerationQuota, async (req: Request, res: Response) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        error: 'Missing imageUrl in request body',
      });
    }

    console.log('[Lighting API] Analyzing lighting for image:', imageUrl.substring(0, 50) + '...');

    const result = await lightingAnalysisService.analyzeLighting(imageUrl);

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Lighting API] Analysis error:', error);
    return res.status(500).json({
      error: 'Failed to analyze lighting',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
