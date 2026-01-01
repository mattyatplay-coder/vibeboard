import { Request, Response } from 'express';
import { prisma } from '../prisma';

import * as fal from "@fal-ai/serverless-client";
import axios from 'axios';
import { getModelMetadataSyncService, civitaiToMetadata, fetchCivitaiModel, parseDescriptionSettings, settingsToRecommendedSettings, ParsedRecommendedSettings } from '../services/sync/ModelMetadataSync';

// Configure fal client
if (process.env.FAL_KEY) {
    fal.config({
        credentials: process.env.FAL_KEY
    });
}

// =============================================================================
// PHASE 7: Multi-Tenant Helper - Get project's teamId for asset inheritance
// =============================================================================
async function getProjectTeamId(projectId: string): Promise<string | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { teamId: true },
  });
  return project?.teamId ?? null;
}

export const getLoRAs = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const loras = await prisma.loRA.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' }
        });

        // Parse recommendedSettings JSON for each LoRA
        const lorasWithParsedSettings = loras.map(lora => ({
            ...lora,
            settings: lora.recommendedSettings ? JSON.parse(lora.recommendedSettings) : null,
            triggerWords: lora.triggerWords ? JSON.parse(lora.triggerWords) : (lora.triggerWord ? [lora.triggerWord] : []),
            aliasPatterns: lora.aliasPatterns ? JSON.parse(lora.aliasPatterns) : [],
            tags: [], // Placeholder since LoRA schema doesn't have a direct tags JSON column like GlobalLoRA yet, or it's handled differently
            characterAttributes: lora.characterAttributes ? JSON.parse(lora.characterAttributes) : null
        }));

        res.json(lorasWithParsedSettings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch LoRAs' });
    }
};

// Infer category from Civitai tags or model name
function inferCategory(name: string, tags?: string[]): string {
    const lowerName = name.toLowerCase();
    const tagSet = new Set((tags || []).map(t => t.toLowerCase()));

    // Check tags first
    if (tagSet.has('character') || tagSet.has('celebrity') || tagSet.has('person')) return 'character';
    if (tagSet.has('style') || tagSet.has('art style') || tagSet.has('aesthetic')) return 'style';
    if (tagSet.has('concept') || tagSet.has('abstract')) return 'concept';
    if (tagSet.has('clothing') || tagSet.has('outfit') || tagSet.has('clothes') || tagSet.has('fashion')) return 'clothing';
    if (tagSet.has('pose') || tagSet.has('action') || tagSet.has('poses')) return 'pose';
    if (tagSet.has('background') || tagSet.has('scenery') || tagSet.has('landscape')) return 'background';
    if (tagSet.has('effect') || tagSet.has('fx') || tagSet.has('vfx') || tagSet.has('lighting')) return 'effect';

    // Check name patterns
    if (lowerName.includes('character') || lowerName.includes('celeb') || lowerName.includes('person')) return 'character';
    if (lowerName.includes('style') || lowerName.includes('aesthetic')) return 'style';
    if (lowerName.includes('cloth') || lowerName.includes('outfit') || lowerName.includes('dress') || lowerName.includes('fashion')) return 'clothing';
    if (lowerName.includes('pose') || lowerName.includes('action')) return 'pose';
    if (lowerName.includes('background') || lowerName.includes('scenery')) return 'background';
    if (lowerName.includes('effect') || lowerName.includes('glow') || lowerName.includes('lighting')) return 'effect';

    return 'other';
}

