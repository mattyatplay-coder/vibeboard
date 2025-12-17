#!/usr/bin/env node
/**
 * Focus Test V3: Spine Tattoo - PRECISE DESIGN
 * 
 * Objective: Fix the "not quite there" details of the moonphase tattoo.
 * Strategy:
 * 1. Use new high-res tattoo reference.
 * 2. Prompt for the EXACT sequence based on the reference:
 *    - Top: Solid Black Circle
 *    - Middle: HOLLOW OUTLINE Circle
 *    - Bottom: Solid Black Circle
 *    - 9 total elements
 * 3. Use very low creativity (0.2) to force the reference design.
 */

const BASE_URL = 'http://localhost:3001';
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

const REFS = {
    // Mirror selfie for correct body context/lighting
    bodyContext: '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/uploaded_image_0_1765775888161.jpg',

    // The NEW specific tattoo design uploaded by user
    tattooDesign: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/tattoo_spine_v3.jpg',
};

const OPTIMAL = {
    loraId: "f652b3b7-9618-4fe5-89c5-f38c9f62033e",
    loraName: "Angelica.V3",
    strength: 1.0,
    cfg: 4.0,
    steps: 40, // Max steps for detail
    negativePrompt: "harsh lighting, over-sharpened, plastic skin, distorted, bad anatomy, worst quality, low quality, extra moon phases, random circles, crooked alignment, messy ink",
};

const TESTS = [
    {
        name: "Spine V3 - Detailed Description",
        prompt: "ohwx_angelica, back view, kneeling on floor looking in mirror. focus on spine tattoo. Vertical column of exactly 9 moon phases. The TOP element is a solid black circle. The EXACT CENTER element is a HOLLOW OUTLINE circle (transparent). The BOTTOM element is a solid black circle. The phases transition smoothly. Black ink style.",
        bodyRef: REFS.bodyContext,
        tattooRef: REFS.tattooDesign,
        bodyStrength: 0.60,
        tattooStrength: 0.90 // Very high to force the hollow center detail
    },
    {
        name: "Spine V3 - Reference Dominant",
        prompt: "ohwx_angelica, back view, spine tattoo. vertical moon phases. center phase is an outlined circle. top and bottom are filled black circles. precise geometric tattoo.",
        bodyRef: REFS.bodyContext,
        tattooRef: REFS.tattooDesign,
        bodyStrength: 0.50,
        tattooStrength: 1.0 // Max reference strength
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
    console.log(`   Tattoo Ref Strength: ${test.tattooStrength * 100}%`);

    const bodyDataUrl = uploadImage(test.bodyRef);
    const tattooDataUrl = uploadImage(test.tattooRef);

    if (!bodyDataUrl || !tattooDataUrl) return { success: false, error: 'Img load failed' };

    const allRefs = [bodyDataUrl, tattooDataUrl];
    const refWithTypes = [
        { url: bodyDataUrl, type: 'character', strength: test.bodyStrength },
        { url: tattooDataUrl, type: 'style', strength: test.tattooStrength }
    ];

    // Try using 'structure' type if supported by some adapters? 
    // For Flux-General, 'style' is the standard for texture/design transfer.

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
        referenceCreativity: 0.2, // Ultra low creativity to force exact copy
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
    console.log("🎨 Spine Focus V3 - Strict Adherence");
    console.log("==================================\n");

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

    console.log("\n==================================");
    console.log("🎉 V3 Queued. Check for the hollow center circle!");
}

main().catch(console.error);
