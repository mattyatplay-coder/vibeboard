import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { tattooCompositingService } from '../services/processing/TattooCompositingService';
import { inpaintingService, InpaintingModel } from '../services/processing/InpaintingService';
import { GrokAdapter } from '../services/llm/GrokAdapter';

export const processingController = {

    /**
     * Composite a tattoo design onto a base image.
     * Expected FormData:
     * - base_image: File
     * - tattoo_image: File
     * - xOffset: number (default 60)
     * - widthRatio: number (default 0.4)
     * - opacity: number (default 0.85)
     * - blur: number (default 0.8)
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

            const xOffset = parseInt(req.body.xOffset) || 60;
            const yOffset = parseInt(req.body.yOffset) || 0;
            const widthRatio = parseFloat(req.body.widthRatio) || 0.4;
            const opacity = parseFloat(req.body.opacity) || 0.85; // User requested slider control
            const blur = parseFloat(req.body.blur) || 0.8;
            const removeBackground = req.body.removeBackground === 'true'; // New Checkbox

            console.log(`[Processing] Compositing Tattoo: OffsetX=${xOffset}, OffsetY=${yOffset} Opacity=${opacity}, RemoveBG=${removeBackground}`);

            const resultBuffer = await tattooCompositingService.compositeTattoo(
                fs.readFileSync(baseFile.path),
                fs.readFileSync(tattooFile.path),
                {
                    xOffset, yOffset, widthRatio, opacity, blur, removeBackground,
                    maskBuffer: maskFile ? fs.readFileSync(maskFile.path) : undefined
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

            const prompt = req.body.prompt || "clean skin, high quality, natural texture";
            const modelType = (req.body.model || 'quality') as InpaintingModel;
            const strength = parseFloat(req.body.strength) || 0.95;
            const inferenceSteps = parseInt(req.body.inferenceSteps) || 28;
            const negativePrompt = req.body.negativePrompt || undefined;

            // Debug: Log raw body values
            console.log(`[Processing] Raw body values: guidanceScale="${req.body.guidanceScale}" maskExpansion="${req.body.maskExpansion}"`);

            // Parse guidanceScale - handle both string and number inputs
            let guidanceScale = 3.5;
            if (req.body.guidanceScale !== undefined && req.body.guidanceScale !== null && req.body.guidanceScale !== '') {
                const parsed = parseFloat(req.body.guidanceScale);
                if (!isNaN(parsed)) {
                    guidanceScale = parsed;
                }
            }

            // Parse maskExpansion - pixels to dilate mask to prevent edge ghosting
            // Default to 15px which helps catch necklace chains, jewelry edges, etc.
            let maskExpansion = 15;
            if (req.body.maskExpansion !== undefined && req.body.maskExpansion !== null && req.body.maskExpansion !== '') {
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
            const message = error.body?.message || error.message || "Unknown error";
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

            let analysisResult: string;

            if (originalFile && maskedFile) {
                // NEW: Dual-image mode - send both for better analysis
                console.log(`[Processing] Using dual-image analysis mode`);

                const originalBuffer = fs.readFileSync(originalFile.path);
                const maskedBuffer = fs.readFileSync(maskedFile.path);

                const base64Original = `data:image/jpeg;base64,${originalBuffer.toString('base64')}`;
                const base64Masked = `data:image/jpeg;base64,${maskedBuffer.toString('base64')}`;

                const dualImagePrompt = `You are an expert image editor analyzing images for AI inpainting/object removal.

I'm providing TWO images:
1. [ORIGINAL]: The clean photo showing what's currently in the masked area
2. [MASKED]: The same photo with a RED semi-transparent overlay showing exactly which area the user wants to remove/modify

IMPORTANT: Compare both images to understand:
- WHAT is in the masked area (tattoo, birthmark, scar, background object, text, etc.)
- The CONTEXT around it (skin tone, texture, lighting, background pattern)
- What should REPLACE it (clean skin, seamless background, etc.)

Based on your analysis, provide optimal inpainting settings in JSON format:

{
    "prompt": "a detailed prompt describing what should fill the masked area - be SPECIFIC about texture, color, lighting, and context",
    "negativePrompt": "things to avoid - include what you saw in the masked area that needs removal",
    "strength": 0.85-0.98 (higher for complete removal like tattoos, lower for subtle fixes),
    "inferenceSteps": 28-45 (higher for complex textures like skin or detailed backgrounds),
    "guidanceScale": 3.0-7.0 (higher for strict prompt following, lower for natural blending),
    "maskExpansion": 5-40 (pixels to expand mask edges - higher for thin objects like chains/jewelry that cause ghosting),
    "reasoning": "brief explanation of what you detected and why you chose these settings"
}

Guidelines:
- TATTOO removal: strength 0.95+, steps 35+, negative must include "tattoo, ink, marks, design"
- SKIN blemishes: match exact skin tone in prompt, strength 0.90, steps 30
- BACKGROUND objects: describe surrounding texture/pattern, strength 0.95
- HANDS/FINGERS in mask: steps 40+, guidance 5+, negative "extra fingers, bad anatomy, distorted"
- TEXT/WATERMARK: strength 0.98, describe replacement background
- JEWELRY/NECKLACE/CHAINS: maskExpansion 25-35 (thin objects cause edge ghosting), negative "necklace, chain, jewelry, pendant, metallic, reflection"
- GLASSES/FRAMES: maskExpansion 20-30, account for shadows and reflections

Respond ONLY with valid JSON, no markdown or code blocks.`;

                // Send both images with labels
                analysisResult = await grok.analyzeImage([
                    { url: base64Original, label: '[ORIGINAL - Clean image showing content to be removed]' },
                    { url: base64Masked, label: '[MASKED - Red overlay shows the target area]' }
                ], dualImagePrompt);

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
            try {
                // Try to extract JSON from the response (in case there's extra text)
                const jsonMatch = analysisResult.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    recommendations = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error("No JSON found in response");
                }
            } catch (parseError) {
                console.error('[Processing] Failed to parse AI response:', analysisResult);
                // Return default recommendations on parse failure
                recommendations = {
                    prompt: "clean skin, high quality, natural texture, matching skin tone",
                    negativePrompt: "bad anatomy, extra fingers, blurry, distorted, artifacts",
                    strength: 0.95,
                    inferenceSteps: 32,
                    guidanceScale: 4.0,
                    maskExpansion: 15,
                    reasoning: "Default settings applied (AI response parsing failed)"
                };
            }

            console.log(`[Processing] AI Recommendations:`, recommendations);

            res.json(recommendations);

        } catch (error: any) {
            console.error('AI Analysis failed:', error);
            res.status(500).json({ error: error.message || "AI analysis failed" });
        }
    }
};
