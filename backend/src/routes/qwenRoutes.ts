/**
 * Qwen Image Edit 2511 Routes
 *
 * Provides API endpoints for Qwen's advanced image editing capabilities:
 * - AI Reshoot (expression/gaze fixes)
 * - Cast Assembly (multi-character compositing)
 * - Prop Fabrication (geometric reskinning)
 * - Text/Sign Fix (gibberish correction, localization)
 * - Pose Generation (Character Foundry integration)
 *
 * P0 SECURITY: All Qwen routes require authentication.
 * Each call costs ~$0.03 per megapixel.
 */

import { Router, Request, Response } from 'express';
import { FalAIAdapter } from '../services/generators/FalAIAdapter';
import { withAuth, requireGenerationQuota } from '../middleware/auth';

const router = Router();
const falAdapter = new FalAIAdapter();

/**
 * POST /api/qwen/edit
 * Core Qwen image editing endpoint - USES Fal.ai ($)
 */
router.post('/edit', withAuth, requireGenerationQuota, async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      imageUrls,
      negativePrompt,
      numInferenceSteps,
      guidanceScale,
      seed,
      imageSize,
      numImages,
    } = req.body;

    if (!prompt || !imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({
        error: 'prompt and imageUrls (array) are required',
      });
    }

    const result = await falAdapter.editWithQwen({
      prompt,
      imageUrls,
      negativePrompt,
      numInferenceSteps,
      guidanceScale,
      seed,
      imageSize,
      numImages,
    });

    res.json(result);
  } catch (error: any) {
    console.error('[Qwen Routes] Edit failed:', error);
    res.status(500).json({ error: error.message || 'Qwen edit failed' });
  }
});

/**
 * POST /api/qwen/reshoot
 * AI Reshoot - Fix expressions, gaze, minor pose adjustments
 *
 * Use cases:
 * - "Make character look at camera"
 * - "Change expression to smiling"
 * - "Close the character's mouth"
 */
router.post('/reshoot', withAuth, requireGenerationQuota, async (req: Request, res: Response) => {
  try {
    const { imageUrl, instruction, preserveBackground, seed } = req.body;

    if (!imageUrl || !instruction) {
      return res.status(400).json({
        error: 'imageUrl and instruction are required',
      });
    }

    const result = await falAdapter.reshootWithQwen(imageUrl, instruction, {
      preserveBackground,
      seed,
    });

    res.json(result);
  } catch (error: any) {
    console.error('[Qwen Routes] Reshoot failed:', error);
    res.status(500).json({ error: error.message || 'Reshoot failed' });
  }
});

/**
 * POST /api/qwen/assemble
 * Cast Assembler - Composite multiple characters into one scene
 * Solves multi-LoRA concept bleeding
 */
router.post('/assemble', withAuth, requireGenerationQuota, async (req: Request, res: Response) => {
  try {
    const { characterImages, sceneDescription, backgroundImage, seed, imageSize } = req.body;

    if (!characterImages || !Array.isArray(characterImages) || characterImages.length < 2) {
      return res.status(400).json({
        error: 'characterImages must be an array with at least 2 images',
      });
    }

    if (!sceneDescription) {
      return res.status(400).json({
        error: 'sceneDescription is required',
      });
    }

    const result = await falAdapter.assembleCharacters(characterImages, sceneDescription, {
      backgroundImage,
      seed,
      imageSize,
    });

    res.json(result);
  } catch (error: any) {
    console.error('[Qwen Routes] Assembly failed:', error);
    res.status(500).json({ error: error.message || 'Cast assembly failed' });
  }
});

/**
 * POST /api/qwen/fabricate-prop
 * Prop Fabrication - Reskin props while maintaining geometry
 */
