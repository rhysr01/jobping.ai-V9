# Debugging: API Key Invalid Even Though Keys Match

## 🔍 The Problem
You've verified that `.env` and Vercel have the same `RESEND_API_KEY`, but you're still getting:
```
"API key is invalid" (401)
```

## ✅ Step-by-Step Debugging

### Step 1: Check What Key is Actually Being Used

Visit your test endpoint in production:
```
https://your-domain.com/api/test-resend?to=your@email.com
```

Look at the `tests.environment.diagnostics` section. It will show:
- `hasLeadingSpace`: true/false
- `hasTrailingSpace`: true/false  
- `hasNewlines`: true/false
- `hasQuotes`: true/false
- `looksValid`: true/false

**Common Issues Found:**
- ✅ Key has leading/trailing spaces
- ✅ Key has quotes around it (`"re_..."` instead of `re_...`)
- ✅ Key has newlines
- ✅ Key is empty after trimming

### Step 2: Verify Key in Resend Dashboard

1. **Go to Resend**: https://resend.com/api-keys
2. **Check ALL your API keys**:
   - Are any marked as "Active"?
   - Are any marked as "Revoked" or "Expired"?
   - What's the exact name/description of each key?

3. **Compare the first 10 characters**:
   - In Resend: Copy the first 10 chars of an active key
   - In Vercel: Check what `apiKeyPrefix` shows in test endpoint
   - **Do they match?**

### Step 3: Test Key Directly with curl

Test your API key directly against Resend API:

```bash
curl -X GET "https://api.resend.com/domains" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json"
```

**Expected Response (if valid):**
```json
{
  "data": [
    {
      "name": "getjobping.com",
      "status": "verified",
      ...
    }
  ]
}
```

**If Invalid:**
```json
{
  "statusCode": 401,
  "name": "validation_error",
  "message": "API key is invalid"
}
```

### Step 4: Common Issues & Fixes

#### Issue 1: Key Has Whitespace
**Symptoms**: `hasWhitespace: true` in diagnostics

**Fix**:
1. In Vercel, edit `RESEND_API_KEY`
2. **Select all** and delete
3. Paste key again (make sure no spaces)
4. Save and redeploy

#### Issue 2: Key Has Quotes
**Symptoms**: `hasQuotes: true` in diagnostics

**Fix**:
- Remove quotes from the value
- Should be: `re_abc123...`
- NOT: `"re_abc123..."` or `'re_abc123...'`

#### Issue 3: Key is Wrong Account
**Symptoms**: Key format looks correct but still invalid

**Fix**:
- Verify you're logged into the correct Resend account
- Check if you have multiple Resend accounts
- Ensure the key belongs to the account that has `getjobping.com` verified

#### Issue 4: Key Was Revoked/Expired
**Symptoms**: Key worked before but stopped working

**Fix**:
1. Go to Resend → API Keys
2. Check if key shows as "Revoked" or "Expired"
3. Create a new key
4. Update in Vercel
5. Redeploy

#### Issue 5: Vercel Environment Not Applied
**Symptoms**: Key looks correct but still fails

**Fix**:
1. **Double-check environment**:
   - In Vercel, ensure `RESEND_API_KEY` is set for **Production**
   - Not just Preview or Development

2. **Force redeploy**:
   - Go to Deployments
   - Click "Redeploy" on latest deployment
   - **Don't use "Redeploy with existing build"** - do a full redeploy

3. **Verify after deploy**:
   - Wait for deployment to complete
   - Test endpoint again
   - Check if key is now working

### Step 5: Nuclear Option - Create Fresh Key

If nothing works, create a completely new key:

1. **In Resend**:
   - Go to https://resend.com/api-keys
   - Click "Create API Key"
   - Name: "JobPing Production - Fresh"
   - Copy the key immediately

2. **In Vercel**:
   - Delete old `RESEND_API_KEY`
   - Create new `RESEND_API_KEY` with fresh key
   - Set for Production
   - Save

3. **Redeploy**:
   - Full redeploy (not cached)
   - Wait for completion

4. **Test**:
   - Test endpoint should now work
   - Try signup flow

## 🔬 Diagnostic Checklist

Run through this checklist:

- [ ] Test endpoint shows `apiKeyPrefix` matches Resend dashboard
- [ ] Test endpoint shows `looksValid: true`
- [ ] No whitespace issues (`hasWhitespace: false`)
- [ ] No quote issues (`hasQuotes: false`)
- [ ] Key exists and is "Active" in Resend dashboard
- [ ] Key is set for Production environment in Vercel
- [ ] Full redeploy completed after updating key
- [ ] curl test with key works directly
- [ ] Domain `getjobping.com` is verified in Resend

## 📊 What to Check in Test Endpoint Response

After visiting `/api/test-resend`, check:

```json
{
  "tests": {
    "environment": {
      "apiKeyPrefix": "re_1234567",  // Should match Resend
      "apiKeyLength": 40,            // Should be ~40+ chars
      "diagnostics": {
        "hasLeadingSpace": false,    // Should be false
        "hasTrailingSpace": false,   // Should be false
        "hasQuotes": false,          // Should be false
        "looksValid": true            // Should be true
      }
    },
    "apiKey": {
      "success": false,              // This will be false if key invalid
      "error": "..."                 // Check error message
    }
  }
}
```

## 🎯 Most Likely Causes (in order)

1. **Key has whitespace** (leading/trailing spaces)
2. **Key was revoked/expired** in Resend
3. **Wrong Resend account** (key belongs to different account)
4. **Vercel not redeployed** after updating key
5. **Key set for wrong environment** (Preview instead of Production)

## 💡 Quick Test

Run this to see exactly what key is being used:

```bash
# Replace with your actual domain
curl "https://your-domain.com/api/test-resend?to=test@example.com" | jq '.tests.environment'
```

This will show you the exact key prefix, length, and any issues.

