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
    const { email, type } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    if (type === 'verification') {
      // Send a test verification email
      const token = EmailVerificationOracle.generateVerificationToken();
      const success = await EmailVerificationOracle.sendVerificationEmail(
        email, 
        token, 
        'Test User'
      );
      
      if (success) {
        return NextResponse.json({ 
          success: true, 
          message: 'Test verification email sent',
          token: token.substring(0, 8) + '...',
          email 
        });
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to send test verification email' 
        }, { status: 500 });
      }
    } else {
      return NextResponse.json({ 
        error: 'Invalid email type. Use "verification"' 
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ Test email error:', error);
    return NextResponse.json({ 
      error: 'Test email failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Test email endpoint active',
    method: 'POST',
    required: { email: 'string', type: 'verification' },
    testMode: isTestMode()
  });
}
