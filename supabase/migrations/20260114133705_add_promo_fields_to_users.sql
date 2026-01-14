-- Add promo code fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS promo_code_used TEXT,
ADD COLUMN IF NOT EXISTS promo_expires_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN users.promo_code_used IS 'The promo code used by this user (if any)';
COMMENT ON COLUMN users.promo_expires_at IS 'When the promo code expires (if applicable)';