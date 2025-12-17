#!/usr/bin/env node
/**
 * Focus Test V15: Spine Tattoo - COMPOSITE + CANNY LOCK
 * 
 * User Feedback: "Consistency of the precise design... design, shape and placement are crucial."
 * Previous Failure: V14 "Bake" drifted because it relied only on Img2Img strength.
 * 
 * V15 Solution:
 * 1. Create the Composite (Design overlaid on Body).
 * 2. Use ControlNet Canny ON THE COMPOSITE.
 *    - This extracts the EXACT edges of the overlaid tattoo.
 * 3. Run Img2Img with this Canny Lock.
 *    - Input: Composite.
 *    - Control: Composite (Canny).
 *    - Result: The model mimics the Input (Placement/Colors) and obeys the Control (Exact Shapes) while generating "Realistic Skin" texture.
 */

const BASE_URL = 'http://localhost:3001';
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

// 1. The "Much Closer" Base Body
const BODY_IMAGE_PATH = '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/uploaded_image_1765778290460.png';

// 2. The Perfect Digital Design
const TATTOO_DESIGN_PATH = '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/uploaded_image_2_1765777338866.png';

const OPTIMAL = {
    loraId: "f652b3b7-9618-4fe5-89c5-f38c9f62033e",
    loraName: "Angelica.V3",
    strength: 0.55, // Higher strength to fix texture, BUT constrained by Canny
    cfg: 4.0,
    steps: 30,
    negativePrompt: "blurry, distortion, extra fingers, plastic skin, drawing, sketch",
};

const sharp = require('sharp');
const fs = require('fs');

async function createComposite() {
    console.log("🛠️  Creating Exact Composite...");

    // 1. Load images
    const body = sharp(BODY_IMAGE_PATH);
    const design = sharp(TATTOO_DESIGN_PATH);

    const bodyMeta = await body.metadata();

    // 2. Resize Design carefully
    // User mentioned "Sectioning". The full design is long.
    // Let's ensure it fits vertically nicely on the spine.
    // 70% of height seems appropriate for a full spine tattoo.
    const targetHeight = Math.floor(bodyMeta.height * 0.70);

    const resizedDesign = await design
        .resize({
            height: targetHeight,
        })
        .toBuffer();

    // 3. Composite
    const designMeta = await sharp(resizedDesign).metadata();
    const left = Math.floor((bodyMeta.width - designMeta.width) / 2); // Center X
    const top = Math.floor(bodyMeta.height * 0.15); // Start at neck base

    const compositeBuffer = await body
        .composite([{
            input: resizedDesign,
            top: top,
            left: left,
            blend: 'multiply' // Perfect ink transfer
        }])
        .png()
        .toBuffer();

    // Save to disk for inspection/debugging if needed
    // fs.writeFileSync('temp_composite.png', compositeBuffer);

    return `data:image/png;base64,${compositeBuffer.toString('base64')}`;
}

async function runCannyBake(compositeDataUrl) {
    console.log(`\n📸 Running Img2Img with Canny Lock...`);

    const body = {
        mode: "image_to_image",
        inputPrompt: "ohwx_angelica, back view. hyperrealistic 8k photo. visible spine texture. tattoo on spine is crisp black ink on skin. pores, goosebumps.",
        negativePrompt: OPTIMAL.negativePrompt,

        // SOURCE: The Composite (provides placement + color)
        sourceImageUrl: compositeDataUrl,
        strength: OPTIMAL.strength,

        // Standard Params
        sessionId: null,
        engine: "fal",
        falModel: "fal-ai/flux/dev",
        loras: [{ id: OPTIMAL.loraId, name: OPTIMAL.loraName, strength: 1.0 }],
        guidanceScale: OPTIMAL.cfg,
        steps: OPTIMAL.steps,

        // CONTROL: The Composite again (provides EXACT EDGES via Canny)
        controlNets: [{
            path: "XLabs-AI/flux-controlnet-canny-v3",
            image_url: compositeDataUrl, // Canny sees the sharp ink lines overlay
            conditioning_scale: 0.85 // High adherence to lines
        }]
    };

    try {
        const response = await fetch(`${BASE_URL}/api/projects/${PROJECT_ID}/generations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        return { success: true, id: data.id };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function main() {
    console.log("🎨 Spine Focus V15 - Composite + Canny Lock");
    console.log("=========================================\n");

    try {
        // Step 1: Create the Exact Composite
        const composite = await createComposite();

        // Step 2: Bake it with Canny Lock
        const result = await runCannyBake(composite);

        if (result.success) {
            console.log(`   ✓ Queued Canny Bake Job: ${result.id}`);
        } else {
            console.log(`   ✗ Failed: ${result.error}`);
        }
    } catch (e) {
        console.error(e);
    }

    console.log("\n=========================================");
    console.log("🎉 V15 Queued. The 'Canny Lock' should force the AI to respect the composite's lines.");
}

main().catch(console.error);
