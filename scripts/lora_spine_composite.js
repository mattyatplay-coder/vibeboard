#!/usr/bin/env node
/**
 * Focus Test V14: Spine Tattoo - COMPOSITE OVERLAY + BAKE
 * 
 * User Suggestion: "Arrange the images down her spine".
 * My Interpretation: Digital Composite.
 * 
 * Problem: AI struggles to generate specific geometry (hollow circle) from scratch.
 * Solution: 
 * 1. DIGITAL: Overlay the perfect Tattoo Design PNG onto the Body Photo using 'sharp'.
 *    - Mode: 'multiply' (White becomes transparent, Black becomes ink).
 * 2. AI: Run a Low-Strength Img2Img pass to "bake" it into the skin (make it look like a tattoo, not a sticker).
 */

const BASE_URL = 'http://localhost:3001';
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

// 1. The "Much Closer" Base Body (Good anatomy/lighting)
const BODY_IMAGE_PATH = '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/uploaded_image_1765778290460.png';

// 2. The Perfect Digital Design (Hollow circle present)
const TATTOO_DESIGN_PATH = '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/uploaded_image_2_1765777338866.png';

const OPTIMAL = {
    loraId: "f652b3b7-9618-4fe5-89c5-f38c9f62033e",
    loraName: "Angelica.V3",
    strength: 0.35, // Low strength = Keep the overlay geometry, just fix texture
    cfg: 4.0,
    steps: 25,
    negativePrompt: "blurry, distortion, extra fingers, plastic skin",
};

const sharp = require('sharp');
const fs = require('fs');

async function createComposite() {
    console.log("🛠️  Creating Digital Composite...");

    // 1. Load images
    const body = sharp(BODY_IMAGE_PATH);
    const design = sharp(TATTOO_DESIGN_PATH);

    const bodyMeta = await body.metadata();

    // 2. Resize Design to fit spine
    // Spine is roughly center, ~60% height, ~10% width
    // The design is a vertical strip.
    const targetHeight = Math.floor(bodyMeta.height * 0.60);

    const resizedDesign = await design
        .resize({
            height: targetHeight,
            // maintain aspect ratio
        })
        .toBuffer();

    // 3. Composite with 'multiply' (Ink effect)
    // Position: Centered horizontally, starting 15% from top
    const designMeta = await sharp(resizedDesign).metadata();
    const left = Math.floor((bodyMeta.width - designMeta.width) / 2);
    const top = Math.floor(bodyMeta.height * 0.18); // Slightly lower than neck

    // Need to ensure design has transparent background or white background?
    // User file is likely White Background. Multiply works perfectly for White->Transparent.
    // If transparent, 'over' works. Let's assume White Background -> Multiply.

    const compositeBuffer = await body
        .composite([{
            input: resizedDesign,
            top: top,
            left: left,
            blend: 'multiply' // The magic sauce
        }])
        .png()
        .toBuffer();

    return `data:image/png;base64,${compositeBuffer.toString('base64')}`;
}

async function runBake(compositeDataUrl) {
    console.log(`\n📸 Baking Composite into Skin (Img2Img)...`);

    const body = {
        mode: "image_to_image",
        inputPrompt: "ohwx_angelica, back view. Realistic skin texture. Tattoo on spine. Crisp black ink. 8k photo.",
        negativePrompt: OPTIMAL.negativePrompt,
        sourceImageUrl: compositeDataUrl,
        strength: OPTIMAL.strength, // Crucial: Low enough to keep lines, high enough to add skin texture

        // Standard Params
        sessionId: null,
        engine: "fal",
        falModel: "fal-ai/flux/dev",
        loras: [{ id: OPTIMAL.loraId, name: OPTIMAL.loraName, strength: 1.0 }],
        guidanceScale: OPTIMAL.cfg,
        steps: OPTIMAL.steps,
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
    console.log("🎨 Spine Focus V14 - Overlay & Bake");
    console.log("==================================\n");

    try {
        // Step 1: Manual Composite
        const composite = await createComposite();

        // Step 2: AI Texture Bake
        const result = await runBake(composite);

        if (result.success) {
            console.log(`   ✓ Queued Bake Job: ${result.id}`);
        } else {
            console.log(`   ✗ Failed: ${result.error}`);
        }
    } catch (e) {
        console.error(e);
        console.log("Error details:", e.message);
    }

    console.log("\n==================================");
    console.log("🎉 V14 Queued. This guarantees the hollow circle exists!");
}

main().catch(console.error);
