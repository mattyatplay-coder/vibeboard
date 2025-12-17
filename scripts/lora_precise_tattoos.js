#!/usr/bin/env node
/**
 * Precise Tattoo Mapping Test
 * 
 * Uses highly specific tattoo close-ups as style references
 * to get exact tattoo designs in correct positions.
 */

const BASE_URL = 'http://localhost:3001';
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

const REFS = {
    // Full body references
    bodyFront: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/uploaded_image_1_1765773064948.png',
    bodyBack: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/uploaded_image_0_1765773064948.png',

    // NEW: Specific tattoo close-ups from user
    nativeWomanArm: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/uploaded_image_0_1765774340253.jpg', // Native woman portrait on left arm
    snakeThigh: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/uploaded_image_1_1765774340253.jpg', // Snake on left thigh (beach)
    catSkullShoulder: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/uploaded_image_4_1765774340253.png', // Cat skull with third eye
    pantherRibcage: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/uploaded_image_3_1765774340253.png', // Panther/cat with flowers on ribcage
    faceWithTattoos: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/uploaded_image_2_1765774340253.png', // Face shot showing arm tattoos

    // Original close-ups
    tattooSpine: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/tattoo.spine.jpeg',
};

const OPTIMAL = {
    loraId: "f652b3b7-9618-4fe5-89c5-f38c9f62033e",
    loraName: "Angelica.V3",
    strength: 1.0,
    cfg: 4.0,
    steps: 30,
    negativePrompt: "harsh lighting, over-sharpened, plastic skin, HDR, high contrast, airbrushed, blurry, distorted, bad anatomy, generic tattoos, wrong tattoo design, incorrect tattoo",
};

// Focused tests with specific tattoo references
const TESTS = [
    {
        name: "Left Arm - Native Woman Portrait",
        prompt: "ohwx_angelica, half body shot, left arm visible, showing detailed native american woman portrait tattoo on left upper arm with headdress and flowers, traditional american style tattoo, natural lighting, white background",
        bodyRef: REFS.bodyFront,
        tattooRefs: [REFS.nativeWomanArm, REFS.faceWithTattoos],
        bodyStrength: 0.5,
        tattooStrength: 0.45, // Higher for tattoo accuracy
    },
    {
        name: "Thigh - Snake Tattoo",
        prompt: "ohwx_angelica, woman lying on side, legs visible, showing detailed snake tattoo on left thigh, coiled snake tattoo traditional style, beach setting, natural lighting",
        bodyRef: REFS.snakeThigh, // Use beach photo as body ref
        tattooRefs: [REFS.snakeThigh],
        bodyStrength: 0.7, // Higher body ref for pose
        tattooStrength: 0.3,
    },
    {
        name: "Right Shoulder - Cat Skull",
        prompt: "ohwx_angelica, over shoulder view, showing detailed cat skull tattoo with third eye on right shoulder, mystical cat skull tattoo with roses, soft lighting",
        bodyRef: REFS.bodyBack,
        tattooRefs: [REFS.catSkullShoulder],
        bodyStrength: 0.5,
        tattooStrength: 0.5,
    },
    {
        name: "Ribcage - Panther/Cat",
        prompt: "ohwx_angelica, side view, arm raised showing right ribcage tattoo, panther cat climbing with flowers tattoo on right side, artistic pose, natural lighting",
        bodyRef: REFS.bodyFront,
        tattooRefs: [REFS.pantherRibcage],
        bodyStrength: 0.5,
        tattooStrength: 0.5,
    },
    {
        name: "Full Back - All Tattoos",
        prompt: "ohwx_angelica, full body back view standing, showing all back tattoos, moon phases running down spine, cat skull on left shoulder blade, butterfly moth on right arm, character sheet style, white studio background",
        bodyRef: REFS.bodyBack,
        tattooRefs: [REFS.tattooSpine, REFS.catSkullShoulder],
        bodyStrength: 0.7,
        tattooStrength: 0.35,
    },
];

const fs = require('fs');
const path = require('path');

function uploadImage(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
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
    console.log(`\n📸 ${test.name}`);

    const bodyDataUrl = uploadImage(test.bodyRef);
    if (!bodyDataUrl) {
        return { success: false, error: 'Failed to load body reference' };
    }

    const tattooDataUrls = test.tattooRefs.map(ref => uploadImage(ref)).filter(Boolean);
    console.log(`   Body ref: ${test.bodyStrength * 100}% | Tattoo refs: ${tattooDataUrls.length} @ ${test.tattooStrength * 100}% each`);

    const allRefs = [bodyDataUrl, ...tattooDataUrls];
    const refWithTypes = [
        { url: bodyDataUrl, type: 'character', strength: test.bodyStrength },
        ...tattooDataUrls.map(url => ({ url, type: 'style', strength: test.tattooStrength })),
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
        referenceCreativity: 0.35, // Lower = more faithful
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
    console.log("🎨 Precise Tattoo Mapping Test");
    console.log("==============================\n");

    for (const test of TESTS) {
        const result = await runGeneration(test);
        console.log(result.success ? `   ✓ Queued: ${result.id}` : `   ✗ Failed: ${result.error}`);
        await sleep(2000);
    }

    console.log("\n==============================");
    console.log("🎉 Done! Check Vibeboard for precise tattoo results.");
}

main().catch(console.error);
