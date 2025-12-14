
import { prisma } from '../../prisma';
import { OpenRouterService } from '../llm/OpenRouterService';
import { Generation } from '@prisma/client';

/**
 * structure of the AI analysis result
 */
export interface GenerationAnalysis {
    flaws: string[];          // "skin texture too smooth", "incorrect eye color"
    positiveTraits: string[]; // "good lighting", "correct composition"
    rating: number;           // 1-5 estimated rating
    advice: string;           // "Lower CFG scale to 3.5"
    offendingLoRAs?: string[]; // IDs of LoRAs that might be causing issues
}

import { GrokAdapter } from '../llm/GrokAdapter';
import { FalAIAdapter } from '../generators/FalAIAdapter';

export class AnalysisService {
    private static instance: AnalysisService;
    private fal: FalAIAdapter;
    private grok: GrokAdapter | null = null;

    private constructor() {
        this.fal = new FalAIAdapter();
        if (process.env.XAI_API_KEY) {
            this.grok = new GrokAdapter();
        }
    }

    public static getInstance(): AnalysisService {
        if (!AnalysisService.instance) {
            AnalysisService.instance = new AnalysisService();
        }
        return AnalysisService.instance;
    }

    public async analyzeGeneration(generationId: string, userFeedback?: string): Promise<GenerationAnalysis> {
        const generation = await prisma.generation.findUnique({
            where: { id: generationId },
            include: { project: true }
        });

        if (!generation) throw new Error('Generation not found');

        let imageUrl: string | undefined;

        if (generation.outputs) {
            try {
                const outputs = JSON.parse(generation.outputs);
                imageUrl = outputs[0]?.url;
            } catch (e) {
                console.error("Failed to parse outputs", e);
            }
        }

        if (!imageUrl) throw new Error('No image URL found for generation');

        // Check if video
        const isVideo = imageUrl.toLowerCase().endsWith('.mp4') || (generation.outputs && generation.outputs.includes('"type":"video"'));

        let targetImages: string[] = [imageUrl];

        if (isVideo) {
            console.log(`[AnalysisService] Detected video. Extracting multiple frames for temporal analysis...`);
            try {
                const { frameExtractor } = require('../FrameExtractor');
                // Extract frames at 1fps for detailed temporal analysis
                const frames = await frameExtractor.extractFramesByRate(imageUrl, 1);
                console.log(`[AnalysisService] Extracted ${frames.length} frames (1 fps).`);

                if (frames && frames.length > 0) {
                    targetImages = frames.map((f: any) => f.url);
                    console.log(`[AnalysisService] Using ${targetImages.length} extracted frames.`);
                }
            } catch (e: any) {
                console.error("[AnalysisService] Failed to extract frames from video:", e.message);
            }
        }

        if (generation && (generation as any).sourceImages) {
            try {
                const sources = JSON.parse((generation as any).sourceImages as string);
                if (Array.isArray(sources) && sources.length > 0) {
                    console.log(`[AnalysisService] Found ${sources.length} source images. Adding to analysis.`);
                    // Add source images to the target list
                    // NOTE: Image 1 is the Generation. Images 2+ are References.
                    targetImages.push(...sources);
                }
            } catch (e) {
                console.warn("[AnalysisService] Failed to parse sourceImages", e);
            }
        }

        const prompt = `
        You are an expert AI Art Critic. 
        
        IMAGES PROVIDED:
        - Image 1: The GENERATED artwork/photo to analyze.
        - Image 2+ (if present): The REFERENCE/SOURCE images provided by the user.

        User Prompt: "${generation.inputPrompt}"
        ${userFeedback ? `USER FEEDBACK: "${userFeedback}"` : ''}

        YOUR TASK:
        The images are LABELED. 
        - [Image 1] is the GENERATION. 
        - [Image 2] is Reference 1.
        - [Image 3] is Reference 2, and so on.
        
        CRITICAL: If the user mentions "Ref 2", they mean [Image 3]. If they mention "Ref 3", they mean [Image 4]. Ensure you map this correctly.

        1. **Verify User Feedback**: If user feedback is present, check if it is accurate. If the user says "bad hands" but hands are hidden, Note that they are mistaken. Do NOT blindly agree.
        2. **Independent Analysis**: Identify at least 2 NEW flaws or technical issues (lighting, noise, anatomy, composition, color grading) that the user DID NOT mention.
        3. **Reference Comparison (STRICT)**: 
           - **POSE**: Be EXTREMELY strict. If Ref 3 shows a specific action (e.g. pulling clothing) and the result is passive, this is a CRITICAL FAILURE.
           - **LIKENESS**: Does the face match Ref 1?
           - Identify specific deviations using the Image numbers.

        ${isVideo ? 'Focus on temporal consistency, morphing, and stability between frames.' : ''}

        ${isVideo ? 'Focus on temporal consistency, morphing, and stability between frames.' : ''}

        Return ONLY valid JSON with this structure:
        {
            "flaws": ["critical flaw 1", "face does not match reference", "skin texture too smooth"],
            "positiveTraits": ["lighting is good", "captured pose correctly"],
            "rating": 3,
            "advice": "Specific tailored advice. If face doesn't match, suggest increased strength or specific LoRA adjustments.",
            "offendingLoRAs": []
        }
        Do not include markdown. Do not include explanations. Just the JSON.
        `;

        let analysisRaw: string;

        // 0. Prepare images with Semantic Labels
        const labeledImages: { url: string, label: string }[] = [];

        // Add generated image
        // If multiple outputs, use the first one for analysis
        let generatedUrl = '';
        try {
            const outputs = JSON.parse(generation.outputs || '[]');
            if (outputs.length > 0) generatedUrl = outputs[0].url || outputs[0];
        } catch (e) { }

        if (generatedUrl) {
            labeledImages.push({
                url: generatedUrl,
                label: `[Image 1: GENERATED RESULT (Prompt: "${generation.inputPrompt.substring(0, 50)}...")]`
            });
        }

        // Add reference images with semantic labels
        // Fetch elements to get types
        try {
            if (generation.sourceElementIds) {
                const elementIds = JSON.parse(generation.sourceElementIds);
                const elements = await prisma.element.findMany({
                    where: { id: { in: elementIds } }
                });

                const urlToType: Record<string, string> = {};
                elements.forEach(e => {
                    urlToType[e.fileUrl] = e.type;
                });

                // Iterate over ELEMENTS directly
                elements.forEach((element) => {
                    const url = element.fileUrl;
                    if (url === generatedUrl) return;

                    let type = element.type || 'Reference';

                    // Map generic types to semantic labels
                    let semanticLabel = 'REFERENCE';
                    if (type === 'character') semanticLabel = 'REFERENCE (Face/ID Identity)';
                    else if (type === 'location') semanticLabel = 'REFERENCE (Background/Environment)';
                    else if (type === 'prop') semanticLabel = 'REFERENCE (Object/Detail)';
                    else if (type === 'style') semanticLabel = 'REFERENCE (Art Style)';
                    else if (type.includes('pose') || type.includes('composition')) semanticLabel = 'REFERENCE (Pose/Structure)';
                    else semanticLabel = `REFERENCE (${type})`;

                    labeledImages.push({
                        url: url,
                        label: `[Image ${labeledImages.length + 1}: ${semanticLabel}]`
                    });
                });
            }
        } catch (e) {
            console.error("[Analysis] Error resolving semantic labels:", e);
        }

        try {
            if (this.grok) {
                console.log(`[AnalysisService] Using Grok Vision (Faster) for generation ${generationId}`);
                analysisRaw = await this.grok.analyzeImage(labeledImages, prompt);
            } else {
                console.log(`[AnalysisService] Using Fal.ai (Fallback) for generation ${generationId}`);
                // Fal usually expects single image, so use the first/middle one
                // If we extracted multiple, maybe use the middle one for single-image critique?
                const bestImage = targetImages.length > 1 ? targetImages[1] : targetImages[0];
                analysisRaw = await this.fal.analyzeImage(bestImage!, prompt);
            }

            if (!analysisRaw) throw new Error('No analysis received from AI');

            console.log(`[AnalysisService] Raw response: ${analysisRaw.substring(0, 100)}...`);

            let analysis: GenerationAnalysis;
            try {
                const jsonStr = analysisRaw.replace(/^[^{]*({[\s\S]*})[^}]*$/, '$1');
                analysis = JSON.parse(jsonStr);
            } catch (e) {
                const jsonMatch = analysisRaw.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    analysis = JSON.parse(jsonMatch[0]);
                } else {
                    console.error("[AnalysisService] JSON Parse Error. Raw:", analysisRaw);
                    throw new Error('Failed to parse AI analysis JSON');
                }
            }

            await prisma.generation.update({
                where: { id: generationId },
                data: {
                    aiAnalysis: JSON.stringify(analysis),
                    rating: analysis.rating
                }
            });

            return analysis;

        } catch (error: any) {
            console.error("[AnalysisService] Error during analysis:", error.message);
            // If Grok fails, maybe fallback to Fal?
            // For now, simpler to just throw, but we could add fallback logic here.
            throw error;
        }
    }

    /**
     * Find similar past failures to learn from
     */
    public async getRelevantLessons(prompt: string, activeLoRAIds: string[]): Promise<string[]> {
        // This acts as a localized RAG system
        // 1. Find bad generations (rating <= 2)
        // 2. That share LoRAs or key keywords

        const failures = await prisma.generation.findMany({
            where: {
                rating: { lte: 3 },
                aiAnalysis: { not: null } // Only ones we've analyzed
            },
            take: 20,
            orderBy: { createdAt: 'desc' }
        });

        const distinctLessons = new Set<string>();

        for (const fail of failures) {
            // Check if LoRAs match
            let loraMatch = false;
            if (fail.usedLoras) {
                try {
                    const used = JSON.parse(fail.usedLoras) as any[];
                    // Check overlap with activeLoRAIds
                    const failLoRAIds = used.map(u => u.id);
                    if (activeLoRAIds.some(id => failLoRAIds.includes(id))) {
                        loraMatch = true;
                    }
                } catch (e) { }
            }

            // Simple keyword overlap (naive)
            const keywordMatch = this.checkKeywordOverlap(prompt, fail.inputPrompt);

            if (loraMatch || keywordMatch) {
                try {
                    const analysis = JSON.parse(fail.aiAnalysis!) as GenerationAnalysis;
                    if (analysis.advice) {
                        distinctLessons.add(`Past failure (${fail.rating}/5 stars): ${analysis.advice}. Issue was: ${analysis.flaws[0]}`);
                    }
                } catch (e) { }
            }
        }

        return Array.from(distinctLessons).slice(0, 3); // Return top 3 lessons
    }

    private checkKeywordOverlap(promptA: string, promptB: string): boolean {
        const wordsA = new Set(promptA.toLowerCase().split(/\s+/).filter(w => w.length > 4));
        const wordsB = new Set(promptB.toLowerCase().split(/\s+/).filter(w => w.length > 4));

        let overlap = 0;
        wordsA.forEach(w => {
            if (wordsB.has(w)) overlap++;
        });

        return overlap >= 2; // At least 2 significant words match
    }
}
