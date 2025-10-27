import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const GET = async (req: NextRequest) => {
  const apiKey = process.env.RESEND_API_KEY;
  
  // Test the API key by making an actual Resend call
  let resendTest = {
    success: false,
    error: null,
    emailId: null
  };
  
  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      const { data, error } = await resend.emails.send({
        from: 'JobPing <noreply@getjobping.com>',
        to: ['delivered@resend.dev'],
        subject: 'Debug Test Email',
        html: '<h1>Debug Test</h1><p>This is a test from production</p>',
      });
      
      if (error) {
        resendTest.error = error;
      } else {
        resendTest.success = true;
        resendTest.emailId = data?.id;
      }
    } catch (err) {
      resendTest.error = {
        message: err instanceof Error ? err.message : 'Unknown error',
        name: err instanceof Error ? err.constructor.name : 'Unknown'
      };
    }
  }
  
  return NextResponse.json({
    // Basic info
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    apiKeyPrefix: apiKey?.substring(0, 10) || 'none',
    apiKeySuffix: apiKey?.substring(-10) || 'none',
    environment: process.env.NODE_ENV,
    emailDomain: process.env.EMAIL_DOMAIN || 'getjobping.com',
    
    // All environment variables that start with RESEND
    resendEnvVars: Object.keys(process.env)
      .filter(key => key.includes('RESEND'))
      .reduce((obj, key) => {
        obj[key] = process.env[key]?.substring(0, 15) + '...';
        return obj;
      }, {} as Record<string, string>),
    
    // Resend API test
    resendTest,
    
    // Timestamp
    timestamp: new Date().toISOString()
  });
};
