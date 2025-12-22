import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { tattooCompositingService } from '../services/processing/TattooCompositingService';
import { inpaintingService, InpaintingModel } from '../services/processing/InpaintingService';
import { GrokAdapter } from '../services/llm/GrokAdapter';
import { AIFeedbackStore } from '../services/learning/AIFeedbackStore';
import * as fal from '@fal-ai/serverless-client';

export const processingController = {
  /**
   * Composite a tattoo design onto a base image.
   * Expected FormData:
   * - base_image: File
   * - tattoo_image: File
   * - xOffset: number (default 0)
   * - yOffset: number (default 0)
   * - widthRatio: number (default 0.4)
   * - opacity: number (default 0.85)
   * - blur: number (default 0.8)
   * - rotation: number (default 0) - degrees
   * - warpMode: 'none' | 'mesh' | 'cylindrical' (default 'none')
   * - cylindricalBend: number (default 0.3) - for cylindrical mode
   * - meshPoints: JSON string of 3x3 point grid - for mesh mode
   */
  compositeTattoo: async (req: Request, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const baseFile = files['base_image']?.[0];
      const tattooFile = files['tattoo_image']?.[0];
      const maskFile = files['mask_image']?.[0]; // Optional mask for Compositing

      if (!baseFile || !tattooFile) {
        res.status(400).json({ error: 'Missing base_image or tattoo_image' });
        return;
      }

      const xOffset = parseInt(req.body.xOffset) || 0;
      const yOffset = parseInt(req.body.yOffset) || 0;
      const widthRatio = parseFloat(req.body.widthRatio) || 0.4;
      const opacity = parseFloat(req.body.opacity) || 0.85;
      const blur = parseFloat(req.body.blur) || 0.8;
      const removeBackground = req.body.removeBackground === 'true';
      const rotation = parseFloat(req.body.rotation) || 0;
      const warpMode = (req.body.warpMode || 'none') as 'none' | 'mesh' | 'cylindrical';
      const cylindricalBend = parseFloat(req.body.cylindricalBend) || 0.3;

      // Parse mesh points if provided
      let meshPoints: Array<Array<{ x: number; y: number }>> | undefined;
      if (req.body.meshPoints) {
        try {
          meshPoints = JSON.parse(req.body.meshPoints);
        } catch (e) {
          console.warn('[Processing] Invalid meshPoints JSON, ignoring');
        }
      }

      console.log(
        `[Processing] Compositing Tattoo: OffsetX=${xOffset}, OffsetY=${yOffset}, Rotation=${rotation}°, Warp=${warpMode}, Opacity=${opacity}, RemoveBG=${removeBackground}`
      );

      const resultBuffer = await tattooCompositingService.compositeTattoo(
        fs.readFileSync(baseFile.path),
        fs.readFileSync(tattooFile.path),
        {
          xOffset,
          yOffset,
          widthRatio,
          opacity,
          blur,
          removeBackground,
          rotation,
          warpMode,
          cylindricalBend,
          meshPoints,
          maskBuffer: maskFile ? fs.readFileSync(maskFile.path) : undefined,
        }
      );

      // Send back the image directly
      res.set('Content-Type', 'image/png');
      res.send(resultBuffer);
    } catch (error: any) {
      console.error('Tattoo composition failed:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Get available inpainting models
   */
  getInpaintingModels: async (_req: Request, res: Response) => {
    try {
      const models = inpaintingService.getAvailableModels();
      res.json({ models });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Magic Eraser / Inpainting
   * Removes blemishes/tattoos using Generative Fill.
   */
  magicEraser: async (req: Request, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const imageFile = files['image']?.[0];
      const maskFile = files['mask']?.[0];

      if (!imageFile || !maskFile) {
        res.status(400).json({ error: 'Missing image or mask' });
        return;
      }

      const prompt = req.body.prompt || 'clean skin, high quality, natural texture';
      const modelType = (req.body.model || 'quality') as InpaintingModel;
      const strength = parseFloat(req.body.strength) || 0.95;
      const inferenceSteps = parseInt(req.body.inferenceSteps) || 28;
      const negativePrompt = req.body.negativePrompt || undefined;

      // Debug: Log raw body values
      console.log(
        `[Processing] Raw body values: guidanceScale="${req.body.guidanceScale}" maskExpansion="${req.body.maskExpansion}"`
      );

      // Parse guidanceScale - handle both string and number inputs
      let guidanceScale = 3.5;
      if (
        req.body.guidanceScale !== undefined &&
        req.body.guidanceScale !== null &&
        req.body.guidanceScale !== ''
      ) {
        const parsed = parseFloat(req.body.guidanceScale);
        if (!isNaN(parsed)) {
          guidanceScale = parsed;
        }
      }

      // Parse maskExpansion - pixels to dilate mask to prevent edge ghosting
      // Default to 15px which helps catch necklace chains, jewelry edges, etc.
      let maskExpansion = 15;
      if (
        req.body.maskExpansion !== undefined &&
        req.body.maskExpansion !== null &&
        req.body.maskExpansion !== ''
      ) {
        const parsed = parseInt(req.body.maskExpansion);
        if (!isNaN(parsed) && parsed >= 0) {
          maskExpansion = parsed;
        }
      }

      const imageBuffer = fs.readFileSync(imageFile.path);
      const maskBuffer = fs.readFileSync(maskFile.path);

      console.log(`[Processing] Magic Eraser requested:`);
      console.log(`  Image: ${imageFile.path} (${imageBuffer.length} bytes)`);
      console.log(`  Mask: ${maskFile.path} (${maskBuffer.length} bytes)`);
      console.log(`  Model: ${modelType}`);
      console.log(`  Strength: ${strength}`);
      console.log(`  Inference Steps: ${inferenceSteps}`);
      console.log(`  Guidance Scale: ${guidanceScale}`);
      console.log(`  Mask Expansion: ${maskExpansion}px`);
      if (negativePrompt) console.log(`  Negative Prompt: ${negativePrompt}`);

      // Call Service - now returns Buffer directly
      const resultBuffer = await inpaintingService.processInpainting(
        imageBuffer,
        maskBuffer,
        prompt,
        modelType,
        strength,
        inferenceSteps,
        guidanceScale,
        negativePrompt,
        maskExpansion
      );

      console.log(`[Processing] Magic Eraser result: ${resultBuffer.length} bytes`);

      res.set('Content-Type', 'image/png');
      res.send(resultBuffer);
    } catch (error: any) {
      console.error('Magic Eraser failed:', error);
      // Return specific error from Fal if available
      const message = error.body?.message || error.message || 'Unknown error';
      res.status(500).json({ error: `Magic Eraser failed: ${message}` });
    }
  },

  /**
   * AI-assisted image analysis for inpainting recommendations
   * Uses Grok Vision to analyze the image and mask, then recommends optimal settings
   *
   * Accepts TWO images for best results:
   * - 'original': The clean image without mask (so AI can see what's being removed)
   * - 'masked': The image with red mask overlay (so AI knows the area to process)
   */
  analyzeImageForInpainting: async (req: Request, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const originalFile = files['original']?.[0];
      const maskedFile = files['masked']?.[0];
      const legacyImageFile = files['image']?.[0]; // Fallback for old single-image requests

      // Support both new dual-image and legacy single-image modes
      if (!originalFile && !maskedFile && !legacyImageFile) {
        res.status(400).json({ error: 'Missing images' });
        return;
      }

      const task = req.body.task || 'inpainting_recommendation';
      console.log(`[Processing] AI Analysis requested: task=${task}`);

      // Initialize Grok adapter
      const grok = new GrokAdapter();

      // Get learned hints from feedback store
      const feedbackStore = AIFeedbackStore.getInstance();
      const learnedHints = feedbackStore.getLearnedHints('magic-eraser');
      console.log(`[Processing] Loaded ${learnedHints.length} learned hints from feedback`);

      let analysisResult: string;

      if (originalFile && maskedFile) {
        // NEW: Dual-image mode - send both for better analysis
        console.log(`[Processing] Using dual-image analysis mode`);
        console.log(
          `[Processing] Original image: ${originalFile.path} (${fs.statSync(originalFile.path).size} bytes)`
        );
        console.log(
          `[Processing] Masked image: ${maskedFile.path} (${fs.statSync(maskedFile.path).size} bytes)`
        );

        const originalBuffer = fs.readFileSync(originalFile.path);
        const maskedBuffer = fs.readFileSync(maskedFile.path);

        const base64Original = `data:image/jpeg;base64,${originalBuffer.toString('base64')}`;
        const base64Masked = `data:image/jpeg;base64,${maskedBuffer.toString('base64')}`;

        // Build learned hints section if we have any
        const learnedHintsSection =
          learnedHints.length > 0
            ? `\n\nLEARNED FROM PAST MISTAKES (APPLY THESE LESSONS):
${learnedHints.map((h, i) => `${i + 1}. ${h}`).join('\n')}`
            : '';

        const dualImagePrompt = `You are an expert image editor analyzing images for AI inpainting/object removal.

I'm providing TWO images:
1. [ORIGINAL]: The clean photo showing what's currently in the masked area
2. [MASKED]: The same photo with a RED/PINK semi-transparent overlay showing EXACTLY which area the user wants to remove/modify

CRITICAL RULES:
1. Focus ONLY on what is DIRECTLY UNDER the RED MASKED AREA - that is the ONLY thing being removed
2. The mask is typically a small brush stroke, NOT the entire clothing item
3. Do NOT assume the user wants to remove nearby clothing (bikini, bra, underwear) - they may just be removing a spot ON the clothing or near it
4. Common scenarios:
   - Small dark spot/shadow = residual artifact from previous edit, NOT clothing
   - Thin line along skin = could be a scar, stretch mark, or shadow
   - Discoloration patch = skin blemish, bruise, or editing artifact
   - Actual bikini string = only if the red mask CLEARLY follows an entire string/strap

Look at the SHAPE of the masked area:
- Small blob/circle = blemish, spot, or artifact - use skin-matching prompt
- Long thin line following a strap = actual clothing removal
- Irregular patch = discoloration or editing residue

Based on your analysis, provide optimal inpainting settings in JSON format:

{
    "prompt": "a detailed prompt describing what should REPLACE the masked area - match surrounding skin tone, texture, lighting",
    "negativePrompt": "things to avoid generating - only include what you actually see IN the mask",
    "strength": 0.85-0.98 (higher for complete removal, lower for subtle fixes),
    "inferenceSteps": 28-45 (higher for complex textures like skin),
    "guidanceScale": 3.0-7.0 (higher for strict prompt following, lower for natural blending),
    "maskExpansion": 5-40 (pixels to expand mask - higher for thin objects),
    "reasoning": "Brief: What is ACTUALLY masked, why these settings"
}

Guidelines by what's IN the mask:
- DARK SPOT/ARTIFACT/RESIDUE: prompt="smooth skin matching surrounding area", strength 0.90, steps 30, maskExpansion 10, negative="dark marks, spots, discoloration, shadows"
- SKIN BLEMISH: match exact skin tone in prompt, strength 0.90, steps 30, maskExpansion 10
- TATTOO: strength 0.95+, steps 35+, negative "tattoo, ink, marks, design"
- ACTUAL CLOTHING STRAP (full strap masked): strength 0.95+, maskExpansion 20-30, negative includes clothing type
- JEWELRY: maskExpansion 25-35, negative "jewelry, chain, metallic"
${learnedHintsSection}
Respond ONLY with valid JSON, no markdown or code blocks.`;

        // Send both images with labels
        console.log(`[Processing] Calling Grok Vision API...`);
        try {
          analysisResult = await grok.analyzeImage(
            [
              {
                url: base64Original,
                label: '[ORIGINAL - Clean image showing content to be removed]',
              },
              { url: base64Masked, label: '[MASKED - Red overlay shows the target area]' },
            ],
            dualImagePrompt
          );
          console.log(`[Processing] Grok Vision API returned successfully`);
        } catch (grokError: any) {
          console.error(`[Processing] Grok Vision API failed:`, grokError.message);
          throw grokError;
        }
      } else {
        // LEGACY: Single image mode (fallback)
        console.log(`[Processing] Using legacy single-image analysis mode`);

        const imageFile = legacyImageFile || maskedFile || originalFile;
        const imageBuffer = fs.readFileSync(imageFile!.path);
        const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

        const singleImagePrompt = `You are an expert image editor analyzing an image for AI inpainting/object removal.

The image shows a photo with a red semi-transparent mask overlay indicating the area the user wants to remove or modify.

Analyze the image and provide optimal inpainting settings in JSON format:

{
    "prompt": "a detailed prompt describing what should fill the masked area",
    "negativePrompt": "things to avoid in generation",
    "strength": 0.85-0.98,
    "inferenceSteps": 28-45,
    "guidanceScale": 3.0-7.0,
    "reasoning": "brief explanation"
}

Respond ONLY with valid JSON.`;

        analysisResult = await grok.analyzeImage([base64Image], singleImagePrompt);
      }

      // Parse the JSON response
      let recommendations;
      console.log(
        `[Processing] Raw AI response (first 500 chars):`,
        analysisResult?.substring(0, 500)
      );
      console.log(`[Processing] Raw AI response length: ${analysisResult?.length || 0} chars`);

      try {
        // Try to extract JSON from the response (in case there's extra text)
        const jsonMatch = analysisResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log(`[Processing] Found JSON in response, parsing...`);
          recommendations = JSON.parse(jsonMatch[0]);
          console.log(`[Processing] Successfully parsed AI recommendations`);
        } else {
          console.error(`[Processing] No JSON object found in AI response`);
          throw new Error('No JSON found in response');
        }
      } catch (parseError: any) {
        console.error('[Processing] Failed to parse AI response:', parseError.message);
        console.error('[Processing] Full AI response:', analysisResult);
        // Return default recommendations on parse failure
        recommendations = {
          prompt: 'clean skin, high quality, natural texture, matching skin tone',
          negativePrompt: 'bad anatomy, extra fingers, blurry, distorted, artifacts',
          strength: 0.95,
          inferenceSteps: 32,
          guidanceScale: 4.0,
          maskExpansion: 15,
          reasoning: 'Default settings applied (AI response parsing failed)',
        };
      }

      console.log(`[Processing] AI Recommendations:`, recommendations);

      res.json(recommendations);
    } catch (error: any) {
      console.error('AI Analysis failed:', error);
      res.status(500).json({ error: error.message || 'AI analysis failed' });
    }
  },

  /**
   * AI Tattoo Generation
   * Generates a tattoo directly on skin using img2img with inpainting
   * Expected FormData:
   * - base_image: File (the skin/body photo)
   * - prompt: string (tattoo description)
   * - projectId: string (optional)
   */
  aiTattooGenerate: async (req: Request, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const baseFile = files['base_image']?.[0];

      if (!baseFile) {
        res.status(400).json({ error: 'Missing base_image' });
        return;
      }

      const prompt = req.body.prompt || 'black ink tattoo design on skin';
      const projectId = req.body.projectId;

      console.log(`[Processing] AI Tattoo Generation: prompt="${prompt}"`);

      // Upload base image to Fal storage
      const imageBuffer = fs.readFileSync(baseFile.path);
      const blob = new Blob([imageBuffer], { type: 'image/png' });
      const imageUrl = await fal.storage.upload(blob as any);

      // Use FLUX inpainting model for realistic tattoo generation
      // This generates the tattoo directly integrated with the skin
      const result: any = await fal.subscribe('fal-ai/flux/dev/image-to-image', {
        input: {
          image_url: imageUrl,
          prompt: `${prompt}, realistic black ink tattoo on human skin, professional tattoo art, crisp lines, skin texture visible, photorealistic`,
          strength: 0.75, // Preserve most of the original while adding tattoo
          num_inference_steps: 28,
          guidance_scale: 7.5,
          seed: Math.floor(Math.random() * 1000000),
        },
        logs: true,
        onQueueUpdate: update => {
          if (update.status === 'IN_PROGRESS') {
            update.logs?.map(log => log.message).forEach(console.log);
          }
        },
      });

      if (!result.images?.[0]?.url) {
        throw new Error('No image returned from AI generation');
      }

      console.log(`[Processing] AI Tattoo generated: ${result.images[0].url}`);

      res.json({
        imageUrl: result.images[0].url,
        seed: result.seed,
      });
    } catch (error: any) {
      console.error('AI Tattoo Generation failed:', error);
      res.status(500).json({ error: error.message || 'AI tattoo generation failed' });
    }
  },
};
