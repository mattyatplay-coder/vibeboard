import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

import { GenerationService } from '../services/GenerationService';
import { PromptBuilder } from '../services/PromptBuilder';

const prisma = new PrismaClient({});

// Simple in-memory queue for MVP
const jobQueue: string[] = [];
let isProcessing = false;

const processQueue = async () => {
    if (isProcessing || jobQueue.length === 0) return;
    isProcessing = true;

    const generationId = jobQueue.shift();
    if (generationId) {
        try {
            console.log(`Processing generation ${generationId}...`);

            // Fetch generation details
            const generation = await prisma.generation.findUnique({
                where: { id: generationId }
            });

            if (!generation) throw new Error("Generation not found");

            // Instantiate service with the correct engine
            // 'engine' field now maps to ProviderType
            const service = new GenerationService(generation.engine as any);

            // Construct Enhanced Prompt
            const resolvedPrompt = PromptBuilder.build({
                basePrompt: generation.inputPrompt,
                shotType: generation.shotType,
                cameraAngle: generation.cameraAngle,
                lighting: generation.lighting,
                location: generation.location,
                // TODO: Add style from LoRA or separate field if we add it
            });

            // Fetch source images if any
            let sourceImages: string[] = [];
            const sourceIds = generation.sourceElementIds as string[];
            if (Array.isArray(sourceIds) && sourceIds.length > 0) {
                const elements = await prisma.element.findMany({
                    where: { id: { in: sourceIds } }
                });
                sourceImages = elements.map(e => e.fileUrl).filter(url => !!url);
            }

            // Parse @ mentions from the prompt
            const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
            const mentions = [...generation.inputPrompt.matchAll(mentionRegex)].map(match => match[1]);

            if (mentions.length > 0) {
                console.log(`Found mentions in prompt: ${mentions.join(', ')}`);
                const mentionedElements = await prisma.element.findMany({
                    where: {
                        name: { in: mentions, mode: 'insensitive' },
                        projectId: generation.projectId // Scope to project
                    }
                });

                // Add mentioned images to sourceImages (if not already present)
                mentionedElements.forEach(e => {
                    if (e.fileUrl && !sourceImages.includes(e.fileUrl)) {
                        sourceImages.push(e.fileUrl);
                    }
                });
            }

            // Check for direct sourceImageUrl (from image-to-video)
            const directSourceUrl = (generation.usedLoras as any)?.sourceImageUrl;
            if (directSourceUrl) {
                sourceImages.push(directSourceUrl);
            }

            // Prepare options
            // Resolve LoRAs
            let resolvedLoras: { path: string; strength: number }[] = [];
            const usedLorasData = (generation.usedLoras as any)?.loras;
            if (Array.isArray(usedLorasData) && usedLorasData.length > 0) {
                const loraIds = usedLorasData.map((l: any) => l.id);
                const loraRecords = await prisma.loRA.findMany({
                    where: { id: { in: loraIds } }
                });

                resolvedLoras = usedLorasData.map((l: any) => {
                    const record = loraRecords.find((r) => r.id === l.id);
                    if (record) {
                        return { path: record.fileUrl, strength: l.strength || record.strength || 1.0 };
                    }
                    return null;
                }).filter((l): l is { path: string; strength: number } => l !== null);
            }

            // Prepare options
            console.log("Processing generation request:", generation.id);
            const options = {
                prompt: resolvedPrompt,
                negativePrompt: PromptBuilder.buildNegative(),
                aspectRatio: generation.aspectRatio || "16:9",
                loras: resolvedLoras,
                model: (generation.usedLoras as any)?.model,
                sourceImages,
                strength: (generation.usedLoras as any)?.strength, // Pass strength to options
                sampler: (generation.usedLoras as any)?.sampler,
                scheduler: (generation.usedLoras as any)?.scheduler,
                count: generation.variations || 1,
                duration: (generation.usedLoras as any)?.duration, // Pass duration
                maskUrl: (generation.usedLoras as any)?.maskUrl, // Pass maskUrl for inpainting
                width: (generation.usedLoras as any)?.width, // Pass explicit dimensions

                height: (generation.usedLoras as any)?.height,
                startFrame: (generation.usedLoras as any)?.startFrame,
                endFrame: (generation.usedLoras as any)?.endFrame,
                inputVideo: (generation.usedLoras as any)?.inputVideo,
                mode: generation.mode as any, // Cast to any to avoid type error, validated at runtime
            };

            // Auto-detect video intent if mode is text_to_image but prompt suggests video
            if (options.mode === 'text_to_video' || options.mode === 'image_to_video' || !options.mode || options.mode === 'text_to_image') {
                const videoKeywords = ['video', 'animated', 'animation', 'shot', 'film', 'movie', 'cinematic', 'drone', 'camera'];
                const hasVideoKeywords = videoKeywords.some(k => generation.inputPrompt.toLowerCase().includes(k));

                // If user explicitly asked for video but we are in image mode (or default), switch to video
                // But only if the provider supports it. For now, we assume if they ask for video, they want video.
                // However, we must be careful not to override explicit user choice if they selected "Image" mode in UI.
                // The issue is the UI might default to "text_to_video" in SceneGenerator but "text_to_image" in main GeneratePage.

                // Check if we have multiple mentions which might imply start/end frames
                if (mentions.length >= 2 && (generation.inputPrompt.includes('start') || generation.inputPrompt.includes('end'))) {
                    console.log("Inferred Frames-to-Video intent from prompt");
                    options.mode = 'frames_to_video';
                    // Map mentions to start/end frames if not explicitly provided
                    if (!options.startFrame && sourceImages[0]) options.startFrame = sourceImages[0];
                    if (!options.endFrame && sourceImages[1]) options.endFrame = sourceImages[1];
                } else if (hasVideoKeywords && (!options.mode || options.mode === 'text_to_image')) {
                    console.log("Inferred Video intent from prompt keywords");
                    options.mode = 'text_to_video';
                }
            }

            console.log(`🔍 DEBUG: options.model = "${options.model}"`);
            console.log(`🔍 DEBUG: options.maskUrl = "${options.maskUrl}"`);


            // Update generation with resolved prompt for reference
            await prisma.generation.update({
                where: { id: generationId },
                data: { resolvedPrompt }
            });

            // Call Service
            let result;
            if (options.mode === 'image_to_video' || options.mode === 'text_to_video' || options.mode === 'frames_to_video' || options.mode === 'extend_video') {
                // For text_to_video, sourceImages[0] might be undefined, which is fine if generateVideo handles it
                // For frames_to_video, we use options.startFrame (which we might have inferred)
                const videoInput = options.startFrame || sourceImages[0];
                result = await service.generateVideo(videoInput, options);
            } else {
                result = await service.generateImage(options);
            }

            if (result.status === 'succeeded') {
                await prisma.generation.update({
                    where: { id: generationId },
                    data: {
                        status: 'succeeded',
                        outputs: result.outputs?.map((url: string) => ({
                            type: (generation.mode === 'image_to_video' || generation.mode === 'text_to_video' || (typeof url === 'string' && (url.endsWith('.mp4') || url.endsWith('.webm')))) ? 'video' : 'image',
                            url,
                            thumbnail_url: url
                        })),
                        // Store provider info if available
                        usedLoras: { ...(generation.usedLoras as object), provider: result.provider, seed: result.seed }
                    },
                });
            } else if (result.status === 'failed') {
                throw new Error(result.error);
            }

            console.log(`Generation ${generationId} completed.`);
        } catch (error: any) {
            console.error(`Generation ${generationId} failed:`, error);
            await prisma.generation.update({
                where: { id: generationId },
                data: {
                    status: 'failed',
                    failureReason: error.message || 'Unknown error occurred'
                },
            });
        }
    }

    isProcessing = false;
    processQueue(); // Process next item
};

