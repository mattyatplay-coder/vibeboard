import * as path from 'path';
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
import { FalAIAdapter } from '../src/services/generators/FalAIAdapter';

async function main() {
    console.log("🚀 Testing Kling Camera Controls...");

    if (!process.env.FAL_KEY) {
        console.warn("⚠️ FAL_KEY is not set. Test will fail.");
        return;
    }

    const adapter = new FalAIAdapter();

    // Test case: Pan Right
    const options = {
        prompt: "A cinematic drone shot of a futuristic city",
        model: "fal-ai/kling-video/v1/standard/text-to-video",
        duration: "5",
        cameraMovement: {
            type: 'pan',
            direction: 'right',
            intensity: 5
        }
    } as any; // Cast to any or GenerationOptions to avoid strict type check in script

    console.log("Testing with options:", JSON.stringify(options, null, 2));

    try {
        const result = await adapter.generateVideo(undefined, options);
        console.log("Generation Result:", JSON.stringify(result, null, 2));
    } catch (error: any) {
        console.error("Generation Failed:", error.message);
        if (error.body) {
            console.error("Error Body:", JSON.stringify(error.body, null, 2));
        }
    }
}

main();
