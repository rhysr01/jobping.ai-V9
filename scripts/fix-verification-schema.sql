-- Fix Email Verification Database Schema
-- This adds the missing columns needed for proper email verification

-- Add verification_token_expires column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ;

-- Add any other missing email tracking columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_email_sent TIMESTAMPTZ;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_count INTEGER DEFAULT 0;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_phase VARCHAR(20) DEFAULT 'welcome';

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_verification_token 
ON users(verification_token) WHERE verification_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_verification_expires 
ON users(verification_token_expires) WHERE verification_token_expires IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_email_verified 
ON users(email_verified);

CREATE INDEX IF NOT EXISTS idx_users_last_email_sent 
ON users(last_email_sent);

CREATE INDEX IF NOT EXISTS idx_users_email_phase 
ON users(email_phase);

-- Add comments for documentation
COMMENT ON COLUMN users.verification_token_expires IS 'When the email verification token expires (24 hours from generation)';
COMMENT ON COLUMN users.last_email_sent IS 'Timestamp of the last email sent to this user';
COMMENT ON COLUMN users.email_count IS 'Total number of emails sent to this user';
COMMENT ON COLUMN users.email_phase IS 'Current email phase: welcome, regular';
COMMENT ON COLUMN users.onboarding_complete IS 'Whether the user has completed the onboarding sequence';

-- Show the updated schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN (
    'email',
    'email_verified', 
    'verification_token',
    'verification_token_expires',
    'last_email_sent',
    'email_count',
    'email_phase',
    'onboarding_complete'
)
ORDER BY column_name;
