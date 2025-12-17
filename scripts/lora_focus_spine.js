#!/usr/bin/env node
/**
 * Focus Test: Moonphase Spine Tattoo
 * 
 * Target: Accurately render the moonphase tattoo running down the spine.
 * Method: 
 *  - V3 LoRA for subject identity
 *  - IP-Adapter (Character) on the full-body mirror selfie for Pose/Context
 *  - IP-Adapter (Style) on the specific tattoo PNG for design accuracy
 */

const BASE_URL = 'http://localhost:3001';
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

const REFS = {
    // The user just uploaded these mirror selfies showing the spine tattoo perfectly
    bodyContext: '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/uploaded_image_0_1765775888161.jpg',

    // The specific cutout reference
    tattooDesign: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/tattoo.spine.png',
};

const OPTIMAL = {
    loraId: "f652b3b7-9618-4fe5-89c5-f38c9f62033e",
    loraName: "Angelica.V3",
    strength: 1.0,
    cfg: 4.0,
    steps: 30,
    negativePrompt: "harsh lighting, over-sharpened, plastic skin, HDR, high contrast, airbrushed, blurry, distorted, bad anatomy, incorrect tattoos, missing tattoos, crooked spine, extra fingers",
};

const TESTS = [
    {
        name: "Spine Tattoo - Direct Recreation",
        prompt: "ohwx_angelica, back view, kneeling on floor looking in mirror, taking selfie with phone. Visible tattoo: vertical moon phases tattoo running exactly down the center of the spine. The tattoo shows changing phases of the moon in black ink. Natural bedroom lighting.",
        bodyRef: REFS.bodyContext,
        tattooRef: REFS.tattooDesign,
        bodyStrength: 0.70,  // High influence from the reference pose/body
        tattooStrength: 0.50 // Moderate influence to enforce the specific design
    },
    {
        name: "Spine Tattoo - Studio Back View",
        prompt: "ohwx_angelica, professional back view character sheet pose, standing straight, white background. Key feature: precise moon phases tattoo down the spine, perfectly aligned. Minimalist aesthetic.",
        bodyRef: REFS.bodyContext, // Use the same body for "angelica's back" reference
        tattooRef: REFS.tattooDesign,
        bodyStrength: 0.50, // Lower body strength to allow changing the pose to standing
        tattooStrength: 0.60 // Higher tattoo strength to ensure it transfers to new pose
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

    const bodyDataUrl = uploadImage(test.bodyRef);
    const tattooDataUrl = uploadImage(test.tattooRef);

    if (!bodyDataUrl || !tattooDataUrl) {
        return { success: false, error: 'Failed to load images' };
    }

    // Construct Reference Arrays
    const allRefs = [bodyDataUrl, tattooDataUrl];
    const refWithTypes = [
        { url: bodyDataUrl, type: 'character', strength: test.bodyStrength },
        { url: tattooDataUrl, type: 'style', strength: test.tattooStrength }
    ];

    const body = {
        mode: "text_to_image",
        inputPrompt: test.prompt,
        negativePrompt: OPTIMAL.negativePrompt,
        aspectRatio: "3:4",
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
        elementReferences: allRefs,
        elementReferencesWithTypes: refWithTypes,
        referenceCreativity: 0.35,
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

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("🎨 Focusing on Spine Tattoo");
    console.log("===========================\n");

    const results = [];

    for (const test of TESTS) {
        const result = await runGeneration(test);
        results.push(result);

        if (result.success) {
            console.log(`   ✓ Queued: ${result.id}`);
        } else {
            console.log(`   ✗ Failed: ${result.error}`);
        }

        await sleep(2000);
    }

    console.log("\n===========================");
    console.log("🎉 Focus test complete!");
}

main().catch(console.error);
