import axios from 'axios';

const API_URL = 'http://localhost:3001/api';
const PROJECT_ID = '06a5208e-aba7-4486-bd0f-7e60f3f29f57'; // From logs

// Exhaustive list of models from EngineSelectorV2.tsx
const testCases = [
    // --- Google ---
    {
        name: 'Google Imagen 3',
        payload: { mode: 'text_to_image', inputPrompt: 'A futuristic city', modelId: 'imagen-3', aspectRatio: '16:9', iterations: 1 }
    },
    {
        name: 'Google Veo 2',
        payload: { mode: 'text_to_video', inputPrompt: 'A drone shot of a city', modelId: 'veo-2', aspectRatio: '16:9', iterations: 1, duration: 5 }
    },
    // Note: skipping veo-3/3.1 as they might be preview only, but testing if available
    {
        name: 'Google Veo 3.1',
        payload: { mode: 'text_to_video', inputPrompt: 'A drone shot of a city', modelId: 'veo-3.1', aspectRatio: '16:9', iterations: 1, duration: 5 }
    },

    // --- OpenAI ---
    {
        name: 'OpenAI DALL-E 3',
        payload: { mode: 'text_to_image', inputPrompt: 'A cute cat', modelId: 'dall-e-3', aspectRatio: '16:9', iterations: 1 }
    },
    // Skipping Sora as it's likely not available to the public API yet, but included in UI

    // --- Fal.ai ---
    {
        name: 'Fal Flux Dev',
        payload: { mode: 'text_to_image', inputPrompt: 'A cyberpunk warrior', modelId: 'fal-ai/flux/dev', aspectRatio: '16:9', iterations: 1 }
    },
    {
        name: 'Fal Flux Pro',
        payload: { mode: 'text_to_image', inputPrompt: 'A cyberpunk warrior', modelId: 'fal-ai/flux-pro', aspectRatio: '16:9', iterations: 1 }
    },
    {
        name: 'Fal Flux 2',
        payload: { mode: 'text_to_image', inputPrompt: 'A cyberpunk warrior', modelId: 'fal-ai/flux-2-flex', aspectRatio: '16:9', iterations: 1 }
    },
    {
        name: 'Fal LTX Video',
        payload: { mode: 'text_to_video', inputPrompt: 'A waterfall', modelId: 'fal-ai/ltx-video/image-to-video', aspectRatio: '16:9', iterations: 1, duration: 5 }
    },
    {
        name: 'Fal Kling 2.1',
        payload: { mode: 'text_to_video', inputPrompt: 'A waterfall', modelId: 'fal-ai/kling-video/v2.1/standard/image-to-video', aspectRatio: '16:9', iterations: 1, duration: 5 }
    },
    {
        name: 'Fal MiniMax',
        payload: { mode: 'text_to_video', inputPrompt: 'A waterfall', modelId: 'fal-ai/minimax-video', aspectRatio: '16:9', iterations: 1, duration: 5 }
    },

    // --- Replicate ---
    {
        name: 'Replicate Flux Schnell',
        payload: { mode: 'text_to_image', inputPrompt: 'A mountain landscape', modelId: 'black-forest-labs/flux-schnell', aspectRatio: '16:9', iterations: 1 }
    },
    {
        name: 'Replicate Flux Dev',
        payload: { mode: 'text_to_image', inputPrompt: 'A mountain landscape', modelId: 'black-forest-labs/flux-dev', aspectRatio: '16:9', iterations: 1 }
    },
    {
        name: 'Replicate SDXL',
        payload: { mode: 'text_to_image', inputPrompt: 'A mountain landscape', modelId: 'stability-ai/sdxl', aspectRatio: '16:9', iterations: 1 }
    },

    // --- Together AI ---
    {
        name: 'Together Flux Schnell',
        payload: { mode: 'text_to_image', inputPrompt: 'A forest', modelId: 'black-forest-labs/FLUX.1-schnell', aspectRatio: '16:9', iterations: 1 }
    },

    // --- HuggingFace ---
    {
        name: 'HuggingFace SDXL',
        payload: { mode: 'text_to_image', inputPrompt: 'A robot', modelId: 'stabilityai/stable-diffusion-xl-base-1.0', aspectRatio: '16:9', iterations: 1 }
    }
];

async function runTests() {
    console.log(`Starting EXHAUSTIVE generation tests for Project: ${PROJECT_ID}\n`);

    const results: { name: string; status: string; error?: string }[] = [];

    for (const test of testCases) {
        console.log(`Testing: ${test.name} (${test.payload.modelId})...`);
        try {
            const response = await axios.post(`${API_URL}/projects/${PROJECT_ID}/generations`, test.payload);

            if (response.status === 201 || response.status === 200) {
                console.log(`✅ Success! Generation ID: ${response.data.id}`);
                console.log(`   Metadata:`, JSON.stringify(response.data.usedLoras, null, 2));
                results.push({ name: test.name, status: '✅ Success' });
            } else {
                console.log(`❌ Failed with status: ${response.status}`);
                results.push({ name: test.name, status: '❌ Failed', error: `Status ${response.status}` });
            }
        } catch (error: any) {
            const errMsg = error.response?.data?.error || error.message;
            console.log(`❌ Error: ${errMsg}`);
            results.push({ name: test.name, status: '❌ Failed', error: errMsg });
        }
        console.log('---\n');

        // Wait a bit between requests
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    console.log('\n=== FINAL REPORT ===');
    console.table(results);
}

runTests();
