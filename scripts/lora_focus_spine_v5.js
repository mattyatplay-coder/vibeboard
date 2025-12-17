#!/usr/bin/env node
/**
 * Focus Test V5: Spine Tattoo - CONTROLNET STABILITY
 * 
 * Problem: V4 (High Style Strength) degraded the image quality/anatomy ("much worse").
 * Solution: Use ControlNet (Depth) to LOCK the anatomy/pose of the mirror selfie.
 *           This allows us to safely push the Tattoo Reference strength higher 
 *           without the model "hallucinating" or breaking the body structure.
 */

const BASE_URL = 'http://localhost:3001';
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

const REFS = {
    // Mirror selfie - source for POSE (ControlNet) and Identity (IP-Adapter)
    bodyContext: '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/uploaded_image_0_1765775888161.jpg',

    // Specific tattoo design
    tattooDesign: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/tattoo_spine_v3.jpg',
};

const OPTIMAL = {
    loraId: "f652b3b7-9618-4fe5-89c5-f38c9f62033e",
    loraName: "Angelica.V3",
    strength: 1.0,
    cfg: 4.0,
    steps: 35,
    negativePrompt: "harsh lighting, over-sharpened, plastic skin, distorted, bad anatomy, worst quality, extra moon phases, random circles, wrong alignment",
};

const TESTS = [
    {
        name: "Spine V5 - Depth Locked + High Style",
        prompt: "ohwx_angelica, back view, kneeling on floor looking in mirror. focus on spine tattoo. Vertical column of moon phases. center phase is a HOLLOW OUTLINE circle. top and bottom are solid black circles.",
        bodyRef: REFS.bodyContext,
        tattooRef: REFS.tattooDesign,
        // ControlNet settings
        controlNetType: "depth_midas",
        controlNetStrength: 0.8, // Strong pose lock
        // IP-Adapter settings
        bodyStrength: 0.50,
        tattooStrength: 0.80 // High style strength
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

        // IP-Adapter Refs
        elementReferences: allRefs,
        elementReferencesWithTypes: refWithTypes,
        referenceCreativity: 0.35,

        // ControlNet for Anatomy Locking
        controlNets: [{
            path: "XLabs-AI/flux-controlnet-depth-v3", // Common depth model for Flux
            image_url: bodyDataUrl,
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
    console.log("🎨 Spine Focus V5 - ControlNet Stability");
    console.log("======================================\n");

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

    console.log("\n======================================");
    console.log("🎉 V5 Queued. Depth map should lock the pose!");
}

main().catch(console.error);
