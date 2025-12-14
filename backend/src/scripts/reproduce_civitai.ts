import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_KEY = process.env.CIVITAI_API_TOKEN;
const BASE_URL = 'https://civitai.com/api/v1';

async function testCivitai() {
    if (!API_KEY) {
        console.error("CIVITAI_API_TOKEN not set");
        return;
    }

    // Variation 5: Verify API Key
    console.log("Testing API Key (GET /models)...");
    try {
        const response = await axios.get(`${BASE_URL}/models?limit=1`, {
            headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
        });
        console.log("API Key Valid. Models:", response.status);
    } catch (error: any) {
        console.error("API Key Check Failed:", error.response?.status, error.response?.data);
    }

    // Variation 6: Orchestration API (Pony XL)
    const orchUrl = 'https://orchestration.civitai.com/v1/consumer/jobs';
    const payload6 = {
        "$type": "textToImage",
        "model": "urn:air:sdxl:checkpoint:civitai:201527@290640",
        "params": {
            "prompt": "cat",
            "negativePrompt": "nsfw",
            "scheduler": "EulerA",
            "steps": 20,
            "cfgScale": 7,
            "width": 1024,
            "height": 1024
        }
    };

    console.log("Testing Orchestration API (Pony XL)...");
    try {
        const response = await axios.post(orchUrl, payload6, {
            headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
        });
        console.log("Success Orchestration (Pony XL):", response.data);
    } catch (error: any) {
        console.error("Error Orchestration (Pony XL):", error.response?.status, error.response?.data);
    }

    // Variation 7: Juggernaut XL with Orchestration API
    console.log("Testing Juggernaut XL with Orchestration API...");
    const payload7 = {
        "$type": "textToImage",
        "model": "urn:air:sdxl:checkpoint:civitai:133005@357609", // Juggernaut XL V6
        "params": {
            "prompt": "cyberpunk street, neon lights, rain",
            "negativePrompt": "nsfw, low quality",
            "scheduler": "EulerA",
            "steps": 25,
            "cfgScale": 7,
            "width": 1024,
            "height": 1024
        }
    };

    try {
        const response = await axios.post(orchUrl, payload7, {
            headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
        });
        console.log("Success Juggernaut XL:", response.data);
    } catch (error: any) {
        console.error("Error Juggernaut XL:", error.response?.status, error.response?.data);
    }
}

testCivitai();
