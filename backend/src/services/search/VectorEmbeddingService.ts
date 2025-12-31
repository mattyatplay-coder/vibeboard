/**
 * VectorEmbeddingService
 *
 * Generates CLIP embeddings for images using Replicate's clip-features model.
 * Provides vector similarity search using cosine similarity.
 *
 * Architecture:
 * - Embeddings are stored as JSON arrays in SQLite (no pgvector needed)
 * - Similarity search loads embeddings and computes cosine similarity in-memory
 * - For large datasets (10k+), consider migrating to PostgreSQL + pgvector
 *
 * Model: andreasjansson/clip-features (128M+ runs, battle-tested)
 * Output: 768-dimensional vector (CLIP ViT-L/14)
 * Cost: ~$0.0001 per image
 */

import Replicate from 'replicate';
import { prisma } from '../../prisma';

export interface EmbeddingResult {
    embedding: number[];
    dimensions: number;
    model: string;
}

export interface SimilarityResult {
    generationId: string;
    similarity: number;
    outputs: any[];
    inputPrompt: string;
    visualDescription?: any;
}

export class VectorEmbeddingService {
    private static instance: VectorEmbeddingService;
    private replicate: Replicate;
    private embeddingCache: Map<string, number[]> = new Map();
    private cacheLoaded: boolean = false;

