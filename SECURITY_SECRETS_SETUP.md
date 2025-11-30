# Security Secrets Setup Guide

## Overview

Your application requires secure secrets for token generation. The warnings you're seeing indicate that these environment variables are missing or too short:

- `PREFERENCES_SECRET` (≥32 chars) - For preferences/unsubscribe token generation
- `EMAIL_VERIFICATION_SECRET` (≥32 chars) - For email verification token generation  
- `INTERNAL_API_HMAC_SECRET` (≥32 chars) - Fallback secret (should always be set)

## Quick Fix

### Option 1: Generate Secrets Automatically (Recommended)

Run the secret generator script:

```bash
npm run generate-secrets
```

This will output secure random secrets that you can copy directly into Vercel.

### Option 2: Generate Manually

You can generate secrets using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run this 3 times to generate:
1. `PREFERENCES_SECRET`
2. `EMAIL_VERIFICATION_SECRET`
3. `INTERNAL_API_HMAC_SECRET` (if not already set)

## Setting Secrets

### For Production (Vercel)

1. **Go to Vercel Dashboard**
   - Navigate to your project
   - Click **Settings** → **Environment Variables**

2. **Add Each Secret**
   - Click **Add New**
   - Enter the variable name (e.g., `PREFERENCES_SECRET`)
   - Paste the generated secret value
   - Select **Production** environment (and Preview/Development if needed)
   - Click **Save**

3. **Required Variables**
   ```
   PREFERENCES_SECRET=<64-character hex string>
   EMAIL_VERIFICATION_SECRET=<64-character hex string>
   INTERNAL_API_HMAC_SECRET=<64-character hex string>
   ```

4. **Redeploy**
   - After adding all secrets, trigger a new deployment
   - The security warnings will disappear once secrets are properly configured

### For Local Development (.env.local)

**Yes, you should add these to `.env.local` too!**

1. **Required for local dev:**
   - `INTERNAL_API_HMAC_SECRET` - **Required** (schema validation will fail without it)

2. **Recommended for local dev:**
   - `PREFERENCES_SECRET` - Optional but recommended for consistency
   - `EMAIL_VERIFICATION_SECRET` - Optional but recommended for consistency

3. **Add to `.env.local`:**
   ```bash
   # Generate secrets for local dev (can be different from production)
   npm run generate-secrets
   
   # Copy the output to .env.local
   INTERNAL_API_HMAC_SECRET=<your-generated-secret>
   PREFERENCES_SECRET=<your-generated-secret>
   EMAIL_VERIFICATION_SECRET=<your-generated-secret>
   ```

**Note:** You can use the same secrets for local dev, or generate different ones. The code uses a hardcoded fallback in non-production, but setting them explicitly is better for:
- Consistency with production behavior
- Testing token generation locally
- Avoiding schema validation errors

## Security Best Practices

### ✅ Do:
- Generate unique secrets for each environment (production, preview, development)
- Use cryptographically secure random generators (≥32 chars)
- Store secrets in Vercel environment variables (never commit to git)
- Rotate secrets quarterly or after security incidents
- Keep backups in a secure password manager

### ❌ Don't:
- Use predictable or short secrets (<32 chars)
- Commit secrets to git repositories
- Share secrets via email or chat
- Reuse secrets across different purposes
- Use the same secrets in development and production

## Verification

After setting the secrets, verify they're working:

1. **Check Logs**
   - The security warnings should disappear
   - Look for: `[SECURITY] Using INTERNAL_API_HMAC_SECRET for...` (this is OK, but dedicated secrets are better)

2. **Test Functionality**
   - Sign up a test user → verify email verification link works
   - Check email preferences link → verify it works
   - Unsubscribe link → verify it works

## Current Status

The application uses a fallback system:

1. **Primary**: Uses purpose-specific secret (`PREFERENCES_SECRET` or `EMAIL_VERIFICATION_SECRET`)
2. **Fallback 1**: Uses `INTERNAL_API_HMAC_SECRET` (logs a warning)
3. **Fallback 2**: Generates deterministic secret from other env vars (logs error - **less secure**)

**You're currently seeing Fallback 2**, which means neither the purpose-specific secrets nor `INTERNAL_API_HMAC_SECRET` are properly configured.

## Troubleshooting

### Warning persists after setting secrets?
- Ensure secrets are ≥32 characters
- Verify secrets are set for the correct environment (Production)
- Check that you've redeployed after adding secrets
- Verify in Vercel dashboard that variables are actually saved

### Secrets not working?
- Check for typos in variable names (case-sensitive)
- Ensure no extra spaces or newlines in secret values
- Verify the deployment environment matches where secrets are set

### Need to rotate secrets?
1. Generate new secrets using `npm run generate-secrets`
2. Update in Vercel environment variables
3. Redeploy application
4. **Note**: Existing tokens will become invalid after rotation

## Related Files

- `Utils/auth/secureTokens.ts` - Token generation logic
- `lib/env.ts` - Environment variable validation
- `PRODUCTION_GUIDE.md` - Full production deployment guide

