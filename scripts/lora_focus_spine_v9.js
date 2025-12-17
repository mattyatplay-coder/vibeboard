#!/usr/bin/env node
/**
 * Focus Test V9: Spine Tattoo - DEPTH + STYLE INJECTION
 * 
 * Diagnosis of previous failures:
 * - V6 (Canny on Photo): The photo was likely too low-res/blurry for Canny to see the "hollow" line, so it saw a solid blob.
 * - V8 (Canny on Design): The design file (strip) was stretched to the full 3:4 canvas, creating giant distorted moons.
 * 
 * V9 Strategy:
 * 1. ControlNet: DEPTH (on Mirror Selfie).
 *    - Why? Depth maps capture 3D shape (back curvature) but IGNORE 2D surface details (existing ink).
 *    - Result: The model gets the perfect pose but a "blank slate" for the skin texture.
 * 
 * 2. IP-Adapter: STYLE (on Digital Design).
 *    - Why? Injects the visual information (Crisp black, hollow center) without dictating placement/scale from the file dimensions.
 *    - Strength: High (0.8) to enforce the "Hollow" concept.
 * 
 * 3. Prompt: Explicitly reinforce the "Hollow Ring" center.
 */

const BASE_URL = 'http://localhost:3001';
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

const REFS = {
    // Mirror Selfie (Pose Source)
    bodyContext: '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/uploaded_image_0_1765775888161.jpg',

    // Digital Design (Detail Source)
    digitalDesign: '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/uploaded_image_2_1765777338866.png',
};

const OPTIMAL = {
    loraId: "f652b3b7-9618-4fe5-89c5-f38c9f62033e",
    loraName: "Angelica.V3",
    strength: 1.0,
    cfg: 4.0,
    steps: 35,
    negativePrompt: "solid center moon, filled circle, black dot, blurry, distorted, bad anatomy",
};

const TESTS = [
    {
        name: "Spine V9 - Depth Erasure + Style Injection",
        prompt: "ohwx_angelica, back view, kneeling on floor. Spine tattoo. A vertical column of moon phases. The exact center phase is a HOLLOW RING (transparent outline). Top and bottom phases are solid. Crisp black ink.",

        // ControlNet: Depth on the PHOTO (Locks pose, ignores old tattoo)
        controlNetImage: REFS.bodyContext,
        controlNetType: "depth_midas",
        controlNetStrength: 1.0,

        // IP-Adapter: Style on the DESIGN (Injects the hollow circle concept)
        ipAdapterRef: REFS.digitalDesign,
        ipAdapterType: "style", // Using standard style
        ipAdapterStrength: 0.8  // High strength
    },
    {
        name: "Spine V9 - Depth + Character Weight Hack",
        prompt: "ohwx_angelica, back view. spine tattoo. center moon is a hollow outline. transparent circle.",

        // ControlNet: Depth on the PHOTO
        controlNetImage: REFS.bodyContext,
        controlNetType: "depth_midas",
        controlNetStrength: 1.0,

        // IP-Adapter: Character on the DESIGN (Stronger injection)
        ipAdapterRef: REFS.digitalDesign,
        ipAdapterType: "character", // Hack for >50% strength
        ipAdapterStrength: 0.7
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

    const cnData = uploadImage(test.controlNetImage);
    const ipData = uploadImage(test.ipAdapterRef);
    if (!cnData || !ipData) return { success: false, error: 'Img load failed' };

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
        loras: [{ id: OPTIMAL.loraId, name: OPTIMAL.loraName, strength: OPTIMAL.strength }],
        guidanceScale: OPTIMAL.cfg,
        steps: OPTIMAL.steps,

        // IP-Adapter
        elementReferences: [ipData],
        elementReferencesWithTypes: [{
            url: ipData,
            type: test.ipAdapterType,
            strength: test.ipAdapterStrength
        }],
        referenceCreativity: 0.4, // Reduced to force adherence

        // ControlNet
        controlNets: [{
            path: "XLabs-AI/flux-controlnet-depth-midas", // Depth
            image_url: cnData,
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
    console.log("🎨 Spine Focus V9 - Depth Erasure & Style Injection");
    console.log("=================================================\n");

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

    console.log("\n=================================================");
    console.log("🎉 V9 Queued. Depth should clear the canvas for the new design.");
}

main().catch(console.error);
