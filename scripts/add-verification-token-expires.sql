-- Migration: Add verification_token_expires column to users table
-- This column stores the expiration timestamp for email verification tokens

-- Add the new column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ;

-- Add index for performance on token expiration queries
CREATE INDEX IF NOT EXISTS idx_users_verification_token_expires 
ON users(verification_token_expires) 
WHERE verification_token_expires IS NOT NULL;

-- Add index for performance on token verification queries
CREATE INDEX IF NOT EXISTS idx_users_verification_token_active 
ON users(verification_token, verification_token_expires) 
WHERE verification_token IS NOT NULL AND email_verified = false;

-- Update existing users with null verification_token_expires to have a default expiration
-- (24 hours from now for any existing unverified users)
UPDATE users 
SET verification_token_expires = NOW() + INTERVAL '24 hours'
WHERE verification_token IS NOT NULL 
  AND verification_token_expires IS NULL 
  AND email_verified = false;

-- Add comment to document the column purpose
COMMENT ON COLUMN users.verification_token_expires IS 'Expiration timestamp for email verification tokens. Tokens expire after 24 hours.';
