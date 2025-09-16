import { NextRequest, NextResponse } from 'next/server';
import { EmailVerificationOracle } from '@/Utils/emailVerification';

// Test mode helper
const isTestMode = () => process.env.NODE_ENV === 'test' || process.env.JOBPING_TEST_MODE === '1';

export async function POST(request: NextRequest) {
  // Only allow in test mode
  if (!isTestMode()) {
    return NextResponse.json({ 
      error: 'Test endpoints only available in test mode' 
    }, { status: 403 });
  }

  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Generate a test verification token
    const token = EmailVerificationOracle.generateVerificationToken(email);
    
    return NextResponse.json({ 
      success: true, 
      token,
      email,
      message: 'Test token generated successfully'
    });
    
  } catch (error) {
    console.error('❌ Test token generation error:', error);
    return NextResponse.json({ 
      error: 'Token generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Test token endpoint active',
    method: 'POST',
    required: { email: 'string' },
    testMode: isTestMode()
  });
}
