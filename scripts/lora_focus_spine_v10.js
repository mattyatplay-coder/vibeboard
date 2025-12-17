#!/usr/bin/env node
/**
 * Focus Test V10: Spine Tattoo - MULTI-LORA (Identity + Tattoo Concept)
 * 
 * New Ingredient: "ilkerzgi/Tattoo-Kontext-Dev-Lora"
 * - User provided this LoRA to help with tattoo realism/context.
 * 
 * Strategy (V9 Enhanced):
 * 1. ControlNet Depth (on Selfie): maintain pose, clean skin.
 * 2. IP-Adapter (on Design): inject the specific moonphase design.
 * 3. LoRA 1 (Angelica V3): Identity.
 * 4. LoRA 2 (Tattoo Context): Concept/Integrity of tattoos.
 * 
 * Hypothesis: The Tattoo Context LoRA will understand "tattoo on skin" better than base Flux, 
 * fixing the "hollow circle" issue by rendering it as skin-negative space properly.
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
    negativePrompt: "solid center moon, filled circle, black dot, blurry, distorted, bad anatomy",
};

const TESTS = [
    {
        name: "Spine V10 - Depth + IP + Tattoo LoRA (0.8)",
        prompt: "ohwx_angelica, back view, kneeling on floor. Spine tattoo. A vertical column of moon phases. The center phase is a HOLLOW RING (transparent outline). Top and bottom phases are solid. Crisp black ink. Tattoo style.",

        // ControlNet: Depth on the PHOTO
        controlNetImage: REFS.bodyContext,
        controlNetType: "depth_midas",
        controlNetStrength: 1.0,

        // IP-Adapter: Style on the DESIGN
        ipAdapterRef: REFS.digitalDesign,
        ipAdapterType: "style",
        ipAdapterStrength: 0.8,

        // LoRA Weights
        angelicaStrength: 1.0,
        tattooLoraStrength: 0.8
    },
    {
        name: "Spine V10 - Depth + IP + Tattoo LoRA (1.0)",
        prompt: "ohwx_angelica, back view. spine tattoo. center moon is a hollow outline. transparent circle. tattoo design.",

        // ControlNet: Depth on the PHOTO
        controlNetImage: REFS.bodyContext,
        controlNetType: "depth_midas",
        controlNetStrength: 1.0,

        // IP-Adapter: Character on the DESIGN (hack)
        ipAdapterRef: REFS.digitalDesign,
        ipAdapterType: "character",
        ipAdapterStrength: 0.7,

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
    // Note: We are trusting the backend to handle the 'path' property
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
    console.log("🎨 Spine Focus V10 - Multi-LoRA (Angelica + Tattoo Context)");
    console.log("========================================================\n");

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

    console.log("\n========================================================");
    console.log("🎉 V10 Queued. If this fails, the backend likely rejected the path-based LoRA.");
}

main().catch(console.error);
