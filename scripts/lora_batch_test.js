#!/usr/bin/env node
/**
 * LoRA Batch Testing Script
 * 
 * Runs a grid search of LoRA parameters to find optimal settings.
 * Results are saved with metadata for easy comparison.
 */

const BASE_URL = 'http://localhost:3001';
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

// Test configuration - SOFT SKIN VERSION
const CONFIG = {
    // Softer prompt for more realistic skin
    prompt: "ohwx_angelica, close up portrait, facing camera, soft natural lighting, golden hour, shallow depth of field, natural skin, film photography, shot on 35mm, subtle film grain",
    negativePrompt: "harsh lighting, over-sharpened, plastic skin, HDR, high contrast, airbrushed, blurry, distorted, bad anatomy",
    aspectRatio: "9:16",

    // LoRA to test
    loraId: "v4-angelica-5678",
    loraName: "Angelica.V4",

    // Parameter grid - lower CFG for softer look
    strengthValues: [0.9, 1.0, 1.1],
    cfgValues: [3.5, 4.0, 4.5, 5.0],
    stepsValues: [28],
};

async function runGeneration(params) {
    const body = {
        mode: "text_to_image",
        inputPrompt: CONFIG.prompt,
        negativePrompt: CONFIG.negativePrompt,
        aspectRatio: CONFIG.aspectRatio,
        sourceElementIds: [],
        variations: 1,
        sessionId: null,
        engine: "fal",
        falModel: "fal-ai/flux/dev",
        loras: [{
            id: CONFIG.loraId,
            name: CONFIG.loraName,
            strength: params.strength
        }],
        guidanceScale: params.cfg,
        steps: params.steps,
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
        return { success: true, id: data.id, params };
    } catch (error) {
        return { success: false, error: error.message, params };
    }
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("🧪 LoRA Batch Testing Script");
    console.log("============================\n");
    console.log(`Testing: ${CONFIG.loraName}`);
    console.log(`Prompt: "${CONFIG.prompt.substring(0, 50)}..."\n`);

    const tests = [];

    // Generate all parameter combinations
    for (const strength of CONFIG.strengthValues) {
        for (const cfg of CONFIG.cfgValues) {
            for (const steps of CONFIG.stepsValues) {
                tests.push({ strength, cfg, steps });
            }
        }
    }

    console.log(`📊 Total tests to run: ${tests.length}\n`);
    console.log("Starting batch run...\n");

    const results = [];

    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        console.log(`[${i + 1}/${tests.length}] Strength: ${test.strength}, CFG: ${test.cfg}, Steps: ${test.steps}`);

        const result = await runGeneration(test);
        results.push(result);

        if (result.success) {
            console.log(`   ✓ Queued: ${result.id}`);
        } else {
            console.log(`   ✗ Failed: ${result.error}`);
        }

        // Small delay between requests to avoid overwhelming the server
        await sleep(500);
    }

    console.log("\n============================");
    console.log("🎉 Batch testing complete!");
    console.log(`   Success: ${results.filter(r => r.success).length}`);
    console.log(`   Failed: ${results.filter(r => !r.success).length}`);
    console.log("\nCheck the Vibeboard UI to compare results.");
    console.log("Tip: Each generation will have its settings logged in the backend.");
}

main().catch(console.error);
