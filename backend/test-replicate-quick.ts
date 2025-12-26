/**
 * Quick test for the two fixed Replicate models
 */

import Replicate from "replicate";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, ".env") });

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN
});

const TEST_PROMPT = "A majestic golden retriever standing in a sunlit meadow";
const TEST_IMAGE_URL = "https://images.pexels.com/photos/58997/pexels-photo-58997.jpeg?auto=compress&w=1024";

async function testModel(modelId: string, name: string, params: any) {
    const startTime = Date.now();
    console.log(`\n🧪 Testing: ${name}`);

    try {
        const output: any = await replicate.run(modelId as `${string}/${string}`, {
            input: params
        });

        const duration = Date.now() - startTime;
        console.log(`   ✅ SUCCESS in ${(duration / 1000).toFixed(1)}s`);
        console.log(`   Output type: ${typeof output}, isArray: ${Array.isArray(output)}`);
        if (Array.isArray(output) && output.length > 0) {
            console.log(`   First item type: ${typeof output[0]}`);
        }
    } catch (error: any) {
        const duration = Date.now() - startTime;
        console.log(`   ❌ FAILED in ${(duration / 1000).toFixed(1)}s`);
        console.log(`   Error: ${error.message}`);
    }
}

async function main() {
    console.log("Testing fixed models...\n");

    // Test Consistent Character with new version
    await testModel(
        "fofr/consistent-character:9c77a3c2f884193fcee4d89645f02a0b9def9434f9e03cb98460456b831c8772",
        "Consistent Character",
        {
            prompt: "A person standing in a park",
            subject: TEST_IMAGE_URL,
            number_of_outputs: 1,
            number_of_images_per_pose: 1,
            output_format: "webp"
        }
    );

    console.log("\n   ⏳ Waiting 12s...");
    await new Promise(r => setTimeout(r, 12000));

    // Test AnimateDiff with new version
    await testModel(
        "lucataco/animate-diff:beecf59c4aee8d81bf04f0381033dfa10dc16e845b4ae00d281e2fa377e48a9f",
        "AnimateDiff",
        { prompt: TEST_PROMPT, num_frames: 16, num_inference_steps: 25 }
    );

    console.log("\n\nDone!");
}

main().catch(console.error);
