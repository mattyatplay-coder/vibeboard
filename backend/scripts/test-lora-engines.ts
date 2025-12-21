/**
 * LoRA Engine Test Script
 *
 * Tests all image and video generation engines with the Angelica V4 LoRA
 * to ensure predictable, consistent results across providers.
 *
 * Usage: npx ts-node scripts/test-lora-engines.ts
 */

// @ts-nocheck - Disable strict type checking for test script

import * as path from 'path';
import * as fs from 'fs';

// Load environment variables BEFORE importing adapters
// Use explicit path to backend .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Now import adapters (after env is loaded)
import { GenerationService } from '../src/services/GenerationService';
import { FalAIAdapter } from '../src/services/generators/FalAIAdapter';
import { ReplicateAdapter } from '../src/services/generators/ReplicateAdapter';
import { CivitaiAdapter } from '../src/services/generators/CivitaiAdapter';

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

const TEST_PROMPT = `ohwx_angelica, sitting on her couch listening to music in a small fitted white half cut babydoll t-shirt that shows her midriff and belly button ring`;

const NEGATIVE_PROMPT = `lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, deformed, distorted`;

// Angelica V4 LoRA - Standard safetensors file (works with Fal.ai, Replicate flux-dev-lora, ComfyUI)
const ANGELICA_V4_LORA = {
    path: 'https://huggingface.co/MikoMurra/angelica-lora/resolve/main/angelica-v4.safetensors',
    strength: 1.0,
    triggerWord: 'ohwx_angelica'
};

// Angelica Replicate Trained Model (works only with Replicate)
const ANGELICA_REPLICATE_MODEL = 'mattyatplay-coder/angelicatraining';

// Test output directory
const OUTPUT_DIR = path.join(process.cwd(), 'test-outputs', `lora-test-${Date.now()}`);

// =============================================================================
// IMAGE ENGINE TESTS
// =============================================================================

interface TestResult {
    engine: string;
    model: string;
    loraType: 'safetensors' | 'replicate-trained' | 'civitai-syntax';
    status: 'success' | 'failed' | 'skipped';
    outputUrl?: string;
    error?: string;
    duration?: number;
}

const results: TestResult[] = [];

async function testFalAI(): Promise<void> {
    console.log('\n========== FAL.AI TESTS ==========\n');

    const adapter = new FalAIAdapter();

    // Test 1: Fal.ai with flux-lora endpoint (standard safetensors)
    console.log('[Fal.ai] Testing flux-lora with Angelica V4 safetensors...');
    const start = Date.now();

    try {
        const result = await adapter.generateImage({
            prompt: TEST_PROMPT,
            negativePrompt: NEGATIVE_PROMPT,
            model: 'fal-ai/flux-lora',
            loras: [ANGELICA_V4_LORA],
            aspectRatio: '16:9',
            count: 1,
        });

        if (result.status === 'succeeded' && result.outputs?.length > 0) {
            console.log(`[Fal.ai] SUCCESS: ${result.outputs[0]}`);
            results.push({
                engine: 'fal',
                model: 'fal-ai/flux-lora',
                loraType: 'safetensors',
                status: 'success',
                outputUrl: result.outputs[0],
                duration: Date.now() - start
            });
        } else {
            throw new Error(result.error || 'No output');
        }
    } catch (error: any) {
        console.error(`[Fal.ai] FAILED: ${error.message}`);
        results.push({
            engine: 'fal',
            model: 'fal-ai/flux-lora',
            loraType: 'safetensors',
            status: 'failed',
            error: error.message,
            duration: Date.now() - start
        });
    }

    // Test 2: Fal.ai Flux Dev (no LoRA, baseline)
    console.log('\n[Fal.ai] Testing Flux Dev baseline (no LoRA)...');
    const start2 = Date.now();

    try {
        const result = await adapter.generateImage({
            prompt: TEST_PROMPT,
            negativePrompt: NEGATIVE_PROMPT,
            model: 'fal-ai/flux/dev',
            aspectRatio: '16:9',
            count: 1,
        });

        if (result.status === 'succeeded' && result.outputs?.length > 0) {
            console.log(`[Fal.ai] Baseline SUCCESS: ${result.outputs[0]}`);
            results.push({
                engine: 'fal',
                model: 'fal-ai/flux/dev',
                loraType: 'safetensors',
                status: 'success',
                outputUrl: result.outputs[0],
                duration: Date.now() - start2
            });
        } else {
            throw new Error(result.error || 'No output');
        }
    } catch (error: any) {
        console.error(`[Fal.ai] Baseline FAILED: ${error.message}`);
        results.push({
            engine: 'fal',
            model: 'fal-ai/flux/dev',
            loraType: 'safetensors',
            status: 'failed',
            error: error.message,
            duration: Date.now() - start2
        });
    }
}

