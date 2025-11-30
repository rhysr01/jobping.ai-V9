# Polar.sh Payment Setup Guide

This guide will help you set up Polar.sh for payments in your JobPing application.

## ✅ What's Already Done

- ✅ Polar SDK installed (`@polar-sh/nextjs` v0.7.0)
- ✅ Checkout route configured (`app/api/checkout/route.ts`)
- ✅ Webhook handler implemented (`app/api/webhooks/polar/route.ts`)
- ✅ Success page ready (`app/success/page.tsx`)
- ✅ Environment variables schema defined (`lib/env.ts`)

## 🔧 Step-by-Step Setup

### Step 1: Create Polar.sh Account & Get Access Token

1. **Sign up at [polar.sh](https://polar.sh)**
   - Complete your account setup
   - Verify your email

2. **Get your Access Token**
   - Go to Polar Dashboard → Settings → API
   - Generate a new access token (or use existing)
   - Copy the token (starts with `polar_at_...`)

3. **Set up Payout Account** (Required to receive payments)
   - Navigate to Finance → Payout Accounts
   - Click "Setup" and follow instructions
   - Choose your account type (bank account, etc.)
   - ⚠️ **This is critical** - you won't receive payments without this!

### Step 2: Create Products in Polar.sh

1. **Go to Products section** in Polar dashboard
2. **Create a new product**:
   - Name: "JobPing Premium"
   - Description: "Premium subscription for enhanced job matching"
   - Type: Subscription (recurring)
   - Price: €5/month (or your preferred amount)
   - Billing period: Monthly
3. **Copy the Product ID** (you'll need this for checkout)
   - Product ID format: `prod_...` or similar
   - Note: Polar may use different ID formats, check their docs

### Step 3: Configure Webhook

1. **Get your webhook URL**:
   - Production: `https://getjobping.com/api/webhooks/polar`
   - Development: `http://localhost:3000/api/webhooks/polar` (for testing)

2. **In Polar Dashboard**:
   - Go to Settings → Webhooks
   - Click "Add Webhook"
   - Enter your webhook URL
   - Select events to listen to:
     - ✅ `order.paid` (most important!)
     - ✅ `checkout.created`
     - ✅ `checkout.updated`
     - ✅ `subscription.created`
     - ✅ `subscription.updated`
     - ✅ `subscription.active`
     - ✅ `subscription.canceled`
     - ✅ `subscription.revoked`
     - ✅ `subscription.uncanceled`
     - ✅ `customer.created`
     - ✅ `customer.updated`

3. **Copy the Webhook Secret**:
   - After creating webhook, Polar will show a secret
   - Copy this secret (starts with `whsec_...` or similar)

### Step 4: Set Environment Variables

Add these to your Vercel environment variables (or `.env.local` for local dev):

```bash
# Required - Get from Polar Dashboard → Settings → API
POLAR_ACCESS_TOKEN=polar_at_xxxxxxxxxxxxx

# Required - Get from Polar Dashboard → Settings → Webhooks
POLAR_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Optional - Customize success URL (defaults to getjobping.com/success)
POLAR_SUCCESS_URL=https://getjobping.com/success?checkout_id={CHECKOUT_ID}
```

**In Vercel:**
1. Go to your project → Settings → Environment Variables
2. Add each variable above
3. Make sure to set them for Production, Preview, and Development environments
4. Redeploy after adding variables

### Step 5: Test the Integration

1. **Test Checkout Flow**:
   - Navigate to `/billing` page
   - Click "Subscribe to Premium" or upgrade button
   - Should redirect to Polar checkout page
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry date (e.g., `12/34`)
   - Any 3-digit CVC (e.g., `123`)

2. **Test Webhook**:
   - Complete a test checkout
   - Check your application logs (`vercel logs` or local console)
   - Should see: `Polar webhook received` with `order.paid` event
   - Check database - user's `subscription_active` should be `true`

3. **Verify Success Page**:
   - After payment, should redirect to `/success?checkout_id=...`
   - Page should display success message

### Step 6: Update Product ID in Code

Once you have your Product ID from Step 2, you need to:

1. **Option A: Use environment variable** (Recommended)
   - Add `POLAR_PRODUCT_ID` to environment variables
   - Update checkout route to use it

2. **Option B: Hardcode for now** (Quick test)
   - Update `app/api/checkout/route.ts` with your product ID
   - See the updated route file for details

## 🐛 Troubleshooting

### Checkout not working?
- ✅ Verify `POLAR_ACCESS_TOKEN` is set correctly
- ✅ Check product ID is correct
- ✅ Ensure payout account is set up
- ✅ Check browser console for errors

### Webhooks not firing?
- ✅ Verify `POLAR_WEBHOOK_SECRET` matches Polar dashboard
- ✅ Check webhook URL is accessible (not behind auth)
- ✅ Verify webhook events are selected in Polar dashboard
- ✅ Check application logs for webhook errors

### Payment succeeds but subscription not activated?
- ✅ Check webhook handler logs
- ✅ Verify email matching logic (user email must match Polar customer email)
- ✅ Check database - look for `subscription_active` field updates
- ✅ Verify webhook secret is correct

### Testing locally?
- Use Polar's webhook testing tools or ngrok to forward webhooks:
  ```bash
  ngrok http 3000
  # Use https://your-ngrok-url.ngrok.io/api/webhooks/polar in Polar dashboard
  ```

## 📋 Checklist

- [ ] Polar.sh account created
- [ ] Access token generated and added to env vars
- [ ] Payout account configured
- [ ] Product created (Premium subscription)
- [ ] Product ID copied
- [ ] Webhook endpoint configured in Polar dashboard
- [ ] Webhook secret added to env vars
- [ ] Environment variables set in Vercel
- [ ] Test checkout completed successfully
- [ ] Webhook received and processed
- [ ] User subscription activated in database
- [ ] Success page displays correctly

## 🔗 Useful Links

- [Polar.sh Documentation](https://docs.polar.sh)
- [Polar.sh Dashboard](https://polar.sh/dashboard)
- [Polar.sh API Reference](https://docs.polar.sh/api-reference)
- [Customer Portal](https://docs.polar.sh/features/customer-portal)

## 📝 Next Steps After Setup

1. **Monitor webhook logs** for first few days
2. **Set up alerts** for webhook failures
3. **Test cancellation flow** (subscription.canceled webhook)
4. **Configure customer portal** for self-service billing management
5. **Set up analytics** to track conversion rates

---

**Last Updated:** January 2025
**Status:** Ready for production setup

