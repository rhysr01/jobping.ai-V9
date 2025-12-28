# JobSpy Root Cause Analysis - Deep Dive

**Date**: December 28, 2025  
**Status**: 🔴 **CRITICAL ISSUE IDENTIFIED**

## 🎯 Core Problem

**"TypeError: fetch failed"** errors are occurring when Supabase client tries to make HTTP requests, but the error handling is not properly catching these exceptions.

## 🔍 Root Cause Discovery

### The Issue

When `supabase.from('jobs').upsert()` is called, if the underlying `fetch` call fails (network issue), it can fail in **two ways**:

1. **Returns error property** (handled): `{ data: null, error: { message: '...' } }`
2. **Throws exception** (NOT properly handled): `TypeError: fetch failed` thrown directly

### Current Code Flow

```javascript
const result = await retryWithBackoff(async () => {
  const upsertResult = await supabase.from('jobs').upsert(...);
  if (upsertResult.error) {
    // Only handles case 1 - error property
    throw upsertResult.error;
  }
  return upsertResult;
}, 5, 2000);
```

**Problem**: If `await supabase.from('jobs').upsert(...)` throws an exception (case 2), it's caught by `retryWithBackoff`, but the error might not have the right properties to be detected as a network error.

### Why It Works Locally But Not in GitHub Actions

1. **Local**: Network is stable, fetch succeeds, errors come back as `error` property
2. **GitHub Actions**: Network is unstable, fetch throws exceptions before Supabase can process them

## 🔧 The Real Fix Needed

The `fetchWithTimeout` wrapper is catching the error and re-throwing it as a `NetworkError`, but the Supabase client might be catching it and re-throwing it differently, or the error might be happening at a different layer.

### Key Insight

The error "TypeError: fetch failed" is coming from Node.js's `undici` (the fetch implementation). This error:
- Has `name: 'TypeError'`
- Has `message: 'fetch failed'`
- Does NOT have `code`, `errno`, `syscall` properties (those are for Node.js system errors)

Our error detection checks for these properties, but the actual error might not have them.

## 🛠️ Solution

### Fix 1: Wrap the entire upsert call in try-catch

```javascript
const result = await retryWithBackoff(async () => {
  try {
    const upsertResult = await supabase.from('jobs').upsert(...);
    if (upsertResult.error) {
      // Handle Supabase error property
      throw upsertResult.error;
    }
    return upsertResult;
  } catch (error) {
    // Handle thrown exceptions (like fetch failed)
    // This is the missing piece!
    if (error instanceof TypeError && error.message?.includes('fetch failed')) {
      throw error; // Will be retried
    }
    throw error;
  }
}, 5, 2000);
```

### Fix 2: Better error detection

The error detection needs to handle the actual error structure from undici:

```javascript
const isNetworkError = 
  errorName === 'NetworkError' ||
  errorName === 'AbortError' ||
  errorName === 'TypeError' ||
  (error instanceof TypeError && errorMessage.includes('fetch failed')) ||
  errorMessage.toLowerCase().includes('fetch failed') ||
  // Add more undici-specific checks
  error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
  error.cause?.code === 'UND_ERR_SOCKET';
```

### Fix 3: Check if fetch is actually available

In GitHub Actions, `fetch` might not be available globally, causing the `fetchWithTimeout` to be `undefined`, which means the Supabase client uses its default fetch, which might not have our timeout/error handling.

## 📋 Implementation Plan

1. **Add try-catch around upsert call** - Catch exceptions, not just error properties
2. **Improve error detection** - Handle undici error codes
3. **Verify fetch availability** - Ensure our custom fetch wrapper is actually being used
4. **Add connection test** - Test Supabase connection before starting saves
5. **Better error logging** - Log the actual error object structure

## 🎯 Expected Outcome

After these fixes:
- Exceptions from fetch failures will be properly caught
- Network errors will be correctly identified and retried
- Enhanced logging will show the actual error structure
- Jobs should start saving successfully

