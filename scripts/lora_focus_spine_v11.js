#!/usr/bin/env node
/**
 * Focus Test V11: Spine Tattoo - GEOMETRY PROMPTING
 * 
 * Outcome of V10: "Better" style (thanks to Tattoo LoRA), but "Still Filled" center.
 * Diagnosis: The model sees "Moon Phase" and auto-fills the Full Moon. Visual Semantic Prior.
 * 
 * V11 Strategy:
 * 1. Semantic Break: Describe the tattoo as "Geometric Shapes" or "Circles" rather than just "Moons".
 * 2. Explicit Geometry: "Center element is a BLACK RING", "Outline only", "Skin visible inside".
 * 3. Setup: Keep the V10 Multi-LoRA + Depth + IP-Adapter architecture as it produced the best canvas so far.
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
    // Angelica V3
    loraId: "f652b3b7-9618-4fe5-89c5-f38c9f62033e",
    loraName: "Angelica.V3",

    // New Tattoo LoRA
    tattooLoraPath: "ilkerzgi/Tattoo-Kontext-Dev-Lora",

    strength: 1.0,
    cfg: 4.0,
    steps: 35,
    negativePrompt: "solid center moon, filled circle, black dot, blurry, distorted, bad anatomy, white ink",
};

const TESTS = [
    {
        name: "Spine V11 - 'Geometric Ring' Prompt",
        prompt: "ohwx_angelica, back view, kneeling. Spine tattoo: A vertical column of 9 widely spaced geometric circular shapes. The exact center shape is a thick BLACK RING (empty inside, skin showing through). The other shapes are solid crescents. Geometric style.",

        // ControlNet: Depth on the PHOTO
        controlNetImage: REFS.bodyContext,
        controlNetType: "depth_midas",
        controlNetStrength: 1.0,

        // IP-Adapter: Style on the DESIGN
        ipAdapterRef: REFS.digitalDesign,
        ipAdapterType: "style",
        ipAdapterStrength: 0.8, // Good transfer without overriding prompts?

        // LoRA Weights
        angelicaStrength: 1.0,
        tattooLoraStrength: 0.9
    },
    {
        name: "Spine V11 - 'Outline Only' Prompt",
        prompt: "ohwx_angelica, back view. spine tattoo. center element is a transparent outline circle. negative space. skin visible in center.",

        // ControlNet: Depth on the PHOTO
        controlNetImage: REFS.bodyContext,
        controlNetType: "depth_midas",
        controlNetStrength: 1.0,

        // IP-Adapter: Character on the DESIGN (strong visual forcing)
        ipAdapterRef: REFS.digitalDesign,
        ipAdapterType: "character",
        ipAdapterStrength: 0.65, // Slightly lower to let prompt win?

        // LoRA Weights
        angelicaStrength: 0.9,
        tattooLoraStrength: 1.0
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

        // Initial LoRA list (will be overridden)
        loras: [],

        guidanceScale: OPTIMAL.cfg,
        steps: OPTIMAL.steps,

        // IP-Adapter
        elementReferences: [ipData],
        elementReferencesWithTypes: [{
            url: ipData,
            type: test.ipAdapterType,
            strength: test.ipAdapterStrength
        }],
        referenceCreativity: 0.4,

        // ControlNet
        controlNets: [{
            path: "XLabs-AI/flux-controlnet-depth-midas",
            image_url: cnData,
            conditioning_scale: test.controlNetStrength
        }]
    };

    // Override LoRAs with the Multi-LoRA array
    body.loras = [
        { id: OPTIMAL.loraId, name: OPTIMAL.loraName, strength: test.angelicaStrength },
        { path: OPTIMAL.tattooLoraPath, scale: test.tattooLoraStrength }
    ];

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
    console.log("🎨 Spine Focus V11 - Geometry Prompting");
    console.log("=====================================\n");

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

    console.log("\n=====================================");
    console.log("🎉 V11 Queued. Fingers crossed for the hollow center!");
}

main().catch(console.error);
