import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, STRIPE_CONFIG } from '@/Utils/stripe';
import { getProductionRateLimiter } from '@/Utils/productionRateLimiter';
import { errorJson } from '@/Utils/errorResponse';
import { createClient } from '@supabase/supabase-js';

let _supabaseClient: any = null;

function getSupabaseClient() {
  // Lazy initialization to prevent build-time execution
  if (_supabaseClient) return _supabaseClient;
  
  // Only initialize during runtime, not build time
  if (typeof window !== 'undefined') {
    throw new Error('Supabase client should only be used server-side');
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  _supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  return _supabaseClient;
}

export async function POST(req: NextRequest) {
  // PRODUCTION: Rate limiting for payment checkout (prevent abuse)
  const rateLimitResult = await getProductionRateLimiter().middleware(req, 'create-checkout-session');
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const { email, priceId, userId } = await req.json();

    // Validate required fields
    if (!email || !priceId || !userId) {
      return errorJson(req, 'VALIDATION_ERROR', 'Missing required fields: email, priceId, userId', 400);
    }

    // Validate price ID
    const validPriceIds = Object.values(STRIPE_CONFIG.PRODUCTS);
    if (!validPriceIds.includes(priceId)) {
      return errorJson(req, 'VALIDATION_ERROR', 'Invalid price ID', 400);
    }

    // Verify user exists and is email verified
    const supabase = getSupabaseClient();
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('email_verified', true)
      .single();

    if (userError || !user) {
      return errorJson(req, 'NOT_FOUND', 'User not found or email not verified', 404);
    }

    // Create checkout session
    const session = await createCheckoutSession({
      email,
      priceId,
      userId,
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error('Failed to create checkout session:', error);
    return errorJson(req, 'INTERNAL_ERROR', 'Failed to create checkout session', 500, error instanceof Error ? error.message : 'Unknown error');
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cycle = searchParams.get('cycle') as 'monthly' | 'quarterly' | null;

    // Minimal demo: redirect to a checkout page without collecting email/userId here.
    // In production, you should create a session server-side with the authenticated user.
    const priceId = cycle === 'quarterly'
      ? STRIPE_CONFIG.PRODUCTS.PREMIUM_QUARTERLY
      : STRIPE_CONFIG.PRODUCTS.PREMIUM_MONTHLY;

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/api/billing/checkout?priceId=${priceId}`);
  } catch (error) {
    return errorJson(req, 'VALIDATION_ERROR', 'Invalid request', 400);
  }
}
