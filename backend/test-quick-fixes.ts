/**
 * Quick test script for the models that failed in the first run
 */

import * as fal from "@fal-ai/serverless-client";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, ".env") });

fal.config({
    credentials: process.env.FAL_KEY
});

const TEST_PROMPT = "A golden retriever running through a sunny park, cinematic lighting, high quality";
const TEST_IMAGE_URL = "https://images.pexels.com/photos/58997/pexels-photo-58997.jpeg";

// I2V models ONLY with Pexels image URL
const MODELS_TO_TEST = [
    { id: "fal-ai/ltx-video/image-to-video", name: "LTX Video I2V", params: { prompt: TEST_PROMPT, image_url: TEST_IMAGE_URL } },
    { id: "fal-ai/kling-video/v2.1/standard/image-to-video", name: "Kling 2.1 Standard I2V", params: { prompt: TEST_PROMPT, image_url: TEST_IMAGE_URL, duration: "5" } },
    { id: "fal-ai/luma-dream-machine/image-to-video", name: "Luma Dream Machine I2V", params: { prompt: TEST_PROMPT, image_url: TEST_IMAGE_URL } },
    { id: "wan/v2.6/image-to-video", name: "Wan 2.6 I2V", params: { prompt: TEST_PROMPT, image_url: TEST_IMAGE_URL, duration: "5", resolution: "1080p" } },
];

async function testModel(modelId: string, name: string, params: any) {
    const startTime = Date.now();
    console.log(`\n🧪 Testing: ${name} (${modelId})`);
    console.log(`   Params: ${JSON.stringify(params, null, 2).replace(/\n/g, '\n   ')}`);

    try {
        const result: any = await fal.subscribe(modelId, {
            input: params,
            logs: true,
            onQueueUpdate: (update) => {
                if (update.status === 'IN_PROGRESS') {
                    process.stdout.write('.');
                }
            }
        });

        const duration = Date.now() - startTime;
        let videoUrl = result.video?.url || result.url || result.output?.url;
        if (!videoUrl && result.videos?.length > 0) {
            videoUrl = result.videos[0].url;
        }

        if (videoUrl) {
            console.log(`\n   ✅ SUCCESS in ${(duration / 1000).toFixed(1)}s`);
            console.log(`   📹 ${videoUrl}`);
        } else {
            console.log(`\n   ⚠️ No video URL in response`);
            console.log(`   Response: ${JSON.stringify(result, null, 2)}`);
        }
    } catch (error: any) {
        const duration = Date.now() - startTime;
        console.log(`\n   ❌ FAILED in ${(duration / 1000).toFixed(1)}s`);
        console.log(`   Error: ${error.message}`);
        if (error.body) {
            console.log(`   Body: ${JSON.stringify(error.body, null, 2)}`);
        }
    }
}

async function main() {
    console.log("=".repeat(60));
    console.log("  QUICK FIXES TEST");
    console.log("=".repeat(60));
    console.log(`FAL_KEY: ${process.env.FAL_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`Test Image: ${TEST_IMAGE_URL}`);

    for (const model of MODELS_TO_TEST) {
        await testModel(model.id, model.name, model.params);
    }

    console.log("\n\n" + "=".repeat(60));
    console.log("  TESTS COMPLETE");
    console.log("=".repeat(60));
}

main().catch(console.error);
