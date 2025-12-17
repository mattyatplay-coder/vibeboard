#!/usr/bin/env node
/**
 * Focus Test V16: Spine Tattoo - BASELINE RESTORATION
 * 
 * User Command: "Get back to the method that gave you these results [Img 3]".
 * Strategy: Exact reproduction of the user's "Best" image using the data from the screenshot.
 * 
 * Target:
 * - Restore the high quality body/lighting/room.
 * - Establish the baseline for "Surgical" fixes (Inpainting) rather than "Global" fixes (ControlNet).
 */

const BASE_URL = 'http://localhost:3001';
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

const TARGET_SETTINGS = {
    prompt: "ohwx_angelica, back view, kneeling on floor looking in mirror, taking selfie with phone. Visible tattoo: vertical column of moon phases tattoo running exactly down the center of the spine. The tattoo shows changing phases of the moon in black ink. Natural bedroom lighting.",
    negativePrompt: "harsh lighting, over-sharpened, plastic skin, HDR, high contrast, airbrushed, blurry, distorted, bad anatomy, incorrect tattoos, missing tattoos, crooked spine, extra fingers",
    seed: 13785496586994750000, // From Screenshot Img 3
    steps: 30,
    cfg: 4.0,
    loraId: "f652b3b7-9618-4fe5-89c5-f38c9f62033e", // Angelica V3
    loraName: "Angelica.V3",
    strength: 1.0
};

async function runRepro() {
    console.log(`\n📸 Restoring User's 'Best' Result (Img 3)...`);

    const body = {
        mode: "text_to_image",
        inputPrompt: TARGET_SETTINGS.prompt,
        negativePrompt: TARGET_SETTINGS.negativePrompt,
        aspectRatio: "3:4",
        sourceElementIds: [],
        variations: 1,
        sessionId: null,
        engine: "fal",
        falModel: "fal-ai/flux/dev",

        loras: [{ id: TARGET_SETTINGS.loraId, name: TARGET_SETTINGS.loraName, strength: TARGET_SETTINGS.strength }],

        guidanceScale: TARGET_SETTINGS.cfg,
        steps: TARGET_SETTINGS.steps,
        seed: TARGET_SETTINGS.seed // Forcing the exact seed
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

async function main() {
    console.log("🎨 Spine Focus V16 - Baseline Restoration");
    console.log("========================================\n");

    // Test 1: Restoring the exact seed
    const result = await runRepro();

    if (result.success) {
        console.log(`   ✓ Queued Restoration Job: ${result.id}`);
    } else {
        console.log(`   ✗ Failed: ${result.error}`);
    }

    console.log("\n========================================");
    console.log("🎉 V16 Queued. We should see the exact 'Room Look' image again.");
}

main().catch(console.error);
