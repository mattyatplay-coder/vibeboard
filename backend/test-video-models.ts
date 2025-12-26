/**
 * Video Model Testing Script
 * Tests all video models registered in VibeBoard
 *
 * Run with: npx ts-node test-video-models.ts
 */

import * as fal from "@fal-ai/serverless-client";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load environment
dotenv.config({ path: path.join(__dirname, ".env") });

fal.config({
    credentials: process.env.FAL_KEY
});

interface TestResult {
    model: string;
    endpoint: string;
    status: "success" | "failed" | "skipped";
    error?: string;
    duration?: number;
    outputUrl?: string;
}

const results: TestResult[] = [];

// Test prompt for all models
const TEST_PROMPT = "A golden retriever running through a sunny park, cinematic lighting, high quality";
const TEST_NEGATIVE = "low quality, blurry, distorted";

// Test image URL for I2V models (publicly accessible - Pexels dog photo, works with Fal.ai)
const TEST_IMAGE_URL = "https://images.pexels.com/photos/58997/pexels-photo-58997.jpeg?auto=compress&w=1280";

// All video models from ModelRegistry.ts
const TEXT_TO_VIDEO_MODELS = [
    // Wan Models
    { id: "fal-ai/wan-t2v", name: "Wan 2.2", params: { prompt: TEST_PROMPT, negative_prompt: TEST_NEGATIVE, aspect_ratio: "16:9", num_frames: 97 } },
    { id: "fal-ai/wan-25-preview/text-to-video", name: "Wan 2.5", params: { prompt: TEST_PROMPT, negative_prompt: TEST_NEGATIVE, aspect_ratio: "16:9", duration: "5" } },
    { id: "wan/v2.6/text-to-video", name: "Wan 2.6", params: { prompt: TEST_PROMPT, negative_prompt: TEST_NEGATIVE, aspect_ratio: "16:9", duration: "5", resolution: "1080p" } },
    { id: "fal-ai/wan-pro/text-to-video", name: "Wan Pro", params: { prompt: TEST_PROMPT, negative_prompt: TEST_NEGATIVE, aspect_ratio: "16:9", duration: "5" } },

    // LTX
    { id: "fal-ai/ltx-video", name: "LTX Video", params: { prompt: TEST_PROMPT, negative_prompt: TEST_NEGATIVE } },

    // Kling
    { id: "fal-ai/kling-video/v2.1/master/text-to-video", name: "Kling 2.1 Master", params: { prompt: TEST_PROMPT, negative_prompt: TEST_NEGATIVE, duration: "5", aspect_ratio: "16:9" } },
    { id: "fal-ai/kling-video/v2.6/pro/text-to-video", name: "Kling 2.6 Pro", params: { prompt: TEST_PROMPT, negative_prompt: TEST_NEGATIVE, duration: "5", aspect_ratio: "16:9" } },

    // Vidu
    { id: "fal-ai/vidu/q1/text-to-video", name: "Vidu Q1", params: { prompt: TEST_PROMPT, duration: "4" } },

    // Hunyuan
    { id: "fal-ai/hunyuan-video", name: "Hunyuan Video", params: { prompt: TEST_PROMPT } },

    // MiniMax Hailuo
    { id: "fal-ai/minimax-video", name: "MiniMax Hailuo", params: { prompt: TEST_PROMPT } },

    // Luma
    { id: "fal-ai/luma-dream-machine", name: "Luma Dream Machine", params: { prompt: TEST_PROMPT, aspect_ratio: "16:9" } },
    { id: "fal-ai/luma-dream-machine/ray-2", name: "Luma Ray 2", params: { prompt: TEST_PROMPT, aspect_ratio: "16:9" } },

    // Veo (duration must be "4s", "6s", or "8s" - string format with 's' suffix)
    { id: "fal-ai/veo3", name: "Veo 3", params: { prompt: TEST_PROMPT, duration: "6s", aspect_ratio: "16:9" } },

    // Pixverse
    { id: "fal-ai/pixverse/v4.5/text-to-video", name: "Pixverse V4.5", params: { prompt: TEST_PROMPT, duration: 5, aspect_ratio: "16:9" } },

    // Magi
    { id: "fal-ai/magi", name: "Magi", params: { prompt: TEST_PROMPT } },
];

