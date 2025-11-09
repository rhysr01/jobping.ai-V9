-- Auto-embedding generation trigger
-- Automatically generates embeddings for new jobs

-- Create a queue table for jobs needing embeddings
CREATE TABLE IF NOT EXISTS embedding_queue (
    id SERIAL PRIMARY KEY,
    job_hash TEXT NOT NULL UNIQUE,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    CONSTRAINT fk_job_hash FOREIGN KEY (job_hash) REFERENCES jobs(job_hash) ON DELETE CASCADE
);

-- Create index for faster queue processing
CREATE INDEX IF NOT EXISTS idx_embedding_queue_unprocessed 
ON embedding_queue(created_at) 
WHERE processed_at IS NULL;

-- Function to add job to embedding queue
CREATE OR REPLACE FUNCTION queue_job_for_embedding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only queue if job is active and doesn't have an embedding yet
    -- Check if embedding is NULL (vector type doesn't support empty arrays the same way)
    IF NEW.is_active = true AND NEW.embedding IS NULL THEN
        INSERT INTO embedding_queue (job_hash, job_id)
        VALUES (NEW.job_hash, NEW.id)
        ON CONFLICT (job_hash) DO UPDATE SET
            processed_at = NULL, -- Reset if job is updated
            error_message = NULL,
            retry_count = 0;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for INSERT
DROP TRIGGER IF EXISTS trigger_queue_embedding_insert ON jobs;
CREATE TRIGGER trigger_queue_embedding_insert
    AFTER INSERT ON jobs
    FOR EACH ROW
    WHEN (NEW.is_active = true)
    EXECUTE FUNCTION queue_job_for_embedding();

-- Create trigger for UPDATE (in case embedding is cleared or job is reactivated)
DROP TRIGGER IF EXISTS trigger_queue_embedding_update ON jobs;
CREATE TRIGGER trigger_queue_embedding_update
    AFTER UPDATE ON jobs
    FOR EACH ROW
    WHEN (
        NEW.is_active = true 
        AND NEW.embedding IS NULL
        AND (OLD.embedding IS DISTINCT FROM NEW.embedding OR OLD.is_active IS DISTINCT FROM NEW.is_active)
    )
    EXECUTE FUNCTION queue_job_for_embedding();

-- Function to mark embedding as processed
CREATE OR REPLACE FUNCTION mark_embedding_processed(job_hash_param TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE embedding_queue
    SET processed_at = NOW()
    WHERE job_hash = job_hash_param AND processed_at IS NULL;
END;
$$;

-- Function to mark embedding as failed (for retry logic)
CREATE OR REPLACE FUNCTION mark_embedding_failed(job_hash_param TEXT, error_msg TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE embedding_queue
    SET 
        error_message = error_msg,
        retry_count = retry_count + 1,
        processed_at = CASE 
            WHEN retry_count >= 3 THEN NOW() -- Give up after 3 retries
            ELSE NULL -- Keep NULL to allow retry
        END
    WHERE job_hash = job_hash_param;
END;
$$;

-- Grant permissions
GRANT INSERT, UPDATE, SELECT ON embedding_queue TO authenticated;
GRANT USAGE ON SEQUENCE embedding_queue_id_seq TO authenticated;

-- Add comments
COMMENT ON TABLE embedding_queue IS 'Queue for jobs that need embeddings generated';
COMMENT ON FUNCTION queue_job_for_embedding() IS 'Automatically queues new/updated jobs for embedding generation';
COMMENT ON FUNCTION mark_embedding_processed(TEXT) IS 'Marks a job embedding as successfully processed';
COMMENT ON FUNCTION mark_embedding_failed(TEXT, TEXT) IS 'Marks a job embedding as failed and increments retry count';

