/**
 * Character Consistency Test Script
 *
 * Tests multiple approaches for character consistency:
 * 1. Civitai native LoRA (by model ID)
 * 2. Fal.ai with IP-Adapter (image reference)
 * 3. Fal.ai with Flux Kontext (character transfer)
 *
 * Usage: npx ts-node scripts/test-character-consistency.ts
 */

// @ts-nocheck

import * as path from 'path';
import * as fs from 'fs';
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

import * as fal from "@fal-ai/serverless-client";

// Configure fal client
fal.config({ credentials: process.env.FAL_KEY });

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

// Use the Angelica Replicate image as reference for IP-Adapter tests
const REFERENCE_IMAGE = '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/flux-lora-4c8f572a-2245-45f5-8293-373ef7c22942.png';

// Civitai Character Sheet LoRA
const CIVITAI_LORA = {
    modelId: '709294',
    versionId: '793369',
    triggerWord: 'egsheet, character sheet',
    strength: 1.2
};

// Test prompts
const CHARACTER_PROMPT = 'beautiful woman with dark hair, white crop top, sitting on couch, photorealistic';
const CHARACTER_SHEET_PROMPT = 'egsheet, character sheet, multiple angles, beautiful woman with dark hair, full body reference sheet, front view, side view, back view';

// Results storage
interface TestResult {
    test: string;
    provider: string;
    method: string;
    status: 'success' | 'failed';
    outputUrl?: string;
    error?: string;
    duration?: number;
}

const results: TestResult[] = [];

// =============================================================================
// HELPER: Upload local file to Fal.ai
// =============================================================================

async function uploadToFal(filePath: string): Promise<string> {
    if (filePath.startsWith('http')) return filePath;

    const fileData = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    if (typeof File !== 'undefined') {
        const file = new File([fileData], fileName, { type: 'application/octet-stream' });
        return await fal.storage.upload(file);
    } else {
        return await fal.storage.upload(fileData);
    }
}

// =============================================================================
// TEST 1: Fal.ai IP-Adapter (Image Reference)
// =============================================================================

async function testFalIPAdapter(): Promise<void> {
    console.log('\n========== TEST: Fal.ai IP-Adapter ==========\n');
    console.log('Using reference image for character consistency...');

    const start = Date.now();

    try {
        // First upload the reference image
        console.log('Uploading reference image...');
        const refUrl = await uploadToFal(REFERENCE_IMAGE);
        console.log('Reference URL:', refUrl);

        const input = {
            prompt: CHARACTER_PROMPT,
            image_size: "landscape_4_3",
            num_inference_steps: 28,
            num_images: 1,
            enable_safety_checker: false,
            guidance_scale: 3.5,
            // IP-Adapter style image prompts
            image_prompts: [{
                image_url: refUrl,
                weight: 0.85  // High weight for strong character consistency
            }]
        };

        console.log('Input payload:', JSON.stringify(input, null, 2));
        console.log('\nCalling fal-ai/flux/dev...');

        const result: any = await fal.subscribe('fal-ai/flux/dev', {
            input,
            logs: true
        });

        console.log('SUCCESS! Image URL:', result.images[0].url);

        // Download for comparison
        const { execSync } = require('child_process');
        execSync(`curl -s -o /tmp/fal-ip-adapter-test.jpg "${result.images[0].url}"`);
        console.log('Downloaded to /tmp/fal-ip-adapter-test.jpg');

        results.push({
            test: 'IP-Adapter Reference',
            provider: 'fal',
            method: 'image_prompts',
            status: 'success',
            outputUrl: result.images[0].url,
            duration: Date.now() - start
        });

    } catch (error: any) {
        console.error('FAILED:', error.message);
        results.push({
            test: 'IP-Adapter Reference',
            provider: 'fal',
            method: 'image_prompts',
            status: 'failed',
            error: error.message,
            duration: Date.now() - start
        });
    }
}

// =============================================================================
// TEST 2: Fal.ai Flux Kontext (Character Transfer)
// =============================================================================

