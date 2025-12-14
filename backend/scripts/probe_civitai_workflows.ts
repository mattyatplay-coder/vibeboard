
import axios from 'axios';

async function probeCivitaiWorkflows() {
    try {
        // Try to search for models with type 'Workflow' or similar
        // Common types: Checkpoint, LORA, TextualInversion, Hypernetwork, AestheticGradient, ControlNet, Poses, Wildcards, Workflows, Other
        const types = ['Workflow', 'Workflows'];

        for (const type of types) {
            console.log(`Searching for type: ${type}`);
            const response = await axios.get(`https://civitai.com/api/v1/models`, {
                params: {
                    types: type,
                    limit: 5
                }
            });

            if (response.data.items && response.data.items.length > 0) {
                console.log(`Found ${response.data.items.length} items of type ${type}`);
                console.log("Example item:", JSON.stringify(response.data.items[0], null, 2));
            } else {
                console.log(`No items found for type ${type}`);
            }
        }
    } catch (error: any) {
        console.error("Error probing API:", error.message);
        if (error.response) {
            console.error("Response data:", error.response.data);
        }
    }
}

probeCivitaiWorkflows();
