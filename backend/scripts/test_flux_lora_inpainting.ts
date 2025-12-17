
import { fal } from "@fal-ai/client";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function testFluxLoraInpainting() {
    console.log("Testing fal-ai/flux-lora with mask_url...");

    const testImageUrl = "https://storage.googleapis.com/falserverless/model_tests/inpainting/monkey.png";
    const testMaskUrl = "https://storage.googleapis.com/falserverless/model_tests/inpainting/monkey_mask.png";

    try {
        const result = await fal.subscribe("fal-ai/flux-general", {
            input: {
                prompt: "a monkey with a blue hat with tattoos",
                image_url: testImageUrl,
                mask_url: testMaskUrl,
                loras: [] // Empty loras array just to test schema acceptance
            } as any,
            logs: true,
        });
        console.log("✅ Success with fal-ai/flux-general!");
        console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
        console.error("❌ Failed fal-ai/flux-lora:", error.message || error);
        // console.log("Error body:", JSON.stringify(error.body || {}, null, 2));
    }
}

testFluxLoraInpainting();
