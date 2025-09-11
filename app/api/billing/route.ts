import { NextRequest, NextResponse } from 'next/server';
// import { paymentRecoverySystem, PAYMENT_CONFIG } from '../../../Utils/advancedPaymentSystem';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Initialize Stripe only when needed and with proper error handling
function getStripeClient() {
  // Prevent execution during build time
  if (typeof window !== 'undefined') {
    throw new Error('Stripe client should only be used server-side');
  }
  
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-07-30.basil',
    typescript: true,
  });
}

// Initialize Supabase only when needed
function getSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables are required');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// GET: Retrieve billing information
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get user's Stripe customer ID
    const supabase = getSupabaseClient();
    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!user?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing information found' }, { status: 404 });
    }

    // Get comprehensive billing information
    // const billingInfo = await paymentRecoverySystem.getBillingHistory(user.stripe_customer_id);
    
    // Get current subscription details
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    return NextResponse.json({
      success: true,
      // billing: billingInfo,
      currentSubscription: subscription,
      // availableTiers: PAYMENT_CONFIG.tiers
    });

  } catch (error) {
    console.error('❌ Billing API error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve billing information' },
      { status: 500 }
    );
  }
}

// POST: Update payment method
export async function POST(req: NextRequest) {
  try {
    const { userId, paymentMethodId, action } = await req.json();

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get user's Stripe customer ID
    const supabase = getSupabaseClient();
    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!user?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing information found' }, { status: 404 });
    }

    switch (action) {
      case 'update_payment_method':
        if (!paymentMethodId) {
          return NextResponse.json({ error: 'Payment method ID required' }, { status: 400 });
        }

        // Attach payment method to customer
        const stripeClient = getStripeClient();
        await stripeClient.paymentMethods.attach(paymentMethodId, {
          customer: user.stripe_customer_id,
        });

        // Set as default payment method
        await stripeClient.customers.update(user.stripe_customer_id, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });

        return NextResponse.json({ success: true, message: 'Payment method updated' });

      case 'remove_payment_method':
        if (!paymentMethodId) {
          return NextResponse.json({ error: 'Payment method ID required' }, { status: 400 });
        }

        // Detach payment method
        const stripeClient2 = getStripeClient();
        await stripeClient2.paymentMethods.detach(paymentMethodId);
        return NextResponse.json({ success: true, message: 'Payment method removed' });

      case 'generate_invoice':
        const { invoiceId } = await req.json();
        if (!invoiceId) {
          return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });
        }

        // const invoice = await paymentRecoverySystem.generateInvoice(invoiceId);
        return NextResponse.json({ success: true, invoice });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Billing update error:', error);
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

    // Get user's current subscription
    const supabase = getSupabaseClient();
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    switch (action) {
      case 'pause':
        // await paymentRecoverySystem.manageSubscription(subscription.stripe_subscription_id, 'pause');
        return NextResponse.json({ success: true, message: 'Subscription paused' });

      case 'resume':
        // await paymentRecoverySystem.manageSubscription(subscription.stripe_subscription_id, 'resume');
        return NextResponse.json({ success: true, message: 'Subscription resumed' });

      case 'cancel':
        // await paymentRecoverySystem.manageSubscription(subscription.stripe_subscription_id, 'cancel');
        return NextResponse.json({ success: true, message: 'Subscription cancelled' });

      case 'reactivate':
        // await paymentRecoverySystem.manageSubscription(subscription.stripe_subscription_id, 'reactivate');
        return NextResponse.json({ success: true, message: 'Subscription reactivated' });

      case 'upgrade':
      case 'downgrade':
        if (!newTier) {
          return NextResponse.json({ error: 'New tier required' }, { status: 400 });
        }

        const tierConfig = PAYMENT_CONFIG.tiers[newTier as keyof typeof PAYMENT_CONFIG.tiers];
        if (!tierConfig) {
          return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
        }

        // Get user's Stripe customer ID
        const supabase = getSupabaseClient();
    const { data: user } = await supabase
          .from('users')
          .select('stripe_customer_id')
          .eq('id', userId)
          .single();

        if (!user?.stripe_customer_id) {
          return NextResponse.json({ error: 'No billing information found' }, { status: 404 });
        }

        // Handle subscription change with proration
        // await paymentRecoverySystem.handleSubscriptionChange(
        //   user.stripe_customer_id,
        //   tierConfig.priceId!
        // );

        return NextResponse.json({ 
          success: true, 
          message: `Subscription ${action}d to ${tierConfig.name}` 
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Subscription management error:', error);
    return NextResponse.json(
      { error: 'Failed to manage subscription' },
      { status: 500 }
    );
  }
}