const IMAGE_TO_VIDEO_MODELS = [
    // Wan I2V
    { id: "fal-ai/wan/v2.2-a14b/image-to-video", name: "Wan 2.2 I2V", params: { prompt: TEST_PROMPT, image_url: TEST_IMAGE_URL, negative_prompt: TEST_NEGATIVE, num_frames: 121 } },
    { id: "fal-ai/wan/v2.2-a14b/image-to-video/lora", name: "Wan 2.2 I2V + LoRA", params: { prompt: TEST_PROMPT, image_url: TEST_IMAGE_URL, negative_prompt: TEST_NEGATIVE, num_frames: 121 } },
    { id: "fal-ai/wan-25-preview/image-to-video", name: "Wan 2.5 I2V", params: { prompt: TEST_PROMPT, image_url: TEST_IMAGE_URL, duration: "5" } },
    { id: "wan/v2.6/image-to-video", name: "Wan 2.6 I2V", params: { prompt: TEST_PROMPT, image_url: TEST_IMAGE_URL, duration: "5", resolution: "1080p" } },
    { id: "fal-ai/wan-pro/image-to-video", name: "Wan Pro I2V", params: { prompt: TEST_PROMPT, image_url: TEST_IMAGE_URL, duration: "5" } },

    // LTX I2V
    { id: "fal-ai/ltx-video/image-to-video", name: "LTX Video I2V", params: { prompt: TEST_PROMPT, image_url: TEST_IMAGE_URL } },
    { id: "fal-ai/ltx-video-13b-distilled/image-to-video", name: "LTX Video 13B I2V", params: { prompt: TEST_PROMPT, image_url: TEST_IMAGE_URL } },

    // Kling I2V
    { id: "fal-ai/kling-video/v2.1/standard/image-to-video", name: "Kling 2.1 Standard I2V", params: { prompt: TEST_PROMPT, image_url: TEST_IMAGE_URL, duration: "5" } },
    { id: "fal-ai/kling-video/v2.1/master/image-to-video", name: "Kling 2.1 Master I2V", params: { prompt: TEST_PROMPT, image_url: TEST_IMAGE_URL, duration: "5" } },
    { id: "fal-ai/kling-video/v2.6/pro/image-to-video", name: "Kling 2.6 Pro I2V", params: { prompt: TEST_PROMPT, image_url: TEST_IMAGE_URL, duration: "5" } },
    { id: "fal-ai/kling-video/o1/image-to-video", name: "Kling O1 I2V", params: { prompt: TEST_PROMPT, image_url: TEST_IMAGE_URL, duration: "5" } },

    // MiniMax I2V
    { id: "fal-ai/minimax-video/image-to-video", name: "MiniMax Hailuo I2V", params: { prompt: TEST_PROMPT, image_url: TEST_IMAGE_URL } },

    // Luma I2V
    { id: "fal-ai/luma-dream-machine/image-to-video", name: "Luma Dream Machine I2V", params: { prompt: TEST_PROMPT, image_url: TEST_IMAGE_URL } },
    { id: "fal-ai/luma-dream-machine/ray-2/image-to-video", name: "Luma Ray 2 I2V", params: { prompt: TEST_PROMPT, image_url: TEST_IMAGE_URL } },

    // Runway
    { id: "fal-ai/runway-gen3/turbo/image-to-video", name: "Runway Gen3 Turbo I2V", params: { prompt: TEST_PROMPT, image_url: TEST_IMAGE_URL, duration: 5 } },

    // Hunyuan I2V
    { id: "fal-ai/hunyuan-video-image-to-video", name: "Hunyuan I2V", params: { prompt: TEST_PROMPT, image_url: TEST_IMAGE_URL } },

    // Vidu I2V
    { id: "fal-ai/vidu/image-to-video", name: "Vidu I2V", params: { prompt: TEST_PROMPT, image_url: TEST_IMAGE_URL, duration: "4" } },
    { id: "fal-ai/vidu/q2/reference-to-video", name: "Vidu Q2 Multi-Reference", params: { prompt: TEST_PROMPT, reference_images: [TEST_IMAGE_URL], duration: "4" } },

    // Pixverse I2V
    { id: "fal-ai/pixverse/v4.5/image-to-video", name: "Pixverse V4.5 I2V", params: { prompt: TEST_PROMPT, image_url: TEST_IMAGE_URL, duration: 5 } },
];

