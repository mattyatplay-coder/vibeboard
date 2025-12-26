/**
 * SemanticIndexService
 *
 * Indexes generation images using Grok Vision to extract searchable visual descriptions.
 * Enables natural language search like "red dress on beach" or "moody lighting portrait".
 */

import { PrismaClient } from '@prisma/client';
import { GrokAdapter } from '../llm/GrokAdapter';

const prisma = new PrismaClient();

export interface VisualDescription {
    description: string;        // 2-3 sentence natural language description
    subjects: string[];         // Main subjects: "woman", "car", "landscape"
    objects: string[];          // Objects present: "umbrella", "chair", "flowers"
    colors: string[];           // Dominant colors: "red", "blue", "warm tones"
    mood: string;               // Emotional tone: "dramatic", "peaceful", "energetic"
    composition: string;        // Framing: "close-up", "wide shot", "centered"
    lighting: string;           // Lighting style: "golden hour", "studio", "neon"
    style: string;              // Art style: "photorealistic", "anime", "oil painting"
    setting: string;            // Environment: "beach", "urban", "fantasy"
    actions: string[];          // What's happening: "running", "posing", "sitting"
}

export class SemanticIndexService {
    private static instance: SemanticIndexService;
    private grok: GrokAdapter;
    private isIndexing: boolean = false;

    private constructor() {
        this.grok = new GrokAdapter();
    }

    static getInstance(): SemanticIndexService {
        if (!SemanticIndexService.instance) {
            SemanticIndexService.instance = new SemanticIndexService();
        }
        return SemanticIndexService.instance;
    }

    /**
     * Index a single generation's images using Grok Vision
     */
    async indexGeneration(generationId: string): Promise<VisualDescription | null> {
        try {
            const generation = await prisma.generation.findUnique({
                where: { id: generationId }
            });

            if (!generation || !generation.outputs) {
                console.log(`[SemanticIndex] No outputs found for generation ${generationId}`);
                return null;
            }

            const outputs = JSON.parse(generation.outputs);
            if (!outputs || outputs.length === 0) {
                console.log(`[SemanticIndex] Empty outputs for generation ${generationId}`);
                return null;
            }

            // Get the first image URL (or primary output)
            const primaryOutput = outputs[0];
            const imageUrl = primaryOutput.url || primaryOutput.thumbnail_url;

            if (!imageUrl) {
                console.log(`[SemanticIndex] No image URL in outputs for generation ${generationId}`);
                return null;
            }

            console.log(`[SemanticIndex] Indexing generation ${generationId} with image: ${imageUrl.substring(0, 50)}...`);

            // Build the vision prompt for structured extraction
            const extractionPrompt = `Analyze this AI-generated image and provide a structured description for search indexing.

Return a JSON object with these fields:
{
    "description": "2-3 sentence natural language description of the image",
    "subjects": ["array of main subjects like 'woman', 'man', 'cat', 'car'"],
    "objects": ["array of objects present like 'umbrella', 'chair', 'flowers'"],
    "colors": ["array of dominant colors like 'red', 'blue', 'warm tones', 'monochrome'"],
    "mood": "emotional tone like 'dramatic', 'peaceful', 'energetic', 'mysterious'",
    "composition": "framing like 'close-up', 'wide shot', 'portrait', 'landscape', 'centered'",
    "lighting": "lighting style like 'golden hour', 'studio', 'neon', 'natural', 'dramatic shadows'",
    "style": "art style like 'photorealistic', 'anime', 'oil painting', '3D render', 'cinematic'",
    "setting": "environment like 'beach', 'urban', 'fantasy', 'indoor', 'nature'",
    "actions": ["array of actions happening like 'running', 'posing', 'sitting', 'smiling'"]
}

Be comprehensive but concise. Focus on visually distinctive elements.
Return ONLY the JSON object, no markdown formatting.`;

            const response = await this.grok.analyzeImage([imageUrl], extractionPrompt);

            // Parse the JSON response
            let visualDescription: VisualDescription;
            try {
                // Clean up response - remove markdown code blocks if present
                let cleanResponse = response.trim();
                if (cleanResponse.startsWith('```')) {
                    cleanResponse = cleanResponse.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
                }
                visualDescription = JSON.parse(cleanResponse);
            } catch (parseError) {
                console.error(`[SemanticIndex] Failed to parse Grok response as JSON:`, response.substring(0, 200));
                // Fallback: Create minimal description from the text response
                visualDescription = {
                    description: response.substring(0, 500),
                    subjects: [],
                    objects: [],
                    colors: [],
                    mood: '',
                    composition: '',
                    lighting: '',
                    style: '',
                    setting: '',
                    actions: []
                };
            }

            // Store in database
            await prisma.generation.update({
                where: { id: generationId },
                data: {
                    visualDescription: JSON.stringify(visualDescription),
                    indexedAt: new Date()
                }
            });

            console.log(`[SemanticIndex] Successfully indexed generation ${generationId}`);
            return visualDescription;

        } catch (error: any) {
            console.error(`[SemanticIndex] Error indexing generation ${generationId}:`, error.message);
            return null;
        }
    }

