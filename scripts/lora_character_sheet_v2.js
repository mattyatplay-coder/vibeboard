#!/usr/bin/env node
/**
 * 4-Pose Character Sheet V2 (Automated Test)
 * 
 * Combines V3 LoRA with PRECISE tattoo references mapped to specific angles.
 * Uses IP-Adapter with "Character" weight for body and "Style" weight for tattoos.
 */

const BASE_URL = 'http://localhost:3001';
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

// --- REFERENCE IMAGES ---
const REFS = {
    // Body Poses
    bodyFront: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/uploaded_image_1_1765773064948.png',
    bodyBack: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/uploaded_image_0_1765773064948.png',
    bodyLeft: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/uploaded_image_2_1765773064948.png',

    // Specific Tattoos
    nativeWomanArm: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/uploaded_image_0_1765774340253.jpg', // Left Arm
    snakeThigh: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/uploaded_image_1_1765774340253.jpg', // Left Thigh
    pantherRibcage: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/uploaded_image_3_1765774340253.png', // Right Ribcage
    catSkullShoulder: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/uploaded_image_4_1765774340253.png', // Back Left Shoulder
    spine: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/tattoo.spine.jpeg', // Spine
    butterflyRight: '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/angelica_tattoos/tattoo.right.arm.jpeg', // Right Arm
};

const OPTIMAL = {
    loraId: "f652b3b7-9618-4fe5-89c5-f38c9f62033e",
    loraName: "Angelica.V3",
    strength: 1.0,
    cfg: 4.0,
    steps: 30,
    negativePrompt: "harsh lighting, over-sharpened, plastic skin, HDR, high contrast, airbrushed, blurry, distorted, bad anatomy, incorrect tattoos, missing tattoos, extra limbs",
};

// --- POSES CONFIGURATION ---
const POSES = [
    {
        name: "Front View",
        prompt: "ohwx_angelica, full body front view, character sheet pose, standing straight, arms slightly out, white studio background. Visible tattoos: Panther cat with flowers on right ribcage, Native American woman portrait on left upper arm, geometric sternum tattoo.",
        bodyRef: REFS.bodyFront,
        tattooRefs: [REFS.pantherRibcage, REFS.nativeWomanArm],
        bodyStrength: 0.60,
        tattooStrength: 0.40
    },
    {
        name: "Left Side View",
        prompt: "ohwx_angelica, full body left profile view, character sheet pose, standing straight, white studio background. Visible tattoos: Detailed Native American woman portrait on left arm, large snake tattoo coiling on left thigh.",
        bodyRef: REFS.bodyLeft,
        tattooRefs: [REFS.nativeWomanArm, REFS.snakeThigh],
        bodyStrength: 0.65,
        tattooStrength: 0.45
    },
    {
        name: "Right Side View",
        prompt: "ohwx_angelica, full body right profile view, character sheet pose, standing straight, white studio background. Visible tattoos: Panther cat climbing on right ribcage, butterfly moth on right arm, floral hip details.",
        bodyRef: REFS.bodyFront, // Use front ref but prompt for right profile
        tattooRefs: [REFS.pantherRibcage, REFS.butterflyRight],
        bodyStrength: 0.55,
        tattooStrength: 0.40
    },
    {
        name: "Back View",
        prompt: "ohwx_angelica, full body back view, character sheet pose, standing straight, white studio background. Visible tattoos: Moon phases running down spine, Cat skull with third eye on left shoulder blade, butterfly moth on right arm.",
        bodyRef: REFS.bodyBack,
        tattooRefs: [REFS.spine, REFS.catSkullShoulder, REFS.butterflyRight],
        bodyStrength: 0.65,
        tattooStrength: 0.35
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

async function runGeneration(pose, index) {
    console.log(`\n📸 [${index + 1}/4] Generating: ${pose.name}`);

    // 1. Upload Body Reference (Character)
    const bodyDataUrl = uploadImage(pose.bodyRef);
    if (!bodyDataUrl) return { success: false, error: 'Failed to load body ref' };

    // 2. Upload Tattoo References (Style)
    const tattooDataUrls = pose.tattooRefs.map(ref => uploadImage(ref)).filter(Boolean);
    console.log(`   Body Ref Strength: ${pose.bodyStrength * 100}%`);
    console.log(`   Tattoo Refs: ${tattooDataUrls.length} @ ~${pose.tattooStrength * 100}%`);

    // 3. Construct Reference Arrays
    const allRefs = [bodyDataUrl, ...tattooDataUrls];
    const refWithTypes = [
        { url: bodyDataUrl, type: 'character', strength: pose.bodyStrength },
        ...tattooDataUrls.map(url => ({ url, type: 'style', strength: pose.tattooStrength }))
    ];

    const body = {
        mode: "text_to_image",
        inputPrompt: pose.prompt,
        negativePrompt: OPTIMAL.negativePrompt,
        aspectRatio: "3:4",
        sourceElementIds: [],
        variations: 1,
        sessionId: null,
        engine: "fal",
        falModel: "fal-ai/flux/dev", // Backend will switch to flux-general due to IP-Adapter
        loras: [{
            id: OPTIMAL.loraId,
            name: OPTIMAL.loraName,
            strength: OPTIMAL.strength
        }],
        guidanceScale: OPTIMAL.cfg,
        steps: OPTIMAL.steps,
        elementReferences: allRefs,
        elementReferencesWithTypes: refWithTypes,
        referenceCreativity: 0.4, // Low creativity for accuracy
    };

    try {
        const response = await fetch(`${BASE_URL}/api/projects/${PROJECT_ID}/generations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        return { success: true, id: data.id, name: pose.name };
    } catch (error) {
        return { success: false, error: error.message, name: pose.name };
    }
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("🎨 Automating 4-Pose Character Sheet V2");
    console.log("======================================\n");

    const results = [];

    for (let i = 0; i < POSES.length; i++) {
        const result = await runGeneration(POSES[i], i);
        results.push(result);

        if (result.success) {
            console.log(`   ✓ Queued: ${result.id}`);
        } else {
            console.log(`   ✗ Failed: ${result.error}`);
        }

        await sleep(2000); // 2s delay
    }

    console.log("\n======================================");
    console.log(`🎉 Batch Complete. Success: ${results.filter(r => r.success).length}/${POSES.length}`);
    console.log("Check Vibeboard galleries for your character sheet!");
}

main().catch(console.error);