export const createGeneration = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const {
            mode,
            inputPrompt,
            shotType,
            cameraAngle,
            location,
            lighting,
            outputResolution,
            aspectRatio,
            variations,
            sourceElementIds,
            prevGenerationId,
            sessionId,
            engine, // 'fal' or 'comfy'
            falModel, // 'fal-ai/flux/dev' or 'fal-ai/flux-2-flex'
            loras,   // Array of { id, strength }
            sourceImageUrl, // Direct URL for image-to-video
            strength, // Image-to-Image strength
            sampler,
            scheduler,
            maskUrl, // Extract maskUrl from body
            width, // Extract width/height from body
            height,
            startFrame, // New video fields
            endFrame,
            inputVideo
        } = req.body;

        const generation = await prisma.generation.create({
            data: {
                projectId,
                mode,
                inputPrompt,
                shotType,
                cameraAngle,
                location,
                lighting,
                outputResolution,
                aspectRatio,
                variations: variations || 1,
                sourceElementIds,
                prevGenerationId,
                sessionId,
                status: 'queued',
                engine: engine || 'fal',
                // Store model info in metadata or similar if needed, for now we just use it for generation
                usedLoras: { loras, model: falModel, sourceImageUrl, strength, sampler, scheduler, maskUrl, width, height, startFrame, endFrame, inputVideo } // Store dimensions in metadata
            },
        });

        // Add to queue
        jobQueue.push(generation.id);
        processQueue(); // Trigger processing

        res.status(201).json(generation);
    } catch (error: any) {
        console.error(error);
        if (error.code === 'P2003') {
            if (error.meta?.field_name?.includes('sessionId')) {
                return res.status(400).json({ error: 'Invalid Session ID. The selected session may have been deleted.' });
            }
            if (error.meta?.field_name?.includes('projectId')) {
                return res.status(400).json({ error: 'Invalid Project ID.' });
            }
        }
        res.status(500).json({ error: 'Failed to create generation' });
    }
};

export const getGenerations = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { sessionId } = req.query;
        console.log(`[getGenerations] projectId=${projectId}, sessionId=${sessionId}`);

        const where: any = { projectId };
        if (sessionId) {
            where.sessionId = sessionId;
        }
        console.log(`[getGenerations] where clause:`, JSON.stringify(where));

        const generations = await prisma.generation.findMany({
            where,
            include: { session: true },
            orderBy: { createdAt: 'desc' },
        });
        console.log(`[getGenerations] found ${generations.length} generations`);
        res.json(generations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch generations' });
    }
};

export const updateGeneration = async (req: Request, res: Response) => {
    try {
        const { projectId, generationId } = req.params;
        const updates = req.body;

        const generation = await prisma.generation.update({
            where: { id: generationId, projectId },
            data: updates,
        });

        res.json(generation);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update generation' });
    }
};

export const deleteGeneration = async (req: Request, res: Response) => {
    try {
        const { projectId, generationId } = req.params;

        await prisma.generation.delete({
            where: { id: generationId, projectId },
        });

        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete generation' });
    }
};