    private constructor() {
        if (!process.env.REPLICATE_API_TOKEN) {
            console.warn('[VectorEmbedding] WARNING: REPLICATE_API_TOKEN not set');
        }
        this.replicate = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN,
        });
    }

    static getInstance(): VectorEmbeddingService {
        if (!VectorEmbeddingService.instance) {
            VectorEmbeddingService.instance = new VectorEmbeddingService();
        }
        return VectorEmbeddingService.instance;
    }

    /**
     * Generate CLIP embedding for an image URL
     */
    async generateEmbedding(imageUrl: string): Promise<EmbeddingResult | null> {
        try {
            console.log(`[VectorEmbedding] Generating embedding for: ${imageUrl.substring(0, 60)}...`);

            // Use andreasjansson/clip-features - the most popular CLIP embedding model
            const output = await this.replicate.run(
                "andreasjansson/clip-features:75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a",
                {
                    input: {
                        inputs: imageUrl
                    }
                }
            ) as any;

            // Output format: array of embeddings (one per input)
            // Each embedding is a 768-dimensional float array
            if (output && Array.isArray(output) && output.length > 0) {
                const embedding = output[0];

                // Validate embedding
                if (!Array.isArray(embedding) || embedding.length !== 768) {
                    console.error('[VectorEmbedding] Invalid embedding format:', typeof embedding);
                    return null;
                }

                console.log(`[VectorEmbedding] Generated ${embedding.length}-dimensional embedding`);

                return {
                    embedding,
                    dimensions: embedding.length,
                    model: 'clip-vit-large-patch14'
                };
            }

            console.error('[VectorEmbedding] Unexpected output format:', output);
            return null;

        } catch (error: any) {
            console.error('[VectorEmbedding] Error generating embedding:', error.message);
            return null;
        }
    }

    /**
     * Store embedding for a generation
     */
    async storeEmbedding(generationId: string, embedding: number[]): Promise<void> {
        await prisma.generation.update({
            where: { id: generationId },
            data: {
                vectorEmbedding: JSON.stringify(embedding)
            }
        });

        // Update cache
        this.embeddingCache.set(generationId, embedding);
    }

    /**
     * Compute cosine similarity between two vectors
     */
    cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            console.error('[VectorEmbedding] Vector dimension mismatch:', a.length, b.length);
            return 0;
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        if (denominator === 0) return 0;

        return dotProduct / denominator;
    }

    /**
     * Load all embeddings for a project into memory cache
     */
    private async loadProjectEmbeddings(projectId: string): Promise<void> {
        const generations = await prisma.generation.findMany({
            where: {
                projectId,
                status: 'succeeded',
                vectorEmbedding: { not: null }
            },
            select: {
                id: true,
                vectorEmbedding: true
            }
        });

        for (const gen of generations) {
            if (gen.vectorEmbedding) {
                try {
                    const embedding = JSON.parse(gen.vectorEmbedding);
                    if (Array.isArray(embedding)) {
                        this.embeddingCache.set(gen.id, embedding);
                    }
                } catch {
                    // Skip invalid embeddings
                }
            }
        }

        console.log(`[VectorEmbedding] Loaded ${this.embeddingCache.size} embeddings into cache`);
    }

    /**
     * Find visually similar images using CLIP embeddings
     * This is true vector similarity search - finds images with similar visual content
     * regardless of how they were tagged or described
     */
    async findSimilarByVector(
        projectId: string,
        generationId: string,
        limit: number = 20,
        minSimilarity: number = 0.7
    ): Promise<SimilarityResult[]> {
        try {
            // Load embeddings if not cached
            await this.loadProjectEmbeddings(projectId);

            // Get source embedding
            const sourceEmbedding = this.embeddingCache.get(generationId);
            if (!sourceEmbedding) {
                // Try to load from database
                const source = await prisma.generation.findUnique({
                    where: { id: generationId },
                    select: { vectorEmbedding: true }
                });

                if (!source?.vectorEmbedding) {
                    console.log('[VectorEmbedding] Source generation has no embedding');
                    return [];
                }

                const parsed = JSON.parse(source.vectorEmbedding);
                this.embeddingCache.set(generationId, parsed);
            }

            const queryVector = this.embeddingCache.get(generationId)!;

            // Compute similarities for all cached embeddings
            const similarities: Array<{ id: string; similarity: number }> = [];

            for (const [id, embedding] of this.embeddingCache.entries()) {
                if (id === generationId) continue; // Skip self

                const similarity = this.cosineSimilarity(queryVector, embedding);
                if (similarity >= minSimilarity) {
                    similarities.push({ id, similarity });
                }
            }

            // Sort by similarity descending
            similarities.sort((a, b) => b.similarity - a.similarity);

            // Get top results with full data
            const topIds = similarities.slice(0, limit).map(s => s.id);
            const similarityMap = new Map(similarities.map(s => [s.id, s.similarity]));

            const generations = await prisma.generation.findMany({
                where: { id: { in: topIds } }
            });

            return generations.map(gen => {
                let outputs: any[] = [];
                try {
                    outputs = gen.outputs ? JSON.parse(gen.outputs) : [];
                } catch { /* ignore */ }

                let visualDesc: any = null;
                try {
                    visualDesc = gen.visualDescription ? JSON.parse(gen.visualDescription) : null;
                } catch { /* ignore */ }

                return {
                    generationId: gen.id,
                    similarity: similarityMap.get(gen.id) || 0,
                    outputs,
                    inputPrompt: gen.inputPrompt,
                    visualDescription: visualDesc
                };
            }).sort((a, b) => b.similarity - a.similarity);

        } catch (error: any) {
            console.error('[VectorEmbedding] findSimilarByVector error:', error.message);
            return [];
        }
    }

    /**
     * Generate embedding for a generation and store it
     * Called during indexing or on-demand
     */
    async embedGeneration(generationId: string): Promise<boolean> {
        try {
            const generation = await prisma.generation.findUnique({
                where: { id: generationId }
            });

            if (!generation?.outputs) {
                return false;
            }

            const outputs = JSON.parse(generation.outputs);
            if (!outputs || outputs.length === 0 || !outputs[0]?.url) {
                return false;
            }

            const imageUrl = outputs[0].url;
            const result = await this.generateEmbedding(imageUrl);

            if (result) {
                await this.storeEmbedding(generationId, result.embedding);
                console.log(`[VectorEmbedding] Embedded generation ${generationId}`);
                return true;
            }

            return false;

        } catch (error: any) {
            console.error(`[VectorEmbedding] Error embedding ${generationId}:`, error.message);
            return false;
        }
    }

    /**
     * Batch embed unembedded generations
     */
    async batchEmbed(projectId: string, batchSize: number = 10): Promise<{ processed: number; errors: number }> {
        let processed = 0;
        let errors = 0;

        try {
            // Find generations without embeddings
            const unembedded = await prisma.generation.findMany({
                where: {
                    projectId,
                    status: 'succeeded',
                    outputs: { not: null },
                    vectorEmbedding: null
                },
                take: batchSize,
                orderBy: { createdAt: 'desc' }
            });

            console.log(`[VectorEmbedding] Found ${unembedded.length} unembedded generations`);

            for (const gen of unembedded) {
                const success = await this.embedGeneration(gen.id);
                if (success) {
                    processed++;
                } else {
                    errors++;
                }

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 300));
            }

        } catch (error: any) {
            console.error('[VectorEmbedding] Batch embed error:', error.message);
        }

        return { processed, errors };
    }

    /**
     * Get embedding stats for a project
     */
    async getEmbeddingStats(projectId: string): Promise<{ total: number; embedded: number; pending: number }> {
        const [total, embedded] = await Promise.all([
            prisma.generation.count({
                where: { projectId, status: 'succeeded' }
            }),
            prisma.generation.count({
                where: { projectId, status: 'succeeded', vectorEmbedding: { not: null } }
            })
        ]);

        return {
            total,
            embedded,
            pending: total - embedded
        };
    }

    /**
     * Clear embedding cache (useful for memory management)
     */
    clearCache(): void {
        this.embeddingCache.clear();
        this.cacheLoaded = false;
    }
}
