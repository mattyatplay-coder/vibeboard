#!/usr/bin/env node
/**
 * Focus Test V7: Spine Tattoo - THE INVERSE APPROACH
 * 
 * Problem: The "Hollow Center Circle" is being ignored when we generate the body first.
 * Solution: Prioritize the Tattoo's Geometry above all else.
 * 
 * Method 1: Ink-to-Skin (Img2Img)
 * - Input: The raw Tattoo Design (Black ink, white background).
 * - Process: High strength Img2Img prompt "Back of woman, realistic skin..."
 * - Goal: Turn the white paper into skin, keep the ink black. Result = Perfect tattoo on skin patch.
 * 
 * Method 2: Direct Mapping (ControlNet Canny)
 * - Input: The raw Tattoo Design.
 * - Process: Use Canny to lock the tattoo lines, then generate a full back view.
 * - Theory: Since the tattoo is a vertical strip, and the spine is a vertical strip, 
 *           Flux might align them perfectly if we use the right aspect ratio.
 */

const BASE_URL = 'http://localhost:3001';
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

const REFS = {
    // The PERFECT design file (Black on White)
    tattooDesign: '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/uploaded_image_2_1765776107950.jpg',
};

const OPTIMAL = {
    loraId: "f652b3b7-9618-4fe5-89c5-f38c9f62033e",
    loraName: "Angelica.V3",
    strength: 1.0,
    cfg: 4.0,
    steps: 35,
    negativePrompt: "paper, drawing, illustration, cartoon, sketch, pen, pencil, distorted, bad anatomy",
};

const TESTS = [
    {
        name: "Spine V7 - Ink to Skin (Texture Swap)",
        prompt: "ohwx_angelica, close up macro shot of the spine of a woman. tanned realistic skin texture. The black ink tattoo is clearly visible on the skin. Goosebumps, pores, hyperrealistic 8k photography.",
        imageRef: REFS.tattooDesign,
        // Img2Img settings
        strength: 0.75, // Enough to change paper->skin, but keep shapes
        mode: "img2img"
    },
    {
        name: "Spine V7 - Direct Mapping (ControlNet Canny)",
        prompt: "ohwx_angelica, back view, naked back, kneeling. The moon phases tattoo runs perfectly down the spine. Realistic skin. Studio lighting.",
        imageRef: REFS.tattooDesign,
        // ControlNet settings
        controlNetType: "canny",
        controlNetStrength: 1.0, // FORCE the lines
        mode: "txt2img"
    }
];

const fs = require('fs');
const path = require('path');

function uploadImage(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return null;
    }
    const fileBuffer = fs.readFileSync(filePath);
    const base64 = fileBuffer.toString('base64');
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    return `data:${mimeType};base64,${base64}`;
}

async function runGeneration(test) {
    console.log(`\n📸 Generating: ${test.name}`);

    const imageDataUrl = uploadImage(test.imageRef);
    if (!imageDataUrl) return { success: false, error: 'Img load failed' };

    let body = {};

    if (test.mode === "img2img") {
        // IMAGE TO IMAGE SETUP
        body = {
            mode: "image_to_image", // Correct mode for backend
            inputPrompt: test.prompt,
            negativePrompt: OPTIMAL.negativePrompt,
            sourceImageUrl: imageDataUrl, // Backend handles upload
            strength: test.strength,
            // Standard params
            sessionId: null,
            engine: "fal",
            falModel: "fal-ai/flux/dev",
            loras: [{ id: OPTIMAL.loraId, name: OPTIMAL.loraName, strength: OPTIMAL.strength }],
            guidanceScale: OPTIMAL.cfg,
            steps: OPTIMAL.steps,
            referenceCreativity: 0.5,
        };
    } else {
        // CONTROLNET SETUP
        body = {
            mode: "text_to_image",
            inputPrompt: test.prompt,
            negativePrompt: OPTIMAL.negativePrompt,
            aspectRatio: "3:4",
            sourceElementIds: [],
            variations: 1,
            sessionId: null,
            engine: "fal",
            falModel: "fal-ai/flux/dev",
            loras: [{ id: OPTIMAL.loraId, name: OPTIMAL.loraName, strength: OPTIMAL.strength }],
            guidanceScale: OPTIMAL.cfg,
            steps: OPTIMAL.steps,

            // Use the Tattoo Lineart as ControlNet
            controlNets: [{
                path: "XLabs-AI/flux-controlnet-canny-v3",
                image_url: imageDataUrl,
                conditioning_scale: test.controlNetStrength
            }]
        };
    }

    try {
        const response = await fetch(`${BASE_URL}/api/projects/${PROJECT_ID}/generations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        // Backend adapter expects "sourceImages" array for img2img in some versions, 
        // or handles 'sourceImageUrl' via mapping. Let's hope the adapter is smart.
        // If it fails, I'll update the script.

        // Actually, checking FalAIAdapter.ts... it uses `options.sourceImages?.[0] || options.sourceVideoUrl`.
        // The GenerationController maps body.sourceImageUrl -> options.sourceImages[0]. 
        // So this should work.

        const data = await response.json();
        return { success: true, id: data.id };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("🎨 Spine Focus V7 - The Inverse Approach");
    console.log("========================================\n");

    const results = [];

    for (const test of TESTS) {
        const result = await runGeneration(test);
        results.push(result);

        if (result.success) {
            console.log(`   ✓ Queued: ${result.id}`);
        } else {
            console.log(`   ✗ Failed: ${result.error}`);
        }
    }

    console.log("\n========================================");
    console.log("🎉 V7 Queued. Checking if we can turn ink into skin!");
}

main().catch(console.error);
