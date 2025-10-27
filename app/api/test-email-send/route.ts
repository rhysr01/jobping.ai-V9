import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { asyncHandler, AppError } from '@/lib/errors';
import { EMAIL_CONFIG } from '@/Utils/email/clients';

export const GET = asyncHandler(async (_req: NextRequest) => {
  // Detailed logging
  console.log('=== EMAIL DEBUG START ===');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('API Key exists:', !!process.env.RESEND_API_KEY);
  console.log('API Key length:', process.env.RESEND_API_KEY?.length);
  console.log('API Key prefix:', process.env.RESEND_API_KEY?.substring(0, 10));
  console.log('Email domain:', EMAIL_CONFIG.from);
  console.log('All RESEND env vars:', Object.keys(process.env).filter(k => k.includes('RESEND')));
  
  // Check if API key exists
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY not configured');
    throw new AppError('RESEND_API_KEY not configured', 500, 'CONFIG_ERROR');
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  console.log('✅ Resend client created');
  
  // Send a test email using the same domain configuration as the app
  console.log('📧 Attempting to send email...');
  const { data, error } = await resend.emails.send({
    from: EMAIL_CONFIG.from,
    to: ['delivered@resend.dev'], // Resend test email
    subject: 'Test Email from JobPing',
    html: '<h1>Test Email</h1><p>If you see this, your email is working!</p>',
  });

  if (error) {
    console.error('❌ Email error:', JSON.stringify(error, null, 2));
    console.log('=== EMAIL DEBUG END ===');
    throw new AppError('Failed to send email', 500, 'EMAIL_SEND_ERROR', { error });
  }

  console.log('✅ Email sent successfully!', data?.id);
  console.log('=== EMAIL DEBUG END ===');

  return NextResponse.json({ 
    success: true,
    message: 'Test email sent successfully!',
    emailId: data?.id,
    note: 'Check https://resend.com/emails for delivery status'
  });
});

