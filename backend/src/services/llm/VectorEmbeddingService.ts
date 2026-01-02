/**
 * VectorEmbeddingService - Script Library RAG System
 *
 * Converts text to vector embeddings for semantic search.
 * Used by Script Library to find stylistically similar scripts for RAG retrieval.
 *
 * Supports multiple providers:
 * - OpenAI text-embedding-3-small (1536 dims) - default, most reliable
 * - MiniMax embo-01 (768 dims) - alternative if configured
 */

import axios from 'axios';

// Provider configuration
const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || 'openai';

// OpenAI configuration (default)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';
const OPENAI_VECTOR_DIM = 1536;

// MiniMax configuration (alternative)
const MINIMAX_API_URL = 'https://api.minimax.io/v1/embeddings';
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID || '2006868071284740135';
const MINIMAX_VECTOR_DIM = 768;

// Use the appropriate dimension based on provider
const VECTOR_DIM = EMBEDDING_PROVIDER === 'minimax' ? MINIMAX_VECTOR_DIM : OPENAI_VECTOR_DIM;

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

            if (EMBEDDING_PROVIDER === 'minimax') {
                return await this.getMiniMaxEmbedding(truncatedText, 'db');
            } else {
                return await this.getOpenAIEmbedding(truncatedText);
            }
        } catch (error: any) {
            console.error('[EmbeddingService] Failed to get embedding:', error.message);
            // Return zero vector as fallback to prevent cascading failures
            return this.getZeroVector();
        }
    }

    /**
     * Get embedding from OpenAI
     */
    private async getOpenAIEmbedding(text: string): Promise<number[]> {
        const response = await axios.post(
            'https://api.openai.com/v1/embeddings',
            {
                model: OPENAI_EMBEDDING_MODEL,
                input: text,
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            }
        );

        if (response.data?.data?.[0]?.embedding) {
            return response.data.data[0].embedding;
        }

        console.warn('[EmbeddingService] Unexpected OpenAI response format, using zero vector');
        return this.getZeroVector();
    }

    /**
     * Get embedding from MiniMax
     */
    private async getMiniMaxEmbedding(text: string, type: 'db' | 'query'): Promise<number[]> {
        const url = `${MINIMAX_API_URL}?GroupId=${MINIMAX_GROUP_ID}`;

        const response = await axios.post(
            url,
            {
                model: 'embo-01',
                texts: [text],
                type: type,
            },
            {
                headers: {
                    'Authorization': `Bearer ${MINIMAX_API_KEY}`,
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

        console.warn('[EmbeddingService] Unexpected MiniMax response format, using zero vector');
        return this.getZeroVector();
    }

    /**
     * Get embedding optimized for search queries (slightly different processing)
     */
    async getQueryEmbedding(query: string): Promise<number[]> {
        try {
            if (EMBEDDING_PROVIDER === 'minimax') {
                return await this.getMiniMaxEmbedding(query, 'query');
            } else {
                // OpenAI doesn't distinguish between db/query embeddings
                return await this.getOpenAIEmbedding(query);
            }
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

            if (EMBEDDING_PROVIDER === 'minimax') {
                return await this.getMiniMaxBatchEmbedding(truncatedTexts);
            } else {
                return await this.getOpenAIBatchEmbedding(truncatedTexts);
            }
        } catch (error: any) {
            console.error('[EmbeddingService] Batch embedding failed:', error.message);
            return texts.map(() => this.getZeroVector());
        }
    }

    /**
     * Batch embed with OpenAI
     */
    private async getOpenAIBatchEmbedding(texts: string[]): Promise<number[][]> {
        const response = await axios.post(
            'https://api.openai.com/v1/embeddings',
            {
                model: OPENAI_EMBEDDING_MODEL,
                input: texts,
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                timeout: 60000,
            }
        );

        if (response.data?.data) {
            // OpenAI returns embeddings in order, but let's sort by index to be safe
            return response.data.data
                .sort((a: any, b: any) => a.index - b.index)
                .map((d: any) => d.embedding);
        }

        return texts.map(() => this.getZeroVector());
    }

    /**
     * Batch embed with MiniMax
     */
    private async getMiniMaxBatchEmbedding(texts: string[]): Promise<number[][]> {
        const url = `${MINIMAX_API_URL}?GroupId=${MINIMAX_GROUP_ID}`;

        const response = await axios.post(
            url,
            {
                model: 'embo-01',
                texts: texts,
                type: 'db',
            },
            {
                headers: {
                    'Authorization': `Bearer ${MINIMAX_API_KEY}`,
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
