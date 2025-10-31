import { NextRequest, NextResponse } from 'next/server';
import { getResendClient, EMAIL_CONFIG, assertValidFrom } from '@/Utils/email/clients';
import { apiLogger } from '@/lib/api-logger';

export const GET = async (req: NextRequest) => {
  const startTime = Date.now();
  try {
    apiLogger.info('=== RESEND TEST START ===');
    
    // Check API key first
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({
        error: 'RESEND_API_KEY not configured',
        message: 'RESEND_API_KEY environment variable is not set',
        hint: 'Check .env.local (local) or Vercel environment variables (production)',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Validate API key format
    if (!process.env.RESEND_API_KEY.startsWith('re_')) {
      return NextResponse.json({
        error: 'Invalid RESEND_API_KEY format',
        message: 'RESEND_API_KEY must start with "re_"',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
    const resend = getResendClient();
    const url = new URL(req.url);
    const testRecipient = url.searchParams.get('to') || 'delivered@resend.dev';
  
  // Test 1: Basic API key validation
  let apiKeyTest = {
    success: false,
    error: null as any,
    details: ''
  };
  
  try {
    // Try to get domains to test API key (with timeout)
    const domainsPromise = resend.domains.list();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('API call timeout after 10 seconds')), 10000)
    );
    
    const domains = await Promise.race([domainsPromise, timeoutPromise]) as any;
    apiKeyTest.success = true;
    apiKeyTest.details = `Found ${Array.isArray(domains.data) ? domains.data.length : 0} domains`;
    apiLogger.debug('API Key valid', { domainCount: Array.isArray(domains.data) ? domains.data.length : 0 });
    
    // Check if getjobping.com is verified
    const domainsList = Array.isArray(domains.data) ? domains.data : [];
    const getjobpingDomain = domainsList.find((d: any) => d.name === 'getjobping.com');
    if (getjobpingDomain) {
      apiKeyTest.details += ` | getjobping.com verified: ${getjobpingDomain.status === 'verified'}`;
    } else {
      apiKeyTest.details += ' | getjobping.com NOT FOUND in domains';
    }
  } catch (error: any) {
    apiKeyTest.success = false;
    apiKeyTest.error = error.message;
      apiLogger.error('API Key test failed', error as Error);
  }
  
  // Test 2: Send actual email
  let emailTest = {
    success: false,
    error: null as any,
    emailId: null as string | null,
    details: ''
  };
  
  try {
    apiLogger.debug('Testing email send', { config: EMAIL_CONFIG, recipient: testRecipient });
    
    // Validate from address before sending
    assertValidFrom(EMAIL_CONFIG.from);
    
    const payload = {
      from: EMAIL_CONFIG.from,
      to: [testRecipient],
      subject: 'JobPing Test Email - Domain Verification',
      html: `
        <h1>🎉 Resend Test Successful!</h1>
        <p>This email confirms that:</p>
        <ul>
          <li>✅ API key is valid</li>
          <li>✅ Domain (${EMAIL_CONFIG.from}) is verified</li>
          <li>✅ Email sending is working</li>
        </ul>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>From:</strong> ${EMAIL_CONFIG.from}</p>
        <p><strong>To:</strong> ${testRecipient}</p>
        <p><strong>Environment:</strong> ${process.env.NODE_ENV}</p>
      `,
    };
    
    // Add timeout to email send
    const sendPromise = resend.emails.send(payload);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email send timeout after 15 seconds')), 15000)
    );
    
    const { data, error } = await Promise.race([sendPromise, timeoutPromise]) as any;
    
    if (error) {
      emailTest.error = error;
      apiLogger.error('Email send failed', error as Error, { 
        status: error?.status ?? 'unknown',
        requestId: error?.response?.headers?.get?.('x-resend-request-id') ?? 'n/a',
        from: EMAIL_CONFIG.from
      });
    } else {
      emailTest.success = true;
      emailTest.emailId = data?.id || null;
      emailTest.details = `Email sent successfully to ${testRecipient}`;
      apiLogger.info('Email sent successfully', { emailId: data?.id, recipient: testRecipient });
    }
  } catch (error: any) {
    const status = error?.status ?? 'unknown';
    const rid = error?.response?.headers?.get?.('x-resend-request-id') ?? 'n/a';
    const body = await error?.response?.json?.().catch(() => error?.message);
    apiLogger.error('Email send exception', error as Error, {
      status: error?.status ?? 'unknown',
      requestId: rid,
      from: EMAIL_CONFIG.from
    });
  }
  
  // Test 3: Environment variables
  const envTest = {
    hasApiKey: !!process.env.RESEND_API_KEY,
    apiKeyLength: process.env.RESEND_API_KEY?.length || 0,
    apiKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 10) || 'none',
    apiKeyFormat: process.env.RESEND_API_KEY?.startsWith('re_') ? 'valid' : 'invalid',
    emailDomain: process.env.EMAIL_DOMAIN || 'getjobping.com',
    fromAddress: EMAIL_CONFIG.from,
    environment: process.env.NODE_ENV,
    vercelUrl: process.env.VERCEL_URL,
    allResendVars: Object.keys(process.env).filter(k => k.includes('RESEND')),
    nodeEnv: process.env.NODE_ENV
  };
  
  apiLogger.info('=== RESEND TEST END ===', { duration: Date.now() - startTime });
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    duration: Date.now() - startTime,
    tests: {
      apiKey: apiKeyTest,
      email: emailTest,
      environment: envTest
    },
    summary: {
      apiKeyWorking: apiKeyTest.success,
      emailSending: emailTest.success,
      domainVerified: emailTest.success, // If email sends, domain is verified
      overallStatus: apiKeyTest.success && emailTest.success ? 'SUCCESS' : 'FAILED'
    }
  });
  } catch (error: any) {
    apiLogger.error('Test endpoint error', error as Error, { duration: Date.now() - startTime });
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'Unknown error';
    let errorHint = '';
    
    if (error.message?.includes('Missing Resend API key')) {
      errorHint = 'RESEND_API_KEY is not set in environment. Check .env.local (local) or Vercel environment variables (production).';
    } else if (error.message?.includes('Invalid Resend API key format')) {
      errorHint = 'RESEND_API_KEY must start with "re_". Check your API key format.';
    } else if (error.message?.includes('timeout')) {
      errorHint = 'Resend API call timed out. This might indicate a network issue or Resend API being slow.';
    }
    
    return NextResponse.json({
      error: 'Test endpoint failed',
      message: errorMessage,
      hint: errorHint,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime
    }, { status: 500 });
  }
};
