# 🔑 Stripe Setup Guide - Fix "Price ID not configured"

## 🎯 Quick Fix (5 minutes)

The `/upgrade` page needs Stripe Price IDs to create checkout sessions. Here's how to set them up:

---

## **STEP 1: Create Stripe Products** (3 min)

### Go to: https://dashboard.stripe.com/test/products

### **Product 1: Monthly Subscription**
1. Click "+ New product"
2. Fill in:
   - **Name**: `JobPing Premium - Monthly`
   - **Description**: `3 emails per week with 5 hand-picked job roles`
   - **Pricing model**: `Standard pricing`
   - **Price**: `€7.00 EUR`
   - **Billing period**: `Monthly`
   - **Payment type**: `Recurring`
3. Click "Add product"
4. **📋 COPY THE PRICE ID** (starts with `price_...`)
   - Example: `price_1QR2s3L4m5N6o7P8q9R0`

### **Product 2: Quarterly Subscription**
1. Click "+ New product"
2. Fill in:
   - **Name**: `JobPing Premium - Quarterly`
   - **Description**: `3 emails per week - 3 month subscription (29% savings)`
   - **Pricing model**: `Standard pricing`
   - **Price**: `€15.00 EUR`
   - **Billing period**: `Every 3 months`
   - **Payment type**: `Recurring`
3. Click "Add product"
4. **📋 COPY THE PRICE ID** (starts with `price_...`)
   - Example: `price_2AB3c4D5e6F7g8H9i0J1`

---

## **STEP 2: Add to Vercel Environment Variables** (2 min)

### Go to: Your Vercel Project → Settings → Environment Variables

### Add these 4 variables:

#### **Variable 1**:
```
Name: STRIPE_PREMIUM_MONTHLY_PRICE_ID
Value: price_YOUR_MONTHLY_ID_HERE
Environment: ✅ Production, ✅ Preview, ✅ Development
```

#### **Variable 2**:
```
Name: STRIPE_PREMIUM_QUARTERLY_PRICE_ID
Value: price_YOUR_QUARTERLY_ID_HERE
Environment: ✅ Production, ✅ Preview, ✅ Development
```

#### **Variable 3** (PUBLIC - for client-side):
```
Name: NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID
Value: price_YOUR_MONTHLY_ID_HERE (same as #1)
Environment: ✅ Production, ✅ Preview, ✅ Development
```

#### **Variable 4** (PUBLIC - for client-side):
```
Name: NEXT_PUBLIC_STRIPE_QUARTERLY_PRICE_ID
Value: price_YOUR_QUARTERLY_ID_HERE (same as #2)
Environment: ✅ Production, ✅ Preview, ✅ Development
```

---

## **STEP 3: Redeploy** (30 seconds)

### Option A - Vercel Dashboard:
1. Go to **Deployments** tab
2. Click "..." on latest deployment
3. Click "Redeploy"
4. ✅ Done!

### Option B - Git Push:
```bash
git commit --allow-empty -m "trigger redeploy"
git push origin main
```

---

## **STEP 4: Test the /upgrade Page**

1. Visit: `https://your-vercel-url.vercel.app/upgrade`
2. Enter email
3. Select plan (Monthly or Quarterly)
4. Click "Continue to Payment"
5. **✅ Should redirect to Stripe checkout** (not error!)

---

## 🔒 **IMPORTANT: Test Mode vs Live Mode**

### **For MVP Testing (Use Test Mode)**:
- Create products in **TEST MODE** in Stripe
- Use **test** price IDs (`price_test_...`)
- Use test API keys (`sk_test_...`, `pk_test_...`)
- Test cards work: `4242 4242 4242 4242`

### **For Real Customers (Use Live Mode)**:
- Switch to **LIVE MODE** in Stripe Dashboard
- Create new products in live mode
- Use **live** price IDs (`price_...` without test prefix)
- Use live API keys (`sk_live_...`, `pk_live_...`)
- Real cards charged!

---

## 📋 **Complete Stripe Env Vars Needed:**

```bash
# Secret Keys (Server-side only)
STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_...
STRIPE_PREMIUM_QUARTERLY_PRICE_ID=price_...

# Public Keys (Client-side accessible)
NEXT_PUBLIC_STRIPE_KEY=pk_test_... (or pk_live_...)
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_QUARTERLY_PRICE_ID=price_...
```

**Total: 7 Stripe-related variables**

---

## ✅ **After Setup:**

The error "Stripe price ID not configured" will disappear!

Users can:
1. Click "Get 3 times weekly matches"
2. Go to /upgrade page
3. Choose Monthly (€7) or Quarterly (€15)
4. Click "Continue to Payment"
5. **Redirected to Stripe** (no errors!)
6. Complete payment
7. Become premium user ✅

---

## 🆘 **Troubleshooting:**

**Error persists?**
- Make sure you added ALL 4 price ID variables
- Check they're in Production AND Preview environments
- Redeploy after adding variables
- Check spelling (STRIPE_PREMIUM_MONTHLY_PRICE_ID)

**Can't find Price ID?**
- Go to Stripe Dashboard → Products
- Click on your product
- Price ID is under "Pricing" section
- Starts with `price_...`

---

**Need help?** DM me the error message and I'll diagnose! 🚀

