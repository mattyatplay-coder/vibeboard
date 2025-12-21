/**
 * Test Script for Enhanced Character Consistency Features
 *
 * Tests the new unified generateWithCharacterConsistency method
 * and the enhanced Kontext/IP-Adapter methods.
 *
 * Usage: source .env && npx ts-node scripts/test-character-consistency-enhanced.ts
 */

// @ts-nocheck

import * as path from 'path';
import * as fs from 'fs';
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

import { FalAIAdapter } from '../src/services/generators/FalAIAdapter';

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

// Use the Angelica Replicate image as reference
const REFERENCE_IMAGE = '/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/flux-lora-4c8f572a-2245-45f5-8293-373ef7c22942.png';

// Test scenes for character transfer
const TEST_SCENES = [
    'same woman standing in a coffee shop, holding a latte, warm lighting',
    'same woman walking on a beach at sunset, casual summer dress',
    'same woman in a professional office setting, business attire',
];

// =============================================================================
// TESTS
// =============================================================================

async function testUnifiedCharacterConsistency(): Promise<void> {
    console.log('\n========== TEST: Unified Character Consistency (Auto) ==========\n');

    const adapter = new FalAIAdapter();

    try {
        const result = await adapter.generateWithCharacterConsistency({
            prompt: 'same woman sitting at a cafe, drinking coffee, warm afternoon light',
            characterConsistency: {
                method: 'auto',
                referenceImage: REFERENCE_IMAGE,
                styleWeight: 0.85,
                sceneTransfer: true,
            },
        });

        console.log('Status:', result.status);
        console.log('Provider:', result.provider);
        if (result.outputs) {
            console.log('Output URL:', result.outputs[0]);

            // Download for review
            const { execSync } = require('child_process');
            execSync(`curl -s -o /tmp/char-consistency-auto.jpg "${result.outputs[0]}"`);
            console.log('Downloaded to /tmp/char-consistency-auto.jpg');
        }
        if (result.error) {
            console.log('Error:', result.error);
        }
    } catch (error: any) {
        console.error('Test failed:', error.message);
    }
}

async function testKontextEnhanced(): Promise<void> {
    console.log('\n========== TEST: Kontext Enhanced ==========\n');

    const adapter = new FalAIAdapter();

    try {
        const result = await adapter.generateWithKontextEnhanced({
            prompt: 'same woman in a modern art gallery, admiring paintings, elegant pose',
            elementReferences: [REFERENCE_IMAGE],
            count: 1,
        });

        console.log('Status:', result.status);
        console.log('Provider:', result.provider);
        if (result.outputs) {
            console.log('Output URL:', result.outputs[0]);

            const { execSync } = require('child_process');
            execSync(`curl -s -o /tmp/kontext-enhanced.jpg "${result.outputs[0]}"`);
            console.log('Downloaded to /tmp/kontext-enhanced.jpg');
        }
        if (result.error) {
            console.log('Error:', result.error);
        }
    } catch (error: any) {
        console.error('Test failed:', error.message);
    }
}

async function testIPAdapterEnhanced(): Promise<void> {
    console.log('\n========== TEST: IP-Adapter Enhanced ==========\n');

    const adapter = new FalAIAdapter();

    try {
        const result = await adapter.generateWithIPAdapterEnhanced({
            prompt: 'beautiful woman with dark hair, sitting in a garden, natural lighting, photorealistic',
            elementReferences: [REFERENCE_IMAGE],
            referenceCreativity: 0.85,
            aspectRatio: '4:3',
        });

        console.log('Status:', result.status);
        console.log('Provider:', result.provider);
        if (result.outputs) {
            console.log('Output URL:', result.outputs[0]);

            const { execSync } = require('child_process');
            execSync(`curl -s -o /tmp/ip-adapter-enhanced.jpg "${result.outputs[0]}"`);
            console.log('Downloaded to /tmp/ip-adapter-enhanced.jpg');
        }
        if (result.error) {
            console.log('Error:', result.error);
        }
    } catch (error: any) {
        console.error('Test failed:', error.message);
    }
}

async function testCharacterVariations(): Promise<void> {
    console.log('\n========== TEST: Character Variations ==========\n');
    console.log(`Testing ${TEST_SCENES.length} scene variations...`);

    const adapter = new FalAIAdapter();

    try {
        const results = await adapter.generateCharacterVariations(
            REFERENCE_IMAGE,
            TEST_SCENES.slice(0, 2), // Just test first 2 to save time
            { aspectRatio: '4:3' }
        );

        console.log(`\nGenerated ${results.length} variations:`);

        const { execSync } = require('child_process');
        results.forEach((result, i) => {
            console.log(`\nVariation ${i + 1}:`);
            console.log('  Scene:', TEST_SCENES[i]);
            console.log('  Status:', result.status);
            if (result.outputs) {
                console.log('  URL:', result.outputs[0]);
                execSync(`curl -s -o /tmp/char-variation-${i + 1}.jpg "${result.outputs[0]}"`);
                console.log(`  Downloaded to /tmp/char-variation-${i + 1}.jpg`);
            }
        });
    } catch (error: any) {
        console.error('Test failed:', error.message);
    }
}

async function testCharacterPreset(): Promise<void> {
    console.log('\n========== TEST: Character Preset Analysis ==========\n');

    const adapter = new FalAIAdapter();

    try {
        // First need to upload or use a URL
        console.log('Analyzing reference image for optimal settings...');

        // For local files, we need to use the actual generation
        // This test will use Kontext to upload and analyze
        const preset = await adapter.createCharacterPreset(REFERENCE_IMAGE);

        console.log('Recommended Method:', preset.recommendedMethod);
        console.log('Face Weight:', preset.faceWeight);
        console.log('Style Weight:', preset.styleWeight);
        console.log('Suggested Prefix:', preset.suggestedPromptPrefix);
    } catch (error: any) {
        console.error('Test failed:', error.message);
    }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
    console.log('='.repeat(60));
    console.log('ENHANCED CHARACTER CONSISTENCY TEST SUITE');
    console.log('='.repeat(60));
    console.log('\nReference Image:', REFERENCE_IMAGE);
    console.log('FAL_KEY set:', !!process.env.FAL_KEY);

    // Check reference image exists
    if (!fs.existsSync(REFERENCE_IMAGE)) {
        console.error('\nERROR: Reference image not found at', REFERENCE_IMAGE);
        console.log('Please ensure the reference image exists.');
        return;
    }

    // Run tests
    await testUnifiedCharacterConsistency();
    await testKontextEnhanced();
    await testIPAdapterEnhanced();
    // await testCharacterVariations(); // Uncomment to test multiple variations
    // await testCharacterPreset(); // Uncomment to test preset analysis

    console.log('\n' + '='.repeat(60));
    console.log('TESTS COMPLETE');
    console.log('='.repeat(60));
    console.log('\nOutput files:');
    console.log('  /tmp/char-consistency-auto.jpg');
    console.log('  /tmp/kontext-enhanced.jpg');
    console.log('  /tmp/ip-adapter-enhanced.jpg');
}

main().catch(console.error);
