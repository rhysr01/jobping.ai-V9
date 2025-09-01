import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWelcomeEmail } from '@/Utils/emailUtils';

// Test mode helper
const isTestMode = () => process.env.NODE_ENV === 'test' || process.env.JOBPING_TEST_MODE === '1';

function getSupabaseClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Supabase client should only be used server-side');
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

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

    const supabase = getSupabaseClient();
    
    // Find the user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Send test welcome email
    await sendWelcomeEmail({
      to: email,
      userName: user.full_name || 'there',
      matchCount: 5
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test welcome email sent',
      email,
      userName: user.full_name
    });
    
  } catch (error) {
    console.error('❌ Test welcome email error:', error);
    return NextResponse.json({ 
      error: 'Test welcome email failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Test welcome email endpoint active',
    method: 'POST',
    required: { email: 'string' },
    testMode: isTestMode()
  });
}
