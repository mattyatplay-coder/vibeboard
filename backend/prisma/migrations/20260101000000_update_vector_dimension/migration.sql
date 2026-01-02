-- Update Script Library Vector Dimension
-- Changes from 768 (MiniMax) to 1536 (OpenAI text-embedding-3-small)

-- Drop the existing index first
DROP INDEX IF EXISTS idx_script_library_embedding;

-- Alter the column to new dimension
-- Note: This will preserve existing data but vectors won't be usable until re-embedded
ALTER TABLE "ScriptLibrary" ALTER COLUMN embedding TYPE vector(1536);

-- Recreate the index with new dimension
CREATE INDEX IF NOT EXISTS idx_script_library_embedding
ON "ScriptLibrary"
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Clear the indexed flag to force re-indexing with new embeddings
UPDATE "ScriptLibrary" SET indexed = false, embedding = NULL;