export const createLoRA = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { name, triggerWord, triggerWords, aliasPatterns, fileUrl, baseModel, strength, imageUrl, type, category, settings, addToGlobalLibrary, civitaiModelId, civitaiVersionId, description, tags, characterAttributes } = req.body;

        console.log(`[createLoRA] Creating LoRA for project ${projectId}`);
        console.log(`[createLoRA] Data:`, { name, triggerWord, fileUrl, baseModel, strength, imageUrl, type, addToGlobalLibrary });

        const os = require('os');
        const pathModule = require('path');

        let finalUrl = fileUrl;

        // Expand ~ to home directory for local paths
        if (fileUrl && fileUrl.startsWith('~')) {
            finalUrl = pathModule.join(os.homedir(), fileUrl.slice(1));
            console.log(`[createLoRA] Expanded ~ path to: ${finalUrl}`);
        }

        // Check if it's a Civitai URL
        if (finalUrl && finalUrl.includes('civitai.com/api/download')) {
            console.log("Detected Civitai URL. Resolving redirect to get final download URL...");
            try {
                // Perform a HEAD request (or GET with no redirects) to get the final URL
                // We loop manually to handle multiple redirects if needed, but usually it's 1 or 2.
                // Actually, axios `maxRedirects: 0` throws an error on 3xx. We catch it.

                let resolvedUrl = fileUrl;
                try {
                    await axios.head(fileUrl, {
                        maxRedirects: 0,
                        validateStatus: (status) => status >= 200 && status < 400, // Accept 3xx
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        }
                    });
                } catch (error: any) {
                    // Axios throws on redirect if maxRedirects is 0? No, validateStatus handles it.
                    // But if it's a 302, response.headers.location has the URL.
                    if (error.response && (error.response.status === 301 || error.response.status === 302 || error.response.status === 303 || error.response.status === 307)) {
                        resolvedUrl = error.response.headers.location;
                        console.log("Resolved Civitai URL to:", resolvedUrl);
                    }
                }

                // If we got a new URL, use it.
                // Note: Civitai signed URLs might expire, but they are better than proxying 2GB.
                // Ideally we would upload this URL to Fal, but Fal doesn't have "upload from URL" easily.
                // For now, we trust the signed URL works for Fal generation.
                if (resolvedUrl) {
                    finalUrl = resolvedUrl;
                }

            } catch (err: any) {
                console.warn("Failed to resolve Civitai URL, using original:", err.message);
                // Fallback to original URL
            }
        }

        let globalLoRAId: string | null = null;

        // Optionally add to global library
        if (addToGlobalLibrary) {
            // Check if already exists in global library
            const existingGlobal = await prisma.globalLoRA.findFirst({
                where: {
                    OR: [
                        { fileUrl: finalUrl },
                        ...(civitaiVersionId ? [{ civitaiVersionId }] : [])
                    ]
                }
            });

            if (existingGlobal) {
                globalLoRAId = existingGlobal.id;
                console.log(`[createLoRA] Found existing global library item: ${globalLoRAId}`);
            } else {
                // Infer category if not provided
                const inferredCategory = category || inferCategory(name, tags);

                // Create new global entry
                const globalItem = await prisma.globalLoRA.create({
                    data: {
                        name,
                        triggerWord,
                        fileUrl: finalUrl,
                        baseModel,
                        strength: strength || 1.0,
                        imageUrl,
                        type: type || 'lora',
                        category: inferredCategory,
                        recommendedSettings: settings ? JSON.stringify(settings) : null,
                        civitaiModelId,
                        civitaiVersionId,
                        description,
                        tags: tags ? JSON.stringify(tags) : '[]'
                    }
                });
                globalLoRAId = globalItem.id;
                console.log(`[createLoRA] Added to global library: ${globalLoRAId}`);
            }
        }

        // Infer category if not provided
        const finalCategory = category || inferCategory(name, tags);

        // Phase 7: Inherit teamId from project for shared asset access
        const teamId = await getProjectTeamId(projectId);

        const lora = await prisma.loRA.create({
            data: {
                projectId,
                teamId,
                name,
                triggerWord,
                triggerWords: triggerWords ? JSON.stringify(triggerWords) : (triggerWord ? JSON.stringify([triggerWord]) : null),
                aliasPatterns: aliasPatterns ? JSON.stringify(aliasPatterns) : null,
                fileUrl: finalUrl,
                baseModel,
                type: type || 'lora',
                category: finalCategory,
                strength: strength || 1.0,
                imageUrl,
                recommendedSettings: settings ? JSON.stringify(settings) : null,
                characterAttributes: characterAttributes ? JSON.stringify(characterAttributes) : null,
                globalLoRAId
            }
        });
        console.log(`[createLoRA] Created LoRA: ${lora.id}`);
        res.json({ ...lora, addedToGlobalLibrary: !!globalLoRAId });
    } catch (error: any) {
        console.error(`[createLoRA] Error:`, error);
        res.status(500).json({ error: 'Failed to create LoRA', details: error.message });
    }
};

export const updateLoRA = async (req: Request, res: Response) => {
    try {
        const { projectId, loraId } = req.params;
        const { name, triggerWord, triggerWords, aliasPatterns, baseModel, category, strength, characterAttributes } = req.body;

        console.log(`[updateLoRA] Updating LoRA ${loraId} for project ${projectId}`);
        console.log(`[updateLoRA] Data:`, { name, triggerWord, aliasPatterns, baseModel, category, strength });

        const lora = await prisma.loRA.update({
            where: { id: loraId, projectId },
            data: {
                name,
                triggerWord,
                triggerWords: triggerWords ? JSON.stringify(triggerWords) : undefined,
                aliasPatterns: aliasPatterns ? JSON.stringify(aliasPatterns) : undefined,
                baseModel,
                category,
                strength: strength || 1.0,
                characterAttributes: characterAttributes ? JSON.stringify(characterAttributes) : undefined
            }
        });

        console.log(`[updateLoRA] Updated LoRA: ${lora.id}`);
        res.json(lora);
    } catch (error: any) {
        console.error(`[updateLoRA] Error:`, error);
        res.status(500).json({ error: 'Failed to update LoRA', details: error.message });
    }
};