async function testReplicate(): Promise<void> {
    console.log('\n========== REPLICATE TESTS ==========\n');

    const adapter = new ReplicateAdapter();

    // Test 1: Replicate with custom trained LoRA model (Angelica)
    console.log('[Replicate] Testing custom trained model (mattyatplay-coder/angelicatraining)...');
    const start = Date.now();

    try {
        const result = await adapter.generateImage({
            prompt: TEST_PROMPT,
            negativePrompt: NEGATIVE_PROMPT,
            model: ANGELICA_REPLICATE_MODEL,
            aspectRatio: '16:9',
            count: 1,
        });

        if (result.status === 'succeeded' && result.outputs?.length > 0) {
            console.log(`[Replicate] Custom LoRA SUCCESS: ${result.outputs[0]}`);
            results.push({
                engine: 'replicate',
                model: ANGELICA_REPLICATE_MODEL,
                loraType: 'replicate-trained',
                status: 'success',
                outputUrl: result.outputs[0],
                duration: Date.now() - start
            });
        } else {
            throw new Error(result.error || 'No output');
        }
    } catch (error: any) {
        console.error(`[Replicate] Custom LoRA FAILED: ${error.message}`);
        results.push({
            engine: 'replicate',
            model: ANGELICA_REPLICATE_MODEL,
            loraType: 'replicate-trained',
            status: 'failed',
            error: error.message,
            duration: Date.now() - start
        });
    }

    // Test 2: Replicate with standard safetensors via flux-dev-lora
    console.log('\n[Replicate] Testing flux-dev-lora with Angelica V4 safetensors...');
    const start2 = Date.now();

    try {
        const result = await adapter.generateImage({
            prompt: TEST_PROMPT,
            negativePrompt: NEGATIVE_PROMPT,
            model: 'black-forest-labs/flux-dev', // Will be handled by standard LoRA handler
            loras: [ANGELICA_V4_LORA],
            aspectRatio: '16:9',
            count: 1,
        });

        if (result.status === 'succeeded' && result.outputs?.length > 0) {
            console.log(`[Replicate] Safetensors LoRA SUCCESS: ${result.outputs[0]}`);
            results.push({
                engine: 'replicate',
                model: 'black-forest-labs/flux-dev-lora',
                loraType: 'safetensors',
                status: 'success',
                outputUrl: result.outputs[0],
                duration: Date.now() - start2
            });
        } else {
            throw new Error(result.error || 'No output');
        }
    } catch (error: any) {
        console.error(`[Replicate] Safetensors LoRA FAILED: ${error.message}`);
        results.push({
            engine: 'replicate',
            model: 'black-forest-labs/flux-dev-lora',
            loraType: 'safetensors',
            status: 'failed',
            error: error.message,
            duration: Date.now() - start2
        });
    }
}

async function testCivitai(): Promise<void> {
    console.log('\n========== CIVITAI TESTS ==========\n');

    const adapter = new CivitaiAdapter();

    // Note: Civitai uses <lora:name:strength> syntax in the prompt
    // The LoRA must be available on Civitai by name/ID

    // Test 1: Civitai SDXL baseline (no LoRA)
    console.log('[Civitai] Testing SDXL 1.0 baseline...');
    const start = Date.now();

    try {
        const result = await adapter.generateImage({
            prompt: TEST_PROMPT,
            negativePrompt: NEGATIVE_PROMPT,
            model: 'sdxl-1-0',
            aspectRatio: '16:9',
            count: 1,
        });

        if (result.status === 'succeeded' && result.outputs?.length > 0) {
            console.log(`[Civitai] SDXL SUCCESS: ${result.outputs[0]}`);
            results.push({
                engine: 'civitai',
                model: 'SDXL 1.0',
                loraType: 'civitai-syntax',
                status: 'success',
                outputUrl: result.outputs[0],
                duration: Date.now() - start
            });
        } else {
            throw new Error(result.error || 'No output');
        }
    } catch (error: any) {
        console.error(`[Civitai] SDXL FAILED: ${error.message}`);
        results.push({
            engine: 'civitai',
            model: 'SDXL 1.0',
            loraType: 'civitai-syntax',
            status: 'failed',
            error: error.message,
            duration: Date.now() - start
        });
    }

    // Test 2: Civitai Flux.1 D
    console.log('\n[Civitai] Testing Flux.1 D...');
    const start2 = Date.now();

    try {
        const result = await adapter.generateImage({
            prompt: TEST_PROMPT,
            negativePrompt: NEGATIVE_PROMPT,
            model: 'flux-1-d',
            aspectRatio: '16:9',
            count: 1,
        });

        if (result.status === 'succeeded' && result.outputs?.length > 0) {
            console.log(`[Civitai] Flux.1 D SUCCESS: ${result.outputs[0]}`);
            results.push({
                engine: 'civitai',
                model: 'Flux.1 D',
                loraType: 'civitai-syntax',
                status: 'success',
                outputUrl: result.outputs[0],
                duration: Date.now() - start2
            });
        } else {
            throw new Error(result.error || 'No output');
        }
    } catch (error: any) {
        console.error(`[Civitai] Flux.1 D FAILED: ${error.message}`);
        results.push({
            engine: 'civitai',
            model: 'Flux.1 D',
            loraType: 'civitai-syntax',
            status: 'failed',
            error: error.message,
            duration: Date.now() - start2
        });
    }
}

