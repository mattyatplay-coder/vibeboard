
import { prisma } from '../prisma';
import { GenerationService } from './GenerationService';
import { PromptBuilder } from './PromptBuilder';

export class GenerationJobService {
    static async processJob(generationId: string) {
        try {
            console.log(`[JobService] Processing generation ${generationId}...`);

            // Fetch generation details
            const generation = await prisma.generation.findUnique({
                where: { id: generationId }
            });

            if (!generation) {
                console.error(`[JobService] Generation ${generationId} not found`);
                return;
            }

            // Update status to processing
            await prisma.generation.update({
                where: { id: generationId },
                data: { status: 'processing' }
            });

            // Instantiate service
            const service = new GenerationService(generation.engine as any);

            // Construct Enhanced Prompt
            const resolvedPrompt = PromptBuilder.build({
                basePrompt: generation.inputPrompt,
                shotType: generation.shotType || undefined,
                cameraAngle: generation.cameraAngle || undefined,
                lighting: generation.lighting || undefined,
                location: generation.location || undefined,
            });

            // Parse usedLoras
            const usedLorasParsed = generation.usedLoras
                ? (typeof generation.usedLoras === 'string' ? JSON.parse(generation.usedLoras) : generation.usedLoras)
                : {};

            // Resolve Elements
            let elementReferences: string[] = [];
            const sourceIdsRaw = generation.sourceElementIds;
            const sourceIds = sourceIdsRaw ? (typeof sourceIdsRaw === 'string' ? JSON.parse(sourceIdsRaw) : sourceIdsRaw) : [];
            const referenceStrengthsByUrl: Record<string, number> = {};
            let elementReferencesWithTypes: { url: string; type: string; strength: number }[] = [];

            if (Array.isArray(sourceIds) && sourceIds.length > 0) {
                const elements = await prisma.element.findMany({
                    where: { id: { in: sourceIds } }
                });

                elementReferences = elements.map(e => {
                    if (e.fileUrl) {
                        const strength = (usedLorasParsed as any)?.referenceStrengths?.[e.id] ?? (usedLorasParsed as any)?.referenceCreativity ?? 0.6;
                        referenceStrengthsByUrl[e.fileUrl] = strength;
                        elementReferencesWithTypes.push({
                            url: e.fileUrl,
                            type: e.type || 'other',
                            strength
                        });
                        return e.fileUrl;
                    }
                    return null;
                }).filter((url): url is string => !!url);
            }

            // Resolve Source Images
            let sourceImages: string[] = [];
            if (usedLorasParsed && (usedLorasParsed as any).sourceImages) {
                sourceImages = (usedLorasParsed as any).sourceImages;
            }

            // Fallback for IP-Adapter
            if (elementReferences.length === 0 && sourceImages.length > 0) {
                elementReferences = [...sourceImages];
            }

            // Mentions (@Name) handling
            const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
            const mentions = [...generation.inputPrompt.matchAll(mentionRegex)].map(match => match[1]);

            if (mentions.length > 0) {
                const mentionedElements = await prisma.element.findMany({
                    where: { projectId: generation.projectId }
                });
                const filteredElements = mentionedElements.filter(e =>
                    mentions.some(m => e.name.toLowerCase() === m.toLowerCase())
                );
                filteredElements.forEach(e => {
                    if (e.fileUrl && !sourceImages.includes(e.fileUrl)) {
                        sourceImages.push(e.fileUrl);
                    }
                });
            }

            // Resolve LoRAs from DB
            let resolvedLoras: { path: string; strength: number; type?: string }[] = [];
            const usedLorasData = (usedLorasParsed as any)?.loras;
            if (Array.isArray(usedLorasData) && usedLorasData.length > 0) {
                const loraIds = usedLorasData.map((l: any) => l.id).filter((id: any) => id);
                let loraRecords: any[] = [];
                if (loraIds.length > 0) {
                    loraRecords = await prisma.loRA.findMany({ where: { id: { in: loraIds } } });
                }

                resolvedLoras = usedLorasData.map((l: any): { path: string; strength: number; type?: string } | null => {
                    const record = loraRecords.find(r => r.id === l.id);
                    if (record) return { path: record.fileUrl, strength: l.strength ?? record.strength ?? 1.0, type: record.type };
                    if (l.path) return { path: l.path, strength: l.strength ?? 1.0, type: l.type };
                    return null;
                }).filter((l): l is { path: string; strength: number; type?: string } => l !== null);
            }

            // Check for Replicate trained LoRAs (type: 'trained-lora' or path matches owner/model format)
            // These are full fine-tuned models, not standard safetensors files
            let replicateTrainedModel: string | undefined;
            const standardLoras: { path: string; strength: number }[] = [];

            for (const lora of resolvedLoras) {
                const isReplicateTrained = (lora as any).type === 'trained-lora' ||
                    (lora.path.includes('/') && !lora.path.includes('.') && !lora.path.startsWith('http') && !lora.path.startsWith('fal-ai/'));

                if (isReplicateTrained) {
                    replicateTrainedModel = lora.path;
                    console.log(`[JobService] Detected Replicate trained model: ${replicateTrainedModel}`);
                } else {
                    standardLoras.push({ path: lora.path, strength: lora.strength });
                }
            }

            // If a Replicate trained model is selected, force engine to Replicate
            // Replicate trained models are full fine-tuned models that only work on Replicate
            let effectiveService = service;
            if (replicateTrainedModel) {
                console.log(`[JobService] Forcing engine to Replicate for trained model: ${replicateTrainedModel}`);
                effectiveService = new GenerationService('replicate');
            }

            // Build Options
            // If a Replicate trained model is selected, use it as the model and only pass standard LoRAs
            const options = {
                prompt: resolvedPrompt,
                negativePrompt: PromptBuilder.buildNegative(),
                aspectRatio: generation.aspectRatio || "16:9",
                loras: standardLoras, // Only standard safetensors LoRAs, not Replicate trained models
                model: replicateTrainedModel || (usedLorasParsed as any)?.model,
                sourceImages,
                elementReferences,
                elementReferencesWithTypes,
                sourceVideoUrl: (usedLorasParsed as any)?.inputVideo,
                strength: (usedLorasParsed as any)?.strength,
                referenceCreativity: (usedLorasParsed as any)?.referenceCreativity,
                referenceStrengths: referenceStrengthsByUrl,
                sampler: (usedLorasParsed as any)?.sampler ? {
                    value: (usedLorasParsed as any).sampler,
                    label: (usedLorasParsed as any).sampler,
                    id: (usedLorasParsed as any).sampler,
                    name: (usedLorasParsed as any).sampler
                } : undefined,
                scheduler: (usedLorasParsed as any)?.scheduler ? {
                    value: (usedLorasParsed as any).scheduler,
                    label: (usedLorasParsed as any).scheduler,
                    id: (usedLorasParsed as any).scheduler,
                    name: (usedLorasParsed as any).scheduler
                } : undefined,
                count: generation.variations || 1,
                duration: (usedLorasParsed as any)?.duration,
                maskUrl: (usedLorasParsed as any)?.maskUrl,
                width: (usedLorasParsed as any)?.width,
                height: (usedLorasParsed as any)?.height,
                startFrame: (usedLorasParsed as any)?.startFrame,
                endFrame: (usedLorasParsed as any)?.endFrame,
                inputVideo: (usedLorasParsed as any)?.inputVideo,
                audioUrl: (usedLorasParsed as any)?.audioUrl,
                // Normalize mode: convert hyphenated (text-to-video) to underscored (text_to_video)
                mode: (generation.mode?.replace(/-/g, '_') || 'text_to_image') as any,
            };

            // Intent inference (copied from controller logic)
            // ... (simplified for brevity, main logic preserved)
            const imageOnlyModels = [
                'fal-ai/flux/dev', 'fal-ai/flux-pro', 'fal-ai/flux-pro/v1.1',
                'fal-ai/flux/schnell', 'fal-ai/flux-realism', 'fal-ai/flux-lora',
                'fal-ai/flux-2-max', 'fal-ai/stable-diffusion-v3', 'fal-ai/recraft-v3',
                'fal-ai/ideogram/v2', 'fal-ai/kling-image/o1'
            ];
            const isImageOnlyModel = imageOnlyModels.some(m =>
                options.model?.toLowerCase().includes(m.toLowerCase()) ||
                options.model?.toLowerCase() === m.toLowerCase()
            );

            if (!isImageOnlyModel && (generation.inputPrompt.toLowerCase().includes('video') || generation.inputPrompt.toLowerCase().includes('motion'))) {
                // Logic to switch mode if implicit
                if (!options.mode || options.mode === 'text_to_image') {
                    options.mode = 'text_to_video';
                }
            }


            // Call Service (use effectiveService which may be forced to Replicate for trained models)
            let result;
            // Video modes include: text_to_video, image_to_video, frames_to_video, extend_video, avatar (lipsync/talking head), video-editing
            const videoModes = ['image_to_video', 'text_to_video', 'frames_to_video', 'extend_video', 'avatar', 'video-editing'];
            if (videoModes.includes(options.mode as string)) {
                const videoInput = options.startFrame || sourceImages[0] || elementReferences[0];
                result = await effectiveService.generateVideo(videoInput, options);
            } else {
                result = await effectiveService.generateImage(options);
            }

            // Update Result
            if (result.status === 'succeeded') {
                // Determine if this is a video generation based on mode (supports both hyphen and underscore formats)
                const isVideoMode = generation.mode?.includes('video') ||
                    options.mode?.includes('video');

                const outputsData = result.outputs?.map((url: string) => ({
                    type: (isVideoMode || (typeof url === 'string' && (url.endsWith('.mp4') || url.endsWith('.webm')))) ? 'video' : 'image',
                    url,
                    thumbnail_url: url
                }));

                await prisma.generation.update({
                    where: { id: generationId },
                    data: {
                        status: 'succeeded',
                        outputs: JSON.stringify(outputsData),
                        usedLoras: JSON.stringify({ ...usedLorasParsed, provider: result.provider, seed: result.seed })
                    }
                });
            } else {
                throw new Error(result.error);
            }

            console.log(`[JobService] Generation ${generationId} completed.`);
        } catch (error: any) {
            console.error(`[JobService] Generation ${generationId} failed:`, error);
            await prisma.generation.update({
                where: { id: generationId },
                data: {
                    status: 'failed',
                    failureReason: error.message || 'Unknown error'
                }
            });
        }
    }
}
