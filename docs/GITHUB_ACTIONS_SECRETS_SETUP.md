# GitHub Actions Secrets Setup Guide

**Date**: December 28, 2025  
**Status**: ⚠️ **REQUIRED FOR WORKFLOW TO RUN**

## 🚨 Current Issue

The workflow is failing because required secrets are not configured in GitHub.

**Error**: `❌ SUPABASE_URL secret is missing`

## 📋 Required Secrets

### Critical (Workflow will fail without these):

1. **`SUPABASE_URL`** ⚠️ **MISSING**
   - Your Supabase project URL
   - Format: `https://xxxxx.supabase.co`
   - Get from: Supabase Dashboard → Settings → API → Project URL

2. **`SUPABASE_SERVICE_ROLE_KEY`** ⚠️ **REQUIRED**
   - Your Supabase service role key (has full database access)
   - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Get from: Supabase Dashboard → Settings → API → service_role key
   - ⚠️ **Keep this secret!** Never commit to code.

### Optional (Scrapers will skip if missing):

3. **`ADZUNA_APP_ID`** (Optional)
   - Adzuna API App ID
   - Get from: [Adzuna API Dashboard](https://developer.adzuna.com/)
   - Without this: Adzuna scraper will skip

4. **`ADZUNA_APP_KEY`** (Optional)
   - Adzuna API App Key
   - Get from: [Adzuna API Dashboard](https://developer.adzuna.com/)
   - Without this: Adzuna scraper will skip

5. **`REED_API_KEY`** (Optional)
   - Reed.co.uk API Key
   - Get from: [Reed API Portal](https://www.reed.co.uk/developers)
   - Without this: Reed scraper will skip

6. **`OPENAI_API_KEY`** (Optional)
   - OpenAI API key for AI matching
   - Get from: [OpenAI Platform](https://platform.openai.com/api-keys)
   - Without this: AI matching will be disabled

7. **`CAREERJET_API_KEY`** (Optional)
   - CareerJet API key
   - Without this: CareerJet scraper will skip

8. **`MUSE_API_KEY`** (Optional)
   - The Muse API key
   - Without this: Muse scraper will skip

9. **`RESEND_API_KEY`** (Optional)
   - Resend API key for email sending
   - Get from: [Resend Dashboard](https://resend.com/api-keys)
   - Without this: Email sending will fail

10. **`JOBPING_API_KEY`** (Optional)
    - Internal API key for authentication
    - Without this: Some API endpoints may fail

## 🔧 How to Add Secrets to GitHub

### Step 1: Navigate to Repository Settings
1. Go to your GitHub repository: `https://github.com/rhysr01/jobping.ai-V9`
2. Click **Settings** (top navigation)
3. In the left sidebar, click **Secrets and variables** → **Actions**

### Step 2: Add Each Secret
1. Click **New repository secret**
2. Enter the secret name (e.g., `SUPABASE_URL`)
3. Enter the secret value
4. Click **Add secret**
5. Repeat for all required secrets

### Step 3: Verify Secrets
After adding secrets, the workflow should run successfully. You can verify by:
1. Going to **Actions** tab
2. Clicking on the latest workflow run
3. Checking that it passes the "Validate required secrets" step

## 📝 Quick Setup Checklist

- [ ] `SUPABASE_URL` - **REQUIRED** ⚠️
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - **REQUIRED** ⚠️
- [ ] `ADZUNA_APP_ID` - Optional (for Adzuna scraper)
- [ ] `ADZUNA_APP_KEY` - Optional (for Adzuna scraper)
- [ ] `REED_API_KEY` - Optional (for Reed scraper)
- [ ] `OPENAI_API_KEY` - Optional (for AI matching)
- [ ] `RESEND_API_KEY` - Optional (for email sending)

## 🔍 Finding Your Supabase Credentials

### Supabase URL:
1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **Settings** → **API**
4. Copy **Project URL** (looks like `https://xxxxx.supabase.co`)

### Supabase Service Role Key:
1. In the same **Settings** → **API** page
2. Find **service_role** key (under "Project API keys")
3. Click **Reveal** to show the key
4. Copy the entire key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

⚠️ **Security Note**: The service_role key has full database access. Never commit it to code or share it publicly.

## ✅ After Setup

Once secrets are configured:
1. The workflow will pass the validation step
2. Scrapers will run with the provided credentials
3. Jobs will be saved to your Supabase database

## 🐛 Troubleshooting

### "Secret is missing" error:
- Verify the secret name matches exactly (case-sensitive)
- Check that you're in the correct repository
- Ensure you clicked "Add secret" after entering the value

### "Invalid credentials" error:
- Verify the secret values are correct
- Check for extra spaces or newlines
- For Supabase: Ensure you're using the service_role key, not the anon key

### Scraper still fails:
- Check the workflow logs for specific error messages
- Verify API keys are valid and not expired
- Check API rate limits haven't been exceeded

