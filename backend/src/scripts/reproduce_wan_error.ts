import { FalAIAdapter } from '../services/generators/FalAIAdapter';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testWanError() {
    console.log("Testing Wan 2.2 Error Reproduction...");

    const fal = new FalAIAdapter();

    const options = {
        prompt: "A test video",
        model: "wan-2.2", // The problematic ID
        count: 1
    };

    try {
        console.log("Calling generateVideo with model: 'wan-2.2'");
        // Passing undefined for image to simulate text-to-video
        const result = await fal.generateVideo(undefined, options);
        console.log("Result:", result);
    } catch (error: any) {
        console.log("Caught Error:", error.message);
    }
}

testWanError();
