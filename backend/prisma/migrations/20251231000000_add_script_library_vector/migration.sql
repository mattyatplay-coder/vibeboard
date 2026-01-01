-- Script Library RAG System Migration
-- Adds pgvector extension and vector column for semantic search

-- Enable pgvector extension (requires PostgreSQL superuser or extension already available)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create ScriptLibrary table if not exists (Prisma creates base, we add vector)
-- Note: Prisma migration will create the base table, this adds the vector column

-- Add vector column for embeddings (768 dimensions for MiniMax embo-01)
-- This column stores the semantic embedding for similarity search
ALTER TABLE "ScriptLibrary" ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Create index for fast similarity search using cosine distance
-- IVFFlat index for approximate nearest neighbor search (fast, good accuracy)
CREATE INDEX IF NOT EXISTS idx_script_library_embedding
ON "ScriptLibrary"
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- HNSW index alternative (slower to build, faster search, better recall)
-- Uncomment to use HNSW instead of IVFFlat:
-- CREATE INDEX IF NOT EXISTS idx_script_library_embedding_hnsw
-- ON "ScriptLibrary"
-- USING hnsw (embedding vector_cosine_ops)
-- WITH (m = 16, ef_construction = 64);