export const deleteLoRA = async (req: Request, res: Response) => {
    try {
        const { projectId, loraId } = req.params;
        await prisma.loRA.delete({
            where: { id: loraId, projectId }
        });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete LoRA' });
    }
};

/**
 * Fetch LoRA metadata from Civitai API with full prompt guide generation
 * This endpoint fetches model info from Civitai and auto-generates:
 * - Trigger words
 * - Base model info
 * - Recommended settings
 * - Prompt guide (quality boosters, style, etc.)
 */
export const fetchCivitaiLoRAMetadata = async (req: Request, res: Response) => {
    try {
        const { modelId, versionId } = req.body;

        if (!modelId) {
            return res.status(400).json({ error: 'modelId is required' });
        }

        console.log(`[fetchCivitaiLoRAMetadata] Fetching metadata for model ${modelId}${versionId ? `@${versionId}` : ''}`);

        // Fetch from Civitai API
        const civitaiInfo = await fetchCivitaiModel(modelId);
        if (!civitaiInfo) {
            return res.status(404).json({ error: 'Model not found on Civitai' });
        }

        // Convert to our metadata format
        const metadata = civitaiToMetadata(civitaiInfo, versionId) as any;

        // Get the specific version
        const version = versionId
            ? civitaiInfo.modelVersions.find(v => v.id.toString() === versionId)
            : civitaiInfo.modelVersions[0];

        // Get parsed settings from the metadata (includes settings from description)
        const parsedSettings: ParsedRecommendedSettings = metadata._parsedSettings || {};
        const recommendedSettings = metadata._recommendedSettings || {};

        // Build response with all useful info
        const response = {
            // Basic info
            name: civitaiInfo.name,
            civitaiModelId: civitaiInfo.id.toString(),
            civitaiVersionId: version?.id?.toString(),
            type: civitaiInfo.type.toLowerCase(),
            nsfw: civitaiInfo.nsfw,
            tags: civitaiInfo.tags,
            creator: civitaiInfo.creator?.username,

            // Version-specific info
            baseModel: version?.baseModel || 'Unknown',
            triggerWords: version?.trainedWords || [],
            triggerWord: version?.trainedWords?.[0] || '',
            downloadUrl: version?.files?.[0]?.downloadUrl,
            fileSize: version?.files?.[0]?.sizeKB,

            // Recommended settings parsed from description (Sampler, Steps, CFG, etc.)
            recommendedSettings: {
                ...recommendedSettings,
                // Include pros/cons if available
                ...(parsedSettings.pros && parsedSettings.pros.length > 0 && { pros: parsedSettings.pros }),
                ...(parsedSettings.cons && parsedSettings.cons.length > 0 && { cons: parsedSettings.cons }),
                ...(parsedSettings.notes && parsedSettings.notes.length > 0 && { notes: parsedSettings.notes }),
            },

            // Auto-generated prompt guide
            promptGuide: {
                style: metadata.promptGuide.style,
                separator: metadata.promptGuide.separator,
                qualityBoosters: metadata.promptGuide.qualityBoosters,
                avoidTerms: metadata.promptGuide.avoidTerms,
                stylePrefixes: metadata.promptGuide.stylePrefixes,
                triggerWordPlacement: metadata.promptGuide.triggerWordPlacement,
                template: metadata.promptGuide.template,
                negativePromptTemplate: metadata.promptGuide.negativePromptTemplate,
            },

            // Constraints
            constraints: metadata.constraints,

            // Category inference
            category: inferCategory(civitaiInfo.name, civitaiInfo.tags),

            // Notes (includes recommended settings info)
            notes: metadata.notes,

            // Raw metadata for debugging
            _metadata: metadata,
        };

        console.log(`[fetchCivitaiLoRAMetadata] Successfully fetched metadata for ${civitaiInfo.name}`);
        res.json(response);

    } catch (error: any) {
        console.error('[fetchCivitaiLoRAMetadata] Error:', error);
        res.status(500).json({ error: 'Failed to fetch Civitai metadata', details: error.message });
    }
};

