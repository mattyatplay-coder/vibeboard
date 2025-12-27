/**
 * SemanticIndexService - Visual Librarian / Media Asset Manager
 *
 * Indexes generation images using Grok Vision with CINEMATIC terminology
 * to enable professional filmmaker-style search queries.
 *
 * Phase 1 Features:
 * - Cinematic Prompt Injection (CU, WS, ECU, Chiaroscuro, Rim-lit, Anamorphic)
 * - Re-indexing safety (prevent double-spending on already-indexed images)
 * - Error state persistence (track failed indexing attempts)
 * - Non-blocking background worker
 *
 * Search Examples:
 * - "extreme close up neon blue shallow depth of field"
 * - "wide shot golden hour silhouette"
 * - "anamorphic lens flare moody"
 * - "chiaroscuro portrait dramatic shadows"
 */

import { PrismaClient } from '@prisma/client';
import { GrokAdapter } from '../llm/GrokAdapter';
import { frameExtractor } from '../FrameExtractor';
import sharp from 'sharp';
import * as fal from '@fal-ai/serverless-client';
import fetch from 'node-fetch';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Configure fal client for image upload
fal.config({
    credentials: process.env.FAL_KEY,
});

// Video file extensions
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];

// Max image size for Grok Vision (25MB)
const MAX_IMAGE_SIZE_BYTES = 25 * 1024 * 1024;

// Index status constants
export const INDEX_STATUS = {
    PENDING: 'pending',      // Never indexed
    INDEXED: 'indexed',      // Successfully indexed
    FAILED: 'failed',        // Indexing failed (with error stored)
    SKIPPED: 'skipped',      // Manually skipped (e.g., no valid output)
} as const;

export type IndexStatus = typeof INDEX_STATUS[keyof typeof INDEX_STATUS];

/**
 * Enhanced VisualDescription with cinematic terminology
 */
export interface VisualDescription {
    // Core description
    description: string;            // 2-3 sentence natural language description

    // Subject & Object Analysis
    subjects: string[];             // Main subjects: "woman", "man", "turtle", "surfer"
    objects: string[];              // Objects present: "surfboard", "umbrella", "neon sign"
    actions: string[];              // What's happening: "surfing", "paddling", "tube riding"

    // === CINEMATIC FRAMING (Professional Terminology) ===
    framing: {
        shotType: string;           // ECU, CU, MCU, MS, MWS, WS, EWS, Aerial, POV
        shotTypeExpanded: string;   // "Extreme Close-Up", "Wide Shot", etc.
        cameraAngle: string;        // Eye Level, Low Angle, High Angle, Dutch, Bird's Eye, Worm's Eye
        cameraMovement?: string;    // Static, Tracking, Dolly, Crane, Handheld, Steadicam
    };

    // === CINEMATIC LIGHTING (Professional Terminology) ===
    lighting: {
        style: string;              // Chiaroscuro, High-Key, Low-Key, Flat, Motivated, Practical
        direction: string;          // Front-lit, Side-lit, Back-lit, Rim-lit, Top-lit
        quality: string;            // Hard, Soft, Diffused, Specular
        source?: string;            // Natural, Artificial, Mixed, Neon, Golden Hour, Blue Hour
        colorTemp?: string;         // Warm, Cool, Neutral, Mixed
    };

    // === LENS & OPTICAL CHARACTERISTICS ===
    lens: {
        type?: string;              // Anamorphic, Spherical, Vintage, Modern
        focalLength?: string;       // Wide (14-24mm), Normal (35-50mm), Telephoto (85mm+)
        depthOfField: string;       // Shallow, Deep, Selective
        bokeh?: string;             // Circular, Anamorphic (oval), Swirly
        opticalEffects?: string[];  // Lens flare, Chromatic aberration, Vignette, Distortion
    };

    // === COMPOSITION & VISUAL DESIGN ===
    composition: {
        technique: string;          // Rule of Thirds, Centered, Symmetrical, Leading Lines, Frame within Frame
        balance: string;            // Balanced, Dynamic, Asymmetric
        negativeSpace?: string;     // Heavy, Minimal, Balanced
    };

