#!/usr/bin/env node
/**
 * Tattoo-focused scene testing
 */

const BASE_URL = 'http://localhost:3001';
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

const OPTIMAL = {
    loraId: "f652b3b7-9618-4fe5-89c5-f38c9f62033e",
    loraName: "Angelica.V3",
    strength: 1.0,
    cfg: 4.0,
    steps: 28,
    negativePrompt: "harsh lighting, over-sharpened, plastic skin, HDR, high contrast, airbrushed, blurry, distorted, bad anatomy",
};

// Tattoo-focused scenes - wider shots showing arms and body
const SCENES = [
    // Arm tattoo focus
    "ohwx_angelica, woman with intricate arm tattoos visible, tank top, showing off sleeve tattoo, half body shot, natural lighting, film photography, detailed tattoo work",
    "ohwx_angelica, woman leaning against wall, arms crossed showing tattoos, casual pose, urban setting, golden hour, tattoo details visible, 35mm film",
    "ohwx_angelica, woman stretching arms above head, tattoos visible on upper arms, morning light, bedroom setting, natural skin, intimate moment",

    // Back/spine tattoo
    "ohwx_angelica, woman from behind showing back tattoo, spine tattoo visible, shoulders exposed, soft lighting, artistic pose, film photography",
    "ohwx_angelica, woman looking over shoulder, back partially visible with tattoos, spaghetti strap top, bedroom lighting, natural skin",

    // Full body showing tattoos
    "ohwx_angelica, woman in bikini at pool, full body, arm and body tattoos visible, tropical setting, golden hour, natural skin, film photography",
    "ohwx_angelica, woman in lingerie, bedroom scene, tattoos visible on arms and body, soft window light, intimate mood, natural skin, 35mm film",

    // Artistic tattoo shots
    "ohwx_angelica, close up of tattooed arm, woman's face partially visible, detailed tattoo work, artistic composition, soft lighting",
    "ohwx_angelica, woman with visible tattoos, boho style outfit, festival setting, natural lighting, candid moment, film grain",
    "ohwx_angelica, tattooed woman taking mirror selfie, phone in hand, showing arm tattoos, bathroom setting, natural light, authentic",
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
    console.log("🎨 Tattoo-Focused Scene Testing");
    console.log("================================\n");
    console.log(`📊 Scenes to test: ${SCENES.length}\n`);

    for (let i = 0; i < SCENES.length; i++) {
        const scene = SCENES[i];
        const shortDesc = scene.split(',').slice(1, 3).join(',').trim();
        console.log(`[${i + 1}/${SCENES.length}] ${shortDesc.substring(0, 50)}...`);

        const result = await runGeneration(scene);
        console.log(result.success ? `   ✓ ${result.id}` : `   ✗ ${result.error}`);

        await sleep(500);
    }

    console.log("\n🎉 Done! Check Vibeboard for tattoo shots.");
}

main().catch(console.error);
