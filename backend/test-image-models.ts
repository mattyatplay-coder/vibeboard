/**
 * Image Model Testing Script
 * Tests all image generation models registered in VibeBoard
 *
 * Run with: npx ts-node test-image-models.ts
 */

import * as fal from "@fal-ai/serverless-client";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load environment
dotenv.config({ path: path.join(__dirname, ".env") });

fal.config({
    credentials: process.env.FAL_KEY
});

interface TestResult {
    model: string;
    endpoint: string;
    status: "success" | "failed" | "skipped";
    error?: string;
    duration?: number;
    outputUrl?: string;
}

const results: TestResult[] = [];

// Test prompt for all models
const TEST_PROMPT = "A majestic golden retriever standing in a sunlit meadow, professional photography, detailed fur, golden hour lighting";
const TEST_NEGATIVE = "low quality, blurry, distorted, ugly, deformed";

// Reference image for editing/character models
const TEST_REFERENCE_IMAGE = "https://images.pexels.com/photos/58997/pexels-photo-58997.jpeg?auto=compress&w=1024";

// All Fal.ai image models from ModelRegistry.ts
const FAL_IMAGE_MODELS = [
    // Flux Models
    { id: "fal-ai/flux/dev", name: "Flux Dev", params: { prompt: TEST_PROMPT, image_size: "landscape_16_9", num_inference_steps: 28 } },
    { id: "fal-ai/flux/schnell", name: "Flux Schnell", params: { prompt: TEST_PROMPT, image_size: "landscape_16_9", num_inference_steps: 4 } },
    { id: "fal-ai/flux-pro", name: "Flux Pro", params: { prompt: TEST_PROMPT, image_size: "landscape_16_9" } },
    { id: "fal-ai/flux-pro/v1.1-ultra", name: "Flux 1.1 Pro Ultra", params: { prompt: TEST_PROMPT, aspect_ratio: "16:9" } },
    { id: "fal-ai/flux-2-max", name: "Flux 2 Max", params: { prompt: TEST_PROMPT, aspect_ratio: "16:9" } },
    { id: "fal-ai/flux-2-flex", name: "Flux 2 Flex", params: { prompt: TEST_PROMPT, aspect_ratio: "16:9" } },

    // Flux Kontext (character consistency)
    { id: "fal-ai/flux-kontext/dev", name: "Flux Kontext Dev", params: { prompt: TEST_PROMPT } },
    { id: "fal-ai/flux-pro/kontext", name: "Flux Pro Kontext", params: { prompt: TEST_PROMPT } },

    // Recraft & Ideogram
    { id: "fal-ai/recraft-v3", name: "Recraft V3", params: { prompt: TEST_PROMPT, image_size: { width: 1024, height: 768 } } },
    { id: "fal-ai/ideogram/v2", name: "Ideogram V2", params: { prompt: TEST_PROMPT, aspect_ratio: "16:9" } },
    { id: "fal-ai/ideogram/v3", name: "Ideogram V3", params: { prompt: TEST_PROMPT, aspect_ratio: "16:9" } },

    // Stable Diffusion
    { id: "fal-ai/stable-diffusion-v35-large", name: "SD 3.5 Large", params: { prompt: TEST_PROMPT, negative_prompt: TEST_NEGATIVE, image_size: "landscape_16_9" } },

    // Google Imagen
    { id: "fal-ai/imagen3", name: "Imagen 3", params: { prompt: TEST_PROMPT, aspect_ratio: "16:9" } },
    { id: "fal-ai/imagen4/preview", name: "Imagen 4 Preview", params: { prompt: TEST_PROMPT, aspect_ratio: "16:9" } },

    // Kling Image
    { id: "fal-ai/kling-image/o1", name: "Kling O1 Image", params: { prompt: TEST_PROMPT, aspect_ratio: "16:9" } },
];

// Edit/Reference models (require input image)
const FAL_EDIT_MODELS = [
    { id: "fal-ai/flux-2-max/edit", name: "Flux 2 Max Edit", params: { prompt: TEST_PROMPT, image_urls: [TEST_REFERENCE_IMAGE] } },
    { id: "fal-ai/ideogram/character", name: "Ideogram Character", params: { prompt: "Character turnaround sheet, front view, side view, back view, professional illustration", aspect_ratio: "1:1" } },
];

