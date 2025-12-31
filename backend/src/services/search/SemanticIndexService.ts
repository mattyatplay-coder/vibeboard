/**
 * SemanticIndexService
 *
 * Indexes generation images using Grok Vision to extract searchable visual descriptions.
 * Enables natural language search like "red dress on beach" or "moody lighting portrait".
 */

import { prisma } from '../../prisma';
import { GrokAdapter } from '../llm/GrokAdapter';
import { VectorEmbeddingService } from './VectorEmbeddingService';

/**
 * Professional Cinematographer's Visual Description
 * Uses industry-standard DP terminology for searchable metadata
 */
export interface VisualDescription {
    description: string;        // 2-3 sentence natural language description
    subjects: string[];         // Main subjects: "woman", "car", "landscape"
    objects: string[];          // Objects present: "umbrella", "chair", "flowers"

    // === CINEMATIC METADATA (DP Terminology) ===

    // Framing - Standard shot sizes
    framing: {
        shotSize: string;       // ECU, CU, MCU, MS, MWS, WS, EWS
        cameraAngle: string;    // Eye Level, Low Angle, High Angle, Dutch, Bird's Eye, Worm's Eye
        cameraMovement?: string; // Static, Pan, Tilt, Dolly, Crane, Handheld, Steadicam
    };

    // Lighting - Professional lighting terminology
    lighting: {
        style: string;          // Low-Key, High-Key, Chiaroscuro, Rembrandt, Split, Silhouette
        direction: string;      // Front, Side, Back, Rim, Under, Top, Ambient
        quality: string;        // Hard, Soft, Diffused, Specular
        colorTemp: string;      // Warm, Cool, Neutral, Mixed, Golden Hour, Blue Hour
        practicals?: string[];  // Neon, Window Light, Lamp, Fire, Screen Glow
    };

    // Lens/Optics - Optical characteristics
    lens: {
        type: string;           // Anamorphic, Spherical, Fisheye, Tilt-Shift
        depthOfField: string;   // Shallow DOF, Deep Focus, Selective Focus
        bokeh?: string;         // Circular, Oval, Anamorphic Streaks
        focalLengthFeel: string; // Wide (14-24mm), Normal (35-50mm), Telephoto (85-200mm)
        opticalEffects?: string[]; // Lens Flare, Chromatic Aberration, Vignette, Distortion
    };

    // Composition - Visual arrangement
    composition: {
        technique: string;      // Rule of Thirds, Golden Ratio, Centered, Symmetrical, Asymmetrical
        leadingLines: boolean;
        negativeSpace: string;  // Minimal, Balanced, Heavy
        layering: string;       // Foreground/Background separation
    };

    // Legacy fields for backwards compatibility
    colors: string[];           // Dominant colors with hex codes if possible
    mood: string;               // Emotional tone
    style: string;              // Art style: photorealistic, anime, etc.
    setting: string;            // Environment
    actions: string[];          // What's happening

    // Color grading metadata
    colorGrade?: {
        palette: string;        // Teal & Orange, Pastel, Monochrome, High Contrast
        saturation: string;     // Desaturated, Natural, Vibrant, Hyper-saturated
        contrast: string;       // Low, Normal, High, Crushed Blacks
    };
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

