/**
 * Together AI Model Testing Script
 * Tests all Together AI models registered in VibeBoard
 *
 * Run with: npx ts-node test-together-models.ts
 */

import Together from 'together-ai';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment
dotenv.config({ path: path.join(__dirname, '.env') });

const together = new Together({
    apiKey: process.env.TOGETHER_API_KEY
});

interface TestResult {
    model: string;
    endpoint: string;
    status: 'success' | 'failed' | 'skipped';
    error?: string;
    duration?: number;
    outputUrl?: string;
}

const results: TestResult[] = [];

// Test prompt
const TEST_PROMPT = "A majestic golden retriever standing in a sunlit meadow, professional photography";

// Together AI models - Updated Dec 24, 2025
// Using correct model IDs from Together AI dashboard
const TOGETHER_MODELS = [
    // FLUX Models
    {
        id: 'black-forest-labs/FLUX.1-schnell',
        name: 'Flux Schnell ($0.003)',
        registryId: 'black-forest-labs/FLUX.1-schnell'
    },
    {
        id: 'black-forest-labs/FLUX.1-dev',
        name: 'Flux Dev',
        registryId: 'black-forest-labs/FLUX.1-dev'
    },
    // Stable Diffusion
    {
        id: 'stabilityai/stable-diffusion-3',
        name: 'SD 3 ($0.0019)',
        registryId: 'stabilityai/stable-diffusion-3'
    },
    {
        id: 'stabilityai/sdxl',
        name: 'SDXL ($0.0019)',
        registryId: 'stabilityai/sdxl'
    },
    // Dreamshaper
    {
        id: 'Lykon/DreamShaper',
        name: 'Dreamshaper ($0.0006)',
        registryId: 'Lykon/DreamShaper'
    },
    // HiDream
    {
        id: 'HiDream-ai/HiDream-I1-Full',
        name: 'HiDream I1 Full ($0.009)',
        registryId: 'HiDream-ai/HiDream-I1-Full'
    },
    {
        id: 'HiDream-ai/HiDream-I1-Dev',
        name: 'HiDream I1 Dev ($0.0045)',
        registryId: 'HiDream-ai/HiDream-I1-Dev'
    },
    {
        id: 'HiDream-ai/HiDream-I1-Fast',
        name: 'HiDream I1 Fast ($0.0032)',
        registryId: 'HiDream-ai/HiDream-I1-Fast'
    },
    // Juggernaut (RunDiffusion)
    {
        id: 'RunDiffusion/Juggernaut-Pro-Flux',
        name: 'Juggernaut Pro Flux ($0.0049)',
        registryId: 'RunDiffusion/Juggernaut-Pro-Flux'
    },
    {
        id: 'RunDiffusion/Juggernaut-Lightning-Flux',
        name: 'Juggernaut Lightning ($0.0017)',
        registryId: 'RunDiffusion/Juggernaut-Lightning-Flux'
    }
];

async function testModel(modelId: string, name: string): Promise<TestResult> {
    const startTime = Date.now();
    console.log(`\n🧪 Testing: ${name} (${modelId})`);

    try {
        const response = await together.images.generate({
            model: modelId,
            prompt: TEST_PROMPT,
            width: 1024,
            height: 1024,
            steps: 4, // Use fewer steps for speed
            n: 1,
            response_format: 'url'
        });

        const duration = Date.now() - startTime;

        // Together AI returns data array with url or b64_json
        const imageData = response.data?.[0] as any;
        if (imageData) {
            const hasOutput = imageData.url || imageData.b64_json;
            if (hasOutput) {
                console.log(`   ✅ SUCCESS in ${(duration / 1000).toFixed(1)}s`);
                if (imageData.url) {
                    console.log(`   🖼️  ${imageData.url.substring(0, 80)}...`);
                } else {
                    console.log(`   🖼️  Base64 image returned (${imageData.b64_json?.length || 0} chars)`);
                }
                return { model: name, endpoint: modelId, status: 'success', duration, outputUrl: imageData.url };
            }
        }

        console.log(`   ⚠️ No image data in response`);
        console.log(`   Response: ${JSON.stringify(response).substring(0, 200)}`);
        return { model: name, endpoint: modelId, status: 'failed', error: 'No image data', duration };
    } catch (error: any) {
        const duration = Date.now() - startTime;
        console.log(`   ❌ FAILED in ${(duration / 1000).toFixed(1)}s`);
        console.log(`   Error: ${error.message}`);

        // Log detailed error
        if (error.error) {
            console.log(`   Details: ${JSON.stringify(error.error, null, 2)}`);
        }

        return {
            model: name,
            endpoint: modelId,
            status: 'failed',
            error: error.message || 'Unknown error',
            duration
        };
    }
}

async function runTests() {
    console.log("=".repeat(60));
    console.log("  TOGETHER AI MODEL TESTING - VibeBoard");
    console.log("=".repeat(60));
    console.log(`\nTOGETHER_API_KEY: ${process.env.TOGETHER_API_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`Test Prompt: "${TEST_PROMPT.substring(0, 50)}..."`);

    console.log("\n" + "=".repeat(60));
    console.log("  IMAGE GENERATION MODELS");
    console.log("=".repeat(60));

    for (const model of TOGETHER_MODELS) {
        const result = await testModel(model.id, model.name);
        results.push(result);

        // Rate limit delay
        console.log("   ⏳ Waiting 3s...");
        await new Promise(r => setTimeout(r, 3000));
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
    const outputPath = path.join(__dirname, 'together-model-test-results.json');
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
