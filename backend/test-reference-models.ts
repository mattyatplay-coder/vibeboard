/**
 * Reference-Based Model Testing Script
 * Tests image editing/character consistency models that require input images
 *
 * Run with: npx ts-node test-reference-models.ts
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

// Test prompts
const TEST_PROMPT = "A person standing in a sunny park, professional photography";
const CHARACTER_PROMPT = "Character turnaround sheet showing front view, side view, and back view";

// Reference image (dog photo from Pexels - publicly accessible)
const TEST_IMAGE_URL = "https://images.pexels.com/photos/58997/pexels-photo-58997.jpeg?auto=compress&w=1024";

// Reference-based models that require input images
const REFERENCE_MODELS = [
    // Flux Kontext - Character editing/scene transfer
    {
        id: "fal-ai/flux-kontext/dev",
        name: "Flux Kontext Dev",
        params: {
            prompt: "The same subject in a coffee shop, warm lighting",
            image_url: TEST_IMAGE_URL,
            guidance_scale: 2.5
        }
    },
    {
        id: "fal-ai/flux-pro/kontext",
        name: "Flux Pro Kontext",
        params: {
            prompt: "The same subject on a beach at sunset",
            image_url: TEST_IMAGE_URL,
            guidance_scale: 2.5
        }
    },

    // Kling O1 Image - Multi-reference generation
    {
        id: "fal-ai/kling-image/o1",
        name: "Kling O1 Image",
        params: {
            prompt: "A beautiful portrait in the same style",
            image_urls: [TEST_IMAGE_URL],
            aspect_ratio: "16:9"
        }
    },

    // Ideogram Character - Character sheet generation
    {
        id: "fal-ai/ideogram/character",
        name: "Ideogram Character",
        params: {
            prompt: CHARACTER_PROMPT,
            reference_image_urls: [TEST_IMAGE_URL],
            aspect_ratio: "1:1"
        }
    },
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
    console.log("  REFERENCE-BASED MODEL TESTING - VibeBoard");
    console.log("=" .repeat(60));
    console.log(`\nFAL_KEY: ${process.env.FAL_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`Reference Image: ${TEST_IMAGE_URL.substring(0, 60)}...`);

    console.log("\n" + "=" .repeat(60));
    console.log("  IMAGE EDITING / CHARACTER CONSISTENCY MODELS");
    console.log("=" .repeat(60));

    for (const model of REFERENCE_MODELS) {
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

    if (successful.length > 0) {
        console.log("\n⚡ PERFORMANCE RANKING:");
        const sortedBySpeed = successful
            .filter(r => r.duration)
            .sort((a, b) => (a.duration || 0) - (b.duration || 0));

        for (const r of sortedBySpeed) {
            console.log(`   ${r.model}: ${((r.duration || 0) / 1000).toFixed(1)}s`);
        }
    }

    // Save results to JSON
    const outputPath = path.join(__dirname, "reference-model-test-results.json");
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
