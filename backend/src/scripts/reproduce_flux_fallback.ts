import { FalAIAdapter } from '../services/generators/FalAIAdapter';
import { ReplicateAdapter } from '../services/generators/ReplicateAdapter';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testFluxFallback() {
    console.log("Testing Flux Fallback Scenario...");

    const fal = new FalAIAdapter();
    const replicate = new ReplicateAdapter();

    const options = {
        prompt: "A test image",
        model: "flux-dev", // This is what comes from frontend or default
        count: 1
    };

    console.log("\n--- Testing Fal with 'flux-dev' ---");
    try {
        // This should fail currently because Fal expects 'fal-ai/flux/dev'
        // But wait, FalAIAdapter might default to 'fal-ai/flux/dev' if model is null, but here it's 'flux-dev'
        const result = await fal.generateImage(options);
        console.log("Fal Result:", result);
    } catch (error: any) {
        console.log("Fal Failed:", error.message);
    }

    console.log("\n--- Testing Replicate with 'fal-ai/flux/dev' (Simulating fallback with bad ID) ---");
    try {
        // Simulating GenerationService passing the Fal ID to Replicate
        const badOptions = { ...options, model: "fal-ai/flux/dev" };
        const result = await replicate.generateImage(badOptions);
        console.log("Replicate Result:", result);
    } catch (error: any) {
        console.log("Replicate Failed:", error.message);
    }
}

testFluxFallback();
