import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { createCustomerPortalSession } from '@/Utils/stripe';
import { getDatabaseClient } from '@/Utils/databasePool';
import { apiLogger } from '@/lib/api-logger';

// Initialize Stripe only when needed and with proper error handling
function getStripeClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Stripe client should only be used server-side');
  }
  
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-10-28.acacia' as any,
    typescript: true,
  });
}

// GET: Retrieve billing information
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const supabase = getDatabaseClient();
    
    // Get user's Stripe customer ID and subscription status
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id, subscription_active, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get current subscription details
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    // If user has Stripe customer ID, fetch invoices from Stripe
    let invoices: any[] = [];
    if (user.stripe_customer_id) {
      try {
        const stripe = getStripeClient();
        const stripeInvoices = await stripe.invoices.list({
          customer: user.stripe_customer_id,
          limit: 10,
        });
        invoices = stripeInvoices.data.map(inv => ({
          id: inv.id,
          amount: inv.amount_paid / 100,
          currency: inv.currency,
          status: inv.status,
          created: inv.created,
          pdf: inv.invoice_pdf,
          hosted_invoice_url: inv.hosted_invoice_url,
        }));
      } catch (stripeError) {
        apiLogger.warn('Failed to fetch Stripe invoices', stripeError as Error, { userId });
      }
    }

    return NextResponse.json({
      success: true,
      currentSubscription: subscription || null,
      invoices,
      hasStripeCustomer: !!user.stripe_customer_id,
    });

  } catch (error) {
    apiLogger.error('Billing API error', error as Error);
    return NextResponse.json(
      { error: 'Failed to retrieve billing information' },
      { status: 500 }
    );
  }
}

// POST: Update payment method or create portal session
export async function POST(req: NextRequest) {
  try {
    const { userId, paymentMethodId, action, invoiceId } = await req.json();

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const supabase = getDatabaseClient();
    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', userId)
      .single();

    if (!user?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing information found' }, { status: 404 });
    }

    const stripe = getStripeClient();

    switch (action) {
      case 'create_portal_session':
        const returnUrl = new URL(req.url).origin + '/billing';
        const portalSession = await createCustomerPortalSession(
          user.stripe_customer_id,
          returnUrl
        );
        return NextResponse.json({ success: true, url: portalSession.url });

      case 'update_payment_method':
        if (!paymentMethodId) {
          return NextResponse.json({ error: 'Payment method ID required' }, { status: 400 });
        }

        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: user.stripe_customer_id,
        });

        await stripe.customers.update(user.stripe_customer_id, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });

        return NextResponse.json({ success: true, message: 'Payment method updated' });

      case 'remove_payment_method':
        if (!paymentMethodId) {
          return NextResponse.json({ error: 'Payment method ID required' }, { status: 400 });
        }

        await stripe.paymentMethods.detach(paymentMethodId);
        return NextResponse.json({ success: true, message: 'Payment method removed' });

      case 'generate_invoice':
        if (!invoiceId) {
          return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });
        }

        const invoice = await stripe.invoices.retrieve(invoiceId);
        return NextResponse.json({ success: true, invoice });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    apiLogger.error('Billing update error', error as Error);
    return NextResponse.json(
      { error: 'Failed to update billing information' },
      { status: 500 }
    );
  }
}

// PUT: Manage subscription
export async function PUT(req: NextRequest) {
  try {
    const { userId, action, newTier } = await req.json();

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const supabase = getDatabaseClient();
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    const stripe = getStripeClient();

    switch (action) {
      case 'cancel':
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          cancel_at_period_end: true,
        });
        return NextResponse.json({ success: true, message: 'Subscription will cancel at period end' });

      case 'reactivate':
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          cancel_at_period_end: false,
        });
        return NextResponse.json({ success: true, message: 'Subscription reactivated' });

      case 'cancel_immediately':
        await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
        return NextResponse.json({ success: true, message: 'Subscription cancelled immediately' });

      case 'upgrade':
      case 'downgrade':
        if (!newTier) {
          return NextResponse.json({ error: 'New tier required' }, { status: 400 });
        }

        // Get price ID for new tier
        const priceId = newTier === 'premium' 
          ? process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || process.env.STRIPE_PREMIUM_QUARTERLY_PRICE_ID
          : null;

        if (!priceId) {
          return NextResponse.json({ error: 'Invalid tier configuration' }, { status: 400 });
        }

        const sub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          items: [{
            id: sub.items.data[0].id,
            price: priceId,
          }],
          proration_behavior: 'create_prorations',
        });

        return NextResponse.json({ 
          success: true, 
          message: `Subscription ${action}d to ${newTier}` 
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    apiLogger.error('Subscription management error', error as Error);
    return NextResponse.json(
      { error: 'Failed to manage subscription' },
      { status: 500 }
    );
  }
}
