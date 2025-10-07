import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function GET(req: NextRequest) {
  try {
    // Check if API key exists
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ 
        error: 'RESEND_API_KEY not configured' 
      }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    
    // Send a test email
    const { data, error } = await resend.emails.send({
      from: 'JobPing <hello@getjobping.com>',
      to: ['delivered@resend.dev'], // Resend test email
      subject: 'Test Email from JobPing',
      html: '<h1>Test Email</h1><p>If you see this, your email is working!</p>',
    });

    if (error) {
      console.error('Email error:', error);
      return NextResponse.json({ 
        error: 'Failed to send email',
        details: error 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Test email sent successfully!',
      emailId: data?.id,
      note: 'Check https://resend.com/emails for delivery status'
    });
  } catch (error: any) {
    console.error('Test email failed:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}

