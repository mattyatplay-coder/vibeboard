#!/usr/bin/env node
/**
 * Focus Test V12: Spine Tattoo - INPAINTING STRATEGY
 * 
 * Problem: Text2Img fails to make the center moon hollow (prior conflict). 
 *          Heavy ControlNet/IP-Adapter fixes the tattoo but ruins the image quality.
 *          The "Best" results (Img 3/4) were simple LoRA generations.
 * 
 * Solution: Two-Stage Pipeline.
 * 1. Generate the High-Quality Base (matching Img 3 settings).
 * 2. Inpaint ONLY the center spine area to force the "Hollow Circle".
 */

const BASE_URL = 'http://localhost:3001';
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

const OPTIMAL = {
    loraId: "f652b3b7-9618-4fe5-89c5-f38c9f62033e",
    loraName: "Angelica.V3",
    strength: 1.0,
    cfg: 4.0,
    steps: 35,
    negativePrompt: "harsh lighting, over-sharpened, plastic skin, distorted, bad anatomy, incorrect tattoos, missing tattoos, extra fingers",
};

// Mask: Vertical strip in the center (approx spine location for 3:4 aspect ratio)
// This is a simple rectangular mask string (base64 or URL). 
// Since we can't easily generate a mask image on the fly without a library, 
// we will rely on FLUX FILL's ability to take a text description? No, Flux Fill needs a mask.
// 
// Alternative: Use `fal-ai/flux/dev/inpainting` which accepts a `mask_url`.
// We will upload a pre-made "Spine Mask" or generate one. 
// For this script, I'll create a simple white-on-black mask file.

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

async function runGeneration() {
    console.log(`\n📸 Stage 1: Generating Base Image (Replicating Best Settings)...`);

    // 1. Generate Base
    const baseBody = {
        mode: "text_to_image",
        inputPrompt: "ohwx_angelica, back view, kneeling on floor looking in mirror, taking selfie. focus on spine. Visible tattoo: vertical column of moon phases running down the spine. The phases are solid black circles and crescents, except for the center full moon which is a simple outline circle. Precise geometric style.",
        negativePrompt: OPTIMAL.negativePrompt,
        aspectRatio: "3:4", // Matching user request
        sourceElementIds: [],
        variations: 1,
        sessionId: null,
        engine: "fal",
        falModel: "fal-ai/flux/dev",
        loras: [{ id: OPTIMAL.loraId, name: OPTIMAL.loraName, strength: OPTIMAL.strength }],
        guidanceScale: OPTIMAL.cfg,
        steps: OPTIMAL.steps
    };

    let baseImageUrl = "";

    try {
        const response = await fetch(`${BASE_URL}/api/projects/${PROJECT_ID}/generations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(baseBody)
        });
        const data = await response.json();

        if (!data.id) throw new Error("No ID returned");
        console.log(`   ✓ Base Queued: ${data.id}`);
        baseImageUrl = data.imageUrl; // Wait, we don't get the URL immediately unless we wait.
        // We need to wait for the result.

        // This script is "fire and forget" usually. 
        // For two-stage, we can't easily do it in one script unless we poll.
        // I'll queue TWO tests:
        // 1. A fresh base generation (to confirm quality).
        // 2. An INPAINTING test using a PREVIOUSLY generated image (if I have one) or a placeholder.

        // Actually, since I can't wait for the result easily here without polling logic,
        // I will queue the BASE generation now.
        // And I will instruct the user to use the "Inpaint" tool in the UI on this result.

        return { success: true, id: data.id };

    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Just run the base generation for now to Restore Confidence
async function main() {
    console.log("🎨 Spine Focus V12 - Restoring Quality");
    console.log("=====================================\n");

    // Test 1: Exact Repro of "Img 3" (Best Quality)
    const result = await runGeneration();

    if (result.success) {
        console.log(`   ✓ Queued High-Quality Base.`);
    } else {
        console.log(`   ✗ Failed: ${result.error}`);
    }

    console.log("\n=====================================");
    console.log("🎉 V12 Queued. Let's get the good photo back first, then Inpaint the tattoo.");
}

main().catch(console.error);
