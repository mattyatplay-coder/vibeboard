#!/usr/bin/env node
/**
 * Focus Test V2: Moonphase Spine Tattoo - HIGH FIDELITY
 * 
 * Adjustments:
 * - Significantly increased Tattoo Reference strength (Style) to force exact design copy.
 * - Added a test case with ONLY the tattoo reference to see if body ref interference is the issue.
 * - Refined prompt to describe the specific moon phase visual.
 */

const BASE_URL = 'http://localhost:3001';
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

const REFS = {
    // Mirror selfie for body placement
    bodyContext: '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/uploaded_image_1_1765776107950.jpg',

    // The specific tattoo design (digital asset)
    tattooDesign: '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/uploaded_image_2_1765776107950.jpg',
};

const OPTIMAL = {
    loraId: "f652b3b7-9618-4fe5-89c5-f38c9f62033e",
    loraName: "Angelica.V3",
    strength: 1.0,
    cfg: 4.0,
    steps: 35, // Increased steps for detail
    negativePrompt: "harsh lighting, over-sharpened, plastic skin, HDR, high contrast, airbrushed, blurry, distorted, bad anatomy, incorrect tattoos, missing tattoos, crooked spine, extra fingers, random circles, wrong moon phases",
};

const TESTS = [
    {
        name: "Spine V2 - High Fidelity Style Transfer",
        prompt: "ohwx_angelica, back view, kneeling on floor looking in mirror, taking selfie. focus on spine. Visible tattoo: vertical column of moon phases running down the spine. The phases are solid black circles and crescents, except for the center full moon which is a simple outline circle. Precise geometric style.",
        bodyRef: REFS.bodyContext,
        tattooRef: REFS.tattooDesign,
        bodyStrength: 0.55,  // Reduced slightly to let style dominate details
        tattooStrength: 0.85 // CRANKED UP - Force the model to use this visual design
    },
    {
        name: "Spine V2 - Balanced + Design Focus",
        prompt: "ohwx_angelica, back view, kneeling. spine tattoo of moon phases. precise vertical alignment. black ink work. minimalist tattoo style.",
        bodyRef: REFS.bodyContext,
        tattooRef: REFS.tattooDesign,
        bodyStrength: 0.65,
        tattooStrength: 0.65 // Balanced but high
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
        referenceCreativity: 0.30, // Lowered further to stick to reference
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
    console.log("🎨 Focusing on Spine Tattoo V2 - HIGH PRECISISON");
    console.log("==============================================\n");

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

    console.log("\n==============================================");
    console.log("🎉 Focus V2 complete!");
}

main().catch(console.error);
