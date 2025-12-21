const fs = require('fs');
const path = require('path');

const registryPath = path.resolve(__dirname, '../frontend/src/lib/ModelRegistry.ts');
const content = fs.readFileSync(registryPath, 'utf8');

// Regex to find the ALL_MODELS array content
const allModelsMatch = content.match(/export const ALL_MODELS: ModelInfo\[\] = \[\s*([\s\S]*?)\];/);

if (!allModelsMatch) {
    console.error("Could not find ALL_MODELS array");
    process.exit(1);
}

const rawModels = allModelsMatch[1];

// Parse the objects manually since it's TS code, not JSON
// We'll look for object blocks { ... }
const models = [];
let buffer = '';
let inObject = 0;

// Simple parser to convert TS object literals to JSON
// This is fragile but sufficient for this specific file structure
const lines = rawModels.split('\n');
for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed === '') continue;

    // Naive parsing: just extract property: value pairs
    if (trimmed.startsWith('{')) {
        const model = {};
        // Remove { and }, then split by comma
        const clean = trimmed.replace(/^\{/, '').replace(/\},?$/, '');

        // Split by comma, but respect quoted strings containing commas logic is hard with regex
        // Let's use a simpler approach: Match key: value patterns

        const props = clean.match(/(\w+):\s*('[^']*'|"[^"]*"|`[^`]*`|\[.*?\]|true|false|\d+)/g);

        if (props) {
            props.forEach(prop => {
                const [key, val] = prop.split(/:\s*/);
                // remove quotes
                let cleanVal = val;
                if ((val.startsWith("'") && val.endsWith("'")) ||
                    (val.startsWith('"') && val.endsWith('"'))) {
                    cleanVal = val.slice(1, -1);
                }
                model[key] = cleanVal;
            });
            models.push(model);
        }
    }
}

console.log(JSON.stringify(models, null, 2));
