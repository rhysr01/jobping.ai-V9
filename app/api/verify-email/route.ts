import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { EmailVerificationOracle } from '@/Utils/emailVerification';
import { errorJson } from '@/Utils/errorResponse';
import { getProductionRateLimiter } from '@/Utils/productionRateLimiter';

// Test mode helper
const isTestMode = () => process.env.NODE_ENV === 'test' || process.env.JOBPING_TEST_MODE === '1';

function getSupabaseClient() {
  // Only initialize during runtime, not build time
  if (typeof window !== 'undefined') {
    throw new Error('Supabase client should only be used server-side');
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function POST(request: NextRequest) {
  // PRODUCTION: Rate limiting for email verification (prevent abuse)
  // Skip rate limiting in test mode
  if (!isTestMode()) {
    const rateLimitResult = await getProductionRateLimiter().middleware(request, 'default', {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 10 // 10 verification attempts per 5 minutes
    });
    if (rateLimitResult) {
      return rateLimitResult;
    }
  }

  try {
    const { token } = await request.json();
    
    if (!token) {
      return errorJson(request, 'VALIDATION_ERROR', 'Verification token required', 400);
    }

    const supabase = getSupabaseClient();
    const result = await EmailVerificationOracle.verifyEmail(token, supabase);
    
    return NextResponse.json(result, { 
      status: result.success ? 200 : 400 
    });
    
  } catch (error) {
    console.error('❌ Verify email API error:', error);
    return errorJson(request, 'INTERNAL_ERROR', 'Verification failed', 500);
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Email verification endpoint active',
    method: 'POST',
    required: { token: 'string' },
    testMode: isTestMode()
  });
}
