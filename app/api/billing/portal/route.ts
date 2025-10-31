import { NextRequest, NextResponse } from 'next/server';
import { createCustomerPortalSession } from '@/Utils/stripe';
import { getDatabaseClient } from '@/Utils/databasePool';
import { apiLogger } from '@/lib/api-logger';

// Create Stripe Customer Portal session
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const supabase = getDatabaseClient();
    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!user?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing information found' }, { status: 404 });
    }

    const returnUrl = new URL(req.url).origin + '/billing';
    const portalSession = await createCustomerPortalSession(
      user.stripe_customer_id,
      returnUrl
    );

    return NextResponse.json({ success: true, url: portalSession.url });

  } catch (error) {
    apiLogger.error('Customer portal error', error as Error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}

