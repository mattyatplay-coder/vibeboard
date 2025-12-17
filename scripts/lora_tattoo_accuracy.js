#!/usr/bin/env node
/**
 * Enhanced Tattoo Accuracy Test
 * 
 * Uses V3 LoRA + IP-Adapter with BOTH:
 * 1. Body reference (character type) for pose/body
 * 2. Tattoo close-up references (style type) for exact tattoo details
 */

const BASE_URL = 'http://localhost:3001';
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

const REFS = {
    // Full body references for pose
    bodyFront: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/uploaded_image_1_1765773064948.png',
    bodyBack: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/uploaded_image_0_1765773064948.png',
    bodyLeftSide: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/uploaded_image_2_1765773064948.png',

    // Close-up tattoo references for style/accuracy
    tattooSpine: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/tattoo.spine.jpeg',
    tattooLeftShoulder: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/tattoo.left.shoulder.jpeg',
    tattooRightShoulder: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/tattoo.right.shoulder.jpeg',
    tattooRightArm: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/tattoo.right.arm.jpeg',
    tattooRightThigh: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/tattoo.right.thigh.jpeg',
    tattooLeftRibcage: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/tattoo.left.ribcage.jpeg',
};

const OPTIMAL = {
    loraId: "f652b3b7-9618-4fe5-89c5-f38c9f62033e",
    loraName: "Angelica.V3",
    strength: 1.0,
    cfg: 4.0,
    steps: 30, // Slightly more steps for detail
    negativePrompt: "harsh lighting, over-sharpened, plastic skin, HDR, high contrast, airbrushed, blurry, distorted, bad anatomy, incorrect tattoos, generic tattoos, wrong tattoo placement",
};

// Tests focusing on tattoo accuracy with specific close-up refs
const TESTS = [
    {
        name: "Back - Spine Focus",
        prompt: "ohwx_angelica, full body back view, character sheet pose, standing straight, white studio background, showing moon phases tattoo running down center of spine, cat skull tattoo on left shoulder blade, butterfly moth on right upper arm, clean studio lighting",
        bodyRef: REFS.bodyBack,
        tattooRefs: [REFS.tattooSpine, REFS.tattooLeftShoulder, REFS.tattooRightArm],
    },
    {
        name: "Back - Shoulder Detail",
        prompt: "ohwx_angelica, artistic back view, three quarter angle, showing detailed cat skull tattoo on left shoulder blade with third eye design, butterfly moth tattoo on right arm, moon phases running down spine, soft natural lighting",
        bodyRef: REFS.bodyBack,
        tattooRefs: [REFS.tattooSpine, REFS.tattooLeftShoulder],
    },
    {
        name: "Right Arm Detail",
        prompt: "ohwx_angelica, half body shot focusing on right arm, showing butterfly moth tattoo on upper arm near shoulder, detailed view of arm tattoos, natural lighting, character reference pose",
        bodyRef: REFS.bodyFront,
        tattooRefs: [REFS.tattooRightArm, REFS.tattooRightShoulder],
    },
    {
        name: "Front - Ribcage Focus",
        prompt: "ohwx_angelica, full body front view, character sheet pose, showing floral botanical tattoo on right side ribcage, woman portrait tattoo on left upper arm, snake tattoo on left thigh, white studio background",
        bodyRef: REFS.bodyFront,
        tattooRefs: [REFS.tattooLeftRibcage, REFS.tattooRightThigh],
    },
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

    // Upload body reference
    const bodyDataUrl = uploadImage(test.bodyRef);
    if (!bodyDataUrl) {
        return { success: false, error: 'Failed to load body reference' };
    }

    // Upload tattoo references
    const tattooDataUrls = test.tattooRefs.map(ref => uploadImage(ref)).filter(Boolean);
    console.log(`   Using ${tattooDataUrls.length} tattoo references`);

    // Build reference arrays
    const allRefs = [bodyDataUrl, ...tattooDataUrls];
    const refWithTypes = [
        { url: bodyDataUrl, type: 'character', strength: 0.65 }, // Body/pose reference
        ...tattooDataUrls.map(url => ({ url, type: 'style', strength: 0.35 })), // Tattoo style refs
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
        referenceCreativity: 0.4, // Lower creativity = more faithful to refs
    };

    try {
        const response = await fetch(`${BASE_URL}/api/projects/${PROJECT_ID}/generations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        return { success: true, id: data.id, name: test.name };
    } catch (error) {
        return { success: false, error: error.message, name: test.name };
    }
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("🎨 Enhanced Tattoo Accuracy Test");
    console.log("=================================\n");
    console.log("Using body refs (character) + tattoo close-ups (style)\n");

    const results = [];

    for (const test of TESTS) {
        const result = await runGeneration(test);
        results.push(result);

        if (result.success) {
            console.log(`   ✓ Queued: ${result.id}`);
        } else {
            console.log(`   ✗ Failed: ${result.error}`);
        }

        await sleep(1500); // Longer delay for multiple refs
    }

    console.log("\n=================================");
    console.log("🎉 Enhanced tattoo test done!");
    console.log(`   Success: ${results.filter(r => r.success).length}/${results.length}`);
}

main().catch(console.error);
