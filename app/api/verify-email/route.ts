import { NextRequest, NextResponse } from 'next/server';
// import { EmailVerificationOracle } from '@/Utils/emailVerification';
import { errorResponse } from '@/Utils/errorResponse';
import { getProductionRateLimiter } from '@/Utils/productionRateLimiter';
import { ENV } from '@/Utils/constants';
import { markUserVerified, verifyVerificationToken } from '@/Utils/emailVerification';

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
    const { token, email } = await request.json();

    if (!token || !email) {
      return errorResponse.badRequest(request, 'Email and verification token required');
    }

    const verification = await verifyVerificationToken(email, token);
    if (!verification.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired token',
          reason: verification.reason,
        },
        { status: 400 }
      );
    }

    await markUserVerified(email);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(' Verify email API error:', error);
    return errorResponse.internal(request, 'Verification failed');
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  if (!token || !email) {
    return NextResponse.json(
      { success: false, error: 'Missing email or token' },
      { status: 400 }
    );
  }

  const verification = await verifyVerificationToken(email, token);
  if (!verification.valid) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid or expired token',
        reason: verification.reason,
      },
      { status: 400 }
    );
  }

  await markUserVerified(email);

  return NextResponse.json({ success: true }, { status: 200 });
}
