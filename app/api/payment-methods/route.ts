import { NextRequest, NextResponse } from 'next/server';
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

// POST: Add new payment method
export async function POST(req: NextRequest) {
  try {
    const { userId, cardNumber, expiryDate, cvv, cardholderName } = await req.json();

    if (!userId || !cardNumber || !expiryDate || !cvv || !cardholderName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

    // Parse expiry date
    const [expMonth, expYear] = expiryDate.split('/');
    const fullYear = expYear.length === 2 ? `20${expYear}` : expYear;

    // Create payment method
    const stripe = getStripeClient();
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: cardNumber.replace(/\s/g, ''),
        exp_month: parseInt(expMonth),
        exp_year: parseInt(fullYear),
        cvc: cvv,
      },
      billing_details: {
        name: cardholderName,
      },
    });

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: user.stripe_customer_id,
    });

    // Set as default payment method if it's the first one
    const existingPaymentMethods = await stripe.paymentMethods.list({
      customer: user.stripe_customer_id,
      type: 'card',
    });

    if (existingPaymentMethods.data.length === 1) {
      await stripe.customers.update(user.stripe_customer_id, {
        invoice_settings: {
          default_payment_method: paymentMethod.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      paymentMethod: {
        id: paymentMethod.id,
        brand: paymentMethod.card?.brand,
        last4: paymentMethod.card?.last4,
        exp_month: paymentMethod.card?.exp_month,
        exp_year: paymentMethod.card?.exp_year,
      },
    });

  } catch (error: any) {
    console.error('❌ Payment method creation error:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { error: error.message || 'Invalid card information' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add payment method' },
      { status: 500 }
    );
  }
}

// GET: List payment methods
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

    // Get payment methods
    const stripe = getStripeClient();
    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripe_customer_id,
      type: 'card',
    });

    return NextResponse.json({
      success: true,
      paymentMethods: paymentMethods.data.map(pm => ({
        id: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        exp_month: pm.card?.exp_month,
        exp_year: pm.card?.exp_year,
        is_default: pm.id === user.stripe_customer_id, // This would need to be tracked separately
      })),
    });

  } catch (error) {
    console.error('❌ Payment methods fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}

// DELETE: Remove payment method
export async function DELETE(req: NextRequest) {
  try {
    const { userId, paymentMethodId } = await req.json();

    if (!userId || !paymentMethodId) {
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

    // Verify the payment method belongs to the user
    const stripe = getStripeClient();
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (paymentMethod.customer !== user.stripe_customer_id) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
    }

    // Detach payment method
    await stripe.paymentMethods.detach(paymentMethodId);

    return NextResponse.json({ success: true, message: 'Payment method removed' });

  } catch (error) {
    console.error('❌ Payment method removal error:', error);
    return NextResponse.json(
      { error: 'Failed to remove payment method' },
      { status: 500 }
    );
  }
}
