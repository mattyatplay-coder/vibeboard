#!/usr/bin/env node
/**
 * 4-Pose Character Sheet with Tattoo References
 * 
 * Uses V3 LoRA + IP-Adapter with body reference images to create
 * accurate character sheet with proper tattoo placement.
 */

const BASE_URL = 'http://localhost:3001';
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

// Local paths to reference images - will be uploaded via API
const TATTOO_REFS = {
    front: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/uploaded_image_1_1765773064948.png', // Front view
    back: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/uploaded_image_0_1765773064948.png', // Back view
    leftSide: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/uploaded_image_2_1765773064948.png', // Left side
    spine: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/tattoo.spine.jpeg', // Spine close-up
    backDetail: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/uploaded_image_3_1765773064948.png', // Back detail
};

const OPTIMAL = {
    loraId: "f652b3b7-9618-4fe5-89c5-f38c9f62033e",
    loraName: "Angelica.V3",
    strength: 1.0,
    cfg: 4.0,
    steps: 28,
    negativePrompt: "harsh lighting, over-sharpened, plastic skin, HDR, high contrast, airbrushed, blurry, distorted, bad anatomy, incorrect tattoos, missing tattoos",
};

// 4 poses for character sheet
const CHARACTER_SHEET_POSES = [
    {
        name: "Front View",
        prompt: "ohwx_angelica, full body front view, character sheet pose, arms slightly away from body, standing straight, neutral pose, white studio background, even lighting, clean reference sheet, woman with visible tattoos, left arm has woman's face portrait tattoo, right side has floral ribcage tattoo",
        referenceImage: TATTOO_REFS.front,
        referenceStrength: 0.7,
    },
    {
        name: "Back View",
        prompt: "ohwx_angelica, full body back view, character sheet pose, standing straight, showing back tattoos, white studio background, even lighting, clean reference sheet, woman with moon phases spine tattoo, cat skull on left shoulder blade, butterfly on right arm",
        referenceImage: TATTOO_REFS.back,
        referenceStrength: 0.7,
    },
    {
        name: "Left Side View",
        prompt: "ohwx_angelica, full body left side profile view, character sheet pose, standing straight, white studio background, even lighting, clean reference sheet, woman showing left arm tattoos, portrait tattoo on upper left arm, snake tattoo on left thigh visible",
        referenceImage: TATTOO_REFS.leftSide,
        referenceStrength: 0.7,
    },
    {
        name: "Right Side View",
        prompt: "ohwx_angelica, full body right side profile view, character sheet pose, standing straight, white studio background, even lighting, clean reference sheet, woman showing right arm with butterfly moth tattoo, floral tattoo on right hip visible",
        referenceImage: TATTOO_REFS.front, // Use front as ref but prompt for right side
        referenceStrength: 0.5,
    },
];

async function uploadImage(filePath) {
    // Read file and convert to base64
    const fs = require('fs');
    const path = require('path');

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

async function runGeneration(pose) {
    console.log(`\n📸 Generating: ${pose.name}`);

    // Upload reference image
    const refDataUrl = await uploadImage(pose.referenceImage);
    if (!refDataUrl) {
        return { success: false, error: 'Failed to load reference image' };
    }

    const body = {
        mode: "text_to_image",
        inputPrompt: pose.prompt,
        negativePrompt: OPTIMAL.negativePrompt,
        aspectRatio: "3:4", // Portrait for character sheet
        sourceElementIds: [],
        variations: 1,
        sessionId: null,
        engine: "fal",
        falModel: "fal-ai/flux/dev",
        loras: [{
            id: OPTIMAL.loraId,
            name: OPTIMAL.loraName,
            strength: OPTIMAL.strength
        }],
        guidanceScale: OPTIMAL.cfg,
        steps: OPTIMAL.steps,
        // Pass reference images for IP-Adapter
        elementReferences: [refDataUrl],
        elementReferencesWithTypes: [{
            url: refDataUrl,
            type: 'character', // Face/body reference
            strength: pose.referenceStrength
        }],
        referenceCreativity: 1 - pose.referenceStrength, // Inverse for creativity
    };

    try {
        const response = await fetch(`${BASE_URL}/api/projects/${PROJECT_ID}/generations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        return { success: true, id: data.id, pose: pose.name };
    } catch (error) {
        return { success: false, error: error.message, pose: pose.name };
    }
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("🎨 4-Pose Character Sheet Generator");
    console.log("====================================\n");
    console.log("Using V3 LoRA + IP-Adapter with tattoo references\n");

    const results = [];

    for (const pose of CHARACTER_SHEET_POSES) {
        const result = await runGeneration(pose);
        results.push(result);

        if (result.success) {
            console.log(`   ✓ Queued: ${result.id}`);
        } else {
            console.log(`   ✗ Failed: ${result.error}`);
        }

        // Longer delay to avoid overwhelming
        await sleep(1000);
    }

    console.log("\n====================================");
    console.log("🎉 Character sheet generation queued!");
    console.log(`   Success: ${results.filter(r => r.success).length}`);
    console.log(`   Failed: ${results.filter(r => !r.success).length}`);
    console.log("\nCheck Vibeboard to see the 4-pose character sheet!");
}

main().catch(console.error);