async function testModel(modelId: string, name: string, params: any): Promise<TestResult> {
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

        // Extract video URL from various response formats
        let videoUrl = result.video?.url || result.url || result.output?.url;
        if (!videoUrl && result.videos?.length > 0) {
            videoUrl = result.videos[0].url;
        }

        if (videoUrl) {
            console.log(`\n   ✅ SUCCESS in ${(duration / 1000).toFixed(1)}s`);
            console.log(`   📹 ${videoUrl}`);
            return { model: name, endpoint: modelId, status: "success", duration, outputUrl: videoUrl };
        } else {
            console.log(`\n   ⚠️ No video URL in response`);
            console.log(`   Response: ${JSON.stringify(result, null, 2)}`);
            return { model: name, endpoint: modelId, status: "failed", error: "No video URL in response", duration };
        }
    } catch (error: any) {
        const duration = Date.now() - startTime;
        console.log(`\n   ❌ FAILED in ${(duration / 1000).toFixed(1)}s`);
        console.log(`   Error: ${error.message}`);

        // Log detailed error if available
        if (error.body) {
            console.log(`   Body: ${JSON.stringify(error.body, null, 2)}`);
        }

        return {
            model: name,
            endpoint: modelId,
            status: "failed",
            error: error.message || "Unknown error",
            duration
        };
    }
}

async function runTests() {
    console.log("=" .repeat(60));
    console.log("  VIDEO MODEL TESTING - VibeBoard");
    console.log("=" .repeat(60));
    console.log(`\nFAL_KEY: ${process.env.FAL_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`Test Prompt: "${TEST_PROMPT}"`);
    console.log(`Test Image: ${TEST_IMAGE_URL}`);

    // Test Text-to-Video models
    console.log("\n" + "=" .repeat(60));
    console.log("  TEXT-TO-VIDEO MODELS");
    console.log("=" .repeat(60));

    for (const model of TEXT_TO_VIDEO_MODELS) {
        const result = await testModel(model.id, model.name, model.params);
        results.push(result);
    }

    // Test Image-to-Video models
    console.log("\n" + "=" .repeat(60));
    console.log("  IMAGE-TO-VIDEO MODELS");
    console.log("=" .repeat(60));

    for (const model of IMAGE_TO_VIDEO_MODELS) {
        const result = await testModel(model.id, model.name, model.params);
        results.push(result);
    }

    // Print summary
    console.log("\n\n" + "=" .repeat(60));
    console.log("  TEST SUMMARY");
    console.log("=" .repeat(60));

    const successful = results.filter(r => r.status === "success");
    const failed = results.filter(r => r.status === "failed");

    console.log(`\n✅ Successful: ${successful.length}/${results.length}`);
    console.log(`❌ Failed: ${failed.length}/${results.length}`);

    if (failed.length > 0) {
        console.log("\n🔴 FAILED MODELS:");
        for (const f of failed) {
            console.log(`   - ${f.model} (${f.endpoint}): ${f.error}`);
        }
    }

    // Save results to JSON
    const outputPath = path.join(__dirname, "video-model-test-results.json");
    fs.writeFileSync(outputPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: {
            total: results.length,
            successful: successful.length,
            failed: failed.length
        },
        results
    }, null, 2));

    console.log(`\n📄 Results saved to: ${outputPath}`);
}

// Run if called directly
runTests().catch(console.error);
