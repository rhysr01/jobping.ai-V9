import { NextRequest, NextResponse } from 'next/server';
import { EmailVerificationOracle } from '@/Utils/emailVerification';
import { errorResponse } from '@/Utils/errorResponse';
import { getProductionRateLimiter } from '@/Utils/productionRateLimiter';
import { getSupabaseClient } from '@/Utils/supabase';
import { ENV } from '@/Utils/constants';

// Test mode helper - using professional pattern
const isTestMode = () => ENV.isTest();

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
      return errorResponse.badRequest(request, 'Verification token required');
    }

    const supabase = getSupabaseClient();
    const result = await EmailVerificationOracle.verifyEmail(token, supabase);
    
    return NextResponse.json(result, { 
      status: result.success ? 200 : 400 
    });
    
  } catch (error) {
    console.error('❌ Verify email API error:', error);
    return errorResponse.internal(request, 'Verification failed');
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
