import { NextRequest, NextResponse } from 'next/server';

export const GET = async (req: NextRequest) => {
  const apiKey = process.env.RESEND_API_KEY;
  
  return NextResponse.json({
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    apiKeyPrefix: apiKey?.substring(0, 10) || 'none',
    environment: process.env.NODE_ENV,
    emailDomain: process.env.EMAIL_DOMAIN || 'getjobping.com'
  });
};
