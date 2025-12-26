import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { GenerationService } from '../services/GenerationService';
import { PromptEnhancer } from '../services/prompts/PromptEnhancer';
import { videoAnalysisService } from '../services/VideoAnalysisService';

// const prisma = new PrismaClient();
const generationService = new GenerationService();
const promptEnhancer = new PromptEnhancer();

export const analyzeVideo = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: "No video file uploaded" });
        }

        console.log(`[ExtendVideo] Analyzing video: ${file.path}`);

        // Use real video analysis service
        const analysisResult = await videoAnalysisService.analyzeVideo(
            file.path,
            projectId,
            {
                extractFirstFrame: false,
                uploadFrames: true,
                detectCharacters: !!projectId,
                analyzeStyle: true
            }
        );

        // Transform to expected response format
        res.json({
            metadata: {
                ...analysisResult.metadata,
                style: analysisResult.styleAnalysis?.style || ['Cinematic'],
                colorGrading: analysisResult.styleAnalysis?.colorGrading || 'Neutral',
                lighting: analysisResult.styleAnalysis?.lighting || 'Natural',
                mood: analysisResult.styleAnalysis?.mood || ['Calm']
            },
            startFrame: {
                id: analysisResult.lastFrame.id,
                imageUrl: analysisResult.lastFrame.imageUrl,
                timestamp: analysisResult.lastFrame.timestamp
            },
            detectedCharacters: analysisResult.detectedCharacters,
            styleMatch: analysisResult.styleMatch
        });

    } catch (error) {
        console.error("Error analyzing video:", error);
        res.status(500).json({ error: "Failed to analyze video" });
    }
};

export const recommendModel = async (req: Request, res: Response) => {
    try {
        const { metadata, detectedCharacters } = req.body;

        // Simple logic for recommendation
        let recommendedModelId = 'fal-wan-2.5';
        let reason = "Balanced quality and speed.";

        if (detectedCharacters && detectedCharacters.length > 0) {
            recommendedModelId = 'gemini-veo-3.1';
            reason = "Best for character consistency.";
        } else if (metadata?.style?.includes("Anime")) {
            recommendedModelId = 'replicate-animatediff';
            reason = "Best for anime styles.";
        }

        // const model = await generationService.getModelDetails(recommendedModelId);

        res.json({
            recommendedModel: { id: recommendedModelId },
            reason
        });

    } catch (error) {
        console.error("Error recommending model:", error);
        res.status(500).json({ error: "Failed to recommend model" });
    }
};

export const enhancePrompt = async (req: Request, res: Response) => {
    try {
        const { prompt, projectStyle, characters, modelId } = req.body;

        const request: any = {
            originalPrompt: prompt,
            modelId: modelId || 'default',
            generationType: 'video',
            elements: characters?.map((c: any) => ({
                id: c.id,
                name: c.name,
                type: 'character',
                description: c.description || '',
                consistencyWeight: 1.0,
                attributes: {}
            })),
            style: projectStyle?.visualStyle,
            enhancementLevel: 'balanced',
            preserveOriginalIntent: true,
            addQualityBoosters: true,
            addNegativePrompt: true,
            consistencyPriority: 0.8
        };

        const enhanced = await promptEnhancer.enhance(request);

        res.json({
            original: prompt,
            enhanced: enhanced.prompt,
            appliedEnhancements: {
                projectStyle: !!projectStyle,
                characterDetails: !!characters?.length
            }
        });

    } catch (error) {
        console.error("Error enhancing prompt:", error);
        res.status(500).json({ error: "Failed to enhance prompt" });
    }
};

export const generateExtension = async (req: Request, res: Response) => {
    // This acts as a wrapper around the standard generation service
    // but handles the specific logic for "Extend Video" (start frames, etc.)
    try {
        const { projectId, ...options } = req.body;

        // Ensure mode is set
        options.mode = 'extend_video';

        const result = await generationService.generateVideo(undefined, options);

        // If successful, we might want to create a SceneShot or update a Chain here
        // But for now, just return the job

        res.json(result);

    } catch (error) {
        console.error("Error generating extension:", error);
        res.status(500).json({ error: "Failed to generate extension" });
    }
};
