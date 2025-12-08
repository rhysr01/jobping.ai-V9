import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';

export async function GET(request: NextRequest) {
  try {
    // Get user email from cookie (simple approach)
    const email = request.cookies.get('free_user_email')?.value;

    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getDatabaseClient();

    // Verify user exists and is free tier
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, subscription_tier')
      .eq('email', email)
      .eq('subscription_tier', 'free')
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Get user's matches from YOUR matches table (uses user_email!)
    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select(`
        match_score,
        match_reason,
        jobs (
          id,
          title,
          company,
          location,
          city,
          country,
          description,
          job_url,
          work_environment,
          categories
        )
      `)
      .eq('user_email', email) // CRITICAL: Use user_email, not user_id!
      .order('match_score', { ascending: false })
      .limit(5);

    if (matchesError) {
      console.error('[MATCHES API ERROR]', matchesError);
      throw matchesError;
    }

    // Format response
    const jobs = (matchesData || [])
      .filter((m: any) => m.jobs && !Array.isArray(m.jobs)) // Filter out any null jobs and ensure it's an object
      .map((m: any) => {
        const job = Array.isArray(m.jobs) ? m.jobs[0] : m.jobs;
        return {
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          city: job.city,
          country: job.country,
          description: job.description,
          url: job.job_url, // Use job_url, not url
          work_environment: job.work_environment,
          match_score: m.match_score,
          match_reason: m.match_reason,
        };
      });

    return NextResponse.json({ jobs });

  } catch (error) {
    console.error('[MATCHES API ERROR]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

