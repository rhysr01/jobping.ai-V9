# Stripe Migration Guide (from Polar.sh)

## Quick Setup with Vercel Integration

### Step 1: Install Vercel Stripe Integration
1. Go to Vercel Dashboard → Your Project → Settings → Integrations
2. Search "Stripe" → Click "Add Integration"
3. Creates sandbox account automatically
4. Environment variables auto-configured ✅

### Step 2: Install Stripe SDK
```bash
npm install stripe @stripe/stripe-js
```

### Step 3: Update Environment Variables

Add to `lib/env.ts`:
```typescript
// Payments (Stripe)
STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
```

### Step 4: Create Stripe Checkout Route

Replace `app/api/checkout/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getDatabaseClient } from '@/Utils/databasePool';
import { asyncHandler } from '@/lib/errors';
import { ENV } from '@/lib/env';

const stripe = new Stripe(ENV.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

export const POST = asyncHandler(async (req: NextRequest) => {
  const { email, userId, priceId } = await req.json();

  if (!email || !priceId) {
    throw new ValidationError('Email and priceId required');
  }

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId, // e.g., 'price_1234567890' from Stripe Dashboard
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${ENV.NEXT_PUBLIC_URL || 'https://getjobping.com'}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${ENV.NEXT_PUBLIC_URL || 'https://getjobping.com'}/billing`,
    metadata: {
      userId: userId || '',
      email: email,
    },
  });

  return NextResponse.json({ 
    success: true, 
    sessionId: session.id,
    url: session.url 
  });
});
```

### Step 5: Create Stripe Webhook Handler

Create `app/api/webhooks/stripe/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getDatabaseClient } from '@/Utils/databasePool';
import { apiLogger } from '@/lib/api-logger';
import { ENV } from '@/lib/env';
import { headers } from 'next/headers';

const stripe = new Stripe(ENV.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature || !ENV.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Missing signature or webhook secret' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      ENV.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    apiLogger.error('Stripe webhook signature verification failed', err);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  const supabase = getDatabaseClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_email || session.metadata?.email;

        if (!email) {
          apiLogger.warn('Checkout completed but no email found', { sessionId: session.id });
          break;
        }

        // Activate subscription
        const { error } = await supabase
          .from('users')
          .update({
            subscription_active: true,
            subscription_tier: 'premium',
            updated_at: new Date().toISOString(),
          })
          .eq('email', email);

        if (error) {
          apiLogger.error('Failed to activate subscription', error as Error, { email });
        } else {
          apiLogger.info(`✅ Activated premium subscription for ${email}`, { sessionId: session.id });
        }
        break;
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Get customer email from Stripe
        const customer = await stripe.customers.retrieve(customerId);
        const email = typeof customer === 'object' && !customer.deleted ? customer.email : null;

        if (!email) {
          apiLogger.warn('Subscription event but no email found', { subscriptionId: subscription.id });
          break;
        }

        const isActive = subscription.status === 'active' || subscription.status === 'trialing';

        await supabase
          .from('users')
          .update({
            subscription_active: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('email', email);

        apiLogger.info(`Updated subscription status for ${email}`, { 
          status: subscription.status,
          active: isActive 
        });
        break;
      }

      default:
        apiLogger.debug(`Unhandled Stripe event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    apiLogger.error('Stripe webhook processing error', error as Error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
```

### Step 6: Update Frontend

Update your checkout button (e.g., in `components/sections/Pricing.tsx`):
```typescript
const handleCheckout = async (priceId: string) => {
  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userEmail,
        userId: userId,
        priceId: priceId, // From Stripe Dashboard
      }),
    });

    const { url } = await response.json();
    if (url) {
      window.location.href = url;
    }
  } catch (error) {
    console.error('Checkout error:', error);
  }
};
```

## Testing with Stripe

### Test Mode (Automatic with Vercel Integration)
- Vercel integration creates a **Stripe sandbox** automatically
- Use test card: `4242 4242 4242 4242`
- Any future expiry date (e.g., `12/34`)
- Any 3-digit CVC (e.g., `123`)

### Test Cards for Different Scenarios
```typescript
// Success
'4242 4242 4242 4242'

// Decline
'4000 0000 0000 0002'

// 3D Secure (requires authentication)
'4000 0025 0000 3155'

// Insufficient funds
'4000 0000 0000 9995'
```

### Testing Webhooks Locally
Use Stripe CLI:
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This gives you a webhook secret like `whsec_...` for local testing.

## Migration Checklist

- [ ] Install Vercel Stripe integration
- [ ] Install Stripe SDK (`npm install stripe @stripe/stripe-js`)
- [ ] Update `lib/env.ts` with Stripe env vars
- [ ] Create Stripe checkout route (`app/api/checkout/route.ts`)
- [ ] Create Stripe webhook handler (`app/api/webhooks/stripe/route.ts`)
- [ ] Update frontend checkout buttons
- [ ] Create products/prices in Stripe Dashboard
- [ ] Configure webhook endpoint in Stripe Dashboard
- [ ] Test with test cards
- [ ] Test webhooks (use Stripe CLI locally)
- [ ] Update billing page to use Stripe
- [ ] Remove Polar.sh code (after migration complete)

## Why Switch from Polar to Stripe?

**Advantages:**
- ✅ More mature ecosystem
- ✅ Better documentation
- ✅ More payment methods
- ✅ Better analytics
- ✅ Vercel native integration
- ✅ Easier testing (Stripe CLI)

**Considerations:**
- ⚠️ Migration effort (1-2 days)
- ⚠️ Need to recreate products/prices in Stripe
- ⚠️ Different webhook format

## Environment Variables Needed

```bash
# Stripe (from Vercel integration)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... # For production webhooks
```

## Next Steps

1. **Test in sandbox first** (Vercel integration provides this)
2. **Use Stripe CLI for local webhook testing**
3. **Create products/prices in Stripe Dashboard**
4. **Test full flow before switching production**

