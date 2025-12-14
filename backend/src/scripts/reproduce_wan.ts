const { fal } = require('@fal-ai/client');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testWan() {
    console.log("Testing Wan Models on Fal.ai...");

    const models = [
        { id: 'fal-ai/wan-t2v', input: { prompt: "A cinematic shot of a cat sitting on a windowsill, raining outside, 4k, highly detailed" } },
        { id: 'fal-ai/wan-i2v', input: { prompt: "A cinematic shot of a cat", image_url: "https://storage.googleapis.com/falserverless/model_tests/flux/flux_dev_1.png" } }
    ];

    for (const model of models) {
        console.log(`\nTesting model: ${model.id}`);
        try {
            // Just a dry run or quick check if possible, but subscribe actually runs it.
            // We'll try to run a very short generation or just check if it errors immediately on "not found".
            // Note: This will cost money if it works.
            // Better approach: Check if we can get model details or just run a dummy request that fails validation but passes "not found".

            // Actually, let's just try the one we are using in the code and see the error.
            const result = await fal.subscribe(model.id, {
                input: model.input,
                logs: true,
            });
            console.log(`SUCCESS: ${model.id}`);
            console.log(result);
            break; // Stop after first success
        } catch (error: any) {
            console.log(`FAILED: ${model.id}`);
            console.log(error.message);
        }
    }
}

testWan();
