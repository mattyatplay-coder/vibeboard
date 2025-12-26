/**
 * Replicate Model Testing Script
 * Tests all Replicate image/video models registered in VibeBoard
 *
 * Run with: npx ts-node test-replicate-models.ts
 */

import Replicate from "replicate";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load environment
dotenv.config({ path: path.join(__dirname, ".env") });

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN
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

// Test image URL for I2V and character consistency models
const TEST_IMAGE_URL = "https://images.pexels.com/photos/58997/pexels-photo-58997.jpeg?auto=compress&w=1024";

// Replicate Image Models from ModelRegistry
const REPLICATE_IMAGE_MODELS = [
    // Flux Models (Black Forest Labs)
    {
        id: "black-forest-labs/flux-schnell",
        name: "Flux Schnell (Replicate)",
        params: { prompt: TEST_PROMPT, aspect_ratio: "16:9" }
    },
    {
        id: "black-forest-labs/flux-dev",
        name: "Flux Dev (Replicate)",
        params: { prompt: TEST_PROMPT, aspect_ratio: "16:9", num_inference_steps: 28, guidance: 3.5 }
    },
    {
        id: "black-forest-labs/flux-1.1-pro",
        name: "Flux 1.1 Pro (Replicate)",
        params: { prompt: TEST_PROMPT, aspect_ratio: "16:9" }
    },
    {
        id: "black-forest-labs/flux-1.1-pro-ultra",
        name: "Flux 1.1 Pro Ultra (Replicate)",
        params: { prompt: TEST_PROMPT, aspect_ratio: "16:9" }
    },

    // SDXL Models
    {
        id: "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        name: "SDXL (Stability AI)",
        params: { prompt: TEST_PROMPT, negative_prompt: TEST_NEGATIVE, width: 1024, height: 768 }
    },

    // Uncensored/NSFW-capable models
    {
        id: "lucataco/juggernaut-xl-v9:bea09cf018e513cef0841719559ea86d2299e05448633ac8fe270b5d5cd6777e",
        name: "Juggernaut XL v9",
        params: { prompt: TEST_PROMPT, negative_prompt: TEST_NEGATIVE, width: 1024, height: 768 }
    },
];

// Character Consistency Models
const CHARACTER_MODELS = [
    {
        id: "fofr/consistent-character:9c77a3c2f884193fcee4d89645f02a0b9def9434f9e03cb98460456b831c8772",
        name: "Consistent Character",
        params: {
            prompt: "A person standing in a park, sunny day",
            subject: TEST_IMAGE_URL,
            number_of_outputs: 1,
            number_of_images_per_pose: 1,
            output_format: "webp"
        }
    },
];

// Video Models
const REPLICATE_VIDEO_MODELS = [
    {
        id: "fofr/ltx-video:983ec70a06fd872ef4c29bb6b728556fc2454125a5b2c68ab51eb8a2a9eaa46a",
        name: "LTX Video (Replicate)",
        params: { prompt: TEST_PROMPT }
    },
    {
        id: "lucataco/animate-diff:beecf59c4aee8d81bf04f0381033dfa10dc16e845b4ae00d281e2fa377e48a9f",
        name: "AnimateDiff",
        params: { prompt: TEST_PROMPT, num_frames: 16, num_inference_steps: 25 }
    },
];

