# Cleanup Actions Summary

## ✅ COMPLETED

1. **Fixed relative imports** - `app/api/monitoring/dashboard/route.ts` now uses `@/` aliases
2. **Created `.env.example`** - Template for environment variables

## 🔄 IN PROGRESS

3. **Duplicate HMAC utilities** - Need to consolidate:
   - `Utils/auth/hmac.ts` - More comprehensive (verifyHMAC, generateHMAC, isHMACRequired)
   - `Utils/security/hmac.ts` - Simpler (hmacSign, hmacVerify)
   
   **Usage**:
   - `app/api/match-users/route.ts` uses BOTH (needs fixing)
   - `app/api/generate-embeddings/route.ts` uses `Utils/auth/hmac.ts`
   - `app/api/user-matches/route.ts` uses `Utils/auth/hmac.ts`
   - Tests use `Utils/security/hmac.ts`

   **Recommendation**: Keep `Utils/auth/hmac.ts`, migrate tests to use it, delete `Utils/security/hmac.ts`

4. **Empty API endpoints** - These directories exist but may not have route.ts:
   - `app/api/cache/` - Empty directory
   - `app/api/create-test-user/` - Empty directory (dev only)
   - `app/api/debug-resend/` - Empty directory (dev only)
   - `app/api/sample-email-preview/` - Empty directory (dev only)
   - `app/api/sample-jobs/` - Empty directory (dev only)
   - `app/api/test-email-preview/` - Empty directory (dev only)
   - `app/api/webhook-tally/` - Empty directory
   - `app/api/job-queue/` - Empty directory
   - `app/api/redirect-to-job/` - Empty directory
   - `app/api/send-scheduled-emails/` - Empty directory
   - `app/api/cron/process-ai-matching/` - Empty directory
   - `app/api/cron/process-email-queue/` - Empty directory
   - `app/api/cron/process-queue/` - Empty directory

   **Action**: Remove empty directories or document their purpose

5. **Console.log cleanup** - 186 instances found:
   - Replace with structured logger from `lib/monitoring.ts`
   - Keep error logging but use Sentry
   - Remove debug console.logs

## 📋 NEXT STEPS

6. **Audit unused lib exports**:
   - `lib/date-helpers.ts` - Several unused functions
   - `lib/copy.ts` - Unused constants (old copy)
   - `lib/auth.ts` - Unused validation functions

7. **Standardize error handling**:
   - Some use `errorResponse` helper
   - Some use `NextResponse.json`
   - Some throw errors
   - Pick one pattern

8. **Type safety improvements**:
   - Replace `any` types with proper types
   - Use database.types.ts consistently

