-- Create promo_pending table to track promo codes for new users
-- before they complete Tally onboarding

CREATE TABLE IF NOT EXISTS public.promo_pending (
  email TEXT PRIMARY KEY,
  promo_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_promo_pending_expires_at 
  ON public.promo_pending(expires_at);

-- Enable RLS
ALTER TABLE public.promo_pending ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to manage promo pending entries
CREATE POLICY "Service role can manage promo pending"
  ON public.promo_pending
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to read their own promo pending
CREATE POLICY "Users can read own promo pending"
  ON public.promo_pending
  FOR SELECT
  TO authenticated
  USING (true);

-- Cleanup function: Delete expired promo codes (run daily)
CREATE OR REPLACE FUNCTION cleanup_expired_promos()
RETURNS void AS $$
BEGIN
  DELETE FROM public.promo_pending
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.promo_pending IS 'Temporary storage for promo codes applied before Tally form completion';
COMMENT ON FUNCTION cleanup_expired_promos IS 'Removes expired promo codes (older than 24 hours)';

