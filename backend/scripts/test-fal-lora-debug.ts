/**
 * Debug script to test Fal.ai LoRA handling
 */

// @ts-nocheck

import * as path from 'path';
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

import * as fal from "@fal-ai/serverless-client";

// Configure fal client
fal.config({
    credentials: process.env.FAL_KEY
});

const ANGELICA_LORA_URL = 'https://huggingface.co/MikoMurra/angelica-lora/resolve/main/angelica-v4.safetensors';
// Use SAME prompt as Replicate test for direct comparison
const TEST_PROMPT = 'ohwx_angelica, sitting on her couch listening to music in a small fitted white half cut babydoll t-shirt that shows her midriff and belly button ring';
const LORA_SCALE = 1.0;  // Try different scales: 0.8, 1.0, 1.2

async function testFalLoRA() {
    console.log('=== FAL.AI LORA DEBUG TEST ===\n');
    console.log('FAL_KEY set:', !!process.env.FAL_KEY);
    console.log('LoRA URL:', ANGELICA_LORA_URL);
    console.log('Prompt:', TEST_PROMPT);
    console.log('\n');

    const input = {
        prompt: TEST_PROMPT,
        image_size: "landscape_4_3",
        num_inference_steps: 28,
        num_images: 1,
        enable_safety_checker: false,
        loras: [
            {
                path: ANGELICA_LORA_URL,
                scale: LORA_SCALE
            }
        ]
    };

    console.log('Input payload:');
    console.log(JSON.stringify(input, null, 2));
    console.log('\n');

    try {
        console.log('Calling fal-ai/flux-lora...');
        const result: any = await fal.subscribe('fal-ai/flux-lora', {
            input,
            logs: true,
            onQueueUpdate: (update) => {
                console.log('Queue update:', update.status);
                if (update.logs) {
                    update.logs.forEach(log => console.log('  Log:', log.message));
                }
            }
        });

        console.log('\nResult:');
        console.log('- Status: succeeded');
        console.log('- Images:', result.images?.length || 0);
        if (result.images?.length > 0) {
            console.log('- First image URL:', result.images[0].url);
        }
        console.log('- Seed:', result.seed);
        console.log('\nFull result:');
        console.log(JSON.stringify(result, null, 2));

    } catch (error: any) {
        console.error('\nERROR:', error.message);
        if (error.body) {
            console.error('Error body:', JSON.stringify(error.body, null, 2));
        }
    }
}

testFalLoRA();
