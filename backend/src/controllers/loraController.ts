import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

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
        res.json(loras);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch LoRAs' });
    }
};

export const createLoRA = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { name, triggerWord, fileUrl, baseModel, strength, imageUrl } = req.body;

        console.log(`[createLoRA] Creating LoRA for project ${projectId}`);
        console.log(`[createLoRA] Data:`, { name, triggerWord, fileUrl, baseModel, strength, imageUrl });

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

        const lora = await prisma.loRA.create({
            data: {
                projectId,
                name,
                triggerWord,
                fileUrl: finalUrl, // Use the Fal Storage URL
                baseModel,
                strength: strength || 1.0,
                imageUrl
            }
        });
        console.log(`[createLoRA] Created LoRA: ${lora.id}`);
        res.json(lora);
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
