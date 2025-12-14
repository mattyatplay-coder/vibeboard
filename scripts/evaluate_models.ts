
import fs from 'fs';
import path from 'path';
import https from 'https';

// Configuration
const MODELS = [
    'z-ai/glm-4.6v',
    'x-ai/grok-4',  // Assuming Grok 4 is the current multimodal flagship in late 2025
    'openai/gpt-4o'
];

const IMAGE_PATH = '/Users/matthenrichmacbook/.gemini/antigravity/brain/4e818628-68b4-4e51-ba40-0030180e7cf3/uploaded_image_1765506844534.png';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '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';

const PROMPT = `Analyze this image for a "Smart Prompt Builder" feature in an AI art tool.
1. **Vision Analysis**: detailed description of tattoos (placement, design), jewelry, hair color/style, and eye color.
2. **LoRA Strategy**: Identify specific types of LoRAs needed to recreate this (e.g., "specific tattoo style LoRA", "character LoRA"). Recommend weights (0.1 - 1.0).
3. **Technical Settings**: Recommend the best Sampler and Scheduler for a FLUX workflow to achieve this aesthetic.
4. **Final Prompt**: Provide a high-quality generation prompt based on your analysis.`;

async function queryModel(model: string, base64Image: string) {
    console.log(`\n--- Querying ${model} ---`);
    const data = JSON.stringify({
        model: model,
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: PROMPT },
                    { type: 'image_url', image_url: { url: base64Image } }
                ]
            }
        ]
    });

    return new Promise((resolve) => {
        const req = https.request({
            hostname: 'openrouter.ai',
            path: '/api/v1/chat/completions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        }, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    if (json.error) {
                        console.error(`Error from ${model}:`, json.error);
                        resolve(`[ERROR] ${JSON.stringify(json.error)}`);
                    } else {
                        const content = json.choices?.[0]?.message?.content || "[No Content]";
                        console.log(`Response received from ${model}`);
                        resolve(content);
                    }
                } catch (e) {
                    console.error("Parse Error");
                    resolve("[Parse Error]");
                }
            });
        });

        req.on('error', (e) => {
            console.error(e);
            resolve(`[Network Error] ${e.message}`);
        });

        req.write(data);
        req.end();
    });
}

async function run() {
    // 1. Load Image
    console.log("Loading image...");
    if (!fs.existsSync(IMAGE_PATH)) {
        console.error("Image not found:", IMAGE_PATH);
        process.exit(1);
    }
    const imageBuffer = fs.readFileSync(IMAGE_PATH);
    const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

    console.log("Image loaded. Starting evaluation...");

    // 2. Query Models Sequentially
    const results: any = {};
    for (const model of MODELS) {
        results[model] = await queryModel(model, base64Image);
    }

    // 3. Output Report
    console.log("\n\n=== FINAL REPORT ===\n");
    for (const [model, result] of Object.entries(results)) {
        console.log(`\n### Model: ${model}\n${result}\n\n-------------------\n`);
    }
}

run();