async function testModel(modelId: string, name: string, params: any): Promise<TestResult> {
    const startTime = Date.now();
    console.log(`\n🧪 Testing: ${name} (${modelId})`);
    console.log(`   Params: ${JSON.stringify(params, null, 2).replace(/\n/g, '\n   ')}`);

    try {
        const result: any = await fal.subscribe(modelId, {
            input: params,
            logs: true,
            onQueueUpdate: (update) => {
                if (update.status === 'IN_PROGRESS') {
                    process.stdout.write('.');
                }
            }
        });

        const duration = Date.now() - startTime;

        // Extract image URL from various response formats
        let imageUrl = result.images?.[0]?.url || result.image?.url || result.url || result.output?.url;
        if (!imageUrl && result.data?.images?.length > 0) {
            imageUrl = result.data.images[0].url;
        }

        if (imageUrl) {
            console.log(`\n   ✅ SUCCESS in ${(duration / 1000).toFixed(1)}s`);
            console.log(`   🖼️  ${imageUrl.substring(0, 80)}...`);
            return { model: name, endpoint: modelId, status: "success", duration, outputUrl: imageUrl };
        } else {
            console.log(`\n   ⚠️ No image URL in response`);
            console.log(`   Response keys: ${Object.keys(result).join(', ')}`);
            return { model: name, endpoint: modelId, status: "failed", error: "No image URL in response", duration };
        }
    } catch (error: any) {
        const duration = Date.now() - startTime;
        console.log(`\n   ❌ FAILED in ${(duration / 1000).toFixed(1)}s`);
        console.log(`   Error: ${error.message}`);

        // Log detailed error if available
        if (error.body) {
            console.log(`   Body: ${JSON.stringify(error.body, null, 2)}`);
        }

        return {
            model: name,
            endpoint: modelId,
            status: "failed",
            error: error.message || "Unknown error",
            duration
        };
    }
}

async function runTests() {
    console.log("=" .repeat(60));
    console.log("  IMAGE MODEL TESTING - VibeBoard");
    console.log("=" .repeat(60));
    console.log(`\nFAL_KEY: ${process.env.FAL_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`Test Prompt: "${TEST_PROMPT.substring(0, 60)}..."`);

    // Test standard T2I models
    console.log("\n" + "=" .repeat(60));
    console.log("  FAL.AI TEXT-TO-IMAGE MODELS");
    console.log("=" .repeat(60));

    for (const model of FAL_IMAGE_MODELS) {
        const result = await testModel(model.id, model.name, model.params);
        results.push(result);
    }

    // Test edit models
    console.log("\n" + "=" .repeat(60));
    console.log("  FAL.AI EDIT/CHARACTER MODELS");
    console.log("=" .repeat(60));

    for (const model of FAL_EDIT_MODELS) {
        const result = await testModel(model.id, model.name, model.params);
        results.push(result);
    }

    // Print summary
    console.log("\n\n" + "=" .repeat(60));
    console.log("  TEST SUMMARY");
    console.log("=" .repeat(60));

    const successful = results.filter(r => r.status === "success");
    const failed = results.filter(r => r.status === "failed");

    console.log(`\n✅ Successful: ${successful.length}/${results.length}`);
    console.log(`❌ Failed: ${failed.length}/${results.length}`);

    if (failed.length > 0) {
        console.log("\n🔴 FAILED MODELS:");
        for (const f of failed) {
            console.log(`   - ${f.model} (${f.endpoint}): ${f.error}`);
        }
    }

    // Performance ranking
    console.log("\n⚡ PERFORMANCE RANKING (fastest to slowest):");
    const sortedBySpeed = successful
        .filter(r => r.duration)
        .sort((a, b) => (a.duration || 0) - (b.duration || 0));

    for (const r of sortedBySpeed) {
        console.log(`   ${r.model}: ${((r.duration || 0) / 1000).toFixed(1)}s`);
    }

    // Save results to JSON
    const outputPath = path.join(__dirname, "image-model-test-results.json");
    fs.writeFileSync(outputPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: {
            total: results.length,
            successful: successful.length,
            failed: failed.length
        },
        results
    }, null, 2));

    console.log(`\n📄 Results saved to: ${outputPath}`);
}

// Run if called directly
runTests().catch(console.error);
