/**
 * VectorEmbeddingService - Script Library RAG System
 *
 * Converts text to vector embeddings for semantic search using MiniMax E3 model.
 * Used by Script Library to find stylistically similar scripts for RAG retrieval.
 */

import axios from 'axios';

// MiniMax embedding dimensions
const VECTOR_DIM = 768;

// API configuration - can use MiniMax directly or local embedding server
const EMBEDDING_API_URL = process.env.EMBEDDING_API_URL || 'https://api.minimax.chat/v1/embeddings';
const EMBEDDING_API_KEY = process.env.MINIMAX_API_KEY;

export interface EmbeddingResult {
    embedding: number[];
    model: string;
    tokens: number;
}

export class VectorEmbeddingService {
    private static instance: VectorEmbeddingService;

    static getInstance(): VectorEmbeddingService {
        if (!VectorEmbeddingService.instance) {
            VectorEmbeddingService.instance = new VectorEmbeddingService();
        }
        return VectorEmbeddingService.instance;
    }

    /**
     * Get embedding vector for a single text string
     */
    async getEmbedding(text: string): Promise<number[]> {
        try {
            // Truncate very long text to avoid token limits (approx 8000 chars for safety)
            const truncatedText = text.length > 8000 ? text.substring(0, 8000) : text;

            const response = await axios.post(
                EMBEDDING_API_URL,
                {
                    model: 'embo-01', // MiniMax embedding model
                    texts: [truncatedText],
                    type: 'db', // 'db' for storage, 'query' for search
                },
                {
                    headers: {
                        'Authorization': `Bearer ${EMBEDDING_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 30000,
                }
            );

            if (response.data?.vectors?.[0]) {
                return response.data.vectors[0];
            }

            // Fallback: OpenAI-compatible format
            if (response.data?.data?.[0]?.embedding) {
                return response.data.data[0].embedding;
            }

            console.warn('[EmbeddingService] Unexpected response format, using zero vector');
            return this.getZeroVector();
        } catch (error: any) {
            console.error('[EmbeddingService] Failed to get embedding:', error.message);
            // Return zero vector as fallback to prevent cascading failures
            return this.getZeroVector();
        }
    }

    /**
     * Get embedding optimized for search queries (slightly different processing)
     */
    async getQueryEmbedding(query: string): Promise<number[]> {
        try {
            const response = await axios.post(
                EMBEDDING_API_URL,
                {
                    model: 'embo-01',
                    texts: [query],
                    type: 'query', // Query type for search
                },
                {
                    headers: {
                        'Authorization': `Bearer ${EMBEDDING_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 30000,
                }
            );

            if (response.data?.vectors?.[0]) {
                return response.data.vectors[0];
            }

            if (response.data?.data?.[0]?.embedding) {
                return response.data.data[0].embedding;
            }

            return this.getZeroVector();
        } catch (error: any) {
            console.error('[EmbeddingService] Failed to get query embedding:', error.message);
            return this.getZeroVector();
        }
    }

    /**
     * Batch embed multiple texts efficiently
     */
    async getBatchEmbeddings(texts: string[]): Promise<number[][]> {
        try {
            // Truncate each text
            const truncatedTexts = texts.map(t =>
                t.length > 8000 ? t.substring(0, 8000) : t
            );

            const response = await axios.post(
                EMBEDDING_API_URL,
                {
                    model: 'embo-01',
                    texts: truncatedTexts,
                    type: 'db',
                },
                {
                    headers: {
                        'Authorization': `Bearer ${EMBEDDING_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 60000,
                }
            );

            if (response.data?.vectors) {
                return response.data.vectors;
            }

            if (response.data?.data) {
                return response.data.data.map((d: any) => d.embedding);
            }

            return texts.map(() => this.getZeroVector());
        } catch (error: any) {
            console.error('[EmbeddingService] Batch embedding failed:', error.message);
            return texts.map(() => this.getZeroVector());
        }
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            console.warn('[EmbeddingService] Vector dimension mismatch');
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
        return denominator === 0 ? 0 : dotProduct / denominator;
    }

    /**
     * Get zero vector (fallback for errors)
     */
    private getZeroVector(): number[] {
        return new Array(VECTOR_DIM).fill(0.0001);
    }

    /**
     * Get the expected vector dimension
     */
    getVectorDimension(): number {
        return VECTOR_DIM;
    }
}

export const embeddingService = VectorEmbeddingService.getInstance();