router.post(
  '/fabricate-prop',
  withAuth,
  requireGenerationQuota,
  async (req: Request, res: Response) => {
    try {
      const { propImage, transformDescription, maintainPerspective, seed } = req.body;

      if (!propImage || !transformDescription) {
        return res.status(400).json({
          error: 'propImage and transformDescription are required',
        });
      }

      const result = await falAdapter.fabricateProp(propImage, transformDescription, {
        maintainPerspective,
        seed,
      });

      res.json(result);
    } catch (error: any) {
      console.error('[Qwen Routes] Prop fabrication failed:', error);
      res.status(500).json({ error: error.message || 'Prop fabrication failed' });
    }
  }
);

/**
 * POST /api/qwen/fix-text
 * Text/Sign Fixer - Correct gibberish or localize text
 */
router.post('/fix-text', withAuth, requireGenerationQuota, async (req: Request, res: Response) => {
  try {
    const { imageUrl, textInstruction, matchStyle, seed } = req.body;

    if (!imageUrl || !textInstruction) {
      return res.status(400).json({
        error: 'imageUrl and textInstruction are required',
      });
    }

    const result = await falAdapter.fixText(imageUrl, textInstruction, {
      matchStyle,
      seed,
    });

    res.json(result);
  } catch (error: any) {
    console.error('[Qwen Routes] Text fix failed:', error);
    res.status(500).json({ error: error.message || 'Text fix failed' });
  }
});

/**
 * POST /api/qwen/generate-pose
 * Pose Generation for Character Foundry
 * Uses Qwen's geometric reasoning for accurate angle/pose changes
 */
router.post(
  '/generate-pose',
  withAuth,
  requireGenerationQuota,
  async (req: Request, res: Response) => {
    try {
      const {
        sourceImage,
        poseInstruction,
        characterDescription,
        maintainIdentity,
        aspectRatio,
        seed,
      } = req.body;

      if (!sourceImage || !poseInstruction) {
        return res.status(400).json({
          error: 'sourceImage and poseInstruction are required',
        });
      }

      const result = await falAdapter.generatePoseWithQwen(sourceImage, poseInstruction, {
        characterDescription,
        maintainIdentity,
        aspectRatio,
        seed,
      });

      res.json(result);
    } catch (error: any) {
      console.error('[Qwen Routes] Pose generation failed:', error);
      res.status(500).json({ error: error.message || 'Pose generation failed' });
    }
  }
);

/**
 * GET /api/qwen/capabilities
 * Returns information about Qwen's capabilities
 */
router.get('/capabilities', (req: Request, res: Response) => {
  res.json({
    model: 'qwen-image-edit-2511',
    provider: 'fal.ai',
    cost: '$0.03 per megapixel',
    capabilities: {
      reshoot: {
        description: 'Fix expressions, gaze, minor poses without regenerating',
        examples: [
          'Make character look at camera',
          'Change expression to smiling',
          'Turn head slightly left',
        ],
      },
      assemble: {
        description: 'Composite multiple characters into one scene',
        minImages: 2,
        maxImages: 4,
        examples: [
          'Put both characters in a coffee shop together',
          'Combine the hero and villain in a confrontation scene',
        ],
      },
      fabricateProp: {
        description: 'Reskin props while maintaining geometry',
        examples: [
          'Transform this sword into a glowing lightsaber',
          'Turn this modern car into a Mad Max vehicle',
        ],
      },
      fixText: {
        description: 'Correct gibberish text or localize signs',
        examples: [
          'Change the sign to say DANGER in red',
          'Replace the Japanese text with English WELCOME',
        ],
      },
      generatePose: {
        description: 'Generate character poses for LoRA training',
        examples: [
          'Change to front view facing camera',
          'Turn to 3/4 view from the left side',
          'Change to side profile',
        ],
      },
    },
    parameters: {
      numInferenceSteps: { default: 28, range: [1, 50] },
      guidanceScale: { default: 4.5, range: [1, 20] },
      imageSizes: ['square_hd', 'portrait_4_3', 'landscape_4_3', 'portrait_16_9', 'landscape_16_9'],
    },
  });
});

export default router;