/**
 * Sync model metadata and generate code snippets for adding to the codebase
 * This is useful for developers adding new models to the registry
 */
export const syncModelMetadata = async (req: Request, res: Response) => {
    try {
        const { modelId } = req.body;

        if (!modelId) {
            return res.status(400).json({ error: 'modelId is required' });
        }

        console.log(`[syncModelMetadata] Syncing metadata for: ${modelId}`);

        const syncService = getModelMetadataSyncService();
        const code = await syncService.syncAndGenerateCode(modelId);

        res.json({
            modelId,
            codeSnippets: code,
            message: 'Copy the generated code snippets to the appropriate files'
        });

    } catch (error: any) {
        console.error('[syncModelMetadata] Error:', error);
        res.status(500).json({ error: 'Failed to sync model metadata', details: error.message });
    }
};

export const fetchLoRAMetadata = async (req: Request, res: Response) => {
    try {
        const { filePath } = req.body;

        if (!filePath) {
            return res.status(400).json({ error: 'File path is required' });
        }

        const fs = require('fs');
        const os = require('os');
        const path = require('path');

        // Expand ~ to home directory
        let expandedPath = filePath;
        if (filePath.startsWith('~')) {
            expandedPath = path.join(os.homedir(), filePath.slice(1));
        }

        // Resolve to absolute path
        expandedPath = path.resolve(expandedPath);

        console.log(`[fetchLoRAMetadata] Checking file: ${expandedPath}`);

        // SECURITY: Prevent reading arbitrary files
        // 1. Ensure file extension is safe
        const allowedExtensions = ['.safetensors', '.pt', '.ckpt', '.bin'];
        const ext = path.extname(expandedPath).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            console.warn(`[fetchLoRAMetadata] Blocked unsafe extension: ${ext}`);
            return res.status(400).json({ error: 'Invalid file type. Only .safetensors, .pt, .ckpt, .bin allowed.' });
        }

        // 2. Ensure it exists and is a file (not directory)
        if (!fs.existsSync(expandedPath)) {
            return res.status(404).json({ error: `File not found: ${expandedPath}` });
        }

        const stat = fs.statSync(expandedPath);
        if (!stat.isFile()) {
            return res.status(400).json({ error: 'Path is not a file' });
        }

        // Read first 8 bytes to get header length (u64 LE)
        const fd = fs.openSync(expandedPath, 'r');
        const buffer = Buffer.alloc(8);
        fs.readSync(fd, buffer, 0, 8, 0);

        // Safetensors header size is a u64 LE integer
        const headerSize = Number(buffer.readBigUInt64LE(0));

        if (headerSize <= 0 || headerSize > 100000000) { // Sanity check (100MB header limit)
            fs.closeSync(fd);
            return res.status(400).json({ error: 'Invalid safetensors header size' });
        }

        // Read the header JSON
        const headerBuffer = Buffer.alloc(headerSize);
        fs.readSync(fd, headerBuffer, 0, headerSize, 8);
        fs.closeSync(fd);

        const headerStr = headerBuffer.toString('utf-8');
        const header = JSON.parse(headerStr);
        const metadata = header.__metadata__ || {};

        // Extract useful info
        const name = metadata.ss_output_name || expandedPath.split('/').pop()?.replace('.safetensors', '') || 'Unknown LoRA';
        const baseModel = metadata.ss_base_model_version || 'SDXL'; // Default to SDXL if unknown

        // Extract trigger words from tag frequency
        let triggerWord = '';
        if (metadata.ss_tag_frequency) {
            try {
                const tags = JSON.parse(metadata.ss_tag_frequency);
                // Get the most frequent tag that isn't a common word? 
                // Or just take the first key of the first directory
                const firstDir = Object.keys(tags)[0];
                if (firstDir && tags[firstDir]) {
                    // tags[firstDir] is { "tag": count }
                    // Sort by count desc
                    const sortedTags = Object.entries(tags[firstDir]).sort((a: any, b: any) => b[1] - a[1]);
                    if (sortedTags.length > 0) {
                        triggerWord = sortedTags[0][0];
                    }
                }
            } catch (e) {
                console.warn("Failed to parse tag frequency", e);
            }
        }

        res.json({
            name,
            baseModel,
            triggerWord,
            type: 'lora', // Assume LoRA for now
            imageUrl: '' // No image in safetensors header usually
        });

    } catch (error: any) {
        console.error("Failed to read safetensors metadata:", error);
        res.status(500).json({ error: 'Failed to read metadata', details: error.message });
    }
};
