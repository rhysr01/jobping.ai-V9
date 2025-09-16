# JobPing Environment Variables Template

Copy this to `.env.local` and fill in your values:

```bash
# =============================================================================
# CRITICAL - REQUIRED FOR PRODUCTION
# =============================================================================

# Database Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Email Configuration
RESEND_API_KEY=your-resend-api-key

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# Webhook Security (CRITICAL for production)
TALLY_WEBHOOK_SECRET=your-tally-webhook-secret

# Token Security (CRITICAL for production)
VERIFICATION_TOKEN_PEPPER=your-verification-token-pepper

# Application URLs
NEXT_PUBLIC_URL=https://your-domain.com
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# =============================================================================
# STRIPE PAYMENT CONFIGURATION
# =============================================================================

# Stripe Keys
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLIC_KEY=your-stripe-public-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# Stripe Price IDs (create these in your Stripe dashboard)
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_QUARTERLY_PRICE_ID=price_xxx

# =============================================================================
# OPTIONAL - PERFORMANCE & MONITORING
# =============================================================================

# Redis (for production rate limiting)
REDIS_URL=redis://localhost:6379

# Sentry (error monitoring)
SENTRY_DSN=your-sentry-dsn

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=300000
RATE_LIMIT_MAX=3

# Job Distribution
SEND_DAILY_FREE=50
SEND_DAILY_PREMIUM=100
FREE_ULTRA_FRESH=2
FREE_FRESH=3
FREE_COMPREHENSIVE=1

# =============================================================================
# SCRAPER CONFIGURATION
# =============================================================================

# SerpAPI
SERP_API_KEY=your-serp-api-key
SERP_DAILY_LIMIT=167
SERP_HOURLY_LIMIT=7
SERP_REQUEST_DELAY=3000

# RapidAPI
RAPIDAPI_KEY=your-rapidapi-key

# Muse API (optional)
MUSE_API_KEY=your-muse-api-key

# =============================================================================
# DEVELOPMENT & TESTING
# =============================================================================

# Test Mode (set to '1' for testing)
JOBPING_TEST_MODE=0
JOBPING_PILOT_TESTING=0

# Debug Mode
SCRAPER_DEBUG_MODE=false
ENABLE_SCRAPER_TELEMETRY=true

# =============================================================================
# DEPLOYMENT PLATFORM
# =============================================================================

# Railway (if using Railway)
RAILWAY_ENVIRONMENT=production

# Vercel (if using Vercel)
VERCEL_URL=your-vercel-url
```

## Quick Setup Checklist

- [ ] Copy this to `.env.local`
- [ ] Fill in all CRITICAL variables
- [ ] Set up Stripe products and price IDs
- [ ] Configure Tally webhook secret
- [ ] Test email verification flow
- [ ] Test payment flow
- [ ] Run database migration: `npm run migrate:verification-tokens`
- [ ] Test with: `npm run test:25-user-launch`

## Security Notes

1. Never commit `.env.local` to version control
2. Use strong, unique secrets for production
3. Rotate secrets regularly
4. Use environment-specific values
5. Monitor for exposed secrets in logs
