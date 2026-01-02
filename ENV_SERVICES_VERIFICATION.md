# Environment Services Verification Guide

## Overview

This document verifies that all four services (Axiom, Inngest, Redis, Sentry) are properly configured for production.

---

## Quick Verification

Run the verification script:

```bash
tsx scripts/verify-env-services.ts
```

Or check manually:

```bash
# Check Redis
echo $REDIS_URL

# Check Sentry
echo $SENTRY_DSN
echo $NEXT_PUBLIC_SENTRY_DSN

# Check Inngest (optional)
echo $USE_INNGEST_FOR_MATCHING
```

---

## Service-by-Service Verification

### 1. ✅ Axiom (Logging & Observability)

**Status:** Auto-configured via Vercel integration

**Environment Variables:** None required

**Verification:**
- ✅ Wrapped in `next.config.ts` with `withAxiom()`
- ✅ Used via `withAxiom()` wrapper on API routes
- ✅ Custom logger in `lib/monitoring.ts` sends to Axiom
- ✅ Logs automatically sent to Axiom on Vercel

**How to Verify:**
1. Deploy to Vercel
2. Check Vercel Dashboard → Logs
3. Logs should appear in Axiom automatically

**Action Required:** None - auto-configured

---

### 2. ✅ Inngest (Durable Workflows)

**Status:** Auto-configured via Vercel integration

**Environment Variables:**
- `USE_INNGEST_FOR_MATCHING` (optional) - Set to `"true"` to enable

**Verification:**
- ✅ Route configured at `/api/inngest/route.ts`
- ✅ Functions defined in `lib/inngest/functions.ts`
- ✅ Used in `/api/signup/free` route
- ✅ Auto-synced with Inngest on Vercel

**How to Verify:**
1. Set `USE_INNGEST_FOR_MATCHING=true` in Vercel environment variables
2. Deploy to Vercel
3. Check Inngest Dashboard → Functions
4. Functions should auto-sync from Vercel

**Action Required:**
- [ ] Set `USE_INNGEST_FOR_MATCHING=true` in Vercel (if you want to use it)

---

### 3. ⚠️ Redis (Rate Limiting)

**Status:** Optional (has in-memory fallback)

**Environment Variables:**
- `REDIS_URL` (optional but recommended for production)

**Verification:**
```bash
# Check if Redis URL is set
echo $REDIS_URL

# Should output something like:
# redis://default:password@host:port
# or
# rediss://default:password@host:port (SSL)
```

**Current Setup:**
- ✅ Rate limiter implemented with Redis support
- ✅ Falls back to in-memory if Redis unavailable
- ✅ Used on all critical API routes

**How to Verify:**
1. Set `REDIS_URL` in Vercel environment variables
2. Check `/api/health` endpoint - should show Redis status
3. Or run: `tsx scripts/verify-env-services.ts`

**Action Required:**
- [ ] Set `REDIS_URL` in Vercel for production (recommended for horizontal scaling)

**Where to Get Redis URL:**
- Upstash: Dashboard → Redis → Connect → Copy URL
- Redis Cloud: Dashboard → Databases → Connection String
- Self-hosted: `redis://host:port` or `rediss://host:port` (SSL)

---

### 4. ⚠️ Sentry (Error Tracking)

**Status:** Optional (recommended for production)

**Environment Variables:**
- `SENTRY_DSN` (server-side) OR
- `NEXT_PUBLIC_SENTRY_DSN` (client-side, can be used for both)

**Verification:**
```bash
# Check if Sentry DSN is set
echo $SENTRY_DSN
echo $NEXT_PUBLIC_SENTRY_DSN
```

**Current Setup:**
- ✅ Client config: `sentry.client.config.ts`
- ✅ Server config: `sentry.server.config.ts`
- ✅ Edge config: `sentry.edge.config.ts`
- ✅ Wrapped in `next.config.ts` with `withSentryConfig()`
- ✅ Session replay enabled (10% in prod, 100% in dev)

