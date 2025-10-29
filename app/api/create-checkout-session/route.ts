import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, STRIPE_CONFIG } from '@/Utils/stripe';
import { validatePromoCode } from '@/Utils/promo';
import { getProductionRateLimiter } from '@/Utils/productionRateLimiter';
import { errorResponse } from '@/Utils/errorResponse';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getBaseUrl } from '@/Utils/url-helpers';

let _supabaseClient: SupabaseClient | null = null;

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
    const { email, priceId, userId, promoCode } = await req.json();

    // Validate required fields
    if (!email || !priceId || !userId) {
      return errorResponse.badRequest(req, 'Missing required fields: email, priceId, userId');
    }

    // Promo path: if promoCode valid, bypass Stripe and mark premium
    if (promoCode) {
      const validation = await validatePromoCode(promoCode, email);
      if (!validation.isValid) {
        return errorResponse.badRequest(req, validation.reason || 'Invalid promo code');
      }

      const supabase = getSupabaseClient();
      const now = new Date().toISOString();

      // Idempotency: if already premium, return success
      const { data: existingUser, error: fetchUserError } = await supabase
        .from('users')
        .select('subscription_active')
        .eq('email', email)
        .single();

      if (!fetchUserError && existingUser?.subscription_active === true) {
        return NextResponse.json({ success: true, promoApplied: true, alreadyActive: true });
      }

      // Prevent multiple promo uses per email
      const { data: prior } = await supabase
        .from('promo_activations')
        .select('id')
        .eq('email', email)
        .limit(1);

      if (prior && prior.length > 0) {
        return errorResponse.badRequest(req, 'Promo already used for this email');
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ subscription_active: true, updated_at: now })
        .eq('email', email);

      if (updateError) {
        return errorResponse.internal(req, 'Failed to activate promo', updateError.message);
      }

      // Audit (best-effort)
      await supabase
        .from('promo_activations')
        .insert({ email, code: promoCode, activated_at: now });
      // Non-fatal if audit insert fails

      return NextResponse.json({ success: true, promoApplied: true });
    }

    // Validate price ID for normal Stripe flow
    const validPriceIds = Object.values(STRIPE_CONFIG.PRODUCTS);
    if (!validPriceIds.includes(priceId)) {
      return errorResponse.badRequest(req, 'Invalid price ID');
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
      return errorResponse.notFound(req, 'User not found or email not verified');
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
    return errorResponse.internal(req, 'Failed to create checkout session', error instanceof Error ? error.message : 'Unknown error');
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

    return NextResponse.redirect(`${getBaseUrl()}/api/billing/checkout?priceId=${priceId}`);
  } catch (error) {
    return errorResponse.badRequest(req, 'Invalid request');
  }
}
