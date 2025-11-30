# Polar.sh Quick Start Checklist

## ✅ What You Need to Do TODAY

### 1. Polar.sh Account Setup (5 minutes)
- [ ] Sign up at [polar.sh](https://polar.sh)
- [ ] Verify your email
- [ ] Go to **Settings → API** → Generate access token
- [ ] Copy access token (starts with `polar_at_...`)

### 2. Create Product (2 minutes)
- [ ] Go to **Products** → **New Product**
- [ ] Name: "JobPing Premium"
- [ ] Type: Subscription (Monthly)
- [ ] Price: €5/month (or your price)
- [ ] Copy the **Product ID** (you'll need this!)

### 3. Set Up Payout Account (5 minutes) ⚠️ CRITICAL
- [ ] Go to **Finance** → **Payout Accounts**
- [ ] Click **Setup**
- [ ] Choose account type and complete setup
- [ ] **You won't receive payments without this!**

### 4. Configure Webhook (3 minutes)
- [ ] Go to **Settings → Webhooks**
- [ ] Add webhook URL: `https://getjobping.com/api/webhooks/polar`
- [ ] Select events:
  - ✅ `order.paid` (MOST IMPORTANT!)
  - ✅ `subscription.created`
  - ✅ `subscription.updated`
  - ✅ `subscription.canceled`
- [ ] Copy webhook secret (starts with `whsec_...`)

### 5. Set Environment Variables in Vercel (3 minutes)
Go to **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add these three variables:

```bash
POLAR_ACCESS_TOKEN=polar_at_xxxxxxxxxxxxx
POLAR_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
POLAR_PRODUCT_ID=prod_xxxxxxxxxxxxx  # Your product ID from step 2
```

**Important:** Set them for **Production**, **Preview**, and **Development** environments.

### 6. Redeploy (2 minutes)
- [ ] After adding env vars, trigger a new deployment
- [ ] Or push a commit to trigger auto-deploy

### 7. Test (5 minutes)
- [ ] Go to `/billing` page
- [ ] Click "Subscribe to Premium"
- [ ] Should redirect to Polar checkout
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Any future expiry (e.g., `12/34`)
- [ ] Any CVC (e.g., `123`)
- [ ] Complete checkout
- [ ] Should redirect to `/success` page
- [ ] Check logs - should see webhook received
- [ ] Check database - user `subscription_active` should be `true`

## 🎯 Total Time: ~25 minutes

## 🐛 If Something Doesn't Work

1. **Checkout not redirecting?**
   - Verify `POLAR_ACCESS_TOKEN` is set correctly
   - Check product ID matches Polar dashboard
   - Check browser console for errors

2. **Webhook not firing?**
   - Verify `POLAR_WEBHOOK_SECRET` matches dashboard
   - Check webhook URL is accessible
   - Check application logs (`vercel logs`)

3. **Payment succeeds but subscription not activated?**
   - Check webhook logs
   - Verify email matches between Polar and your database
   - Check `subscription_active` field in database

## 📚 Full Documentation

See `POLAR_SETUP_GUIDE.md` for detailed instructions.

---

**Ready? Start with step 1!** 🚀