    // === COLOR & MOOD ===
    colors: string[];               // Dominant colors: "red", "blue", "warm tones", "monochrome"
    colorGrade?: string;            // Teal-Orange, Bleach Bypass, Cross-Process, Natural
    mood: string;                   // Emotional tone: "dramatic", "peaceful", "ominous", "ethereal"

    // === STYLE & SETTING ===
    style: string;                  // Art style: "photorealistic", "anime", "cinematic", "3D render"
    setting: string;                // Environment: "beach", "underwater", "urban", "studio"

    // === TECHNICAL ASPECTS ===
    technical?: {
        aspectRatio?: string;       // 16:9, 21:9 (Anamorphic), 4:3, 1:1
        filmStock?: string;         // Digital, 35mm, 65mm, IMAX, Kodak, Fuji
        grain?: string;             // Clean, Light grain, Heavy grain
    };
}

/**
 * The CINEMATIC PROMPT for Grok Vision
 * Designed to extract professional filmmaker terminology
 */
const CINEMATIC_EXTRACTION_PROMPT = `You are a professional cinematographer and director of photography (DP) analyzing this image for a Media Asset Manager database.

Extract visual metadata using PRECISE CINEMATIC TERMINOLOGY as used on professional film sets.

Return a JSON object with this EXACT structure:
{
    "description": "2-3 sentence description focusing on composition, lighting, and mood",

    "subjects": ["main subjects - people, animals, vehicles"],
    "objects": ["notable props and objects in frame"],
    "actions": ["what is happening - verbs like 'surfing', 'walking', 'posing'"],

    "framing": {
        "shotType": "Use ABBREVIATIONS: ECU (Extreme Close-Up), CU (Close-Up), MCU (Medium Close-Up), MS (Medium Shot), MWS (Medium Wide Shot), WS (Wide Shot), EWS (Extreme Wide Shot), POV (Point of View), OTS (Over the Shoulder), INSERT, Aerial, Establishing",
        "shotTypeExpanded": "Full name of the shot type",
        "cameraAngle": "Eye Level, Low Angle, High Angle, Dutch/Canted, Bird's Eye, Worm's Eye",
        "cameraMovement": "Static, Tracking, Dolly-in, Dolly-out, Crane, Pan, Tilt, Handheld, Steadicam, Drone"
    },

    "lighting": {
        "style": "Chiaroscuro, High-Key, Low-Key, Flat, Motivated, Practical, Natural, Silhouette, Split",
        "direction": "Front-lit, Side-lit, Back-lit, Rim-lit, Top-lit, Under-lit, Three-Point",
        "quality": "Hard, Soft, Diffused, Specular, Bounced",
        "source": "Natural/Daylight, Artificial/Tungsten, Neon, LED, Firelight, Golden Hour, Blue Hour, Overcast, Night",
        "colorTemp": "Warm (3200K), Cool (5600K+), Neutral, Mixed"
    },

    "lens": {
        "type": "Anamorphic, Spherical, Vintage (soft, lower contrast), Modern (sharp, clinical)",
        "focalLength": "Ultra-Wide (14-20mm), Wide (24-35mm), Normal (40-60mm), Short Tele (85-105mm), Telephoto (135mm+), Macro",
        "depthOfField": "Shallow (soft background), Deep (everything sharp), Selective (specific focus plane)",
        "bokeh": "Circular, Anamorphic/Oval, Swirly, Creamy, Busy",
        "opticalEffects": ["lens flare", "chromatic aberration", "vignette", "barrel distortion", "bloom", "halation"]
    },

    "composition": {
        "technique": "Rule of Thirds, Golden Ratio, Centered, Symmetrical, Leading Lines, Frame within Frame, Diagonal, Triangle",
        "balance": "Balanced, Dynamic/Unbalanced, Asymmetric, Tension",
        "negativeSpace": "Heavy, Minimal, Balanced, None"
    },

    "colors": ["list dominant colors: 'deep red', 'neon blue', 'warm tones', 'monochrome', 'teal-orange'"],
    "colorGrade": "Natural, Teal-Orange (blockbuster), Bleach Bypass (desaturated), Cross-Process, Sepia, B&W, Pastel",
    "mood": "dramatic, peaceful, ominous, ethereal, nostalgic, gritty, romantic, tense, melancholic, euphoric, mysterious",

    "style": "Photorealistic, Cinematic, Anime, 3D Render, Oil Painting, Digital Art, Film Photography",
    "setting": "environment description: 'Hawaiian beach at sunrise', 'dark urban alley', 'underwater reef'",

    "technical": {
        "aspectRatio": "16:9, 2.39:1 (Anamorphic/Scope), 1.85:1, 4:3, 1:1 (Square), 9:16 (Vertical)",
        "filmStock": "Digital Clean, Digital Filmic, 35mm, 65mm/IMAX, Super 8, Kodak Vision3, Fuji",
        "grain": "Clean/No Grain, Light Grain, Heavy Grain, Digital Noise"
    }
}

IMPORTANT:
- Use EXACT abbreviations for shot types (ECU, CU, MCU, MS, WS, EWS)
- Identify lighting with professional terms (Chiaroscuro, Rim-lit, Motivated)
- Note any Anamorphic characteristics (oval bokeh, horizontal flares)
- Describe depth of field precisely (shallow, deep, selective)
- Return ONLY valid JSON, no markdown formatting or extra text`;

