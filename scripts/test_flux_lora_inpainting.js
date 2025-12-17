
const { fal } = require("@fal-ai/client");
require("dotenv").config({ path: "backend/.env" });

async function testFluxLoraInpainting() {
    console.log("Testing fal-ai/flux-lora with mask_url...");

    const testImageUrl = "https://storage.googleapis.com/falserverless/model_tests/inpainting/monkey.png";
    const testMaskUrl = "https://storage.googleapis.com/falserverless/model_tests/inpainting/monkey_mask.png";

    try {
        const result = await fal.subscribe("fal-ai/flux-lora", {
            input: {
                prompt: "a monkey with a blue hat",
                image_url: testImageUrl,
                mask_url: testMaskUrl,
                // Dummy LoRA just to trigger LoRA logic if needed (optional)
                // loras: [{path: "...", scale: 1}] 
            },
            logs: true,
        });
        console.log("✅ Success with fal-ai/flux-lora!");
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("❌ Failed fal-ai/flux-lora:", error.message || error);
        console.log("Error body:", JSON.stringify(error.body || {}, null, 2));
    }
}

testFluxLoraInpainting();