// =============================================================================
// VIDEO ENGINE TESTS
// =============================================================================

async function testVideoEngines(): Promise<void> {
    console.log('\n========== VIDEO ENGINE TESTS ==========\n');

    const VIDEO_PROMPT = `ohwx_angelica, sitting on her couch listening to music in a small fitted white half cut babydoll t-shirt, gentle swaying motion, cinematic lighting, 4k`;

    // Test 1: Fal.ai Wan T2V with LoRA (using Wan 2.1 T2V LoRA endpoint)
    console.log('[Fal.ai Video] Testing Wan T2V with LoRA...');
    const falAdapter = new FalAIAdapter();
    const start = Date.now();

    try {
        // Use the T2V LoRA endpoint - the adapter will auto-switch if using wan-t2v with LoRAs
        const result = await falAdapter.generateVideo(undefined, {
            prompt: VIDEO_PROMPT,
            negativePrompt: NEGATIVE_PROMPT,
            model: 'fal-ai/wan-t2v-lora', // Wan 2.1 T2V with LoRA support
            loras: [ANGELICA_V4_LORA],
            duration: '5',
            aspectRatio: '16:9',
        });

        if (result.status === 'succeeded' && result.outputs?.length > 0) {
            console.log(`[Fal.ai Video] SUCCESS: ${result.outputs[0]}`);
            results.push({
                engine: 'fal',
                model: 'fal-ai/wan-lora-video',
                loraType: 'safetensors',
                status: 'success',
                outputUrl: result.outputs[0],
                duration: Date.now() - start
            });
        } else {
            throw new Error(result.error || 'No output');
        }
    } catch (error: any) {
        console.error(`[Fal.ai Video] FAILED: ${error.message}`);
        results.push({
            engine: 'fal',
            model: 'fal-ai/wan-lora-video',
            loraType: 'safetensors',
            status: 'failed',
            error: error.message,
            duration: Date.now() - start
        });
    }

    // Test 2: Civitai Wan 2.5 T2V (with LoRA via prompt syntax)
    console.log('\n[Civitai Video] Testing Wan 2.5 T2V...');
    const civitaiAdapter = new CivitaiAdapter();
    const start2 = Date.now();

    try {
        const result = await civitaiAdapter.generateVideo(undefined, {
            prompt: VIDEO_PROMPT,
            negativePrompt: NEGATIVE_PROMPT,
            model: 'wan-video-2-5-t2v',
            duration: '5',
        });

        if (result.status === 'succeeded' && result.outputs?.length > 0) {
            console.log(`[Civitai Video] SUCCESS: ${result.outputs[0]}`);
            results.push({
                engine: 'civitai',
                model: 'Wan Video 2.5 T2V',
                loraType: 'civitai-syntax',
                status: 'success',
                outputUrl: result.outputs[0],
                duration: Date.now() - start2
            });
        } else {
            throw new Error(result.error || 'No output');
        }
    } catch (error: any) {
        console.error(`[Civitai Video] FAILED: ${error.message}`);
        results.push({
            engine: 'civitai',
            model: 'Wan Video 2.5 T2V',
            loraType: 'civitai-syntax',
            status: 'failed',
            error: error.message,
            duration: Date.now() - start2
        });
    }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
    console.log('='.repeat(60));
    console.log('LoRA ENGINE TEST SUITE');
    console.log('='.repeat(60));
    console.log(`\nTest Prompt: "${TEST_PROMPT.substring(0, 50)}..."`);
    console.log(`LoRA: Angelica V4 (${ANGELICA_V4_LORA.path.substring(0, 50)}...)`);
    console.log(`Output Directory: ${OUTPUT_DIR}\n`);

    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Run tests
    await testFalAI();
    await testReplicate();
    await testCivitai();
    await testVideoEngines();

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60) + '\n');

    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'failed');

    console.log(`Total Tests: ${results.length}`);
    console.log(`Successful: ${successful.length}`);
    console.log(`Failed: ${failed.length}`);

    console.log('\n--- RESULTS TABLE ---\n');
    console.log('| Engine | Model | LoRA Type | Status | Duration |');
    console.log('|--------|-------|-----------|--------|----------|');

    for (const result of results) {
        const status = result.status === 'success' ? '✅' : '❌';
        const duration = result.duration ? `${(result.duration / 1000).toFixed(1)}s` : 'N/A';
        console.log(`| ${result.engine} | ${result.model.substring(0, 30)} | ${result.loraType} | ${status} | ${duration} |`);
    }

    if (failed.length > 0) {
        console.log('\n--- FAILURES ---\n');
        for (const result of failed) {
            console.log(`${result.engine}/${result.model}: ${result.error}`);
        }
    }

    // Save results to file
    const resultsPath = path.join(OUTPUT_DIR, 'results.json');
    fs.writeFileSync(resultsPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        prompt: TEST_PROMPT,
        lora: ANGELICA_V4_LORA,
        results
    }, null, 2));
    console.log(`\nResults saved to: ${resultsPath}`);
}

main().catch(console.error);
