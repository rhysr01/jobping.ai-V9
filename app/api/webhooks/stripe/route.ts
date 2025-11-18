/**
 * Stripe Webhook Handler
 * 
 * Handles Stripe webhook events for subscription management
 * Verifies webhook signature and ensures idempotency
 */

import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent } from '@/Utils/stripe';
import { getDatabaseClient } from '@/Utils/databasePool';
import { captureException, setContext, addBreadcrumb, captureMessage } from '@/lib/sentry-utils';
import crypto from 'crypto';

// Idempotency tracking: store processed event IDs in memory (for production, use Redis)
const processedEvents = new Map<string, number>();
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [eventId, timestamp] of processedEvents.entries()) {
    if (now - timestamp > IDEMPOTENCY_TTL_MS) {
      processedEvents.delete(eventId);
    }
  }
}, 60 * 60 * 1000); // Run cleanup every hour

async function checkIdempotency(eventId: string): Promise<boolean> {
  // Check if event was already processed
  if (processedEvents.has(eventId)) {
    console.log(`Event ${eventId} already processed (idempotency check)`);
    return true;
  }
  
  // Mark as processed
  processedEvents.set(eventId, Date.now());
  return false;
}

async function handleCheckoutSessionCompleted(event: any) {
  const session = event.data.object;
  const customerEmail = session.customer_email;
  const userId = session.metadata?.userId;
  
  if (!customerEmail) {
    console.error('Missing customer_email in checkout.session.completed event');
    return { success: false, error: 'Missing customer_email' };
  }

  const supabase = getDatabaseClient();
  
  // Idempotency: check if subscription already active
  const { data: existingUser } = await supabase
    .from('users')
    .select('subscription_active, stripe_customer_id')
    .eq('email', customerEmail)
    .single();

  if (existingUser?.subscription_active === true) {
    console.log(`User ${customerEmail} already has active subscription (idempotency)`);
    return { success: true, message: 'Subscription already active' };
  }

  // Update user to premium
  const { error: updateError } = await supabase
    .from('users')
    .update({
      subscription_active: true,
      stripe_customer_id: session.customer || null,
      updated_at: new Date().toISOString()
    })
    .eq('email', customerEmail);

  if (updateError) {
    console.error('Failed to activate subscription:', updateError);
    return { success: false, error: updateError.message };
  }

  console.log(`✅ Activated premium subscription for ${customerEmail}`);
  return { success: true, message: 'Subscription activated' };
}

async function handleSubscriptionUpdated(event: any) {
  const subscription = event.data.object;
  const customerId = subscription.customer;
  const status = subscription.status;

  if (!customerId) {
    console.error('Missing customer ID in customer.subscription.updated event');
    return { success: false, error: 'Missing customer ID' };
  }

  const supabase = getDatabaseClient();
  
  // Find user by Stripe customer ID
  const { data: user } = await supabase
    .from('users')
    .select('email, subscription_active')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!user) {
    console.error(`User not found for Stripe customer ${customerId}`);
    return { success: false, error: 'User not found' };
  }

  const isActive = status === 'active' || status === 'trialing';
  
  // Idempotency: only update if status changed
  if (user.subscription_active === isActive) {
    console.log(`User ${user.email} subscription status unchanged (${status})`);
    return { success: true, message: 'Status unchanged' };
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({
      subscription_active: isActive,
      updated_at: new Date().toISOString()
    })
    .eq('email', user.email);

  if (updateError) {
    console.error('Failed to update subscription:', updateError);
    return { success: false, error: updateError.message };
  }

  console.log(`✅ Updated subscription for ${user.email}: ${status} (active: ${isActive})`);
  return { success: true, message: 'Subscription updated' };
}

async function handleSubscriptionDeleted(event: any) {
  const subscription = event.data.object;
  const customerId = subscription.customer;

  if (!customerId) {
    console.error('Missing customer ID in customer.subscription.deleted event');
    return { success: false, error: 'Missing customer ID' };
  }

  const supabase = getDatabaseClient();
  
  // Find user by Stripe customer ID
  const { data: user } = await supabase
    .from('users')
    .select('email, subscription_active')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!user) {
    console.error(`User not found for Stripe customer ${customerId}`);
    return { success: false, error: 'User not found' };
  }

  // Idempotency: only update if subscription is currently active
  if (user.subscription_active === false) {
    console.log(`User ${user.email} subscription already inactive (idempotency)`);
    return { success: true, message: 'Subscription already inactive' };
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({
      subscription_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('email', user.email);

  if (updateError) {
    console.error('Failed to deactivate subscription:', updateError);
    return { success: false, error: updateError.message };
  }

  console.log(`✅ Deactivated subscription for ${user.email}`);
  return { success: true, message: 'Subscription deactivated' };
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing Stripe signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event;
    try {
      event = constructWebhookEvent(rawBody, signature);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
captureException(error, {
        tags: {
          endpoint: 'stripe-webhook',
          operation: 'signature-verification',
          requestId
        }
      });
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Idempotency check: ensure we don't process the same event twice
    const wasProcessed = await checkIdempotency(event.id);
    if (wasProcessed) {
      console.log(`Event ${event.id} already processed, returning success (idempotency)`);
      return NextResponse.json({ 
        received: true, 
        message: 'Event already processed',
        eventId: event.id
      });
    }

    // Set Sentry context
setContext('stripe-webhook', {
      eventId: event.id,
      eventType: event.type,
      requestId,
      timestamp: new Date().toISOString()
    });

    // Handle different event types
    let result;
    switch (event.type) {
      case 'checkout.session.completed':
        result = await handleCheckoutSessionCompleted(event);
        break;
      
      case 'customer.subscription.updated':
        result = await handleSubscriptionUpdated(event);
        break;
      
      case 'customer.subscription.deleted':
        result = await handleSubscriptionDeleted(event);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
        return NextResponse.json({ 
          received: true, 
          message: `Unhandled event type: ${event.type}`,
          eventId: event.id
        });
    }

    const duration = Date.now() - startTime;

    // Log to Sentry
addBreadcrumb({
      message: 'Stripe webhook processed',
      level: result.success ? 'info' : 'error',
      data: {
        eventType: event.type,
        eventId: event.id,
        duration,
        success: result.success
      }
    });

    if (!result.success) {
      captureMessage(`Stripe webhook processing failed: ${result.error}`, 'error');
    }

    return NextResponse.json({
      received: true,
      processed: result.success,
      message: result.message || result.error,
      eventId: event.id,
      duration
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Stripe webhook error:', error);
    
captureException(error, {
      tags: {
        endpoint: 'stripe-webhook',
        operation: 'webhook-processing',
        requestId
      },
      extra: {
        duration,
        requestId
      }
    });

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

