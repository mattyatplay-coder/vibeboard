import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

import { GenerationService } from '../services/GenerationService';
import { PromptBuilder } from '../services/PromptBuilder';

const prisma = new PrismaClient({});

// Helper to safely parse JSON fields
const safeParse = (data: any, fieldName: string, id: string) => {
    if (!data) return null;
    if (typeof data === 'string') {
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error(`[Data Error] Failed to parse ${fieldName} for generation ${id}:`, e);
            console.error(`[Data Error] Raw value:`, data);
            return []; // Return empty array/object as fallback
        }
    }
    return data;
};

const parseGenerationJsonFields = (generation: any) => {
    if (!generation) return generation;

    // Handle tags specifically (might be comma-separated or JSON)
    let parsedTags: string[] = [];
    if (generation.tags) {
        if (typeof generation.tags === 'string') {
            const trimmed = generation.tags.trim();
            if (trimmed.startsWith('[')) {
                try {
                    parsedTags = JSON.parse(trimmed);
                } catch (e) {
                    console.warn(`[Data Warning] Failed to parse tags JSON for ${generation.id}, treating as single tag.`);
                    parsedTags = [generation.tags];
                }
            } else {
                // Handle comma separated or single tag
                parsedTags = [generation.tags];
            }
        } else if (Array.isArray(generation.tags)) {
            parsedTags = generation.tags;
        }
    }

    return {
        ...generation,
        outputs: safeParse(generation.outputs, 'outputs', generation.id),
        usedLoras: safeParse(generation.usedLoras, 'usedLoras', generation.id),
        sourceElementIds: safeParse(generation.sourceElementIds, 'sourceElementIds', generation.id),
        sourceReferenceIds: safeParse(generation.sourceReferenceIds, 'sourceReferenceIds', generation.id),
        aiAnalysis: safeParse(generation.aiAnalysis, 'aiAnalysis', generation.id),
        tags: parsedTags,
    };
};

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

            // Parse usedLoras from JSON string
            const usedLorasParsed = generation.usedLoras
                ? (typeof generation.usedLoras === 'string' ? JSON.parse(generation.usedLoras) : generation.usedLoras)
                : {};

            // Fetch Element References (for IP-Adapter / Character Consistency)
            let elementReferences: string[] = [];
            const sourceIdsRaw = generation.sourceElementIds;
            console.log(`[DEBUG] sourceIdsRaw: ${JSON.stringify(sourceIdsRaw)}`);
            const sourceIds = sourceIdsRaw ? (typeof sourceIdsRaw === 'string' ? JSON.parse(sourceIdsRaw) : sourceIdsRaw) : [];
            console.log(`[DEBUG] sourceIds parsed: ${JSON.stringify(sourceIds)}`);

            // Map to store URL -> Strength for the adapter
            const referenceStrengthsByUrl: Record<string, number> = {};

            if (Array.isArray(sourceIds) && sourceIds.length > 0) {
                const elements = await prisma.element.findMany({
                    where: { id: { in: sourceIds } }
                });
                console.log(`[DEBUG] Found ${elements.length} elements for IP-Adapter`);

                // Map to file URLs and build strength map
                elementReferences = elements.map(e => {
                    if (e.fileUrl) {
                        // Map ID-based strength to URL-based strength
                        if (usedLorasParsed?.referenceStrengths && usedLorasParsed.referenceStrengths[e.id]) {
                            referenceStrengthsByUrl[e.fileUrl] = usedLorasParsed.referenceStrengths[e.id];
                        }
                        return e.fileUrl;
                    }
                    return null;
                }).filter((url): url is string => !!url);

                console.log(`[DEBUG] Resolved elementReferences: ${JSON.stringify(elementReferences)}`);
                console.log(`[DEBUG] Mapped referenceStrengthsByUrl: ${JSON.stringify(referenceStrengthsByUrl)}`);
            } else {
                console.log(`[DEBUG] No sourceIds found for IP-Adapter`);
            }

            // Fetch Source Images (for Image-to-Image / Structure)
            let sourceImages: string[] = [];
            if (usedLorasParsed && usedLorasParsed.sourceImages) {
                sourceImages = usedLorasParsed.sourceImages;
            }
            // else if (usedLorasParsed && usedLorasParsed.sourceImageUrl) {
            //    sourceImages = [usedLorasParsed.sourceImageUrl];
            // }
            console.log(`[DEBUG] Resolved sourceImages: ${JSON.stringify(sourceImages)}`);

            // FALLBACK: If no Element References (Face) are provided, but a Source Image (Structure) is,
            // use the Source Image for the Face Reference as well.
            // This ensures "Reference Image" is used for both I2I and IP-Adapter if not specified otherwise.
            if (elementReferences.length === 0 && sourceImages.length > 0) {
                console.log(`[DEBUG] No elementReferences found. Using sourceImages as fallback for IP-Adapter.`);
                elementReferences = [...sourceImages];
            }

            // Check for sourceImages array (from image-to-image)
            if (usedLorasParsed?.sourceImages && Array.isArray(usedLorasParsed.sourceImages)) {
                usedLorasParsed.sourceImages.forEach((img: string) => {
                    if (!sourceImages.includes(img)) {
                        sourceImages.push(img);
                    }
                });
            }

            // Parse @ mentions from the prompt
            const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
            const mentions = [...generation.inputPrompt.matchAll(mentionRegex)].map(match => match[1]);

            if (mentions.length > 0) {
                console.log(`Found mentions in prompt: ${mentions.join(', ')}`);
                // Note: Prisma doesn't support case-insensitive 'in' filter directly
                // We filter in-memory for case-insensitivity
                const mentionedElements = await prisma.element.findMany({
                    where: {
                        projectId: generation.projectId // Scope to project
                    }
                });
                const filteredElements = mentionedElements.filter(e =>
                    mentions.some(m => e.name.toLowerCase() === m.toLowerCase())
                );
                console.log(`Found ${filteredElements.length} matching elements for mentions:`, filteredElements.map(e => e.name));


                // Add mentioned images to sourceImages (if not already present)
                filteredElements.forEach(e => {
                    if (e.fileUrl && !sourceImages.includes(e.fileUrl)) {
                        sourceImages.push(e.fileUrl);
                    }
                });
            }

            // Resolve LoRAs
            let resolvedLoras: { path: string; strength: number }[] = [];
            const usedLorasData = usedLorasParsed?.loras;
            let loraRecords: any[] = []; // Initialize loraRecords outside the if block
            if (Array.isArray(usedLorasData) && usedLorasData.length > 0) {
                const loraIds = usedLorasData.map((l: any) => l.id).filter((id: any) => id !== undefined && id !== null);
                if (loraIds.length > 0) {
                    loraRecords = await prisma.loRA.findMany({
                        where: { id: { in: loraIds } }
                    });
                }

                resolvedLoras = usedLorasData.map((l: any) => {
                    const record = loraRecords.find((r) => r.id === l.id);
                    if (record) {
                        return { path: record.fileUrl, strength: l.strength || record.strength || 1.0 };
                    }
                    // Fallback: If no record but path is provided, use it (Ad-hoc LoRA)
                    if (l.path) {
                        return { path: l.path, strength: l.strength || 1.0 };
                    }
                    return null;
                }).filter((l): l is { path: string; strength: number } => l !== null);
            }

            const options = {
                prompt: resolvedPrompt,
                negativePrompt: PromptBuilder.buildNegative(),
                aspectRatio: generation.aspectRatio || "16:9",
                loras: resolvedLoras,
                model: usedLorasParsed?.model,
                sourceImages, // Only contains structure images
                elementReferences, // Contains character/style references
                sourceVideoUrl: usedLorasParsed?.inputVideo, // Pass inputVideo as sourceVideoUrl
                strength: usedLorasParsed?.strength, // Pass strength to options
                referenceCreativity: usedLorasParsed?.referenceCreativity, // Pass to service
                referenceStrengths: referenceStrengthsByUrl, // Pass URL-keyed map
                sampler: usedLorasParsed?.sampler ? { value: usedLorasParsed.sampler, label: usedLorasParsed.sampler, id: usedLorasParsed.sampler, name: usedLorasParsed.sampler } : undefined,
                scheduler: usedLorasParsed?.scheduler ? { value: usedLorasParsed.scheduler, label: usedLorasParsed.scheduler, id: usedLorasParsed.scheduler, name: usedLorasParsed.scheduler } : undefined,
                count: generation.variations || 1,
                duration: usedLorasParsed?.duration, // Pass duration
                maskUrl: usedLorasParsed?.maskUrl, // Pass maskUrl for inpainting
                width: usedLorasParsed?.width, // Pass explicit dimensions
                height: usedLorasParsed?.height,
                startFrame: usedLorasParsed?.startFrame,
                endFrame: usedLorasParsed?.endFrame,
                inputVideo: usedLorasParsed?.inputVideo,
                audioUrl: usedLorasParsed?.audioUrl, // Pass audioUrl
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
                // Fix: Include elementReferences[0] (Face/Reference) as a valid input source for Image-to-Video
                const videoInput = options.startFrame || sourceImages[0] || elementReferences[0];
                console.log(`Calling generateVideo with videoInput: ${videoInput ? 'PRESENT' : 'UNDEFINED'}, sourceImages length: ${sourceImages.length}`);
                result = await service.generateVideo(videoInput, options);
            } else {
                result = await service.generateImage(options);
            }

            if (result.status === 'succeeded') {
                const outputsData = result.outputs?.map((url: string) => ({
                    type: (generation.mode === 'image_to_video' || generation.mode === 'text_to_video' || (typeof url === 'string' && (url.endsWith('.mp4') || url.endsWith('.webm')))) ? 'video' : 'image',
                    url,
                    thumbnail_url: url
                }));

                await prisma.generation.update({
                    where: { id: generationId },
                    data: {
                        status: 'succeeded',
                        outputs: JSON.stringify(outputsData),
                        // Store provider info if available
                        usedLoras: JSON.stringify({ ...usedLorasParsed, provider: result.provider, seed: result.seed })
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
            inputVideo,
            duration, // Extract duration from body
            referenceCreativity, // Extract reference creativity
            referenceStrengths, // Extract per-element strengths
            audioUrl, // Extract audioUrl
            name, // Extract name
            negativePrompt, // Extract negativePrompt
            steps, // Extract steps
            guidanceScale // Extract guidanceScale
        } = req.body;

        console.log("[createGeneration] Starting creation...");
        console.log("[createGeneration] Request body:", JSON.stringify(req.body, null, 2));

        const generation = await prisma.generation.create({
            data: {
                projectId,
                mode,
                inputPrompt: inputPrompt || "",
                shotType,
                cameraAngle,
                location,
                lighting,
                outputResolution,
                aspectRatio,
                variations: variations || 1,
                sourceElementIds: sourceElementIds ? JSON.stringify(sourceElementIds) : undefined,
                prevGenerationId,
                sessionId,
                status: req.body.status || 'queued',
                engine: engine || 'fal',
                tags: JSON.stringify(req.body.tags || []),
                name: name || undefined,
                // Store model info in metadata or similar if needed, for now we just use it for generation
                usedLoras: JSON.stringify({ loras, model: falModel, sourceImages: req.body.sourceImages, sourceImageUrl, strength, sampler, scheduler, maskUrl, width, height, startFrame, endFrame, inputVideo, duration, referenceCreativity, referenceStrengths, audioUrl, negativePrompt, steps, guidanceScale })
            },
        });
        console.log("[createGeneration] Generation created in DB:", generation.id);

        // Add to queue only if queued
        if (generation.status === 'queued') {
            jobQueue.push(generation.id);
            console.log("[createGeneration] Added to jobQueue");
            processQueue(); // Trigger processing
        }

        res.status(201).json(parseGenerationJsonFields(generation));
    } catch (error: any) {
        console.error("[createGeneration] Error:", error);
        if (error.code === 'P2003') {
            if (error.meta?.field_name?.includes('sessionId')) {
                return res.status(400).json({ error: 'Invalid Session ID. The selected session may have been deleted.' });
            }
            if (error.meta?.field_name?.includes('projectId')) {
                return res.status(400).json({ error: 'Invalid Project ID.' });
            }
        }
        res.status(500).json({ error: 'Failed to create generation', message: error.message || String(error) });
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
        // Parse JSON fields before returning
        res.json(generations.map(parseGenerationJsonFields));
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

        res.json(parseGenerationJsonFields(generation));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update generation' });
    }
};

export const deleteGeneration = async (req: Request, res: Response) => {
    try {
        const { projectId, generationId } = req.params;

        // Use transaction to ensure safe cleanup
        await prisma.$transaction(async (tx) => {
            // 1. Remove references in SceneShot
            await tx.sceneShot.deleteMany({
                where: { generationId }
            });

            // 2. Unlink any child generations (break the chain)
            await tx.generation.updateMany({
                where: { prevGenerationId: generationId },
                data: { prevGenerationId: null }
            });

            // 3. Delete the generation itself
            await tx.generation.delete({
                where: { id: generationId, projectId },
            });
        });

        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete generation' });
    }
};
export const downloadWithMetadata = async (req: Request, res: Response) => {
    res.status(501).json({ error: "Not Implemented" });
};

export const getQueueStatus = async (req: Request, res: Response) => {
    res.json({
        queueLength: jobQueue.length,
        isProcessing
    });
};

export const enhanceVideo = async (req: Request, res: Response) => {
    // Placeholder for video enhancement
    try {
        const { projectId, generationId } = req.params;
        console.log(`[enhanceVideo] Request for generation ${generationId}`);
        // Mock success for now
        res.json({ message: "Enhancement check complete (Placeholder)", status: "no_changes_needed" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to enhance video' });
    }
};

export const analyzeGeneration = async (req: Request, res: Response) => {
    try {
        const { projectId, generationId } = req.params;
        console.log(`[analyzeGeneration] Request for generation ${generationId}`);

        // Mock analysis result matching UI expectations
        const mockAnalysis = {
            flaws: ["Subject lighting is slightly inconsistent with background", "Hands appear slightly distorted"],
            positiveTraits: ["Excellent composition", "Color grading matches reference"],
            advice: "Try reducing the CFG scale slightly or using a ControlNet for hand pose stability.",
            rating: 3
        };

        // Update the generation with this analysis
        await prisma.generation.update({
            where: { id: generationId },
            data: { aiAnalysis: JSON.stringify(mockAnalysis) }
        });

        res.json(mockAnalysis);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to analyze generation' });
    }
};

export const refineGeneration = async (req: Request, res: Response) => {
    try {
        const { projectId, generationId } = req.params;
        const { feedback } = req.body;
        console.log(`[refineGeneration] Feedback for ${generationId}: ${feedback}`);

        // In a real implementation, this would trigger a new generation job
        // For now, we just acknowledge it
        res.json({ message: "Refinement feedback received", nextAction: "queued" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to refine generation' });
    }
};
