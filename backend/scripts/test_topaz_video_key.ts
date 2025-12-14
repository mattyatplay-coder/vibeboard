import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

async function testTopazVideoKey() {
    console.log("Testing Topaz Video API Key...");

    if (!process.env.TOPAZ_API_KEY) {
        console.error("TOPAZ_API_KEY is not set in .env");
        return;
    }

    try {
        console.log("Sending create video request...");
        const response = await axios.post('https://api.topazlabs.com/video/', {
            // Minimal payload to check auth
            source: {
                resolution: { width: 800, height: 448 },
                container: "mp4",
                size: 1000,
                duration: 1,
                frameRate: 24,
                frameCount: 24
            },
            output: {
                resolution: { width: 800, height: 448 },
                container: "mp4"
            },
            filters: [
                { model: "apo-8" }
            ]
        }, {
            headers: {
                'X-API-Key': process.env.TOPAZ_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log("Response status:", response.status);
        console.log("Response data:", response.data);
        console.log("Topaz Video API Key is VALID.");

    } catch (error: any) {
        console.error("Test failed:", error.response?.status, error.response?.data || error.message);
        if (error.response?.status === 401 || error.response?.status === 403) {
            console.error("Topaz Video API Key is INVALID or lacks permissions.");
        }
    }
}

testTopazVideoKey();
