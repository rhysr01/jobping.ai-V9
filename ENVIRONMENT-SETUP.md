# 🔐 Environment Variables Setup for Production

## Required Environment Variables

You need to set up these environment variables before deploying to production:

### 1. Database Configuration
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**How to get these:**
1. Go to your Supabase project dashboard
2. Settings → API
3. Copy the Project URL and service_role key

### 2. Email Configuration
```bash
RESEND_API_KEY=re_your-resend-api-key
```

**How to get this:**
1. Sign up at resend.com
2. Go to API Keys
3. Create a new API key

### 3. OpenAI Configuration
```bash
OPENAI_API_KEY=sk-your-openai-api-key
```

**How to get this:**
1. Go to platform.openai.com
2. API Keys section
3. Create a new secret key

### 4. Stripe Configuration
```bash
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_PUBLIC_KEY=pk_live_your-stripe-public-key
```

**How to get these:**
1. Go to dashboard.stripe.com
2. Developers → API Keys
3. Copy the Publishable and Secret keys

### 5. Webhook Security
```bash
TALLY_WEBHOOK_SECRET=your-random-secret-string
VERIFICATION_TOKEN_PEPPER=your-random-pepper-string
```

**How to generate these:**
```bash
# Generate random secrets
openssl rand -hex 32
```

## Quick Setup Commands

### 1. Create .env.local file
```bash
cp ENV_TEMPLATE.md .env.local
```

### 2. Fill in the variables
Edit `.env.local` and replace all the placeholder values with your actual keys.

### 3. Verify setup
```bash
node scripts/production-launch.js
```

Should show: "ALL CHECKS PASSED - READY FOR PRODUCTION!"

## Vercel Environment Variables

After setting up locally, you'll need to add these to Vercel:

### Option 1: Vercel Dashboard
1. Go to your Vercel project
2. Settings → Environment Variables
3. Add each variable with the same name and value

### Option 2: Vercel CLI
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add RESEND_API_KEY
vercel env add OPENAI_API_KEY
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_PUBLIC_KEY
vercel env add TALLY_WEBHOOK_SECRET
vercel env add VERIFICATION_TOKEN_PEPPER
```

## Security Notes

1. **Never commit .env.local to git**
2. **Use different keys for development and production**
3. **Rotate secrets regularly**
4. **Monitor for exposed secrets in logs**

## Testing Your Setup

Once you've set up all environment variables:

```bash
# Run the production readiness check
node scripts/production-launch.js

# Should show all green checkmarks
```

---

**Next Step:** Once environment variables are set up, run the production launch script again to verify everything is ready for deployment.
