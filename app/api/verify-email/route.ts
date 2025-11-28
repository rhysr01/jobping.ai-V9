import { NextRequest, NextResponse } from 'next/server';
import { asyncHandler, ValidationError, AppError } from '@/lib/errors';
import { getProductionRateLimiter } from '@/Utils/productionRateLimiter';
import { ENV } from '@/lib/constants';
import { markUserVerified, verifyVerificationToken } from '@/Utils/emailVerification';

// Test mode helper - using professional pattern
const isTestMode = () => ENV.isTest();

export const POST = asyncHandler(async (request: NextRequest) => {
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

  const { token, email } = await request.json();

  if (!token || !email) {
    throw new ValidationError('Email and verification token required');
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
});

export const GET = asyncHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  if (!token || !email) {
    throw new ValidationError('Missing email or token');
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
});
