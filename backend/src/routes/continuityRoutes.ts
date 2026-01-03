import { Router } from 'express';
import { continuityService } from '../services/ContinuityService';

const router = Router();

/**
 * POST /api/continuity/check
 * Compare two images for visual consistency
 */
router.post('/check', async (req, res) => {
  try {
    const { referenceImageUrl, generatedImageUrl, checkCharacters, characterNames, focusAreas } =
      req.body;

    if (!referenceImageUrl || !generatedImageUrl) {
      return res.status(400).json({
        error: 'Both referenceImageUrl and generatedImageUrl are required',
      });
    }

    const result = await continuityService.checkContinuity(referenceImageUrl, generatedImageUrl, {
      checkCharacters,
      characterNames,
      focusAreas,
    });

    res.json(result);
  } catch (error) {
    console.error('Continuity check error:', error);
    res.status(500).json({ error: 'Failed to check continuity' });
  }
});

/**
 * POST /api/continuity/scene
 * Check consistency across multiple frames in a scene
 */
router.post('/scene', async (req, res) => {
  try {
    const { frames, referenceFrame, characterNames } = req.body;

    if (!frames || !Array.isArray(frames) || frames.length < 2) {
      return res.status(400).json({
        error: 'At least 2 frame URLs are required',
      });
    }

    const result = await continuityService.checkSceneConsistency(frames, {
      referenceFrame,
      characterNames,
    });

    // Convert Map to object for JSON response
    const frameResultsObj: Record<number, any> = {};
    result.frameResults.forEach((value, key) => {
      frameResultsObj[key] = value;
    });

    res.json({
      frameResults: frameResultsObj,
      averageScore: result.averageScore,
      worstFrame: result.worstFrame,
      driftTrend: result.driftTrend,
    });
  } catch (error) {
    console.error('Scene consistency check error:', error);
    res.status(500).json({ error: 'Failed to check scene consistency' });
  }
});

export default router;
