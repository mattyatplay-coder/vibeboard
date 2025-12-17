#!/usr/bin/env node
/**
 * Focus Test V4: Spine Tattoo - UNLEASHED
 * 
 * Problem: The backend 'SmartMode' logic was dampening 'Style' references to ~15-25% strength.
 *          This meant even when we asked for 90% strength, the model only received ~20%.
 * 
 * Solution:
 * 1. Hack: Pass the Tattoo Reference as type 'CHARACTER' to access the higher weight range (30-80%).
 * 2. This bypasses the safety dampening intended for art styles, treating the tattoo as a 'face' to be preserved.
 */

const BASE_URL = 'http://localhost:3001';
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

const REFS = {
    bodyContext: '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/uploaded_image_0_1765775888161.jpg',
    tattooDesign: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/tattoo_spine_v3.jpg',
};

const OPTIMAL = {
    loraId: "f652b3b7-9618-4fe5-89c5-f38c9f62033e",
    loraName: "Angelica.V3",
    strength: 1.0,
    cfg: 4.0,
    steps: 35,
    negativePrompt: "harsh lighting, over-sharpened, plastic skin, distorted, bad anatomy, worst quality, extra moon phases, random circles, crooked alignment, messy ink",
};

const TESTS = [
    {
        name: "Spine V4 - Weight Hack (Tattoo as Character)",
        prompt: "ohwx_angelica, back view, kneeling on floor looking in mirror. focus on spine tattoo. Vertical column of moon phases. The center phase is a HOLLOW OUTLINE circle. Top and bottom are solid black circles. Precise alignment down the spine.",
        bodyRef: REFS.bodyContext,
        tattooRef: REFS.tattooDesign,
        bodyStrength: 0.60,
        // Hack: Send high strength, and we'll label it 'character' to get ~0.7 scale
        tattooStrength: 0.90
    },
    {
        name: "Spine V4 - Max Transfer",
        prompt: "ohwx_angelica, back view. spine tattoo. moon phases. hollow center circle. black ink. vertical.",
        bodyRef: REFS.bodyContext,
        tattooRef: REFS.tattooDesign,
        bodyStrength: 0.40, // Lower body ref to let tattoo dominante
        tattooStrength: 1.0 // Max strength
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

    if (!bodyDataUrl || !tattooDataUrl) return { success: false, error: 'Img load failed' };

    const allRefs = [bodyDataUrl, tattooDataUrl];

    // HACK: Label the tattoo reference as 'character' to bypass the 'style' dampening
    // Backend logic: Character = 0.3 + (strength * 0.5) -> Max ~0.8
    // Backend logic: Style     = 0.05 + (strength * 0.2) -> Max ~0.25 (Too weak!)
    const refWithTypes = [
        { url: bodyDataUrl, type: 'character', strength: test.bodyStrength },
        { url: tattooDataUrl, type: 'character', strength: test.tattooStrength } // HACKED TYPE
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
        referenceCreativity: 0.2, // Low creativity + High weight = Exact Transfer
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
    console.log("🎨 Spine Focus V4 - UNLEASHED (Bypassing Weight Cap)");
    console.log("==================================================\n");

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

    console.log("\n==================================================");
    console.log("🎉 V4 Queued. Tattoo reference should now represent 80% influence!");
}

main().catch(console.error);
