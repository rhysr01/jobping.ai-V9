// app/api/unsubscribe/one-click/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';
import crypto from 'crypto';
import { getBaseUrl } from '@/Utils/url-helpers';

// Verify unsubscribe token
function verifyUnsubscribeToken(email: string, token: string): boolean {
  const secret = process.env.UNSUBSCRIBE_SECRET || 'fallback-secret';
  const expectedToken = crypto.createHmac('sha256', secret)
    .update(email)
    .digest('hex').slice(0, 16);
  
  return token === expectedToken;
}

// Add email to suppression list for unsubscribe
async function suppressEmailForUnsubscribe(email: string): Promise<void> {
  const supabase = getDatabaseClient();
  
  try {
    // Insert suppression record
    const { error } = await supabase
      .from('email_suppression')
      .upsert({
        user_email: email,
        reason: 'unsubscribe_one_click',
        created_at: new Date().toISOString(),
        event_data: { method: 'one_click', timestamp: new Date().toISOString() }
      });
    
    if (error) {
      console.error('Failed to insert unsubscribe suppression:', error);
      throw error;
    }
    
    console.log(` Email unsubscribed: ${email}`);
  } catch (error) {
    // If table doesn't exist, fail gracefully
    console.warn('Failed to suppress email for unsubscribe:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Parse form data (List-Unsubscribe-Post sends form data)
    const formData = await req.formData();
    const listUnsubscribe = formData.get('List-Unsubscribe');
    
    // Get email and token from query params
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('u');
    const token = searchParams.get('t');
    
    if (!email || !token) {
      return NextResponse.json(
        { error: 'Missing email or token' },
        { status: 400 }
      );
    }
    
    // Verify token
    if (!verifyUnsubscribeToken(email, token)) {
      return NextResponse.json(
        { error: 'Invalid unsubscribe token' },
        { status: 401 }
      );
    }
    
    // Validate that this is a one-click unsubscribe request
    if (listUnsubscribe !== 'One-Click') {
      return NextResponse.json(
        { error: 'Invalid List-Unsubscribe value' },
        { status: 400 }
      );
    }
    
    // Add to suppression list
    await suppressEmailForUnsubscribe(email);
    
    // Track unsubscribe event for analytics
    const { apiLogger } = await import('@/lib/api-logger');
    apiLogger.info('user_unsubscribed', {
      event: 'user_unsubscribed',
      email,
      method: 'one_click',
      source: 'email_footer',
      timestamp: new Date().toISOString()
    });
    
    // Return success (no body required for one-click unsubscribe)
    return new NextResponse(null, { status: 200 });
    
  } catch (error) {
    console.error('One-click unsubscribe failed:', error);
    return NextResponse.json(
      { error: 'Unsubscribe failed' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Handle GET requests for manual unsubscribe links
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('u');
    const token = searchParams.get('t');
    
    if (!email || !token) {
      return new NextResponse(`
        <!DOCTYPE html>
        <html>
        <head><title>Unsubscribe - JobPing</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
          <h1>Invalid Unsubscribe Link</h1>
          <p>This unsubscribe link is invalid or expired.</p>
        </body>
        </html>
      `, {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Verify token
    if (!verifyUnsubscribeToken(email, token)) {
      return new NextResponse(`
        <!DOCTYPE html>
        <html>
        <head><title>Unsubscribe - JobPing</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
          <h1>Invalid Unsubscribe Link</h1>
          <p>This unsubscribe link is invalid or expired.</p>
        </body>
        </html>
      `, {
        status: 401,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Add to suppression list
    await suppressEmailForUnsubscribe(email);
    
    // Track unsubscribe event for analytics
    const { apiLogger } = await import('@/lib/api-logger');
    const reason = searchParams.get('reason') || 'user_requested';
    apiLogger.info('user_unsubscribed', {
      event: 'user_unsubscribed',
      email,
      method: 'manual_link',
      source: 'email_footer',
      reason,
      timestamp: new Date().toISOString()
    });
    
    // Return success page
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Unsubscribed - JobPing</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #f9f9f9;">
        <div style="background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #2d3748; margin-bottom: 20px;"> Successfully Unsubscribed</h1>
          <p style="color: #4a5568; line-height: 1.6; margin-bottom: 16px;">
            You have been successfully unsubscribed from JobPing emails.
          </p>
          <p style="color: #4a5568; line-height: 1.6; margin-bottom: 24px;">
            Email: <strong>${email}</strong>
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            If you change your mind, you can always sign up again at 
            <a href="${getBaseUrl()}" style="color: #667eea;">JobPing</a>
          </p>
        </div>
      </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
    
  } catch (error) {
    console.error('Unsubscribe page failed:', error);
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
      <head><title>Error - JobPing</title></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
        <h1>Unsubscribe Error</h1>
        <p>An error occurred while processing your unsubscribe request. Please try again later.</p>
      </body>
      </html>
    `, {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}
