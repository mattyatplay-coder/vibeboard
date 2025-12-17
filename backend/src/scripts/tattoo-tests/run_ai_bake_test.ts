import path from 'path';
import fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables from backend/.env BEFORE importing adapter
const envPath = path.resolve(__dirname, '../../../.env');
console.log(`Loading .env from: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error("Error loading .env:", result.error);
}

// Now import adapter
import { FalAIAdapter } from '../../services/generators/FalAIAdapter';

const ARTIFACTS_DIR = '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39';
// Use the user-selected alignment file
const INPUT_IMG = path.join(ARTIFACTS_DIR, 'A4_align_right_60.png');
const OUTPUT_DIR = path.resolve(__dirname, '../../tests/output/tattoo');

async function runAiBakeTest() {
    console.log("Starting Tattoo Placement Test: Approach B (AI Bake)");

    if (!process.env.FAL_KEY) {
        console.error("Error: FAL_KEY not found in environment.");
        process.exit(1);
    }

    if (!fs.existsSync(INPUT_IMG)) {
        console.error(`Error: Input image not found at ${INPUT_IMG}`);
        process.exit(1);
    }

    const falAdapter = new FalAIAdapter();

    // Strengths to test
    const strengths = [0.15, 0.25, 0.35];

    // We need a prompt describing the image to guide the AI
    // We can use a generic one or try to analyze. Let's start with a strong generic prompt for this context.
    // Based on the file names, it's a "back tattoo".
    const prompt = "High quality photo of a woman's back with a complex geometric spiritual tattoo down the spine. The tattoo is black ink, perfectly crisp, embedded in skin. Realistic skin texture, soft lighting, 8k, raw photo.";

    for (const str of strengths) {
        console.log(`Running Bake with Strength: ${str}...`);

        try {
            // Upload the local composite to Fal first (Adapter handles it if we pass path?)
            // Adapter expects paths or URLs. It assumes local paths if starting with /.

            const result = await falAdapter.generateImage({
                prompt: prompt,
                sourceImages: [INPUT_IMG],
                strength: str,
                model: 'fal-ai/flux/dev', // Using Flux Dev for high fidelity
                steps: 28,
                guidanceScale: 2.5, // Low guidance to stick to image? Or standard? 2.5 is standard for Flux Dev.
                count: 1
            });

            if (result.status === 'succeeded' && result.outputs?.length) {
                const url = result.outputs[0];
                console.log(`-> Success: ${url}`);

                // Download the result
                const filename = `B_bake_${str.toString().replace('.', '')}.png`; // e.g. B_bake_015.png
                const filepath = path.join(OUTPUT_DIR, filename);

                // Simple fetch and save
                const fetch = (await import('node-fetch')).default;
                const response = await fetch(url);
                const buffer = await response.buffer();
                fs.writeFileSync(filepath, buffer);
                console.log(`-> Saved to ${filepath}`);
            } else {
                console.error(`-> Failed: ${result.error}`);
            }

        } catch (e) {
            console.error(`-> Error:`, e);
        }
    }

    console.log("Test B Complete. Outputs in: " + OUTPUT_DIR);
}

runAiBakeTest().catch(console.error);