    /**
     * Search generations using natural language query
     */
    async search(projectId: string, query: string, limit: number = 50): Promise<any[]> {
        try {
            // Normalize query for SQLite LIKE search
            const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

            if (searchTerms.length === 0) {
                return [];
            }

            // Build WHERE clause for SQLite text search
            // Search across visualDescription JSON and inputPrompt
            // IMPORTANT: Only return succeeded generations with actual outputs
            const generations = await prisma.generation.findMany({
                where: {
                    projectId,
                    status: 'succeeded',
                    outputs: { not: null },
                    AND: [
                        // Ensure outputs is not empty array
                        { NOT: { outputs: '[]' } },
                        { NOT: { outputs: 'null' } },
                        {
                            OR: [
                                // Search in visual description
                                ...searchTerms.map(term => ({
                                    visualDescription: { contains: term }
                                })),
                                // Also search in the original prompt
                                ...searchTerms.map(term => ({
                                    inputPrompt: { contains: term }
                                }))
                            ]
                        }
                    ]
                },
                orderBy: { createdAt: 'desc' },
                take: limit
            });

            // Post-filter: Only include generations with valid output URLs
            const validGenerations = generations.filter(gen => {
                if (!gen.outputs) return false;
                try {
                    const outputs = JSON.parse(gen.outputs);
                    return Array.isArray(outputs) && outputs.length > 0 && outputs[0]?.url;
                } catch {
                    return false;
                }
            });

            // Score results by how many terms match
            // IMPORTANT: Parse outputs from JSON string to array for frontend compatibility
            const scoredResults = validGenerations.map(gen => {
                let score = 0;
                const searchableText = `${gen.visualDescription || ''} ${gen.inputPrompt}`.toLowerCase();

                for (const term of searchTerms) {
                    if (searchableText.includes(term)) {
                        score += 1;
                        // Bonus for exact word match
                        const regex = new RegExp(`\\b${term}\\b`, 'i');
                        if (regex.test(searchableText)) {
                            score += 0.5;
                        }
                    }
                }

                // Parse outputs from JSON string to array (GenerationCard expects parsed outputs)
                let parsedOutputs = [];
                try {
                    parsedOutputs = gen.outputs ? JSON.parse(gen.outputs) : [];
                } catch {
                    parsedOutputs = [];
                }

                return {
                    ...gen,
                    outputs: parsedOutputs,  // Replace string with parsed array
                    searchScore: score
                };
            });

            // Sort by score descending, then by date
            scoredResults.sort((a, b) => {
                if (b.searchScore !== a.searchScore) {
                    return b.searchScore - a.searchScore;
                }
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });

            return scoredResults;

        } catch (error: any) {
            console.error(`[SemanticIndex] Search error:`, error.message);
            return [];
        }
    }

    /**
     * Get indexing stats for a project
     */
    async getIndexStats(projectId: string): Promise<{ total: number; indexed: number; pending: number }> {
        const [total, indexed] = await Promise.all([
            prisma.generation.count({
                where: { projectId, status: 'succeeded' }
            }),
            prisma.generation.count({
                where: { projectId, status: 'succeeded', indexedAt: { not: null } }
            })
        ]);

        return {
            total,
            indexed,
            pending: total - indexed
        };
    }

    /**
     * Batch index unindexed generations
     */
    async batchIndex(projectId: string, batchSize: number = 10): Promise<{ processed: number; errors: number }> {
        if (this.isIndexing) {
            console.log('[SemanticIndex] Batch indexing already in progress');
            return { processed: 0, errors: 0 };
        }

        this.isIndexing = true;
        let processed = 0;
        let errors = 0;

        try {
            // Find unindexed generations
            const unindexed = await prisma.generation.findMany({
                where: {
                    projectId,
                    status: 'succeeded',
                    indexedAt: null,
                    outputs: { not: null }
                },
                take: batchSize,
                orderBy: { createdAt: 'desc' }
            });

            console.log(`[SemanticIndex] Found ${unindexed.length} unindexed generations`);

            for (const gen of unindexed) {
                try {
                    await this.indexGeneration(gen.id);
                    processed++;
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (err) {
                    errors++;
                    console.error(`[SemanticIndex] Failed to index ${gen.id}:`, err);
                }
            }

            console.log(`[SemanticIndex] Batch complete: ${processed} processed, ${errors} errors`);

        } finally {
            this.isIndexing = false;
        }

        return { processed, errors };
    }

    /**
     * Auto-index a generation after it completes (hook for GenerationService)
     */
    async autoIndex(generationId: string): Promise<void> {
        // Don't block - run indexing in background
        this.indexGeneration(generationId).catch(err => {
            console.error(`[SemanticIndex] Auto-index failed for ${generationId}:`, err);
        });
    }
}
