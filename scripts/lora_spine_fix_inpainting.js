#!/usr/bin/env node
/**
 * Focus Test V13: Spine Tattoo - INPAINTING SURGERY
 * 
 * The user identified the "Simple/Clean" base as "Much closer".
 * Now we perform the final surgery: Inpainting the center element to be HOLLOW.
 * 
 * Method:
 * 1. Load the "Much Closer" image.
 * 2. Generate a "Spine Mask" using 'sharp'.
 *    - A vertical strip down the center where the tattoo is.
 * 3. Run Flux Inpainting on that mask.
 *    - Prompt: "Hollow outline circle, transparent ring".
 */

const BASE_URL = 'http://localhost:3001';
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

// The "Much Closer" Image
const SOURCE_IMAGE_PATH = '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/uploaded_image_1765778290460.png';

const OPTIMAL = {
    loraId: "f652b3b7-9618-4fe5-89c5-f38c9f62033e",
    loraName: "Angelica.V3",
    strength: 0.9, // Lower strength during inpainting to blend well?
    // Actually, for specific detail replacement, higher strength is better for the concept, 
    // but we need to keep the skin tone. Flux Fill is usually good at blending.
};

const sharp = require('sharp');
const fs = require('fs');

async function createSpineMask(inputPath) {
    const metadata = await sharp(inputPath).metadata();
    const { width, height } = metadata;

    // Create a black canvas (transparent/black)
    // For mask: White = Inpaint, Black = Keep.

    // Calculate spine area.
    // It's usually exactly in the center.
    // Width: ~10% of total width (narrow strip)
    // Height: ~50% of total height (from neck down)
    // Top: ~15% from top

    const maskWidth = Math.floor(width * 0.12);
    const maskHeight = Math.floor(height * 0.6);
    const top = Math.floor(height * 0.15);
    const left = Math.floor((width - maskWidth) / 2);

    const svgRect = `
    <svg width="${width}" height="${height}">
      <rect x="${left}" y="${top}" width="${maskWidth}" height="${maskHeight}" fill="white" />
    </svg>
    `;

    const maskBuffer = await sharp({
        create: {
            width: width,
            height: height,
            channels: 3,
            background: { r: 0, g: 0, b: 0 }
        }
    })
        .composite([{ input: Buffer.from(svgRect), blend: 'add' }])
        .png()
        .toBuffer();

    return `data:image/png;base64,${maskBuffer.toString('base64')}`;
}

function getFileAsBase64(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return `data:image/png;base64,${fileBuffer.toString('base64')}`; // Assuming PNG from upload name
}

async function runInpainting() {
    console.log(`\n📸 Generating Mask for Inpainting...`);

    if (!fs.existsSync(SOURCE_IMAGE_PATH)) {
        console.error("Source image not found!");
        return { success: false, error: "Source not found" };
    }

    const maskDataUrl = await createSpineMask(SOURCE_IMAGE_PATH);
    const sourceDataUrl = getFileAsBase64(SOURCE_IMAGE_PATH);

    // Prompt specifically for the corrected tattoo
    const prompt = "Perfect human back skin texture. Spine tattoo. A vertical column of moon phases. The center element is a HOLLOW OUTLINE CIRCLE (transparent ring, skin visible inside). Top and bottom elements are solid black. Crisp ink, hyperrealistic.";

    const body = {
        mode: "inpainting", // Not "text_to_image"
        inputPrompt: prompt,
        negativePrompt: "solid center circle, filled black dot, messy, blurry, distorted text",

        // Inpainting Params
        sourceImageUrl: sourceDataUrl,
        maskImageUrl: maskDataUrl, // Passed as manual mask

        // Standard Params
        sessionId: null,
        engine: "fal",
        falModel: "fal-ai/flux/dev/inpainting", // Use specific inpainting model

        // LoRA to ensure Identity match if it regenerates skin
        loras: [{ id: OPTIMAL.loraId, name: OPTIMAL.loraName, strength: OPTIMAL.strength }],

        guidanceScale: 3.5,
        steps: 30,
        strength: 1.0 // Inpainting strength (1.0 = replace masked area completely vs 0.x = blend)
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
    console.log("🎨 Spine Focus V13 - Inpainting Surgery");
    console.log("=====================================\n");

    try {
        const result = await runInpainting();

        if (result.success) {
            console.log(`   ✓ Queued Inpainting Job: ${result.id}`);
        } else {
            console.log(`   ✗ Failed: ${result.error}`);
        }
    } catch (e) {
        console.error(e);
    }

    console.log("\n=====================================");
    console.log("🎉 V13 Queued. This forces the 'Hollow Ring' onto the good base image.");
}

main().catch(console.error);
