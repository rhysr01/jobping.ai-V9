# Free Tier Signup Debugging Guide

## Overview

Enhanced debugging logging has been added to make it **much easier** to track the free tier signup flow. Instead of manually searching through console logs, you now have structured, color-coded logs with a simple API.

## Quick Start

### 1. **Open Browser DevTools**
```
Press F12 or Cmd+Option+I
```

### 2. **Access Debug Logger**
```javascript
window.debugLogger
```

### 3. **View All Logs**
```javascript
window.debugLogger.getHistory()
```

### 4. **Search by Stage**
```javascript
// See all logs for a specific stage
window.debugLogger.getStageHistory('FORM_SUBMIT')
window.debugLogger.getStageHistory('VALIDATION')
window.debugLogger.getStageHistory('SUBMIT_API_RESPONSE')
```

### 5. **Search by Level**
```javascript
// See all errors
window.debugLogger.getLevelHistory('error')

// See all warnings
window.debugLogger.getLevelHistory('warning')

// See all success logs
window.debugLogger.getLevelHistory('success')
```

### 6. **Export Logs**
```javascript
// Copy logs as JSON for sharing/analysis
copy(window.debugLogger.exportHistory())
```

## Available Log Stages

| Stage | Purpose | Examples |
|-------|---------|----------|
| **INIT** | Component initialization | Initial step, form data setup |
| **MOUNT** | Component mounted | Ready for interaction |
| **STEP_CHANGE** | User navigates between steps | Step 1 → Step 2 |
| **FORM_VALIDATION** | Field validation | Email valid? Cities selected? |
| **USER_ACTION** | User interactions | Button clicks, field changes |
| **SUBMIT** | Form submission flow | Validation, API calls, success/error |
| **VALIDATION** | Client-side validation | Form field checks before submission |
| **SUBMIT_START** | Submission initiated | Form submission begins |
| **SUBMIT_STAGE** | Multi-stage progress | Stage 1, Stage 2, Stage 3 |
| **SUBMIT_API_DATA** | API payload preparation | Data transformation |
| **SUBMIT_API_RESPONSE** | API response received | Success/error from server |
| **SUBMIT_SUCCESS** | Successful submission | User data saved, matches found |
| **SUBMIT_ERROR** | Error during submission | Any failure point |
| **SUBMIT_VALIDATION_ERROR** | API validation errors | Field validation from server |
| **SUBMIT_MAPPED_ERRORS** | Error field mapping | Converting API errors to UI fields |
| **SUBMIT_FINAL_ERROR** | Final error summary | Complete error details |
| **REDIRECT** | Post-submission redirect | Redirecting to matches page |

## Log Levels

| Level | Color | Emoji | Usage |
|-------|-------|-------|-------|
| **success** | 🟢 Green | ✅ | Successful operations |
| **error** | 🔴 Red | ❌ | Failures and exceptions |
| **warning** | 🟡 Amber | ⚠️ | Potential issues |
| **step** | 🔵 Cyan | 📍 | Process steps/milestones |
| **info** | 🔵 Blue | ℹ️ | General information |
| **debug** | 🟣 Purple | 🐛 | Detailed debugging info |

## Common Debugging Scenarios

### Scenario 1: Form Won't Submit

**Quick Diagnosis:**
```javascript
// 1. Check validation errors
window.debugLogger.getStageHistory('VALIDATION')

// 2. See what validation failed
window.debugLogger.getStageHistory('SUBMIT')

// 3. Check form data at submission
window.debugLogger.getLevelHistory('error')
```

**Expected Log Sequence:**
```
✅ VALIDATION: All client-side validations passed
📍 SUBMIT_START: Starting form submission
📍 SUBMIT_STAGE: Stage 1: Validation (30%)
📍 SUBMIT_STAGE: Stage 2: API Call (40%)
✅ SUBMIT_API_RESPONSE: API response received
✅ SUBMIT_SUCCESS: Signup successful!
```

### Scenario 2: API Validation Error (400 Bad Request)

**Quick Diagnosis:**
```javascript
// Get the specific validation error
window.debugLogger.getStageHistory('SUBMIT_VALIDATION_ERROR')

// See what fields failed
window.debugLogger.getStageHistory('SUBMIT_MAPPED_ERRORS')

// Get full error details
window.debugLogger.getLevelHistory('error')
```

**Common Errors:**
- Missing required cities
- Missing required career path
- Invalid visa status
- Missing GDPR consent
- Age verification not set

### Scenario 3: Email Validation Issue

**Quick Diagnosis:**
```javascript
// Check email validation
window.debugLogger.getStageHistory('FORM_VALIDATION')
  .filter(log => log.data?.fieldName === 'email')

// Or simpler
window.debugLogger.getHistory()
  .filter(log => log.message.includes('email'))
```

### Scenario 4: Step Navigation Issues

**Quick Diagnosis:**
```javascript
// See all step changes
window.debugLogger.getStageHistory('STEP_CHANGE')

// Check what happened on mount
window.debugLogger.getStageHistory('MOUNT')

// Check initialization
window.debugLogger.getStageHistory('INIT')
```

### Scenario 5: API Connection Error

**Quick Diagnosis:**
```javascript
// Get API response logs
window.debugLogger.getStageHistory('SUBMIT_API_RESPONSE')

// Check for network errors
window.debugLogger.getStageHistory('SUBMIT_ERROR')

// See error details
const errors = window.debugLogger.getLevelHistory('error');
errors.forEach(log => console.log(log.message, log.data));
```

## Log Data Structures

