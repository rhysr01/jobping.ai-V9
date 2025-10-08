# 🔧 Fix: Tally Webhook Using Wrong Domain

## The Problem

Vercel has multiple domains:
- ✅ `getjobping.com` (your custom domain)
- ⚠️  `your-project.vercel.app` (Vercel subdomain)

If Tally webhook is configured to send to the `.vercel.app` domain, but your environment variables are only set for `getjobping.com`, emails won't work!

## ✅ Solution: Update Tally Webhook URL

### Step 1: Check Current Webhook URL in Tally

1. Go to your Tally form
2. Click **Settings** → **Integrations** → **Webhooks**
3. Check the webhook URL

**Is it pointing to:**
- ❌ `https://something.vercel.app/api/webhook-tally`
- ✅ `https://getjobping.com/api/webhook-tally`

### Step 2: Update to Correct Domain

If it's using `.vercel.app`, change it to:
```
https://getjobping.com/api/webhook-tally
```

### Step 3: Make getjobping.com the Primary Domain in Vercel

1. Go to Vercel Dashboard → Your Project → **Settings → Domains**
2. Find `getjobping.com` in the list
3. Click the **⋮** (three dots) menu
4. Select **"Set as Production Domain"**
5. This ensures all traffic goes to getjobping.com

### Step 4: Remove or Redirect Old Vercel Domain

**Option A: Keep but redirect (recommended)**
- Leave `.vercel.app` domain
- It will auto-redirect to `getjobping.com`

**Option B: Remove completely**
- Click **⋮** on `.vercel.app` domain
- Select "Remove"

## 🧪 Test After Fixing

1. Update Tally webhook URL to `https://getjobping.com/api/webhook-tally`
2. Submit a test signup
3. Check Vercel logs for the webhook function
4. Email should now send!

## 📊 Why This Matters

Environment variables in Vercel can be scoped to specific domains. If:
- Webhook hits: `something.vercel.app/api/webhook-tally`
- But `RESEND_API_KEY` is only set for: `getjobping.com`
- Then the API key won't be available and emails fail!

**Fix:** Make sure webhook uses `getjobping.com` and that domain is set as Production.
