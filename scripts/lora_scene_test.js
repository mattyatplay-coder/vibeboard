#!/usr/bin/env node
/**
 * LoRA Scene Testing Script
 * 
 * Tests different scenes/poses with LOCKED optimal settings.
 */

const BASE_URL = 'http://localhost:3001';
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

// LOCKED OPTIMAL SETTINGS
const OPTIMAL = {
    loraId: "v4-angelica-5678",
    loraName: "Angelica.V4",
    strength: 1.0,
    cfg: 4.0,
    steps: 28,
    negativePrompt: "harsh lighting, over-sharpened, plastic skin, HDR, high contrast, airbrushed, blurry, distorted, bad anatomy, back turned, facing away",
};

// Different scenes to test
const SCENES = [
    // Indoor scenes
    "ohwx_angelica, woman sitting at a coffee shop window, morning light streaming in, holding a latte, relaxed smile, natural skin, film photography, shot on 35mm",
    "ohwx_angelica, woman lying in bed, white sheets, morning sunlight, messy hair, sleepy expression, intimate moment, natural skin, film photography",
    "ohwx_angelica, woman in bathroom mirror selfie, phone in hand, casual outfit, natural makeup, soft lighting, authentic moment",

    // Outdoor scenes  
    "ohwx_angelica, woman at the beach, sunset golden hour, wind in hair, bikini, relaxed pose, natural skin, cinematic lighting, film photography",
    "ohwx_angelica, woman in a forest, dappled sunlight through trees, bohemian dress, peaceful expression, natural setting, film photography",
    "ohwx_angelica, woman on city street at night, neon lights, leather jacket, urban vibe, candid moment, film grain",

    // Different poses
    "ohwx_angelica, woman looking over shoulder, three quarter view, smiling, outdoor setting, golden hour, natural skin, 35mm film",
    "ohwx_angelica, full body shot, woman walking confidently, casual street style, daylight, film photography, authentic",

    // Artistic/editorial
    "ohwx_angelica, artistic portrait, dramatic side lighting, one eye visible, dark background, moody atmosphere, fine art photography",
    "ohwx_angelica, woman laughing candidly, genuine emotion, outdoor park setting, natural light, documentary style photography",
];

async function runGeneration(prompt) {
    const body = {
        mode: "text_to_image",
        inputPrompt: prompt,
        negativePrompt: OPTIMAL.negativePrompt,
        aspectRatio: "9:16",
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
        duration: "5",
        audioUrl: null,
        referenceStrengths: {},
        referenceCreativity: 0.6
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
    console.log("🎬 LoRA Scene Testing Script");
    console.log("============================\n");
    console.log(`Using optimal settings:`);
    console.log(`  LoRA: ${OPTIMAL.loraName} @ ${OPTIMAL.strength}`);
    console.log(`  CFG: ${OPTIMAL.cfg}`);
    console.log(`  Steps: ${OPTIMAL.steps}\n`);
    console.log(`📊 Scenes to test: ${SCENES.length}\n`);

    const results = [];

    for (let i = 0; i < SCENES.length; i++) {
        const scene = SCENES[i];
        const shortDesc = scene.split(',').slice(1, 3).join(',').trim();
        console.log(`[${i + 1}/${SCENES.length}] ${shortDesc.substring(0, 50)}...`);

        const result = await runGeneration(scene);
        results.push({ scene, ...result });

        if (result.success) {
            console.log(`   ✓ Queued: ${result.id}`);
        } else {
            console.log(`   ✗ Failed: ${result.error}`);
        }

        await sleep(500);
    }

    console.log("\n============================");
    console.log("🎉 Scene testing complete!");
    console.log(`   Success: ${results.filter(r => r.success).length}`);
    console.log(`   Failed: ${results.filter(r => !r.success).length}`);
    console.log("\nCheck Vibeboard to see how different scenes look!");
}

main().catch(console.error);