async function testModel(modelId: string, name: string, params: any): Promise<TestResult> {
    const startTime = Date.now();
    console.log(`\n🧪 Testing: ${name} (${modelId})`);
    console.log(`   Params: ${JSON.stringify(params, null, 2).replace(/\n/g, '\n   ')}`);

    try {
        const output: any = await replicate.run(modelId as `${string}/${string}`, {
            input: params
        });

        const duration = Date.now() - startTime;

        // Extract URL from various response formats
        let outputUrl: string | undefined;

        if (typeof output === 'string') {
            outputUrl = output;
        } else if (Array.isArray(output) && output.length > 0) {
            if (typeof output[0] === 'string') {
                outputUrl = output[0];
            } else if (output[0]?.url) {
                outputUrl = output[0].url;
            }
        } else if (output?.url) {
            outputUrl = output.url;
        } else if (output?.output) {
            outputUrl = Array.isArray(output.output) ? output.output[0] : output.output;
        }

        // Handle ReadableStream (Flux models often return this)
        if (output instanceof ReadableStream || output?.constructor?.name === 'ReadableStream') {
            console.log(`\n   ✅ SUCCESS in ${(duration / 1000).toFixed(1)}s`);
            console.log(`   📦 Returned ReadableStream (binary image data)`);
            return { model: name, endpoint: modelId, status: "success", duration, outputUrl: "[ReadableStream]" };
        }

        // Handle FileOutput object (common with newer Replicate API)
        if (outputUrl && typeof outputUrl === 'object' && 'url' in outputUrl) {
            outputUrl = (outputUrl as any).url();
        }

        if (outputUrl && typeof outputUrl === 'string') {
            console.log(`\n   ✅ SUCCESS in ${(duration / 1000).toFixed(1)}s`);
            console.log(`   🖼️  ${outputUrl.substring(0, 80)}...`);
            return { model: name, endpoint: modelId, status: "success", duration, outputUrl };
        } else if (outputUrl) {
            // It's some kind of object/stream we can't parse - still consider it success
            console.log(`\n   ✅ SUCCESS in ${(duration / 1000).toFixed(1)}s`);
            console.log(`   📦 Returned: ${typeof outputUrl} (${outputUrl?.constructor?.name || 'unknown'})`);
            return { model: name, endpoint: modelId, status: "success", duration, outputUrl: `[${typeof outputUrl}]` };
        } else {
            console.log(`\n   ⚠️ No output URL found`);
            console.log(`   Response type: ${typeof output}, isArray: ${Array.isArray(output)}`);
            if (output) console.log(`   Response keys: ${Object.keys(output).join(', ')}`);
            return { model: name, endpoint: modelId, status: "failed", error: "No output URL in response", duration };
        }
    } catch (error: any) {
        const duration = Date.now() - startTime;
        console.log(`\n   ❌ FAILED in ${(duration / 1000).toFixed(1)}s`);
        console.log(`   Error: ${error.message}`);

        // Log detailed error if available
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
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

// Add delay between tests to avoid rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
    console.log("=" .repeat(60));
    console.log("  REPLICATE MODEL TESTING - VibeBoard");
    console.log("=" .repeat(60));
    console.log(`\nREPLICATE_API_TOKEN: ${process.env.REPLICATE_API_TOKEN ? '✅ Set' : '❌ Missing'}`);
    console.log(`Test Prompt: "${TEST_PROMPT.substring(0, 60)}..."`);
    console.log(`\n⏱️  Adding 12s delay between tests to avoid rate limits...`);

    // Test Image Models
    console.log("\n" + "=" .repeat(60));
    console.log("  REPLICATE IMAGE MODELS");
    console.log("=" .repeat(60));

    for (let i = 0; i < REPLICATE_IMAGE_MODELS.length; i++) {
        const model = REPLICATE_IMAGE_MODELS[i];
        const result = await testModel(model.id, model.name, model.params);
        results.push(result);
        if (i < REPLICATE_IMAGE_MODELS.length - 1) {
            console.log(`   ⏳ Waiting 12s before next test...`);
            await delay(12000);
        }
    }

    // Test Character Consistency Models
    console.log("\n" + "=" .repeat(60));
    console.log("  CHARACTER CONSISTENCY MODELS");
    console.log("=" .repeat(60));

    for (let i = 0; i < CHARACTER_MODELS.length; i++) {
        const model = CHARACTER_MODELS[i];
        const result = await testModel(model.id, model.name, model.params);
        results.push(result);
        if (i < CHARACTER_MODELS.length - 1) {
            console.log(`   ⏳ Waiting 12s before next test...`);
            await delay(12000);
        }
    }

    // Test Video Models
    console.log("\n" + "=" .repeat(60));
    console.log("  REPLICATE VIDEO MODELS");
    console.log("=" .repeat(60));

    for (let i = 0; i < REPLICATE_VIDEO_MODELS.length; i++) {
        const model = REPLICATE_VIDEO_MODELS[i];
        const result = await testModel(model.id, model.name, model.params);
        results.push(result);
        if (i < REPLICATE_VIDEO_MODELS.length - 1) {
            console.log(`   ⏳ Waiting 12s before next test...`);
            await delay(12000);
        }
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
    const outputPath = path.join(__dirname, "replicate-model-test-results.json");
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
