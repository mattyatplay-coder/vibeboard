#!/usr/bin/env node
/**
 * Focus Test: Snake Neck Tattoo
 * 
 * Objective: Accurately render the coiling snake tattoo on the back of the neck/upper spine.
 * References:
 * - New user upload: Snake Tattoo Detail (uploaded_image_1_1765777113521.png)
 * - Body context: Previous mirror selfie or standard back view.
 */

const BASE_URL = 'http://localhost:3001';
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

const REFS = {
    // Mirror selfie for body/lighting context
    bodyContext: '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/uploaded_image_0_1765775888161.jpg',

    // The new snake tattoo reference
    snakeRef: '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/uploaded_image_1_1765777113521.png',
};

const OPTIMAL = {
    loraId: "f652b3b7-9618-4fe5-89c5-f38c9f62033e",
    loraName: "Angelica.V3",
    strength: 1.0,
    cfg: 4.0,
    steps: 35,
    negativePrompt: "harsh lighting, over-sharpened, distorted, bad anatomy, worst quality, extra snakes, messy ink",
};

const TESTS = [
    {
        name: "Snake V1 - IP-Adapter Style Transfer",
        prompt: "ohwx_angelica, close up back view of neck and upper back. Visible tattoo: small black snake coiling vertically on the back of the neck. Fine line blackwork style.",
        bodyRef: REFS.bodyContext,
        tattooRef: REFS.snakeRef,
        // Using the 'Character' hack for strong transfer
        bodyStrength: 0.50,
        tattooStrength: 0.85
    },
    {
        name: "Snake V1 - ControlNet Canny (Shape Lock)",
        prompt: "ohwx_angelica, close up back of neck. snake tattoo.",
        bodyRef: REFS.bodyContext,
        tattooRef: REFS.snakeRef,
        mode: "controlnet_canny"
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

    let body = {};

    if (test.mode === "controlnet_canny") {
        // Use the REFERNCE PHOTO as the ControlNet input to capture the snake's shape
        // This works because the reference is a photo of the tattoo on skin, so Canny will see the edges.
        body = {
            mode: "text_to_image",
            inputPrompt: test.prompt,
            negativePrompt: OPTIMAL.negativePrompt,
            aspectRatio: "3:4", // Match the ref
            sourceElementIds: [],
            variations: 1,
            sessionId: null,
            engine: "fal",
            falModel: "fal-ai/flux/dev",
            loras: [{ id: OPTIMAL.loraId, name: OPTIMAL.loraName, strength: OPTIMAL.strength }],
            guidanceScale: OPTIMAL.cfg,
            steps: OPTIMAL.steps,

            // IP-Adapter for Identity/Style
            elementReferences: [bodyDataUrl],
            elementReferencesWithTypes: [{ url: bodyDataUrl, type: 'character', strength: 0.5 }],
            referenceCreativity: 0.5,

            // ControlNet for Structure
            controlNets: [{
                path: "XLabs-AI/flux-controlnet-canny-v3",
                image_url: tattooDataUrl, // The snake photo
                conditioning_scale: 0.8
            }]
        };
    } else {
        // Standard IP-Adapter approach
        const allRefs = [bodyDataUrl, tattooDataUrl];
        const refWithTypes = [
            { url: bodyDataUrl, type: 'character', strength: test.bodyStrength },
            { url: tattooDataUrl, type: 'character', strength: test.tattooStrength } // HACK
        ];

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
            elementReferences: allRefs,
            elementReferencesWithTypes: refWithTypes,
            referenceCreativity: 0.3,
        };
    }

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
    console.log("🎨 Snake Focus V1 - Start");
    console.log("=======================\n");

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

    console.log("\n=======================");
    console.log("🎉 Snake tests queued!");
}

main().catch(console.error);
