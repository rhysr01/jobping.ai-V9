# Fix: Resend API Key Invalid Error

## 🔴 Problem
```
Resend API error: {"statusCode":401,"name":"validation_error","message":"API key is invalid"}
```

## ✅ Solution Steps

### Step 1: Get a New Valid API Key from Resend

1. **Go to Resend Dashboard**: https://resend.com/api-keys
2. **Check existing keys**:
   - Look for any active keys
   - If all are expired/revoked, create a new one
3. **Create new API key** (if needed):
   - Click "Create API Key"
   - Give it a name: "JobPing Production"
   - Copy the key immediately (starts with `re_`)
   - ⚠️ **You can only see it once!**

### Step 2: Update Vercel Environment Variable

1. **Go to Vercel Dashboard**:
   - Navigate to your project
   - Go to **Settings** → **Environment Variables**

2. **Find `RESEND_API_KEY`**:
   - Check if it exists
   - Check which environments it's set for (Production, Preview, Development)

3. **Update the key**:
   - Click on `RESEND_API_KEY`
   - Replace the value with your new key
   - Ensure it starts with `re_`
   - Make sure it's set for **Production** environment
   - Save

4. **Verify format**:
   - Should look like: `re_1234567890abcdef...`
   - Should be ~40+ characters long
   - No spaces or extra characters

### Step 3: Redeploy

**Important**: After updating environment variables, you MUST redeploy:

1. **Option A: Trigger redeploy**:
   - Go to **Deployments** tab
   - Click **"Redeploy"** on latest deployment
   - Or push a new commit to trigger auto-deploy

2. **Option B: Wait for next deploy**:
   - If you have auto-deploy enabled, wait for next push

### Step 4: Verify It Works

1. **Test the endpoint**:
   ```
   https://your-domain.com/api/test-resend?to=your@email.com
   ```

2. **Expected response**:
   ```json
   {
     "summary": {
       "apiKeyWorking": true,
       "emailSending": true,
       "overallStatus": "SUCCESS"
     }
   }
   ```

3. **Test signup**:
   - Complete a signup form
   - Check logs for: `[EMAIL] ✅ Welcome email sent successfully`
   - Check your email inbox

## 🔍 Troubleshooting

### If test endpoint still fails:

1. **Check API key format**:
   - Must start with `re_`
   - No extra spaces or quotes
   - Full key copied (not truncated)

2. **Check Resend account**:
   - Log into https://resend.com
   - Verify account is active
   - Check for any account restrictions
   - Verify billing/subscription status

3. **Check domain verification**:
   - Go to https://resend.com/domains
   - Verify `getjobping.com` shows as "Verified"
   - If not verified, complete DNS verification

4. **Check API key permissions**:
   - In Resend dashboard, check API key permissions
   - Ensure it has "Send Email" permission
   - Ensure it's not restricted to specific domains (unless that's intentional)

### Common Mistakes:

❌ **Wrong**: `RESEND_API_KEY=re_abc123` (with quotes or spaces)
✅ **Correct**: `RESEND_API_KEY=re_abc123...` (no quotes, no spaces)

❌ **Wrong**: Key set only for Development, not Production
✅ **Correct**: Key set for Production environment

❌ **Wrong**: Updated env var but didn't redeploy
✅ **Correct**: Updated env var AND redeployed

## 📋 Quick Checklist

- [ ] Got new API key from Resend (starts with `re_`)
- [ ] Updated `RESEND_API_KEY` in Vercel
- [ ] Set for Production environment
- [ ] No extra spaces/quotes in the key
- [ ] Redeployed the application
- [ ] Tested `/api/test-resend` endpoint
- [ ] Verified domain `getjobping.com` is verified in Resend
- [ ] Tested actual signup flow

## 🎯 After Fixing

Once the API key is fixed:
- Emails should send successfully
- You'll see `[EMAIL] ✅` in logs instead of `[EMAIL] ❌`
- Users will receive welcome emails
- Safety net won't need to trigger