async function testFalKontext(): Promise<void> {
    console.log('\n========== TEST: Fal.ai Flux Kontext ==========\n');
    console.log('Using Kontext for character transfer to new scene...');

    const start = Date.now();

    try {
        // Upload the reference image
        console.log('Uploading reference image...');
        const refUrl = await uploadToFal(REFERENCE_IMAGE);

        const input = {
            prompt: 'same woman standing in a coffee shop, holding a latte, warm lighting',
            image_url: refUrl,
            num_images: 1
        };

        console.log('Input payload:', JSON.stringify(input, null, 2));
        console.log('\nCalling fal-ai/flux-kontext/dev...');

        const result: any = await fal.subscribe('fal-ai/flux-kontext/dev', {
            input,
            logs: true
        });

        console.log('SUCCESS! Image URL:', result.images[0].url);

        // Download for comparison
        const { execSync } = require('child_process');
        execSync(`curl -s -o /tmp/fal-kontext-test.jpg "${result.images[0].url}"`);
        console.log('Downloaded to /tmp/fal-kontext-test.jpg');

        results.push({
            test: 'Flux Kontext Transfer',
            provider: 'fal',
            method: 'kontext',
            status: 'success',
            outputUrl: result.images[0].url,
            duration: Date.now() - start
        });

    } catch (error: any) {
        console.error('FAILED:', error.message);
        results.push({
            test: 'Flux Kontext Transfer',
            provider: 'fal',
            method: 'kontext',
            status: 'failed',
            error: error.message,
            duration: Date.now() - start
        });
    }
}

// =============================================================================
// TEST 3: Fal.ai with Higher LoRA Scale
// =============================================================================

async function testFalLoRAHighScale(): Promise<void> {
    console.log('\n========== TEST: Fal.ai LoRA High Scale ==========\n');
    console.log('Testing with LoRA scale 1.5 for stronger character influence...');

    const start = Date.now();
    const ANGELICA_LORA = 'https://huggingface.co/MikoMurra/angelica-lora/resolve/main/angelica-v4.safetensors';

    try {
        const input = {
            prompt: 'ohwx_angelica, sitting on her couch listening to music in a small fitted white half cut babydoll t-shirt that shows her midriff and belly button ring',
            image_size: "landscape_4_3",
            num_inference_steps: 28,
            num_images: 1,
            enable_safety_checker: false,
            guidance_scale: 3.5,
            loras: [{
                path: ANGELICA_LORA,
                scale: 1.5  // Higher scale
            }]
        };

        console.log('LoRA scale: 1.5');
        console.log('\nCalling fal-ai/flux-lora...');

        const result: any = await fal.subscribe('fal-ai/flux-lora', {
            input,
            logs: true
        });

        console.log('SUCCESS! Image URL:', result.images[0].url);

        // Download for comparison
        const { execSync } = require('child_process');
        execSync(`curl -s -o /tmp/fal-lora-high-scale.jpg "${result.images[0].url}"`);
        console.log('Downloaded to /tmp/fal-lora-high-scale.jpg');

        results.push({
            test: 'LoRA High Scale (1.5)',
            provider: 'fal',
            method: 'lora_scale_1.5',
            status: 'success',
            outputUrl: result.images[0].url,
            duration: Date.now() - start
        });

    } catch (error: any) {
        console.error('FAILED:', error.message);
        results.push({
            test: 'LoRA High Scale (1.5)',
            provider: 'fal',
            method: 'lora_scale_1.5',
            status: 'failed',
            error: error.message,
            duration: Date.now() - start
        });
    }
}

// =============================================================================
// TEST 4: Civitai Native LoRA (Character Sheet)
// =============================================================================

