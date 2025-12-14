import { FalAIAdapter } from '../services/generators/FalAIAdapter';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testWanImageError() {
    console.log("Testing Wan 2.2 Image Generation Error Reproduction...");

    const fal = new FalAIAdapter();

    const options = {
        prompt: "A test generation",
        model: "wan-2.2", // The problematic ID
        count: 1
    };

    try {
        console.log("Calling generateImage with model: 'wan-2.2'");
        const result = await fal.generateImage(options);
        console.log("Result:", result);
    } catch (error: any) {
        console.log("Caught Error:", error.message);
    }
}

testWanImageError();
