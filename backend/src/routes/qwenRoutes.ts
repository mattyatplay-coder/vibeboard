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
import { withAuth, withDevAuth, requireGenerationQuota } from '../middleware/auth';

const router = Router();
const falAdapter = new FalAIAdapter();

// Use dev auth in development, real auth in production
const authMiddleware = process.env.NODE_ENV === 'production' ? withAuth : withDevAuth;
const quotaMiddleware =
  process.env.NODE_ENV === 'production'
    ? requireGenerationQuota
    : (_req: any, _res: any, next: any) => next();

/**
 * POST /api/qwen/edit
 * Core Qwen image editing endpoint - USES Fal.ai ($)
 */
router.post('/edit', authMiddleware, quotaMiddleware, async (req: Request, res: Response) => {
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
router.post('/reshoot', authMiddleware, quotaMiddleware, async (req: Request, res: Response) => {
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
router.post('/assemble', authMiddleware, quotaMiddleware, async (req: Request, res: Response) => {
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
  authMiddleware,
  quotaMiddleware,
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
router.post('/fix-text', authMiddleware, quotaMiddleware, async (req: Request, res: Response) => {
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
  authMiddleware,
  quotaMiddleware,
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
 * Returns information about all Qwen model capabilities
 */
router.get('/capabilities', (req: Request, res: Response) => {
  res.json({
    models: {
      // Text-to-Image
      'fal-ai/qwen-image': {
        name: 'Qwen Image',
        type: 'text-to-image',
        cost: '$0.02/MP',
        description: 'Foundation text-to-image with strong prompt adherence',
        capabilities: ['text-to-image', 'turbo-mode'],
      },
      'fal-ai/qwen-image-2512': {
        name: 'Qwen Image 2512',
        type: 'text-to-image',
        cost: '$0.02/MP',
        description: 'Latest Qwen with better text rendering, finer textures, realistic humans',
        capabilities: ['text-to-image', 'text-rendering', 'acceleration'],
      },
      // Image-to-Image
      'fal-ai/qwen-image/image-to-image': {
        name: 'Qwen Image I2I',
        type: 'image-to-image',
        cost: '$0.02/MP',
        description: 'Transform images while maintaining structure and style',
        capabilities: ['image-to-image', 'style-transfer'],
      },
      // Image Editing
      'fal-ai/qwen-image-edit': {
        name: 'Qwen Image Edit',
        type: 'image-editing',
        cost: '$0.03/MP',
        description: 'Instruction-based image editing with inpainting support',
        capabilities: ['image-editing', 'inpainting'],
      },
      'fal-ai/qwen-image-edit-2509': {
        name: 'Qwen Image Edit 2509',
        type: 'image-editing',
        cost: '$0.03/MP',
        description: 'Superior text editing and multi-image support. Excellent LoRA base model.',
        capabilities: ['image-editing', 'text-editing', 'multi-image', 'lora-base'],
        loraCompatible: true,
        maxImages: 4,
      },
      'fal-ai/qwen-image-edit-2511': {
        name: 'Qwen Image Edit 2511',
        type: 'image-editing',
        cost: '$0.03/MP',
        description:
          'Latest edit model - geometric reasoning, pose/expression fixes, multi-image compositing. Best LoRA base model.',
        capabilities: [
          'ai-reshoot',
          'cast-assembly',
          'prop-fabrication',
          'text-fix',
          'pose-generation',
          'lora-base',
        ],
        loraCompatible: true,
        maxImages: 4,
      },
      // Layer Decomposition
      'fal-ai/qwen-image-layered': {
        name: 'Qwen Image Layered',
        type: 'layer-decomposition',
        cost: '$0.05/image',
        description: 'Decompose images into RGBA layers for compositing and VFX',
        capabilities: ['layer-extraction', 'compositing'],
        maxLayers: 10,
      },
    },
    // Specialized capabilities for Qwen Edit 2511
    editCapabilities: {
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
    loraBaseModels: ['fal-ai/qwen-image-edit-2509', 'fal-ai/qwen-image-edit-2511'],
  });
});

export default router;
