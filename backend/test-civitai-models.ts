/**
 * Civitai Model Testing Script
 * Tests all Civitai models registered in VibeBoard using the official SDK
 *
 * Run with: npx ts-node test-civitai-models.ts
 */

import { Civitai, Scheduler } from 'civitai';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment
dotenv.config({ path: path.join(__dirname, '.env') });

const civitai = new Civitai({
    auth: process.env.CIVITAI_API_TOKEN || ''
});

interface TestResult {
    model: string;
    modelId: string;
    status: 'success' | 'failed' | 'skipped';
    error?: string;
    duration?: number;
    outputUrl?: string;
}

const results: TestResult[] = [];

// Test prompt
const TEST_PROMPT = "A majestic golden retriever standing in a sunlit meadow, professional photography, 8k, detailed";

// Civitai models from ModelRegistry - using AIR URN format
// Format: urn:air:{base}:checkpoint:civitai:{modelId}@{versionId}
const CIVITAI_MODELS = [
    {
        urn: 'urn:air:flux1:checkpoint:civitai:618692@691639',
        name: 'Auraflow',
        registryId: 'auraflow',
        width: 1024,
        height: 1024
    },
    {
        urn: 'urn:air:sdxl:checkpoint:civitai:101055@128078',
        name: 'SDXL 1.0',
        registryId: 'sdxl-1-0',
        width: 1024,
        height: 1024
    },
    {
        urn: 'urn:air:sdxl:checkpoint:civitai:413081@462695',
        name: 'SDXL Lightning',
        registryId: 'sdxl-lightning',
        width: 1024,
        height: 1024
    },
    {
        urn: 'urn:air:pony:checkpoint:civitai:257749@290640',
        name: 'Pony Diffusion',
        registryId: 'pony',
        width: 1024,
        height: 1024
    },
    {
        urn: 'urn:air:sd1:checkpoint:civitai:4201@130072',
        name: 'Realistic Vision',
        registryId: 'realistic-vision-civitai',
        width: 512,
        height: 512
    }
];

async function testModel(urn: string, name: string, width: number, height: number): Promise<TestResult> {
    const startTime = Date.now();
    console.log(`\n🧪 Testing: ${name}`);
    console.log(`   URN: ${urn}`);

    try {
        // Use the SDK to generate an image with polling for completion
        const response = await civitai.image.fromText({
            model: urn,
            params: {
                prompt: TEST_PROMPT,
                negativePrompt: "low quality, blurry, distorted, ugly, deformed",
                scheduler: Scheduler.EULER_A,
                steps: 20,
                cfgScale: 7,
                width: width,
                height: height
            }
        }, true); // true enables long polling

        const duration = Date.now() - startTime;

        // Log raw response for debugging
        console.log(`   📋 Raw response: ${JSON.stringify(response).substring(0, 500)}`);

        // Check for successful result - handle both object and array result formats
        const job = response?.jobs?.[0];
        if (job) {
            let imageUrl: string | undefined;

            // Case 1: result is an object with blobUrl (as per documentation)
            if (job.result?.blobUrl) {
                imageUrl = job.result.blobUrl;
            }
            // Case 2: result is an array (actual API behavior for some models)
            else if (Array.isArray(job.result) && job.result[0]?.blobUrl) {
                imageUrl = job.result[0].blobUrl;
            }

            if (imageUrl) {
                console.log(`   ✅ SUCCESS in ${(duration / 1000).toFixed(1)}s`);
                console.log(`   🖼️  ${imageUrl.substring(0, 80)}...`);
                return { model: name, modelId: urn, status: 'success', duration, outputUrl: imageUrl };
            }

            // Check if job is still processing (available: false)
            const resultData = Array.isArray(job.result) ? job.result[0] : job.result;
            if (resultData?.available === false) {
                console.log(`   ⏳ Job completed but image not yet available (processing)`);
                console.log(`   BlobKey: ${resultData?.blobKey}`);
                return { model: name, modelId: urn, status: 'failed', error: 'Image not available yet (still processing)', duration };
            }
        }

        // Check response structure
        console.log(`   ⚠️ Unexpected response structure`);
        console.log(`   Response: ${JSON.stringify(response).substring(0, 500)}`);
        return { model: name, modelId: urn, status: 'failed', error: 'No image URL in response', duration };

    } catch (error: any) {
        const duration = Date.now() - startTime;
        console.log(`   ❌ FAILED in ${(duration / 1000).toFixed(1)}s`);
        console.log(`   Error: ${error.message}`);

        // Log detailed error if available
        if (error.response?.data) {
            console.log(`   Details: ${JSON.stringify(error.response.data, null, 2).substring(0, 300)}`);
        }

        return {
            model: name,
            modelId: urn,
            status: 'failed',
            error: error.message || 'Unknown error',
            duration
        };
    }
}

async function runTests() {
    console.log("=".repeat(60));
    console.log("  CIVITAI MODEL TESTING - VibeBoard");
    console.log("=".repeat(60));
    console.log(`\nCIVITAI_API_TOKEN: ${process.env.CIVITAI_API_TOKEN ? '✅ Set' : '❌ Missing'}`);
    console.log(`Test Prompt: "${TEST_PROMPT.substring(0, 50)}..."`);

    if (!process.env.CIVITAI_API_TOKEN) {
        console.log("\n❌ CIVITAI_API_TOKEN is required. Exiting.");
        return;
    }

    console.log("\n" + "=".repeat(60));
    console.log("  IMAGE GENERATION MODELS");
    console.log("=".repeat(60));

    for (const model of CIVITAI_MODELS) {
        const result = await testModel(model.urn, model.name, model.width, model.height);
        results.push(result);

        // Rate limit delay
        console.log("   ⏳ Waiting 5s...");
        await new Promise(r => setTimeout(r, 5000));
    }

    // Print summary
    console.log("\n\n" + "=".repeat(60));
    console.log("  TEST SUMMARY");
    console.log("=".repeat(60));

    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'failed');

    console.log(`\n✅ Successful: ${successful.length}/${results.length}`);
    console.log(`❌ Failed: ${failed.length}/${results.length}`);

    if (failed.length > 0) {
        console.log("\n🔴 FAILED MODELS:");
        for (const f of failed) {
            console.log(`   - ${f.model}: ${f.error}`);
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
    const outputPath = path.join(__dirname, 'civitai-model-test-results.json');
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
