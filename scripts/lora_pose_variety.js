#!/usr/bin/env node
/**
 * Extended pose variety test with V3 LoRA
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

// Extended variety of poses and scenarios
const SCENES = [
    // Candid/casual poses
    "ohwx_angelica, woman laughing while looking at phone, natural expression, coffee shop setting, casual outfit, soft lighting, film photography",
    "ohwx_angelica, woman sitting cross-legged on couch, relaxed pose, living room, natural light through window, cozy atmosphere",
    "ohwx_angelica, woman applying lipstick in mirror, getting ready, bathroom vanity, warm lighting, intimate moment",

    // Dynamic poses
    "ohwx_angelica, woman dancing at party, movement blur, colorful lights, joyful expression, nightlife, film grain",
    "ohwx_angelica, woman doing yoga pose outdoors, athletic wear, morning light, peaceful expression, nature setting",
    "ohwx_angelica, woman running on beach, action shot, sunset, athletic body, dynamic movement",

    // Intimate/bedroom
    "ohwx_angelica, woman waking up in bed, stretching, morning sunlight, white sheets, natural beauty, intimate moment",
    "ohwx_angelica, woman reading book in bed, cozy setting, soft lamplight, relaxed pose, intellectual vibe",
    "ohwx_angelica, woman in silk robe, morning coffee, kitchen counter, soft window light, domestic goddess",

    // Editorial/fashion
    "ohwx_angelica, fashion editorial pose, high fashion outfit, studio lighting, confident expression, magazine style",
    "ohwx_angelica, woman in vintage dress, retro aesthetic, film photography, classic beauty, timeless elegance",
    "ohwx_angelica, woman in leather jacket, urban rooftop, city skyline, edgy style, golden hour",

    // Close-ups with expression variety
    "ohwx_angelica, extreme close up, intense eye contact, dramatic lighting, portrait, detailed skin texture",
    "ohwx_angelica, woman smiling genuinely, happy expression, outdoor natural light, authentic joy",
    "ohwx_angelica, woman with serious expression, contemplative mood, window light, artistic portrait",
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
    console.log("🎭 Extended Pose Variety Test (V3)");
    console.log("===================================\n");
    console.log(`📊 Scenes to test: ${SCENES.length}\n`);

    for (let i = 0; i < SCENES.length; i++) {
        const scene = SCENES[i];
        const shortDesc = scene.split(',').slice(1, 3).join(',').trim();
        console.log(`[${i + 1}/${SCENES.length}] ${shortDesc.substring(0, 50)}...`);

        const result = await runGeneration(scene);
        console.log(result.success ? `   ✓ ${result.id}` : `   ✗ ${result.error}`);

        await sleep(500);
    }

    console.log("\n🎉 Done! Check Vibeboard for pose variety.");
}

main().catch(console.error);
