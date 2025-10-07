# 🚀 JobPing Production Deployment Guide

**Status**: Ready to deploy  
**Last Updated**: 2025-01-30  
**Estimated Time**: 30 minutes

---

## ✅ PRE-DEPLOYMENT CHECKLIST

- [x] Production build passes (`npm run build`)
- [x] E2E tests pass (26/26)
- [x] TypeScript errors resolved
- [x] ESLint warnings minimized
- [x] All code committed and pushed to GitHub
- [ ] Production environment variables configured
- [ ] Stripe products created
- [ ] Stripe webhook configured
- [ ] Domain DNS configured (if using custom domain)

---

## 📋 STEP-BY-STEP DEPLOYMENT

### **STEP 1: Configure Stripe Products** ⚡

1. **Go to Stripe Dashboard** → [Products](https://dashboard.stripe.com/products)

2. **Create Monthly Product**:
   - Click "+ New product"
   - Name: `JobPing Premium Monthly`
   - Description: `Premium job matching - 3 emails per week with 5 hand-picked roles each`
   - Pricing model: `Recurring`
   - Price: `€7.00 EUR`
   - Billing period: `Monthly`
   - Click "Save product"
   - **Copy the Price ID** (starts with `price_...`)

3. **Create Quarterly Product**:
   - Click "+ New product"
   - Name: `JobPing Premium Quarterly`
   - Description: `Premium job matching - Quarterly subscription (3 months)`
   - Pricing model: `Recurring`
   - Price: `€59.00 EUR`
   - Billing period: `Every 3 months`
   - Click "Save product"
   - **Copy the Price ID** (starts with `price_...`)

**Save these for Step 3!**

---

### **STEP 2: Configure Stripe Webhook** 🔗

1. **Go to Stripe Dashboard** → [Webhooks](https://dashboard.stripe.com/webhooks)

2. **Click "+ Add endpoint"**

3. **Endpoint URL**: 
   ```
   https://getjobping.com/api/webhooks/stripe
   ```
   *(Or your production domain)*

4. **Select events to listen to**:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`

5. **Click "Add endpoint"**

6. **Copy the Signing Secret** (starts with `whsec_...`)

**Save this for Step 3!**

---

### **STEP 3: Set Production Environment Variables** 🔐

**If using Vercel**:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable below

**If using Railway**:
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your project
3. Go to Variables tab
4. Add each variable below

**Required Variables**:
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Stripe LIVE Keys (from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY
NEXT_PUBLIC_STRIPE_KEY=pk_live_YOUR_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_YOUR_MONTHLY_PRICE
STRIPE_PREMIUM_QUARTERLY_PRICE_ID=price_YOUR_QUARTERLY_PRICE

# Email (Resend)
RESEND_API_KEY=re_YOUR_API_KEY

# System
NODE_ENV=production
NEXT_PUBLIC_URL=https://getjobping.com

# Optional but Recommended
SENTRY_DSN=https://YOUR_SENTRY_DSN
ENABLE_TEST_ENDPOINTS=false
```

**⚠️ CRITICAL**: Make sure you're using **LIVE** Stripe keys (`sk_live_...`, `pk_live_...`), not test keys!

---

### **STEP 4: Deploy to Production** 🌐

#### **Option A: Deploy via Vercel (Recommended)**

1. **Connect GitHub repo** (if not already connected):
   ```bash
   npx vercel --prod
   ```
   - Follow prompts to link your GitHub repo
   - Vercel will auto-detect Next.js

2. **Trigger deployment**:
   - Push to `main` branch (already done ✅)
   - Vercel will automatically build and deploy

3. **Verify deployment**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Check deployment status
   - Click on deployment to see build logs

#### **Option B: Deploy via Railway**

1. **Connect GitHub repo**:
   ```bash
   railway link
   ```

2. **Deploy**:
   ```bash
   railway up
   ```

3. **Verify**:
   - Check Railway dashboard
   - View deployment logs

#### **Option C: Manual Deploy (VPS/AWS/etc.)**

```bash
# On your server
git clone https://github.com/yourusername/jobping.git
cd jobping
npm ci --production
npm run build
npm start
```

---

### **STEP 5: Configure Domain DNS** 🌍

If using custom domain `getjobping.com`:

1. **Add DNS Records** (in your domain registrar):
   ```
   Type: A
   Name: @
   Value: [Your server IP or Vercel IP]
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com (or your host's CNAME)
   ```

2. **Verify in Vercel/Railway**:
   - Add custom domain in dashboard
   - Wait for SSL certificate (automatic)
   - Verify HTTPS works

---

### **STEP 6: Post-Deployment Verification** ✅

**Test these immediately after deployment**:

1. **Landing Page**:
   - [ ] Visit `https://getjobping.com`
   - [ ] Check all sections load correctly
   - [ ] Verify branding (indigo→purple gradient)
   - [ ] Test mobile responsiveness

2. **Tally Form**:
   - [ ] Click "Get my weekly 5" in Pricing
   - [ ] Verify Tally form opens with `?tier=free&source=pricing`
   - [ ] Click "Get 3 times weekly matches"
   - [ ] Verify Tally form opens with `?tier=premium&source=pricing`

3. **Webhook Integration**:
   - [ ] Submit test signup via Tally form
   - [ ] Check Supabase → `users` table for new entry
   - [ ] Verify welcome email sent (check email inbox)
   - [ ] Check Stripe Dashboard → no webhook errors

4. **Payment Flow** (Use Stripe test mode first):
   - [ ] Go to `/billing/test-user-id`
   - [ ] Verify page loads with premium styling
   - [ ] Test payment method addition

5. **API Health**:
   - [ ] Visit `https://getjobping.com/api/health`
   - [ ] Should return `{ status: 'healthy' }`

---

### **STEP 7: Monitor for 24 Hours** 👀

**Watch these metrics**:

1. **Vercel/Railway Dashboard**:
   - Build status
   - Response times
   - Error rates

2. **Stripe Dashboard**:
   - Webhook deliveries
   - Payment attempts
   - Customer creation

3. **Supabase Dashboard**:
   - User signups
   - Database queries
   - Error logs

4. **Resend Dashboard**:
   - Email delivery rate
   - Bounce rate
   - Open rate

---

## 🐛 TROUBLESHOOTING

### **Issue: Stripe webhook not working**
```bash
# Check webhook in Stripe Dashboard
# Verify STRIPE_WEBHOOK_SECRET matches
# Check /api/webhooks/stripe logs
```

### **Issue: Tally signups not creating users**
```bash
# Check /api/webhook-tally logs in Vercel
# Verify Tally webhook URL is correct
# Test with curl:
curl -X POST https://getjobping.com/api/webhook-tally \
  -H "Content-Type: application/json" \
  -d '{"eventType": "FORM_RESPONSE", ...}'
```

### **Issue: Emails not sending**
```bash
# Verify RESEND_API_KEY is correct
# Check Resend dashboard for failures
# Check /api/send-scheduled-emails logs
```

### **Issue: Build fails on Vercel**
```bash
# Check build logs in Vercel dashboard
# Verify all env vars are set
# Try local build: npm run build
```

---

## 📊 SUCCESS METRICS (Week 1)

Track these KPIs:

- [ ] **10+ signups** (Free tier)
- [ ] **1+ premium conversion** (€7 MRR)
- [ ] **< 5% error rate** (API/webhooks)
- [ ] **> 25% email open rate**
- [ ] **< 2% unsubscribe rate**
- [ ] **< 3s page load time**
- [ ] **Zero critical bugs**

---

## 🔄 ROLLBACK PLAN (If things go wrong)

### **Quick Rollback**:
```bash
# Vercel
vercel rollback

# Railway
railway rollback

# Manual
git revert HEAD
git push origin main
```

### **Emergency Disable**:
If emails are broken or sending spam:
```sql
-- In Supabase SQL Editor
UPDATE users SET email_paused = true;
```

---

## 🎯 FINAL CHECKLIST

Before you click deploy:

- [ ] Stripe LIVE keys configured (not test keys!)
- [ ] Domain DNS pointing to production server
- [ ] Webhook URLs use production domain
- [ ] All secrets in production env (not in code)
- [ ] Test Tally form submission manually
- [ ] Backup database (Supabase auto-backups enabled)
- [ ] Set up error monitoring (Sentry recommended)
- [ ] Prepare for customer support (email ready)

---

## 🚀 DEPLOY COMMAND

**Vercel**:
```bash
git push origin main
# Auto-deploys via GitHub integration
```

**Railway**:
```bash
railway up --detach
```

**Manual**:
```bash
npm run build
npm start
```

---

## 📞 POST-LAUNCH

1. **Tweet/post** your launch
2. **Share in student groups** (university Discord, Slack, Facebook)
3. **Monitor first 10 signups** closely
4. **Reply to feedback** within 24 hours
5. **Fix critical bugs** immediately
6. **Iterate on copy** based on conversion data

---

**Ready? Let's ship this! 🎉**

Which deployment platform are you using? (Vercel / Railway / Other)
