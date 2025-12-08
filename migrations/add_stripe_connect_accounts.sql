-- Create table for storing Stripe Connect account information
CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  charges_enabled BOOLEAN NOT NULL DEFAULT false,
  payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  details_submitted BOOLEAN NOT NULL DEFAULT false,
  deauthorized BOOLEAN NOT NULL DEFAULT false,
  requirements_currently_due JSONB DEFAULT '[]'::jsonb,
  requirements_past_due JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_stripe_connect_accounts_user_id ON stripe_connect_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_connect_accounts_account_id ON stripe_connect_accounts(account_id);

-- Add RLS policies (adjust based on your auth setup)
ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own accounts
CREATE POLICY "Users can read own accounts"
  ON stripe_connect_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can do everything (for API routes)
CREATE POLICY "Service role full access"
  ON stripe_connect_accounts
  FOR ALL
  USING (auth.role() = 'service_role');