**How to Verify:**
1. Set `SENTRY_DSN` or `NEXT_PUBLIC_SENTRY_DSN` in Vercel
2. Deploy to Vercel
3. Check Sentry Dashboard → Issues
4. Errors should appear automatically

**Action Required:**
- [ ] Set `SENTRY_DSN` or `NEXT_PUBLIC_SENTRY_DSN` in Vercel (recommended)

**Where to Get Sentry DSN:**
1. Go to Sentry Dashboard
2. Select your project
3. Settings → Client Keys (DSN)
4. Copy the DSN (format: `https://xxx@xxx.ingest.sentry.io/xxx`)

---

## Production Checklist

### Required (App won't work without these):
- [x] `NEXT_PUBLIC_SUPABASE_URL` - Database connection
- [x] `SUPABASE_SERVICE_ROLE_KEY` - Database access
- [x] `RESEND_API_KEY` - Email sending
- [x] `INTERNAL_API_HMAC_SECRET` - API authentication
- [x] `SYSTEM_API_KEY` - System operations

### Recommended (App works but degraded without):
- [ ] `REDIS_URL` - Distributed rate limiting
- [ ] `SENTRY_DSN` or `NEXT_PUBLIC_SENTRY_DSN` - Error tracking
- [ ] `USE_INNGEST_FOR_MATCHING=true` - Enable durable workflows

### Auto-Configured (No action needed):
- [x] Axiom - Auto via Vercel integration
- [x] Inngest - Auto via Vercel integration

---

## Health Check Endpoint

Your app has a health check endpoint that verifies services:

```bash
curl https://your-domain.com/api/health
```

This returns:
- Database status
- Redis status (if configured)
- OpenAI status
- Scraper health
- Environment variables status

---

## Vercel Environment Variables Setup

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add the following:

### Required:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
RESEND_API_KEY=re_xxx
INTERNAL_API_HMAC_SECRET=your-32-char-secret
SYSTEM_API_KEY=your-10-char-key
```

### Recommended:
```
REDIS_URL=redis://default:password@host:port
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
USE_INNGEST_FOR_MATCHING=true
```

### Optional (for AI matching):
```
OPENAI_API_KEY=sk-xxx
```

---

## Verification Results

After running `tsx scripts/verify-env-services.ts`, you should see:

```
✅ Axiom (Logging): Configured (auto)
✅ Inngest (Durable Workflows): Configured (auto)
⚠️  Redis (Rate Limiting): Not configured (optional)
⚠️  Sentry (Error Tracking): Not configured (optional)
```

**Status:**
- ✅ All required services configured
- ⚠️ Optional services not configured (this is OK)

---

## Troubleshooting

### Axiom not working?
- Check Vercel Dashboard → Integrations → Axiom
- Ensure integration is enabled
- Logs should appear automatically

### Inngest not working?
- Check Vercel Dashboard → Integrations → Inngest
- Ensure integration is enabled
- Functions should auto-sync
- Set `USE_INNGEST_FOR_MATCHING=true` to enable

### Redis not working?
- Check `REDIS_URL` format (must be valid URL)
- Test connection: `redis-cli -u $REDIS_URL ping`
- Rate limiting will fall back to in-memory if Redis unavailable

### Sentry not working?
- Check DSN format (must be valid URL)
- Ensure DSN is set in Vercel environment variables
- Check Sentry Dashboard → Settings → Projects → Client Keys
- Errors should appear automatically after deployment

---

## Summary

| Service | Status | Env Vars | Action Required |
|---------|--------|----------|-----------------|
| Axiom | ✅ Auto | None | None |
| Inngest | ✅ Auto | `USE_INNGEST_FOR_MATCHING` (optional) | Set to `true` if you want to use it |
| Redis | ⚠️ Optional | `REDIS_URL` | Set for production (recommended) |
| Sentry | ⚠️ Optional | `SENTRY_DSN` | Set for production (recommended) |

**Your stack is production-ready!** The auto-configured services (Axiom, Inngest) work out of the box. Redis and Sentry are optional but recommended for production.