            // Build the vision prompt using professional DP terminology
            const extractionPrompt = `You are a professional Cinematographer and Director of Photography (DP).
Analyze this image as if you were logging it for a Digital Asset Manager on a film production.
Use industry-standard terminology. Be precise about technical characteristics.

Return a JSON object with this exact structure:
{
    "description": "2-3 sentence description focusing on the shot's visual storytelling",
    "subjects": ["main subjects: woman, man, turtle, car, etc."],
    "objects": ["notable objects in frame"],

    "framing": {
        "shotSize": "ECU|CU|MCU|MS|MWS|WS|EWS",
        "cameraAngle": "Eye Level|Low Angle|High Angle|Dutch|Bird's Eye|Worm's Eye",
        "cameraMovement": "Static|Pan|Tilt|Dolly|Crane|Handheld|Steadicam|null if still image"
    },

    "lighting": {
        "style": "Low-Key|High-Key|Chiaroscuro|Rembrandt|Split|Silhouette|Flat|Natural",
        "direction": "Front|Side|Back|Rim|Under|Top|Ambient|Three-Point",
        "quality": "Hard|Soft|Diffused|Specular|Mixed",
        "colorTemp": "Warm|Cool|Neutral|Mixed|Golden Hour|Blue Hour|Tungsten|Daylight",
        "practicals": ["Neon", "Window Light", "Screen Glow", etc. or empty array]
    },

    "lens": {
        "type": "Spherical|Anamorphic|Fisheye|Tilt-Shift|Macro",
        "depthOfField": "Shallow DOF|Deep Focus|Selective Focus|Moderate",
        "bokeh": "Circular|Oval|Anamorphic Streaks|None visible",
        "focalLengthFeel": "Wide (14-24mm)|Normal (35-50mm)|Telephoto (85-200mm)|Extreme Telephoto",
        "opticalEffects": ["Lens Flare", "Chromatic Aberration", "Vignette", etc. or empty array]
    },

    "composition": {
        "technique": "Rule of Thirds|Golden Ratio|Centered|Symmetrical|Asymmetrical|Dynamic",
        "leadingLines": true/false,
        "negativeSpace": "Minimal|Balanced|Heavy",
        "layering": "Strong FG/BG|Moderate|Flat"
    },

    "colorGrade": {
        "palette": "Teal & Orange|Pastel|Monochrome|High Contrast|Natural|Neon|Vintage",
        "saturation": "Desaturated|Natural|Vibrant|Hyper-saturated",
        "contrast": "Low|Normal|High|Crushed Blacks"
    },

    "colors": ["dominant colors with common names"],
    "mood": "Dramatic|Peaceful|Energetic|Mysterious|Melancholic|Tense|Ethereal|Intimate",
    "style": "Photorealistic|Anime|Oil Painting|3D Render|Cinematic|Documentary|Fashion|Fine Art",
    "setting": "environment description",
    "actions": ["what's happening in the frame"]
}

SHOT SIZE GUIDE:
- ECU (Extreme Close-Up): Only eyes/mouth visible
- CU (Close-Up): Face fills frame
- MCU (Medium Close-Up): Head and shoulders
- MS (Medium Shot): Waist up
- MWS (Medium Wide Shot): Knees up
- WS (Wide Shot): Full body with environment
- EWS (Extreme Wide Shot): Landscape/establishing shot

Return ONLY valid JSON, no markdown formatting or explanation.`;

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
                // Fallback: Create minimal description with proper structure
                visualDescription = {
                    description: response.substring(0, 500),
                    subjects: [],
                    objects: [],
                    framing: {
                        shotSize: 'Unknown',
                        cameraAngle: 'Eye Level',
                        cameraMovement: 'Static'
                    },
                    lighting: {
                        style: 'Natural',
                        direction: 'Ambient',
                        quality: 'Mixed',
                        colorTemp: 'Neutral',
                        practicals: []
                    },
                    lens: {
                        type: 'Spherical',
                        depthOfField: 'Moderate',
                        bokeh: 'None visible',
                        focalLengthFeel: 'Normal (35-50mm)',
                        opticalEffects: []
                    },
                    composition: {
                        technique: 'Centered',
                        leadingLines: false,
                        negativeSpace: 'Balanced',
                        layering: 'Flat'
                    },
                    colors: [],
                    mood: '',
                    style: '',
                    setting: '',
                    actions: [],
                    colorGrade: {
                        palette: 'Natural',
                        saturation: 'Natural',
                        contrast: 'Normal'
                    }
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

            // Score results with cinematic terminology bonuses
            // IMPORTANT: Parse outputs from JSON string to array for frontend compatibility
            const scoredResults = validGenerations.map(gen => {
                let score = 0;
                const searchableText = `${gen.visualDescription || ''} ${gen.inputPrompt}`.toLowerCase();

                // Cinematic terminology bonus weights
                const CINEMATIC_TERMS: Record<string, number> = {
                    // Shot sizes (high value - very specific)
                    'ecu': 5, 'extreme close-up': 5, 'extreme close up': 5,
                    'cu': 4, 'close-up': 4, 'close up': 4, 'closeup': 4,
                    'mcu': 4, 'medium close-up': 4, 'medium close up': 4,
                    'ms': 3, 'medium shot': 3,
                    'mws': 3, 'medium wide': 3,
                    'ws': 3, 'wide shot': 3, 'wide': 2,
                    'ews': 4, 'extreme wide': 4, 'establishing': 3,

                    // Lighting styles (high value)
                    'low-key': 5, 'low key': 5, 'lowkey': 5,
                    'high-key': 5, 'high key': 5, 'highkey': 5,
                    'chiaroscuro': 6, 'rembrandt': 5, 'silhouette': 4,
                    'rim-lit': 4, 'rim light': 4, 'rimlight': 4,
                    'backlit': 3, 'front-lit': 3,

                    // Lens/optics (high value)
                    'anamorphic': 6, 'spherical': 3,
                    'shallow dof': 5, 'shallow depth': 5, 'bokeh': 4,
                    'deep focus': 4, 'lens flare': 3, 'vignette': 2,

                    // Camera angles
                    'dutch': 4, 'dutch angle': 4,
                    'low angle': 3, 'high angle': 3,
                    'bird\'s eye': 4, 'worm\'s eye': 4,

                    // Color/mood terms
                    'teal': 2, 'orange': 2, 'neon': 3,
                    'golden hour': 4, 'blue hour': 4,
                    'moody': 3, 'dramatic': 2, 'ethereal': 3
                };

                for (const term of searchTerms) {
                    if (searchableText.includes(term)) {
                        score += 1;

                        // Check for cinematic terminology bonus
                        const cinematicBonus = CINEMATIC_TERMS[term] || 0;
                        score += cinematicBonus;

                        // Bonus for exact word match
                        const regex = new RegExp(`\\b${term}\\b`, 'i');
                        if (regex.test(searchableText)) {
                            score += 0.5;
                        }
                    }
                }

                // Also check for multi-word cinematic terms
                for (const [cinematicTerm, bonus] of Object.entries(CINEMATIC_TERMS)) {
                    if (cinematicTerm.includes(' ') && searchableText.includes(cinematicTerm)) {
                        score += bonus;
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
    async getIndexStats(projectId: string): Promise<{ total: number; indexed: number; pending: number; failed: number }> {
        const [total, indexed, failed] = await Promise.all([
            prisma.generation.count({
                where: { projectId, status: 'succeeded' }
            }),
            prisma.generation.count({
                where: { projectId, status: 'succeeded', indexStatus: 'indexed' }
            }),
            prisma.generation.count({
                where: { projectId, status: 'succeeded', indexStatus: 'failed' }
            })
        ]);

        return {
            total,
            indexed,
            pending: total - indexed - failed,
            failed
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
     * Runs both semantic indexing (Grok Vision) and vector embedding (CLIP) in parallel
     */
    async autoIndex(generationId: string): Promise<void> {
        // Don't block - run both indexing operations in background

        // 1. Semantic indexing with Grok Vision (for text-based search)
        this.indexGeneration(generationId).catch(err => {
            console.error(`[SemanticIndex] Auto-index failed for ${generationId}:`, err);
        });

        // 2. CLIP vector embedding (for visual similarity search)
        const vectorService = VectorEmbeddingService.getInstance();
        vectorService.embedGeneration(generationId).catch(err => {
            console.error(`[VectorEmbedding] Auto-embed failed for ${generationId}:`, err);
        });
    }

    /**
     * Get smart suggestion pills based on aggregated indexed content
     * These are the most common terms in the project's indexed generations
     */
    async getSuggestionPills(projectId: string): Promise<Array<{ label: string; category: string; count: number }>> {
        try {
            // Get all indexed generations for this project
            const indexed = await prisma.generation.findMany({
                where: {
                    projectId,
                    status: 'succeeded',
                    indexedAt: { not: null },
                    visualDescription: { not: null }
                },
                select: { visualDescription: true }
            });

            // Aggregate terms from visual descriptions
            const termCounts: Record<string, { count: number; category: string }> = {};

            for (const gen of indexed) {
                if (!gen.visualDescription) continue;

                try {
                    const desc = JSON.parse(gen.visualDescription);

                    // Extract framing terms
                    if (desc.framing?.shotSize) {
                        const key = desc.framing.shotSize;
                        termCounts[key] = termCounts[key] || { count: 0, category: 'framing' };
                        termCounts[key].count++;
                    }

                    // Extract lighting style
                    if (desc.lighting?.style) {
                        const key = desc.lighting.style;
                        termCounts[key] = termCounts[key] || { count: 0, category: 'lighting' };
                        termCounts[key].count++;
                    }

                    // Extract lens type
                    if (desc.lens?.type) {
                        const key = desc.lens.type;
                        termCounts[key] = termCounts[key] || { count: 0, category: 'lens' };
                        termCounts[key].count++;
                    }

                    // Extract mood
                    if (desc.mood) {
                        const key = desc.mood;
                        termCounts[key] = termCounts[key] || { count: 0, category: 'mood' };
                        termCounts[key].count++;
                    }

                    // Extract color palette
                    if (desc.colorGrade?.palette) {
                        const key = desc.colorGrade.palette;
                        termCounts[key] = termCounts[key] || { count: 0, category: 'color' };
                        termCounts[key].count++;
                    }

                    // Extract subjects (top 2)
                    if (Array.isArray(desc.subjects)) {
                        for (const subject of desc.subjects.slice(0, 2)) {
                            termCounts[subject] = termCounts[subject] || { count: 0, category: 'subject' };
                            termCounts[subject].count++;
                        }
                    }
                } catch {
                    // Skip unparseable descriptions
                }
            }

            // Convert to array and sort by count
            const suggestions = Object.entries(termCounts)
                .map(([label, data]) => ({ label, ...data }))
                .filter(s => s.count >= 2) // Only show terms with 2+ occurrences
                .sort((a, b) => b.count - a.count)
                .slice(0, 12); // Top 12 suggestions

            return suggestions;
        } catch (error: any) {
            console.error('[SemanticIndex] getSuggestionPills error:', error.message);
            return [];
        }
    }

    /**
     * Find visually similar generations based on indexed metadata
     * This is a metadata-based similarity search (not vector embeddings)
     */
    async findSimilar(
        projectId: string,
        generationId: string,
        type: string = 'all'
    ): Promise<any[]> {
        try {
            // Get source generation's visual description
            const source = await prisma.generation.findUnique({
                where: { id: generationId },
                select: { visualDescription: true }
            });

            if (!source?.visualDescription) {
                return [];
            }

            const sourceDesc = JSON.parse(source.visualDescription);

            // Get all indexed generations for this project
            const candidates = await prisma.generation.findMany({
                where: {
                    projectId,
                    status: 'succeeded',
                    id: { not: generationId },
                    indexedAt: { not: null },
                    visualDescription: { not: null }
                }
            });

            // Score each candidate by similarity
            const scored = candidates.map(gen => {
                let score = 0;
                try {
                    const desc = JSON.parse(gen.visualDescription || '{}');

                    // Framing similarity
                    if (type === 'all' || type === 'framing') {
                        if (desc.framing?.shotSize === sourceDesc.framing?.shotSize) score += 5;
                        if (desc.framing?.cameraAngle === sourceDesc.framing?.cameraAngle) score += 3;
                    }

                    // Lighting similarity
                    if (type === 'all' || type === 'lighting') {
                        if (desc.lighting?.style === sourceDesc.lighting?.style) score += 5;
                        if (desc.lighting?.colorTemp === sourceDesc.lighting?.colorTemp) score += 3;
                        if (desc.lighting?.quality === sourceDesc.lighting?.quality) score += 2;
                    }

                    // Lens similarity
                    if (type === 'all' || type === 'lens') {
                        if (desc.lens?.type === sourceDesc.lens?.type) score += 4;
                        if (desc.lens?.depthOfField === sourceDesc.lens?.depthOfField) score += 3;
                    }

                    // Color similarity
                    if (type === 'all' || type === 'color') {
                        if (desc.colorGrade?.palette === sourceDesc.colorGrade?.palette) score += 4;
                        if (desc.mood === sourceDesc.mood) score += 2;
                    }

                    // Subject overlap
                    if (type === 'all') {
                        const sourceSubjects = new Set(sourceDesc.subjects || []);
                        const targetSubjects = desc.subjects || [];
                        for (const subj of targetSubjects) {
                            if (sourceSubjects.has(subj)) score += 2;
                        }
                    }
                } catch {
                    // Skip unparseable
                }

                // Parse outputs for return
                let parsedOutputs = [];
                try {
                    parsedOutputs = gen.outputs ? JSON.parse(gen.outputs) : [];
                } catch {
                    parsedOutputs = [];
                }

                return {
                    ...gen,
                    outputs: parsedOutputs,
                    similarityScore: score
                };
            });

            // Filter and sort by similarity
            return scored
                .filter(s => s.similarityScore >= 5)
                .sort((a, b) => b.similarityScore - a.similarityScore)
                .slice(0, 20);
        } catch (error: any) {
            console.error('[SemanticIndex] findSimilar error:', error.message);
            return [];
        }
    }

    /**
     * Search by visual REALITY - what the AI actually generated
     * Only searches the visualDescription field (Grok's analysis of the image)
     */
    async searchByReality(projectId: string, query: string, limit: number = 50): Promise<any[]> {
        try {
            const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
            if (searchTerms.length === 0) return [];

            const generations = await prisma.generation.findMany({
                where: {
                    projectId,
                    status: 'succeeded',
                    indexedAt: { not: null },
                    outputs: { not: null },
                    AND: searchTerms.map(term => ({
                        visualDescription: { contains: term }
                    }))
                },
                orderBy: { createdAt: 'desc' },
                take: limit
            });

            return generations
                .filter(gen => {
                    if (!gen.outputs) return false;
                    try {
                        const outputs = JSON.parse(gen.outputs);
                        return Array.isArray(outputs) && outputs.length > 0 && outputs[0]?.url;
                    } catch {
                        return false;
                    }
                })
                .map(gen => {
                    let parsedOutputs = [];
                    try {
                        parsedOutputs = gen.outputs ? JSON.parse(gen.outputs) : [];
                    } catch {
                        parsedOutputs = [];
                    }
                    return { ...gen, outputs: parsedOutputs };
                });
        } catch (error: any) {
            console.error('[SemanticIndex] searchByReality error:', error.message);
            return [];
        }
    }

    /**
     * Search by user INTENT - what the user prompted
     * Only searches the inputPrompt field (user's original prompt)
     */
    async searchByIntent(projectId: string, query: string, limit: number = 50): Promise<any[]> {
        try {
            const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
            if (searchTerms.length === 0) return [];

            const generations = await prisma.generation.findMany({
                where: {
                    projectId,
                    status: 'succeeded',
                    outputs: { not: null },
                    AND: searchTerms.map(term => ({
                        inputPrompt: { contains: term }
                    }))
                },
                orderBy: { createdAt: 'desc' },
                take: limit
            });

            return generations
                .filter(gen => {
                    if (!gen.outputs) return false;
                    try {
                        const outputs = JSON.parse(gen.outputs);
                        return Array.isArray(outputs) && outputs.length > 0 && outputs[0]?.url;
                    } catch {
                        return false;
                    }
                })
                .map(gen => {
                    let parsedOutputs = [];
                    try {
                        parsedOutputs = gen.outputs ? JSON.parse(gen.outputs) : [];
                    } catch {
                        parsedOutputs = [];
                    }
                    return { ...gen, outputs: parsedOutputs };
                });
        } catch (error: any) {
            console.error('[SemanticIndex] searchByIntent error:', error.message);
            return [];
        }
    }
}
