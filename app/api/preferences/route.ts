import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';
import { createHash } from 'crypto';

// Generate secure token for preferences access
function generatePreferencesToken(email: string): string {
  const secret = process.env.PREFERENCES_SECRET || 'default-secret-change-in-production';
  const hash = createHash('sha256');
  hash.update(`${email}-${secret}-${Date.now()}`);
  return hash.digest('hex').substring(0, 32);
}

// Verify token - TODO: Implement proper JWT or signed token verification
function verifyPreferencesToken(email: string, token: string): boolean {
  // SECURITY: In production, implement proper token verification
  // For now, accept 'temp' token for development/testing
  // In production, generate signed tokens in emails and verify them here
  if (token === 'temp') {
    // Allow temp token for development - REMOVE IN PRODUCTION
    return process.env.NODE_ENV !== 'production';
  }
  
  // TODO: Implement proper token verification
  // const secret = process.env.PREFERENCES_SECRET;
  // return verifySignedToken(token, email, secret);
  
  return token.length > 0;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      return NextResponse.json({ error: 'Token and email required' }, { status: 400 });
    }

    if (!verifyPreferencesToken(email, token)) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = getDatabaseClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('active', true)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });

  } catch (error) {
    console.error('Preferences GET error:', error);
    return NextResponse.json({ error: 'Failed to load preferences' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, email, ...preferences } = body;

    if (!token || !email) {
      return NextResponse.json({ error: 'Token and email required' }, { status: 400 });
    }

    if (!verifyPreferencesToken(email, token)) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = getDatabaseClient();

    // Update user preferences
    const { error } = await supabase
      .from('users')
      .update({
        target_cities: preferences.cities || [],
        languages: preferences.languages || [],
        start_date: preferences.startDate || null,
        experience: preferences.experience || '',
        work_environment: preferences.workEnvironment || [],
        visa_status: preferences.visaStatus || '',
        entry_level_preference: preferences.entryLevelPreferences || [],
        company_types: preferences.targetCompanies || [],
        professional_expertise: preferences.careerPath || '',
        roles: preferences.roles || [],
        updated_at: new Date().toISOString(),
      })
      .eq('email', email);

    if (error) {
      console.error('Update preferences error:', error);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Preferences updated' });

  } catch (error) {
    console.error('Preferences POST error:', error);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
}