### Validation Log Example
```javascript
{
  timestamp: "2026-01-27T14:23:45.123Z",
  level: "error",
  stage: "VALIDATION",
  message: "Client-side validation failed",
  data: {
    errors: {
      cities: "Please select at least one city",
      careerPath: "Please select at least one career path"
    }
  }
}
```

### API Response Log Example
```javascript
{
  timestamp: "2026-01-27T14:23:50.456Z",
  level: "success",
  stage: "SUBMIT_API_RESPONSE",
  message: "API response received",
  data: {
    userId: "user-12345",
    matchCount: 5,
    email: "user@example.com",
    status: "success"
  },
  duration: 1234  // milliseconds
}
```

## Tips & Tricks

### 1. **Monitor Live**
Keep the console open and watch logs appear in real-time as you fill out the form.

### 2. **Table View**
```javascript
// View all errors in a table
console.table(window.debugLogger.getLevelHistory('error'))
```

### 3. **Filter Complex Data**
```javascript
// Find all logs with duration > 1 second
window.debugLogger.getHistory()
  .filter(log => log.duration && log.duration > 1000)

// Find all API errors
window.debugLogger.getHistory()
  .filter(log => log.stage.includes('API') && log.level === 'error')
```

### 4. **Clear Logs**
```javascript
window.debugLogger.clearHistory()
```

### 5. **Share Logs**
```javascript
// Copy all logs to clipboard as JSON
copy(window.debugLogger.exportHistory())

// Then paste in Slack/email for others to analyze
```

## Production vs Development

- **Development**: All logs are displayed with colors and emojis
- **Production**: Logs are collected silently (no console output)
- **Development-Only Grouped Logs**: `console.group()` only in dev mode

## Performance Impact

- **Minimal**: Logs are only stored in memory (~500 log limit per session)
- **No Network**: Logs don't send data anywhere by default
- **Cleanup**: Old logs are automatically pruned to prevent memory bloat

## Integration Points

### Client-Side Logging (Components)

```javascript
import { debugLogger } from "@/lib/debug-logger";

// Log a simple message
debugLogger.info("STAGE", "Something happened", { data: value });

// Log success
debugLogger.success("STAGE", "Operation completed", { result: value });

// Create a tracker for multi-step operations
const tracker = debugLogger.createTracker("OPERATION");
tracker.checkpoint("Step 1 complete");
tracker.complete("All steps complete", { finalData: value });

// Log validation
debugLogger.logValidation("email", isValid, emailValue, errorMsg);

// Log API calls
debugLogger.logApiCall("/api/endpoint", "POST", requestData);
debugLogger.logApiResponse("/api/endpoint", 200, responseData, durationMs);
```

### Stages Currently Logged

**SignupFormFree Component:**
- ✅ INIT - Initialization
- ✅ MOUNT - Component mounting
- ✅ STEP_CHANGE - Step navigation
- ✅ VALIDATION - Form validation
- ✅ SUBMIT_* - All submission stages
- ✅ FORM_VALIDATION - Individual field validation

**API Route (Free Signup):**
- ✅ Request received with metadata
- ✅ Rate limiting checks
- ✅ Request body logging
- ✅ Validation results
- ✅ Error details

## Troubleshooting the Debugger

### Logger Not Available?

```javascript
// Check if it's defined
window.debugLogger
// Should return an object with methods

// Check if you're in development mode
process.env.NODE_ENV
// Should be "development"

// If running locally with npm run dev
// The logger should be initialized when page loads
```

### Logs Not Appearing?

1. Check browser console is open (F12)
2. Make sure you're on a page that uses SignupFormFree
3. Check that NODE_ENV is 'development'
4. Try refreshing the page

### Want to Add More Logging?

See the component code for examples:
- `components/signup/SignupFormFree.tsx` - Client-side logging
- `app/api/signup/free/route.ts` - Server-side logging (uses existing console logs)

## Example: Full Signup Flow Logs

```
📍 [INIT] SignupFormFree component mounting
📍 [MOUNT] Component mounted successfully
📍 [STEP_CHANGE] Step navigation (step: 1)
ℹ️ [USER_ACTION] User filled email: user@example.com
📍 [STEP_CHANGE] Step navigation (step: 2)
ℹ️ [USER_ACTION] User selected cities: London, Berlin
📍 [STEP_CHANGE] Step navigation (step: 3)
ℹ️ [USER_ACTION] User selected career paths: graduate, intern
✅ [VALIDATION] All client-side validations passed
📍 [SUBMIT_START] Starting form submission
📍 [SUBMIT_STAGE] Stage 1: Validation (30%)
🐛 [SUBMIT_API_DATA] Prepared API payload
📍 [SUBMIT_STAGE] Stage 2: API Call (40%)
✅ [SUBMIT_API_RESPONSE] API response received
📍 [SUBMIT_STAGE] Stage 3: Success (100%)
✅ [SUBMIT_SUCCESS] Signup successful!
📍 [REDIRECT] Redirecting to matches page
```

## Need More Help?

Check the console messages on page load for available commands:

```
🔧 Debug Logger Loaded - Use window.debugLogger to access logs
Available commands:
  • window.debugLogger.getHistory() - View all logs
  • window.debugLogger.getStageHistory('STAGE_NAME') - Filter by stage
  • window.debugLogger.getLevelHistory('error') - Filter by level
  • window.debugLogger.exportHistory() - Export as JSON
  • window.debugLogger.clearHistory() - Clear logs
```

---

**Created**: 2026-01-27  
**Updated**: With enhanced debug logger system  
**For**: Free tier signup debugging
