# Sentry Error Tracking Summary

**Date**: January 23, 2026  
**Status**: ⚠️ Sentry MCP not configured (404 errors)

## Error Types Tracked in Free Signup Flow

### Server-Side Errors (API Route: `/app/api/signup/free/route.ts`)

#### 1. **Rate Limit Exceeded** ⚠️ WARNING
- **Location**: Line 356
- **Tag**: `error_type: "rate_limit"`
- **Context**: IP address, requestId
- **Frequency**: When user exceeds 10 requests/hour

#### 2. **Validation Failed** ⚠️ WARNING  
- **Location**: Line 408
- **Tag**: `error_type: "validation"`
- **Context**: Email, cities, careerPath, full request body, zod errors
- **Common Causes**: Missing fields, invalid email, invalid name format

#### 3. **User Check Error** ❌ ERROR
- **Location**: Line 479, 497
- **Tag**: `error_type: "user_check"` or `"user_check_unexpected"`
- **Context**: Email, error code/message
- **Common Causes**: Database connection issues, RLS policy issues

#### 4. **User Creation Failed** ❌ ERROR
- **Location**: Line 624
- **Tag**: `error_type: "user_creation"`
- **Context**: Email, stage (minimal_user_insert)
- **Common Causes**: Database constraints, UUID generation issues

#### 5. **User Update Failed** ⚠️ WARNING
- **Location**: Line 682
- **Tag**: `error_type: "user_update"`
- **Context**: Email, stage (user_field_update)
- **Common Causes**: Schema cache issues, field type mismatches

#### 6. **No Jobs Found** ⚠️ WARNING
- **Location**: Line 868
- **Tag**: `error_type: "no_jobs_found"`
- **Context**: Cities, careerPath, reason, jobsError
- **Common Causes**: No jobs in database, filtering too strict

#### 7. **No Jobs for Matching** ⚠️ WARNING
- **Location**: Line 928
- **Tag**: `error_type: "no_jobs_for_matching"`
- **Context**: TargetCities, careerPath
- **Common Causes**: All jobs filtered out before matching

#### 8. **No Matches Found** ℹ️ INFO
- **Location**: Line 993
- **Tag**: `error_type: "no_matches_found"`
- **Context**: JobsAvailable, method, reason, cities, careerPath
- **Common Causes**: Matching engine filters too strict, no suitable jobs

---

### Client-Side Errors (Component: `/components/signup/SignupFormFree.tsx`)

#### 9. **Client-Side Validation Error** ⚠️ WARNING
- **Location**: Line 353
- **Tag**: `error_type: "client_validation"`, `status_code: 400`
- **Context**: FormData (email, cities, careerPath, gdprConsent), validationDetails, apiResponse
- **Common Causes**: Form validation fails before API call

#### 10. **API Error** ❌ ERROR
- **Location**: Line 379
- **Tag**: `error_type: "api_error"`, includes `status_code`
- **Context**: FormData, errorMessage, status, apiResponse
- **Common Causes**: Network errors, 4xx/5xx responses, timeout

#### 11. **Unexpected Error** ❌ ERROR
- **Location**: Line 400 (in catch block)
- **Tag**: `error_type: "unexpected_error"`
- **Context**: FormData, errorMessage
- **Common Causes**: Non-ApiError exceptions, unexpected failures

---

### Global Error Tracking

#### 12. **Error Boundary** ❌ ERROR
- **Location**: `/components/error-boundary.tsx` Line 35
- **Tag**: `errorBoundary: true`, `errorType: error.name`
- **Context**: Component stack, error message, error stack
- **Common Causes**: React rendering errors, component crashes

#### 13. **Global Error Handler** ❌ ERROR
- **Location**: `/app/global-error.tsx` Line 15
- **Tag**: `errorBoundary: "global"`, includes `digest`
- **Context**: Error stack
- **Common Causes**: Unhandled exceptions, Next.js errors

---

## Error Tags Used

All errors include these tags for filtering:
- `endpoint: "signup-free"` (server-side)
- `error_type: <specific_type>` (see above)
- `status_code: <http_status>` (client-side API errors)

## Error Context Data

All errors include:
- **Request ID** (server-side) - for tracing requests
- **Email** (when available) - for user identification
- **Form Data** (client-side) - cities, careerPath, etc.
- **Error Details** - specific error messages, stack traces

---

## How to Check Sentry (Manual)

Since MCP isn't configured, check Sentry directly:

1. **Go to Sentry Dashboard**: https://sentry.io
2. **Filter by**:
   - Project: Your JobPing project
   - Tags: `endpoint:signup-free`
   - Time range: Last 24 hours / 7 days
3. **Look for patterns**:
   - High frequency of `validation` errors → Form issues
   - High frequency of `user_creation` → Database issues
   - High frequency of `no_jobs_found` → Data/scraping issues
   - High frequency of `api_error` → Network/server issues

---

## Common Error Patterns to Watch

### 🔴 Critical Issues
- **`user_creation`** errors → Users can't sign up
- **`api_error` with 500 status** → Server crashes
- **`no_jobs_for_matching`** → Database empty or filtering broken

### 🟡 Warning Issues  
- **`validation` errors** → Form UX issues, user confusion
- **`no_matches_found`** → Matching too strict, need to adjust
- **`rate_limit`** → Legitimate users hitting limits

### 🟢 Info Issues
- **`no_matches_found`** (info level) → Expected when no suitable jobs

---

## Next Steps

1. **Configure Sentry MCP** - Fix the 404 error in MCP configuration
2. **Set up Alerts** - Alert on critical error types (`user_creation`, 500 errors)
3. **Monitor Trends** - Track error rates over time
4. **Review Patterns** - Weekly review of error patterns to identify UX issues

---

## Recent Fixes Applied

✅ **Console logging added** - Comprehensive F12 debugging logs  
✅ **Hydration error fixed** - React error #185 resolved  
✅ **Error tracking comprehensive** - All error paths tracked in Sentry
