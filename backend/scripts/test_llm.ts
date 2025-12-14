import * as path from 'path';
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
import { LLMService } from '../src/services/LLMService';

import { PromptEnhancer } from '../src/services/prompts/PromptEnhancer';

async function main() {
    console.log("🚀 Testing Prompt Enhancer with Qwen...");

    if (!process.env.TOGETHER_API_KEY) {
        console.warn("⚠️ TOGETHER_API_KEY is not set. Test will likely fail.");
    }

    const enhancer = new PromptEnhancer();

    try {
        console.log("Enhancing prompt using Qwen 2.5...");
        const result = await enhancer.enhance({
            originalPrompt: "A cyberpunk city street at night",
            modelId: "flux-dev",
            generationType: "image",
            enhancementLevel: "balanced",
            preserveOriginalIntent: true,
            addQualityBoosters: true,
            addNegativePrompt: true,
            consistencyPriority: 0.7,
            enhancerModel: 'qwen-2.5-72b'
        });

        console.log("\n✅ Enhancement Result:");
        console.log(JSON.stringify(result, null, 2));

    } catch (error: any) {
        console.error("\n❌ Test Failed:", error.message);
    }
}

main();
