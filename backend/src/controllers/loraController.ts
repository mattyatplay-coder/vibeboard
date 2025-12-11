import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

import * as fal from "@fal-ai/serverless-client";
import axios from 'axios';

const prisma = new PrismaClient();

// Configure fal client
if (process.env.FAL_KEY) {
    fal.config({
        credentials: process.env.FAL_KEY
    });
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
            settings: lora.recommendedSettings ?
                (typeof lora.recommendedSettings === 'string'
                    ? JSON.parse(lora.recommendedSettings)
                    : lora.recommendedSettings)
                : null
        }));

        res.json(lorasWithParsedSettings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch LoRAs' });
    }
};

export const createLoRA = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { name, triggerWord, fileUrl, baseModel, strength, imageUrl, type, settings, addToGlobalLibrary, civitaiModelId, civitaiVersionId, description } = req.body;

        console.log(`[createLoRA] Creating LoRA for project ${projectId}`);
        console.log(`[createLoRA] Data:`, { name, triggerWord, fileUrl, baseModel, strength, imageUrl, type, addToGlobalLibrary });

        let finalUrl = fileUrl;

        // Check if it's a Civitai URL
        if (fileUrl.includes('civitai.com/api/download')) {
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
                        recommendedSettings: settings ? JSON.stringify(settings) : Prisma.JsonNull,
                        civitaiModelId,
                        civitaiVersionId,
                        description
                    }
                });
                globalLoRAId = globalItem.id;
                console.log(`[createLoRA] Added to global library: ${globalLoRAId}`);
            }
        }

        const lora = await prisma.loRA.create({
            data: {
                projectId,
                name,
                triggerWord,
                fileUrl: finalUrl,
                baseModel,
                strength: strength || 1.0,
                imageUrl,
                type,
                recommendedSettings: settings ? JSON.stringify(settings) : Prisma.JsonNull,
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
        const { name, triggerWord, baseModel, strength } = req.body;

        console.log(`[updateLoRA] Updating LoRA ${loraId} for project ${projectId}`);
        console.log(`[updateLoRA] Data:`, { name, triggerWord, baseModel, strength });

        const lora = await prisma.loRA.update({
            where: { id: loraId, projectId },
            data: {
                name,
                triggerWord,
                baseModel,
                strength: strength || 1.0
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
