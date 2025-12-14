
import { LoRA } from "@/components/loras/LoRAManager";

export interface CivitaiModelVersion {
    id: number;
    modelId: number;
    name: string;
    baseModel: string;
    description: string;
    files: {
        id: number;
        name: string;
        downloadUrl: string;
        primary: boolean;
    }[];
    images: {
        url: string;
        nsfwLevel: number;
    }[];
    model: {
        name: string;
        type: string;
    };
    trainedWords: string[];
}

export interface RecommendedSettings {
    sampler?: string;
    scheduler?: string;
    steps?: number;         // Single value or midpoint of range
    stepsRange?: [number, number];  // Original range if provided
    cfg?: number;           // Single value or midpoint of range
    cfgRange?: [number, number];    // Original range if provided
    width?: number;
    height?: number;
    negativePrompt?: string;
    notes?: string;
    triggerWords?: string[]; // Added
    tagDefinitions?: Record<string, string>; // tag -> description mapping
}

export async function fetchCivitaiModelVersion(versionId: string): Promise<CivitaiModelVersion | null> {
    try {
        const response = await fetch(`https://civitai.com/api/v1/model-versions/${versionId}`);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch Civitai model version", error);
        return null;
    }
}

export async function fetchCivitaiModelByHash(hash: string): Promise<CivitaiModelVersion | null> {
    try {
        const response = await fetch(`https://civitai.com/api/v1/model-versions/by-hash/${hash}`);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch Civitai model by hash", error);
        return null;
    }
}

export function extractRecommendedSettings(description: string | null, trainedWords?: string[]): RecommendedSettings {
    const settings: RecommendedSettings = {
        triggerWords: trainedWords || []
    };
    if (!description) return settings;
    const lowerDesc = description.toLowerCase();

    // Sampler - check for common samplers
    if (lowerDesc.includes("dpm++ 2m sde")) settings.sampler = "dpmpp_2m_sde";
    else if (lowerDesc.includes("dpm++ 2m")) settings.sampler = "dpmpp_2m";
    else if (lowerDesc.includes("dpm++ sde")) settings.sampler = "dpmpp_sde";
    else if (lowerDesc.includes("euler a") || lowerDesc.includes("euler_a")) settings.sampler = "euler_ancestral";
    else if (lowerDesc.includes("euler")) settings.sampler = "euler";
    else if (lowerDesc.includes("ddim")) settings.sampler = "ddim";
    else if (lowerDesc.includes("heun")) settings.sampler = "heun";

    // Scheduler
    if (lowerDesc.includes("karras")) settings.scheduler = "karras";
    else if (lowerDesc.includes("exponential")) settings.scheduler = "exponential";
    else if (lowerDesc.includes("sgm_uniform") || lowerDesc.includes("sgm uniform")) settings.scheduler = "sgm_uniform";

    // Steps - handle ranges like "30-40" or single values
    const stepsRangeMatch = lowerDesc.match(/steps:?\s*(\d+)\s*[-–]\s*(\d+)/);
    const stepsSingleMatch = lowerDesc.match(/steps:?\s*(\d+)(?!\s*[-–])/);
    if (stepsRangeMatch) {
        const min = parseInt(stepsRangeMatch[1]);
        const max = parseInt(stepsRangeMatch[2]);
        settings.stepsRange = [min, max];
        settings.steps = Math.round((min + max) / 2);
    } else if (stepsSingleMatch) {
        settings.steps = parseInt(stepsSingleMatch[1]);
    }

    // CFG - handle ranges like "3-6" or single values
    const cfgRangeMatch = lowerDesc.match(/cfg:?\s*([\d.]+)\s*[-–]\s*([\d.]+)/);
    const cfgSingleMatch = lowerDesc.match(/cfg:?\s*([\d.]+)(?!\s*[-–])/);
    if (cfgRangeMatch) {
        const min = parseFloat(cfgRangeMatch[1]);
        const max = parseFloat(cfgRangeMatch[2]);
        settings.cfgRange = [min, max];
        settings.cfg = (min + max) / 2;
    } else if (cfgSingleMatch) {
        settings.cfg = parseFloat(cfgSingleMatch[1]);
    }

    // Resolution - look for patterns like "832*1216" or "832x1216"
    const resMatch = description.match(/(\d{3,4})\s*[*x×]\s*(\d{3,4})/i);
    if (resMatch) {
        settings.width = parseInt(resMatch[1]);
        settings.height = parseInt(resMatch[2]);
    }

    // Negative prompt hints
    if (lowerDesc.includes("no negative") || lowerDesc.includes("start with no negative")) {
        settings.negativePrompt = ""; // Explicitly empty - don't add negative prompt
    }

    // Notes (extract keywords)
    const keywords = ["highres.fix", "adetailer", "clip skip", "vae", "hires fix"];
    const foundKeywords = keywords.filter(k => lowerDesc.includes(k));
    if (foundKeywords.length > 0) {
        settings.notes = `Recommended: ${foundKeywords.join(", ")}`;
    }

    // Extract Tag Definitions (e.g., "tag_name - Description")
    const tagDefs: Record<string, string> = {};
    const lines = description.split('\n');
    for (const line of lines) {
        // Match "tagname - description" or "tagname : description"
        // Avoid simple bullet points like "- feature"
        const match = line.match(/^([a-zA-Z0-9_]+(:?\s+\[[^\]]+\])?)\s*[-:]\s*(.+)$/);
        if (match) {
            const tag = match[1].trim();
            const desc = match[3].trim();
            // Filter out common false positives
            if (tag.length > 2 && !tag.startsWith('http') && desc.length > 5) {
                tagDefs[tag] = desc;
            }
        }
    }
    if (Object.keys(tagDefs).length > 0) {
        settings.tagDefinitions = tagDefs;
    }

    return settings;
}

export function extractVersionIdFromUrl(url: string): string | null {
    // https://civitai.com/models/1390683?modelVersionId=1594589
    // https://civitai.com/api/download/models/1594589

    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    if (params.get("modelVersionId")) return params.get("modelVersionId");

    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    if (!isNaN(parseInt(lastPart))) return lastPart;

    return null;
}
