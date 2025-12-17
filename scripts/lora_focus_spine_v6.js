#!/usr/bin/env node
/**
 * Focus Test V6: Spine Tattoo - CANNY EDGE LOCK
 * 
 * Problem: Previous attempts failed to capture the EXACT geometry (hollow center vs filled).
 * Solution: "Trace" the original photo using ControlNet Canny.
 * 
 * Method:
 * 1. Source: The actual photo of the back (uploaded_image_1_1765776229664.jpg)
 * 2. ControlNet: CANNY (Edge)
 *    - This will create a line-drawing of the tattoo, capturing the hollow center perfectly.
 * 3. Generation: Flux will "color in" these lines.
 */

const BASE_URL = 'http://localhost:3001';
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

const REFS = {
    // The actual photo with the perfect tattoo
    sourcePhoto: '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/uploaded_image_1_1765776229664.jpg',
};

const OPTIMAL = {
    loraId: "f652b3b7-9618-4fe5-89c5-f38c9f62033e",
    loraName: "Angelica.V3",
    strength: 1.0,
    cfg: 4.0,
    steps: 30,
    negativePrompt: "harsh lighting, over-sharpened, plastic skin, distorted, bad anatomy, worst quality, extra moon phases",
};

const TESTS = [
    {
        name: "Spine V6 - Canny Edge Lock (Exact Tracing)",
        // Prompt carefully describes the scene to match the Canny edges
        prompt: "ohwx_angelica, back view, kneeling on floor, black hair up in bun. Vertical moon phases tattoo on spine. Center phase is a transparent outline circle. Top and bottom are black circles. Clean lines, realistic skin texture.",
        imageRef: REFS.sourcePhoto,
        controlNetType: "canny",
        controlNetStrength: 0.75, // Strong enough to keep lines, weak enough to look real
        ippAdapterStrength: 0.40 // Lower IP-Adapter just for identity
    },
    {
        name: "Spine V6 - Canny Edge Lock (Max Precision)",
        prompt: "ohwx_angelica, back view. detailed spine tattoo. moon phases. hollow center circle.",
        imageRef: REFS.sourcePhoto,
        controlNetType: "canny",
        controlNetStrength: 1.0, // MAX line adherence
        ippAdapterStrength: 0.40
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

    const imageDataUrl = uploadImage(test.imageRef);
    if (!imageDataUrl) return { success: false, error: 'Img load failed' };

    // Use the image for IP-Adapter (Identity) AND ControlNet (Structure)
    const allRefs = [imageDataUrl];
    const refWithTypes = [
        { url: imageDataUrl, type: 'character', strength: test.ippAdapterStrength },
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

        // IP-Adapter for Identity
        elementReferences: allRefs,
        elementReferencesWithTypes: refWithTypes,
        referenceCreativity: 0.5,

        // ControlNet for Structure (The "Tracer")
        controlNets: [{
            path: "XLabs-AI/flux-controlnet-canny-v3", // FLUX Canny
            image_url: imageDataUrl,
            conditioning_scale: test.controlNetStrength
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

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("🎨 Spine Focus V6 - Canny Edge Tracing");
    console.log("====================================\n");

    const results = [];

    for (const test of TESTS) {
        const result = await runGeneration(test);
        results.push(result);

        if (result.success) {
            console.log(`   ✓ Queued: ${result.id}`);
        } else {
            console.log(`   ✗ Failed: ${result.error}`);
        }
    }

    console.log("\n====================================");
    console.log("🎉 V6 Queued. Canny should force the exact tattoo lines.");
}

main().catch(console.error);
