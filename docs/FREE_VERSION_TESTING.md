# Free Version Testing Guide

This document explains how to test the free version to ensure it doesn't hang or load forever.

## Changes Made

### 1. Added Timeout Protection to API Route
**File:** `app/api/matches/free/route.ts`

- Added `queryWithTimeout()` wrapper function that prevents database queries from hanging indefinitely
- Each database query now has a 10-second timeout
- Returns HTTP 504 (Gateway Timeout) if queries exceed timeout
- Prevents infinite loading by ensuring API responds within reasonable time

**Key Features:**
- 10-second timeout per database query (3 queries max = 30 seconds total)
- Proper error logging when timeouts occur
- User-friendly error messages returned to client

### 2. Updated Loading Message
**File:** `app/matches/page.tsx`

- Changed loading message from "10-15 seconds" to "5-10 seconds" to better reflect expected performance
- More accurate user expectations

### 3. Created Automated E2E Tests
**File:** `tests/e2e/free-version-loading.spec.ts`

Comprehensive Playwright tests that verify:
- Free signup completes and redirects correctly
- Matches page loads within timeout (35 seconds)
- Loading state transitions properly (doesn't hang)
- API endpoint responds within timeout
- Network timeout handling works correctly

**Run with:**
```bash
npm run test:e2e:free
```

### 4. Created Manual Test Script
**File:** `scripts/test-free-version.ts`

Quick manual test script that:
- Tests health endpoint
- Tests signup API
- Tests matches API with cookie
- Reports response times and identifies slow endpoints

**Run with:**
```bash
npm run test:free
```

Or directly:
```bash
tsx scripts/test-free-version.ts
```

## How to Test

### Option 1: Automated E2E Tests (Recommended)

```bash
# Make sure dev server is running
npm run dev

# In another terminal, run the tests
npm run test:e2e:free
```

### Option 2: Manual Test Script

```bash
# Make sure dev server is running
npm run dev

# Run the test script
npm run test:free
```

### Option 3: Manual Browser Testing

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open browser DevTools (Network tab)

3. Navigate to `/signup/free`

4. Fill out the form and submit

5. Check Network tab for:
   - `/api/signup/free` - should complete in <30 seconds
   - `/api/matches/free` - should complete in <30 seconds

6. Verify:
   - Matches page loads (not stuck on loading spinner)
   - Loading spinner disappears
   - Either jobs are shown OR error message appears
   - No infinite loading

### Option 4: Direct API Testing

```bash
# Test signup
curl -X POST http://localhost:3000/api/signup/free \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "full_name": "Test User",
    "preferred_cities": ["Prague"],
    "career_paths": ["finance"],
    "entry_level_preferences": ["graduate"]
  }'

# Test matches (replace email with one from signup)
curl http://localhost:3000/api/matches/free \
  -H "Cookie: free_user_email=test@example.com"
```

## What to Look For

### ✅ Success Indicators:
- API responses complete in <30 seconds
- Loading spinner disappears
- Matches page shows content or error (not stuck loading)
- No console errors related to timeouts

### ❌ Failure Indicators:
- API requests hang for >35 seconds
- Loading spinner never disappears
- Browser shows "Request timeout" errors
- Network tab shows pending requests

## Troubleshooting

### If API times out (>30 seconds):

1. **Check database connection:**
   ```bash
   # Check if Supabase is accessible
   # Look for connection errors in logs
   ```

2. **Check query performance:**
   - Look for slow queries in database logs
   - Check if indexes exist on `user_email` and `job_hash` columns

3. **Check rate limiting:**
   - Verify rate limiter isn't blocking requests
   - Check Redis connection if using Redis-based rate limiting

### If loading never completes:

1. **Check browser console** for JavaScript errors
2. **Check Network tab** for failed requests
3. **Verify cookie is set** (`free_user_email` in Application → Cookies)
4. **Check API logs** for errors

## Performance Benchmarks

Expected response times:
- Health check: <100ms
- Signup API: <10 seconds (includes matching)
- Matches API: <10 seconds (with timeouts)

If any endpoint exceeds 30 seconds, investigate:
- Database connection issues
- Slow queries (missing indexes)
- Network latency
- Rate limiting issues

## Monitoring

The API route now logs:
- Query timeouts (with operation name)
- Response times
- Error details

Check logs for patterns:
```bash
# Look for timeout errors
grep "timeout" logs/*.log

# Look for slow queries
grep "responseTime" logs/*.log | awk '$2 > 10000'
```

