-- Database migrations for pgvector embeddings
-- Migration: add_vector_embeddings

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to jobs table (1536 dimensions for OpenAI text-embedding-3-small)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Add embedding column to users table for user preference embeddings
ALTER TABLE users ADD COLUMN IF NOT EXISTS preference_embedding vector(1536);

-- Create index for similarity search (IVFFlat for fast approximate search)
-- Using cosine distance (1 - cosine similarity)
CREATE INDEX IF NOT EXISTS idx_jobs_embedding ON jobs 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100)
WHERE embedding IS NOT NULL AND is_active = true;

-- Create index for user preference embeddings
CREATE INDEX IF NOT EXISTS idx_users_preference_embedding ON users 
USING ivfflat (preference_embedding vector_cosine_ops)
WITH (lists = 50)
WHERE preference_embedding IS NOT NULL;

-- Function to find jobs by embedding similarity
CREATE OR REPLACE FUNCTION match_jobs_by_embedding(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 200,
  city_filter text[] DEFAULT NULL,
  career_path_filter text[] DEFAULT NULL
)
RETURNS TABLE (
  id integer,
  job_hash text,
  title text,
  company text,
  location text,
  description text,
  semantic_score float,
  embedding_distance float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.job_hash,
    j.title,
    j.company,
    j.location,
    j.description,
    -- Cosine similarity (1 - distance)
    1 - (j.embedding <=> query_embedding) as semantic_score,
    j.embedding <=> query_embedding as embedding_distance
  FROM jobs j
  WHERE 
    j.embedding IS NOT NULL
    AND j.is_active = true
    AND (1 - (j.embedding <=> query_embedding)) >= match_threshold
    AND (city_filter IS NULL OR j.city = ANY(city_filter))
    AND (career_path_filter IS NULL OR j.categories && career_path_filter)
  ORDER BY j.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to find similar users by preference embedding
CREATE OR REPLACE FUNCTION find_similar_users(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.85,
  match_count int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  email text,
  similarity_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    1 - (u.preference_embedding <=> query_embedding) as similarity_score
  FROM users u
  WHERE 
    u.preference_embedding IS NOT NULL
    AND u.active = true
    AND (1 - (u.preference_embedding <=> query_embedding)) >= match_threshold
  ORDER BY u.preference_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add comment
COMMENT ON FUNCTION match_jobs_by_embedding IS 'Find jobs similar to user preferences using vector embeddings';
COMMENT ON FUNCTION find_similar_users IS 'Find users with similar preferences for batch processing';

