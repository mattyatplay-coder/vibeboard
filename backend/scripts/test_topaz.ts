import * as dotenv from 'dotenv';
dotenv.config();

import { TopazAdapter } from '../src/services/generators/TopazAdapter';

async function testTopaz() {
    console.log("Testing Topaz Adapter...");

    if (!process.env.TOPAZ_API_KEY) {
        console.error("TOPAZ_API_KEY is not set in .env");
        return;
    }
    console.log("TOPAZ_API_KEY loaded:", process.env.TOPAZ_API_KEY.substring(0, 5) + "...");

    const adapter = new TopazAdapter();

    // Use a publicly available image for testing
    const testImageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png";

    try {
        console.log("Sending upscaling request...");
        const result = await adapter.generateImage({
            prompt: "upscale", // Not used by Topaz but required by interface
            sourceImages: [testImageUrl],
            width: 1024, // Target width
            height: 768  // Target height
        });

        console.log("Result:", result);

        if (result.status === 'succeeded' && result.outputs && result.outputs.length > 0) {
            console.log("Topaz verification SUCCESS!");
            console.log("Output URL:", result.outputs[0]);
        } else {
            console.error("Topaz verification FAILED:", result.error);
        }

    } catch (error) {
        console.error("Test failed with error:", error);
    }
}

testTopaz();