async function testCivitaiNativeLoRA(): Promise<void> {
    console.log('\n========== TEST: Civitai Native LoRA ==========\n');
    console.log(`Testing with Civitai Character Sheet LoRA (${CIVITAI_LORA.modelId}@${CIVITAI_LORA.versionId})...`);

    const start = Date.now();

    // Import Civitai SDK
    const { Civitai, Scheduler } = await import('civitai');

    const apiKey = process.env.CIVITAI_API_TOKEN;
    if (!apiKey) {
        console.error('CIVITAI_API_TOKEN not set');
        results.push({
            test: 'Civitai Native LoRA',
            provider: 'civitai',
            method: 'additionalNetworks',
            status: 'failed',
            error: 'API key not configured',
            duration: Date.now() - start
        });
        return;
    }

    const civitai = new Civitai({ auth: apiKey });

    try {
        const loraUrn = `urn:air:flux1:lora:civitai:${CIVITAI_LORA.modelId}@${CIVITAI_LORA.versionId}`;

        const input = {
            model: 'urn:air:flux1:checkpoint:civitai:618692@691639', // Flux.1 D
            params: {
                prompt: `${CIVITAI_LORA.triggerWord}, ${CHARACTER_SHEET_PROMPT}`,
                negativePrompt: 'lowres, bad quality, blurry',
                scheduler: Scheduler.EULER_A,
                steps: 25,
                cfgScale: 7,
                width: 1024,
                height: 1024,
                clipSkip: 2
            },
            additionalNetworks: {
                [loraUrn]: {
                    strength: CIVITAI_LORA.strength
                }
            }
        };

        console.log('Input payload:', JSON.stringify(input, null, 2));
        console.log('\nCalling Civitai SDK...');

        const response = await civitai.image.fromText(input, true);

        if (response.jobs && response.jobs.length > 0) {
            const job = response.jobs[0];
            if (job.result && job.result.blobUrl) {
                console.log('SUCCESS! Image URL:', job.result.blobUrl);

                // Download for comparison
                const { execSync } = require('child_process');
                execSync(`curl -s -o /tmp/civitai-native-lora.jpg "${job.result.blobUrl}"`);
                console.log('Downloaded to /tmp/civitai-native-lora.jpg');

                results.push({
                    test: 'Civitai Native LoRA',
                    provider: 'civitai',
                    method: 'additionalNetworks',
                    status: 'success',
                    outputUrl: job.result.blobUrl,
                    duration: Date.now() - start
                });
                return;
            }
        }

        throw new Error('No image returned from Civitai');

    } catch (error: any) {
        console.error('FAILED:', error.message);
        results.push({
            test: 'Civitai Native LoRA',
            provider: 'civitai',
            method: 'additionalNetworks',
            status: 'failed',
            error: error.message,
            duration: Date.now() - start
        });
    }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
    console.log('='.repeat(60));
    console.log('CHARACTER CONSISTENCY TEST SUITE');
    console.log('='.repeat(60));
    console.log('\nReference Image:', REFERENCE_IMAGE);
    console.log('FAL_KEY set:', !!process.env.FAL_KEY);
    console.log('CIVITAI_API_TOKEN set:', !!process.env.CIVITAI_API_TOKEN);

    // Check reference image exists
    if (!fs.existsSync(REFERENCE_IMAGE)) {
        console.error('\nERROR: Reference image not found at', REFERENCE_IMAGE);
        console.log('Please run the LoRA test first to generate reference images.');
        return;
    }

    // Run tests
    await testFalIPAdapter();
    await testFalKontext();
    await testFalLoRAHighScale();
    await testCivitaiNativeLoRA();

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
    console.log('| Test | Provider | Method | Status | Duration |');
    console.log('|------|----------|--------|--------|----------|');

    for (const result of results) {
        const status = result.status === 'success' ? 'SUCCESS' : 'FAILED';
        const duration = result.duration ? `${(result.duration / 1000).toFixed(1)}s` : 'N/A';
        console.log(`| ${result.test} | ${result.provider} | ${result.method} | ${status} | ${duration} |`);
    }

    if (failed.length > 0) {
        console.log('\n--- FAILURES ---\n');
        for (const result of failed) {
            console.log(`${result.test}: ${result.error}`);
        }
    }

    console.log('\n--- OUTPUT FILES ---\n');
    console.log('Reference:     ', REFERENCE_IMAGE);
    console.log('IP-Adapter:    /tmp/fal-ip-adapter-test.jpg');
    console.log('Kontext:       /tmp/fal-kontext-test.jpg');
    console.log('LoRA Scale 1.5:/tmp/fal-lora-high-scale.jpg');
    console.log('Civitai:       /tmp/civitai-native-lora.jpg');
}

main().catch(console.error);
