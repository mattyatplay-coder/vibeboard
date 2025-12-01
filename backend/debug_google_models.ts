import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const API_KEY = process.env.GOOGLE_AI_API_KEY;

if (!API_KEY) {
    console.error("GOOGLE_AI_API_KEY is not set in .env");
    process.exit(1);
}

async function listModels() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
        console.log(`Fetching models from: ${url.replace(API_KEY as string, 'HIDDEN')}`);

        const response = await axios.get(url);

        console.log("Available Models:");
        if (response.data.models) {
            response.data.models.forEach((model: any) => {
                console.log(`- ${model.name} (${model.version})`);
                console.log(`  Supported methods: ${model.supportedGenerationMethods?.join(', ')}`);
            });
        } else {
            console.log("No models found in response:", response.data);
        }

    } catch (error: any) {
        console.error("Error fetching models:");
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data:`, error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

listModels();
