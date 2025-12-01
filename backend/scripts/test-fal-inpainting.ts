import { fal } from "@fal-ai/client";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function testInpainting() {
    console.log("Testing Fal Inpainting Models...");

    const testImageUrl = "https://storage.googleapis.com/falserverless/model_tests/inpainting/monkey.png";
    const testMaskUrl = "https://storage.googleapis.com/falserverless/model_tests/inpainting/monkey_mask.png";
    const prompt = "a monkey with a red hat";

    // Test flux-general/inpainting with different inputs
    const model = "fal-ai/flux-general/inpainting";
    console.log(`\nRetrying ${model} with variations...`);

    try {
        console.log("Variation 1: standard inputs");
        const result = await fal.subscribe(model, {
            input: {
                prompt: prompt,
                image_url: testImageUrl,
                mask_url: testMaskUrl
            },
            logs: true,
        });
        console.log(`✅ Success with ${model} (Var 1)!`);
        console.log(JSON.stringify(result, null, 2));
        return;
    } catch (error: any) {
        console.error(`❌ Failed Var 1:`, error.message || error);
    }

    try {
        console.log("Variation 1: flux-general/inpainting with image/mask keys");
        const result = await fal.subscribe("fal-ai/flux-general/inpainting", {
            input: {
                prompt: prompt,
                image: testImageUrl,
                mask: testMaskUrl
            } as any,
            logs: true,
        });
        console.log(`✅ Success with fal-ai/flux-general/inpainting (image/mask)!`);
        console.log(JSON.stringify(result, null, 2));
        return;
    } catch (error: any) {
        console.error(`❌ Failed Var 1:`, error.message || error);
    }

    try {
        console.log("Variation 2: flux/dev with image_url/mask_url");
        const result = await fal.subscribe("fal-ai/flux/dev", {
            input: {
                prompt: prompt,
                image_url: testImageUrl,
                mask_url: testMaskUrl
            } as any,
            logs: true,
        });
        console.log(`✅ Success with fal-ai/flux/dev!`);
        console.log(JSON.stringify(result, null, 2));
        return;
    } catch (error: any) {
        console.error(`❌ Failed Var 2:`, error.message || error);
    }
}

testInpainting();
