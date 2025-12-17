#!/usr/bin/env node
/**
 * Focus Test V8: Spine Tattoo - DIGITAL DESIGN LOCK
 * 
 * Objective: Force the "Hollow Center Circle" to appear by using the Digital Design as the structure.
 * 
 * Method:
 * - ControlNet Input: The Digital Design PNG (uploaded_image_2_1765777338866.png).
 * - ControlNet Type: CANNY. This creates a perfect edge map of the hollow circle.
 * - Prompt: "Woman's back... tattoo on spine".
 * - Logic: Flux MUST fill inside the Canny edges. Since there is a hollow circle edge, it cannot fill it with black.
 */

const BASE_URL = 'http://localhost:3001';
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

const REFS = {
    // The Digital Design (Black on White) - Perfect Geometry
    // Using the one from the latest upload
    digitalDesign: '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/uploaded_image_2_1765777338866.png',

    // Mirror Selfie for Pose Context (IP-Adapter only)
    poseContext: '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/uploaded_image_1_1765777338866.jpg'
};

const OPTIMAL = {
    loraId: "f652b3b7-9618-4fe5-89c5-f38c9f62033e",
    loraName: "Angelica.V3",
    strength: 1.0,
    cfg: 4.0,
    steps: 35,
    negativePrompt: "paper, white background, drawing, sketch, illustration, cartoon, distorted, bad anatomy",
};

const TESTS = [
    {
        name: "Spine V8 - Digital Canny Lock (Force Hollow Center)",
        prompt: "ohwx_angelica, back view, naked back, kneeling used as spine tattoo canvas. A vertical column of moon phases is tattooed on the spine. The center phase is a HOLLOW OUTLINE circle (skin visible inside). The top and bottom phases are solid black. Realistic skin texture, 8k photo.",
        // ControlNet Input = The Digital Design
        controlNetImage: REFS.digitalDesign,
        controlNetType: "canny",
        controlNetStrength: 1.0, // MAX STRENGTH to enforce the hollow lines

        // IP-Adapter = The Pose Context (to help it look like a back)
        ipAdapterImage: REFS.poseContext,
        ipAdapterStrength: 0.5
    },
    {
        name: "Spine V8 - Inverse Texture Swap (Design -> Skin)",
        // Re-trying the Ink-to-Skin method with the new file
        prompt: "ohwx_angelica, close up macro shot of human skin on back. A crisp black tattoo of moon phases is visible. The skin is tanned and realistic settings. Goosebumps. High detail.",
        imageRef: REFS.digitalDesign,
        mode: "img2img",
        strength: 0.70 // High enough to create skin, low enough to keep ink
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

    let body = {};

    if (test.mode === "img2img") {
        const imgData = uploadImage(test.imageRef);
        if (!imgData) return { success: false, error: 'Img load failed' };

        body = {
            mode: "image_to_image",
            inputPrompt: test.prompt,
            negativePrompt: OPTIMAL.negativePrompt,
            strength: test.strength,
            sourceImageUrl: imgData,
            // Standard params
            sessionId: null,
            engine: "fal",
            falModel: "fal-ai/flux/dev",
            loras: [{ id: OPTIMAL.loraId, name: OPTIMAL.loraName, strength: OPTIMAL.strength }],
            guidanceScale: OPTIMAL.cfg,
            steps: OPTIMAL.steps,
        };

    } else {
        // ControlNet Canny Mode
        const cnData = uploadImage(test.controlNetImage);
        const ipData = uploadImage(test.ipAdapterImage);
        if (!cnData || !ipData) return { success: false, error: 'Img load failed' };

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

            // IP-Adapter: Use the mirror selfie to prompt "Back View" context
            elementReferences: [ipData],
            elementReferencesWithTypes: [{ url: ipData, type: 'character', strength: test.ipAdapterStrength }],
            referenceCreativity: 0.5,

            // ControlNet: Use the DIGITAL DESIGN to force the lines
            controlNets: [{
                path: "XLabs-AI/flux-controlnet-canny-v3",
                image_url: cnData,
                conditioning_scale: test.controlNetStrength
            }]
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
    console.log("🎨 Spine Focus V8 - Back to Moonphases (Canny Lock)");
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
    }

    console.log("\n==================================================");
    console.log("🎉 V8 Queued. That hollow circle HAS to show up now!");
}

main().catch(console.error);