export class SemanticIndexService {
    private static instance: SemanticIndexService;
    private grok: GrokAdapter;
    private isIndexing: boolean = false;
    private indexQueue: string[] = [];

    private constructor() {
        this.grok = new GrokAdapter();
    }

    /**
     * Check if a URL points to a video file
     */
    private isVideoUrl(url: string): boolean {
        const urlLower = url.toLowerCase();
        return VIDEO_EXTENSIONS.some(ext => urlLower.includes(ext));
    }

    /**
     * Get an indexable image URL from any media URL
     * - For videos: extracts middle frame (best representation of content)
     * - For large images: compresses and re-uploads
     * - For normal images: returns original URL
     */
    private async getIndexableImageUrl(mediaUrl: string): Promise<string> {
        // Check if it's a video - extract middle frame for best content representation
        if (this.isVideoUrl(mediaUrl)) {
            console.log(`[SemanticIndex] Video detected, extracting middle frame...`);
            try {
                const frame = await frameExtractor.extractFrame({
                    videoUrl: mediaUrl,
                    framePosition: 'middle', // Middle frame shows main action, avoids fade-ins
                    outputFormat: 'jpg', // Use JPEG for smaller size
                });
                console.log(`[SemanticIndex] Extracted frame: ${frame.url}`);
                return frame.url;
            } catch (frameError: any) {
                console.error(`[SemanticIndex] Frame extraction failed:`, frameError.message);
                throw new Error(`Cannot index video: frame extraction failed - ${frameError.message}`);
            }
        }

        // For images, check size and compress if needed
        try {
            // Fetch image to check size
            const response = await fetch(mediaUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status}`);
            }

            const contentLength = response.headers.get('content-length');
            const contentType = response.headers.get('content-type') || '';

            // Check if content type is supported
            const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!supportedTypes.some(type => contentType.includes(type))) {
                // Might be a video with wrong extension - try frame extraction
                if (contentType.includes('video')) {
                    console.log(`[SemanticIndex] Video content-type detected, extracting middle frame...`);
                    const frame = await frameExtractor.extractFrame({
                        videoUrl: mediaUrl,
                        framePosition: 'middle', // Middle frame shows main action
                        outputFormat: 'jpg',
                    });
                    return frame.url;
                }
                throw new Error(`Unsupported content type: ${contentType}`);
            }

            const imageSize = contentLength ? parseInt(contentLength, 10) : 0;

            // If image is small enough, return original URL
            if (imageSize > 0 && imageSize < MAX_IMAGE_SIZE_BYTES) {
                return mediaUrl;
            }

            // Image is too large or size unknown - compress it
            console.log(`[SemanticIndex] Image too large (${Math.round(imageSize / 1024 / 1024)}MB), compressing...`);

            const buffer = await response.buffer();

            // Compress with sharp - resize to max 2048px and convert to JPEG
            const compressedBuffer = await sharp(buffer)
                .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 85 })
                .toBuffer();

            console.log(`[SemanticIndex] Compressed from ${Math.round(buffer.length / 1024)}KB to ${Math.round(compressedBuffer.length / 1024)}KB`);

            // Upload compressed image to Fal storage
            // Convert Buffer to Uint8Array for Blob compatibility
            const uint8Array = new Uint8Array(compressedBuffer);
            const blob = new Blob([uint8Array], { type: 'image/jpeg' });
            const uploadedUrl = await fal.storage.upload(blob as any);

            return uploadedUrl;

        } catch (error: any) {
            // If we can't check/compress, try the original URL anyway
            console.warn(`[SemanticIndex] Could not verify/compress image: ${error.message}, trying original URL`);
            return mediaUrl;
        }
    }

    static getInstance(): SemanticIndexService {
        if (!SemanticIndexService.instance) {
            SemanticIndexService.instance = new SemanticIndexService();
        }
        return SemanticIndexService.instance;
    }

    /**
     * Check if a generation should be indexed
     * Prevents double-spending by checking indexStatus
     */
    async shouldIndex(generationId: string): Promise<{ shouldIndex: boolean; reason: string }> {
        const generation = await prisma.generation.findUnique({
            where: { id: generationId },
            select: {
                status: true,
                outputs: true,
                indexStatus: true,
                indexedAt: true,
                indexError: true,
            }
        });

        if (!generation) {
            return { shouldIndex: false, reason: 'Generation not found' };
        }

        if (generation.status !== 'succeeded') {
            return { shouldIndex: false, reason: `Generation status is ${generation.status}, not succeeded` };
        }

        if (!generation.outputs || generation.outputs === '[]' || generation.outputs === 'null') {
            return { shouldIndex: false, reason: 'No valid outputs' };
        }

        // Check index status
        const indexStatus = generation.indexStatus || INDEX_STATUS.PENDING;

        if (indexStatus === INDEX_STATUS.INDEXED) {
            return { shouldIndex: false, reason: 'Already indexed' };
        }

        if (indexStatus === INDEX_STATUS.SKIPPED) {
            return { shouldIndex: false, reason: 'Manually skipped' };
        }

        // Allow re-indexing of failed items (user might want to retry)
        if (indexStatus === INDEX_STATUS.FAILED) {
            return { shouldIndex: true, reason: 'Retrying failed indexing' };
        }

        return { shouldIndex: true, reason: 'Pending indexing' };
    }

    /**
     * Index a single generation's images using Grok Vision with CINEMATIC terminology
     *
     * @param generationId - The generation ID to index
     * @param force - If true, re-index even if already indexed (use sparingly!)
     */
    async indexGeneration(generationId: string, force: boolean = false): Promise<VisualDescription | null> {
        try {
            // Check if we should index (prevents double-spending)
            if (!force) {
                const { shouldIndex, reason } = await this.shouldIndex(generationId);
                if (!shouldIndex) {
                    console.log(`[SemanticIndex] Skipping ${generationId}: ${reason}`);
                    return null;
                }
            }

            const generation = await prisma.generation.findUnique({
                where: { id: generationId }
            });

            if (!generation || !generation.outputs) {
                await this.markIndexFailed(generationId, 'No outputs found');
                return null;
            }

            const outputs = JSON.parse(generation.outputs);
            if (!outputs || outputs.length === 0) {
                await this.markIndexFailed(generationId, 'Empty outputs array');
                return null;
            }

            // Get the first image URL (or primary output)
            const primaryOutput = outputs[0];
            const mediaUrl = primaryOutput.url || primaryOutput.thumbnail_url;

            if (!mediaUrl) {
                await this.markIndexFailed(generationId, 'No media URL in outputs');
                return null;
            }

            console.log(`[SemanticIndex] Indexing ${generationId} with CINEMATIC analysis...`);

            // Get an indexable image URL (handles videos, large images, etc.)
            let imageUrl: string;
            try {
                imageUrl = await this.getIndexableImageUrl(mediaUrl);
            } catch (prepError: any) {
                await this.markIndexFailed(generationId, `Media preparation failed: ${prepError.message}`);
                return null;
            }

            // Call Grok Vision with the cinematic prompt
            const response = await this.grok.analyzeImage([imageUrl], CINEMATIC_EXTRACTION_PROMPT);

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
                console.error(`[SemanticIndex] Failed to parse Grok response:`, response.substring(0, 300));
                await this.markIndexFailed(generationId, `JSON parse error: ${(parseError as Error).message}`);
                return null;
            }

            // Store in database with indexed status
            await prisma.generation.update({
                where: { id: generationId },
                data: {
                    visualDescription: JSON.stringify(visualDescription),
                    indexedAt: new Date(),
                    indexStatus: INDEX_STATUS.INDEXED,
                    indexError: null, // Clear any previous error
                }
            });

            console.log(`[SemanticIndex] Successfully indexed ${generationId} - Shot: ${visualDescription.framing?.shotType || 'N/A'}, Lighting: ${visualDescription.lighting?.style || 'N/A'}`);
            return visualDescription;

        } catch (error: any) {
            console.error(`[SemanticIndex] Error indexing ${generationId}:`, error.message);
            await this.markIndexFailed(generationId, error.message);
            return null;
        }
    }

    /**
     * Mark a generation as failed to index (with error message)
     */
    private async markIndexFailed(generationId: string, errorMessage: string): Promise<void> {
        try {
            await prisma.generation.update({
                where: { id: generationId },
                data: {
                    indexStatus: INDEX_STATUS.FAILED,
                    indexError: errorMessage,
                }
            });
            console.log(`[SemanticIndex] Marked ${generationId} as FAILED: ${errorMessage}`);
        } catch (err) {
            console.error(`[SemanticIndex] Failed to update index status for ${generationId}:`, err);
        }
    }

    /**
     * Mark a generation as skipped (e.g., user decided not to index)
     */
    async markSkipped(generationId: string): Promise<void> {
        await prisma.generation.update({
            where: { id: generationId },
            data: {
                indexStatus: INDEX_STATUS.SKIPPED,
            }
        });
    }

    /**
     * Reset a generation's index status to pending (for retry)
     */
    async resetIndexStatus(generationId: string): Promise<void> {
        await prisma.generation.update({
            where: { id: generationId },
            data: {
                indexStatus: INDEX_STATUS.PENDING,
                indexedAt: null,
                visualDescription: null,
                indexError: null,
            }
        });
    }

    /**
     * Search generations using natural language query with CINEMATIC terminology support
     *
     * Supports queries like:
     * - "ECU shallow depth of field" (uses shot type abbreviation)
     * - "extreme close up" (full name, will match)
     * - "chiaroscuro rim lit" (lighting terms)
     * - "anamorphic lens flare" (lens characteristics)
     * - "wide shot golden hour silhouette"
     *
     * @param mode - Search mode:
     *   - 'reality': Only search visualDescription (what AI saw/generated)
     *   - 'intent': Only search inputPrompt (what user prompted)
     *   - 'both': Search both fields (default)
     */
    async search(projectId: string, query: string, limit: number = 50, mode: string = 'both'): Promise<any[]> {
        try {
            // Normalize query for SQLite LIKE search
            const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);

            if (searchTerms.length === 0) {
                return [];
            }

            // Build OR conditions based on search mode
            const searchConditions: any[] = [];

            if (mode === 'reality' || mode === 'both') {
                // Search in visual description (what was actually generated)
                searchConditions.push(
                    ...searchTerms.map(term => ({
                        visualDescription: { contains: term }
                    }))
                );
            }

            if (mode === 'intent' || mode === 'both') {
                // Search in the original prompt (what user intended)
                searchConditions.push(
                    ...searchTerms.map(term => ({
                        inputPrompt: { contains: term }
                    }))
                );
            }

            // Build WHERE clause for SQLite text search
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
                            OR: searchConditions
                        }
                    ]
                },
                orderBy: { createdAt: 'desc' },
                take: limit * 2 // Fetch extra for post-filtering
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

            // Score results by how many terms match and their specificity
            // Respect mode when building searchable text
            const scoredResults = validGenerations.map(gen => {
                let score = 0;

                // Build searchable text based on mode
                let searchableText = '';
                if (mode === 'reality' || mode === 'both') {
                    searchableText += (gen.visualDescription || '') + ' ';
                }
                if (mode === 'intent' || mode === 'both') {
                    searchableText += (gen.inputPrompt || '');
                }
                searchableText = searchableText.toLowerCase();

                for (const term of searchTerms) {
                    if (searchableText.includes(term)) {
                        score += 1;

                        // Bonus for exact word match
                        const regex = new RegExp(`\\b${term}\\b`, 'i');
                        if (regex.test(searchableText)) {
                            score += 0.5;
                        }

                        // Extra bonus for cinematic terminology matches (especially relevant for 'reality' mode)
                        const cinematicTerms = [
                            'ecu', 'cu', 'mcu', 'ms', 'mws', 'ws', 'ews', 'pov', 'ots',
                            'chiaroscuro', 'rim-lit', 'backlit', 'silhouette',
                            'anamorphic', 'spherical', 'shallow', 'deep',
                            'bokeh', 'lens flare', 'chromatic',
                            'high-key', 'low-key', 'golden hour', 'blue hour'
                        ];
                        if (cinematicTerms.some(ct => term.includes(ct) || ct.includes(term))) {
                            score += 1; // Extra point for cinematic terms
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

                // Parse visualDescription for enhanced display
                let parsedVisualDesc = null;
                try {
                    parsedVisualDesc = gen.visualDescription ? JSON.parse(gen.visualDescription) : null;
                } catch {
                    parsedVisualDesc = null;
                }

                return {
                    ...gen,
                    outputs: parsedOutputs,           // Replace string with parsed array
                    parsedVisualDescription: parsedVisualDesc, // Include parsed visual data
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

            return scoredResults.slice(0, limit);

        } catch (error: any) {
            console.error(`[SemanticIndex] Search error:`, error.message);
            return [];
        }
    }

    /**
     * Find similar images by composition (framing, camera angle, balance)
     */
    async findSimilarComposition(generationId: string, projectId: string, limit: number = 20): Promise<any[]> {
        const source = await prisma.generation.findUnique({
            where: { id: generationId },
            select: { visualDescription: true }
        });

        if (!source?.visualDescription) {
            return [];
        }

        try {
            const desc = JSON.parse(source.visualDescription) as VisualDescription;
            const searchTerms: string[] = [];

            // Extract composition-related terms
            if (desc.framing?.shotType) searchTerms.push(desc.framing.shotType.toLowerCase());
            if (desc.framing?.cameraAngle) searchTerms.push(desc.framing.cameraAngle.toLowerCase());
            if (desc.composition?.technique) searchTerms.push(desc.composition.technique.toLowerCase());
            if (desc.lens?.depthOfField) searchTerms.push(desc.lens.depthOfField.toLowerCase());

            if (searchTerms.length === 0) {
                return [];
            }

            // Search using composition terms
            const query = searchTerms.join(' ');
            const results = await this.search(projectId, query, limit + 1);

            // Filter out the source image
            return results.filter(r => r.id !== generationId).slice(0, limit);

        } catch (err) {
            console.error('[SemanticIndex] findSimilarComposition error:', err);
            return [];
        }
    }

    /**
     * Find similar images by lighting (style, direction, quality)
     */
    async findSimilarLighting(generationId: string, projectId: string, limit: number = 20): Promise<any[]> {
        const source = await prisma.generation.findUnique({
            where: { id: generationId },
            select: { visualDescription: true }
        });

        if (!source?.visualDescription) {
            return [];
        }

        try {
            const desc = JSON.parse(source.visualDescription) as VisualDescription;
            const searchTerms: string[] = [];

            // Extract lighting-related terms
            if (desc.lighting?.style) searchTerms.push(desc.lighting.style.toLowerCase());
            if (desc.lighting?.direction) searchTerms.push(desc.lighting.direction.toLowerCase());
            if (desc.lighting?.source) searchTerms.push(desc.lighting.source.toLowerCase());
            if (desc.mood) searchTerms.push(desc.mood.toLowerCase());

            if (searchTerms.length === 0) {
                return [];
            }

            // Search using lighting terms
            const query = searchTerms.join(' ');
            const results = await this.search(projectId, query, limit + 1);

            // Filter out the source image
            return results.filter(r => r.id !== generationId).slice(0, limit);

        } catch (err) {
            console.error('[SemanticIndex] findSimilarLighting error:', err);
            return [];
        }
    }

    /**
     * Get indexing stats for a project (enhanced with status breakdown)
     */
    async getIndexStats(projectId: string): Promise<{
        total: number;
        indexed: number;
        pending: number;
        failed: number;
        skipped: number;
    }> {
        const [total, indexed, failed, skipped] = await Promise.all([
            prisma.generation.count({
                where: { projectId, status: 'succeeded' }
            }),
            prisma.generation.count({
                where: { projectId, status: 'succeeded', indexStatus: INDEX_STATUS.INDEXED }
            }),
            prisma.generation.count({
                where: { projectId, status: 'succeeded', indexStatus: INDEX_STATUS.FAILED }
            }),
            prisma.generation.count({
                where: { projectId, status: 'succeeded', indexStatus: INDEX_STATUS.SKIPPED }
            })
        ]);

        return {
            total,
            indexed,
            pending: total - indexed - failed - skipped,
            failed,
            skipped,
        };
    }

    /**
     * Batch index unindexed generations (respects indexStatus)
     */
    async batchIndex(projectId: string, batchSize: number = 10): Promise<{ processed: number; errors: number; skipped: number }> {
        if (this.isIndexing) {
            console.log('[SemanticIndex] Batch indexing already in progress');
            return { processed: 0, errors: 0, skipped: 0 };
        }

        this.isIndexing = true;
        let processed = 0;
        let errors = 0;
        let skipped = 0;

        try {
            // Find unindexed generations (pending status only, not failed/skipped)
            const unindexed = await prisma.generation.findMany({
                where: {
                    projectId,
                    status: 'succeeded',
                    outputs: { not: null },
                    indexStatus: INDEX_STATUS.PENDING, // Default value for new/legacy records
                },
                take: batchSize,
                orderBy: { createdAt: 'desc' }
            });

            console.log(`[SemanticIndex] Found ${unindexed.length} pending generations to index`);

            for (const gen of unindexed) {
                try {
                    const result = await this.indexGeneration(gen.id);
                    if (result) {
                        processed++;
                    } else {
                        skipped++;
                    }
                    // Delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (err) {
                    errors++;
                    console.error(`[SemanticIndex] Failed to index ${gen.id}:`, err);
                }
            }

            console.log(`[SemanticIndex] Batch complete: ${processed} indexed, ${errors} errors, ${skipped} skipped`);

        } finally {
            this.isIndexing = false;
        }

        return { processed, errors, skipped };
    }

    /**
     * Retry all failed indexing attempts
     */
    async retryFailed(projectId: string, batchSize: number = 10): Promise<{ processed: number; errors: number }> {
        const failed = await prisma.generation.findMany({
            where: {
                projectId,
                status: 'succeeded',
                indexStatus: INDEX_STATUS.FAILED,
            },
            take: batchSize,
            orderBy: { updatedAt: 'desc' }
        });

        console.log(`[SemanticIndex] Retrying ${failed.length} failed generations`);

        let processed = 0;
        let errors = 0;

        for (const gen of failed) {
            try {
                // Reset status first
                await this.resetIndexStatus(gen.id);
                // Then try to index
                const result = await this.indexGeneration(gen.id);
                if (result) {
                    processed++;
                } else {
                    errors++;
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (err) {
                errors++;
            }
        }

        return { processed, errors };
    }

    /**
     * Auto-index a generation after it completes (hook for GenerationService)
     * Non-blocking background worker
     */
    async autoIndex(generationId: string): Promise<void> {
        // Don't block - run indexing in background
        this.indexGeneration(generationId).catch(err => {
            console.error(`[SemanticIndex] Auto-index failed for ${generationId}:`, err);
        });
    }

    /**
     * Get suggested search pills based on indexed content
     * Returns common cinematic terms found in the project
     */
    async getSearchSuggestions(projectId: string): Promise<string[]> {
        // Default cinematic suggestions that work across projects
        const defaultSuggestions = [
            'close-up', 'wide shot', 'shallow depth',
            'golden hour', 'silhouette', 'rim-lit',
            'anamorphic', 'chiaroscuro', 'high contrast',
            'moody', 'dramatic', 'soft lighting'
        ];

        // TODO: Analyze project's indexed content to generate project-specific suggestions
        // For now, return defaults
        return defaultSuggestions;
    }
}
