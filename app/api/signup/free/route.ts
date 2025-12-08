import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';
import { createConsolidatedMatcher } from '@/Utils/consolidatedMatchingV2';
import { preFilterJobsByUserPreferencesEnhanced } from '@/Utils/matching/preFilterJobs';
import { getDatabaseCategoriesForForm } from '@/Utils/matching/categoryMapper';
import { distributeJobsWithDiversity } from '@/Utils/matching/jobDistribution';
import { apiLogger } from '@/lib/api-logger';
import { getProductionRateLimiter } from '@/Utils/productionRateLimiter';
import { z } from 'zod';

// Input validation schema
const freeSignupSchema = z.object({
  email: z.string().email('Invalid email address').max(255, 'Email too long'),
  full_name: z.string().min(1, 'Name is required').max(100, 'Name too long').regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters'),
  preferred_cities: z.array(z.string().max(50)).min(1, 'Select at least one city').max(3, 'Maximum 3 cities allowed'),
  career_paths: z.array(z.string()).min(1, 'Select at least one career path'),
  entry_level_preferences: z.array(z.string()).optional().default(['graduate', 'intern', 'junior']),
});

export async function POST(request: NextRequest) {
  // Rate limiting - prevent abuse
  const rateLimitResult = await getProductionRateLimiter().middleware(request, 'signup-free', {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 signup attempts per hour per IP
  });
  
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const body = await request.json();
    
    // Validate input with zod
    const validationResult = freeSignupSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      apiLogger.warn('Free signup validation failed', new Error(errors), { email: body.email });
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { email, full_name, preferred_cities, career_paths, entry_level_preferences } = validationResult.data;

    const supabase = getDatabaseClient();
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already used for Free tier
    const { data: existingFreeUser } = await supabase
      .from('users')
      .select('id, subscription_tier')
      .eq('email', normalizedEmail)
      .eq('subscription_tier', 'free')
      .maybeSingle();

    if (existingFreeUser) {
      return NextResponse.json(
        { 
          error: 'already_signed_up', 
          message: 'You already tried Free. Want 10 more jobs this week? Upgrade to Premium for 15 jobs/week (3x more)!' 
        },
        { status: 409 }
      );
    }

    // Create free user record
    const freeExpiresAt = new Date();
    freeExpiresAt.setDate(freeExpiresAt.getDate() + 30); // 30 days from now

    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        email: normalizedEmail,
        full_name,
        subscription_tier: 'free', // Use existing column
        free_signup_at: new Date().toISOString(),
        free_expires_at: freeExpiresAt.toISOString(),
        target_cities: preferred_cities, // Use target_cities, not preferred_cities
        career_path: career_paths[0] || null, // Single value, not array
        entry_level_preference: entry_level_preferences?.join(', ') || 'graduate, intern, junior',
        email_verified: true,
        subscription_active: false, // Free users not active
        active: true,
      })
      .select()
      .single();

    if (userError) {
      apiLogger.error('Failed to create free user', userError as Error, { email: normalizedEmail });
      throw userError;
    }

    // Fetch jobs (same pattern as existing signup)
    let careerPathCategories: string[] = [];
    if (userData.career_path) {
      careerPathCategories = getDatabaseCategoriesForForm(userData.career_path);
    }

    let query = supabase
      .from('jobs')
      .select('*')
      .eq('is_active', true)
      .eq('status', 'active')
      .is('filtered_reason', null);

    if (userData.target_cities && userData.target_cities.length > 0) {
      query = query.in('city', userData.target_cities);
    }

    if (careerPathCategories.length > 0) {
      query = query.overlaps('categories', careerPathCategories);
    }

    query = query.order('created_at', { ascending: false }).limit(1000);

    const { data: allJobs, error: jobsError } = await query;

    if (jobsError || !allJobs || allJobs.length === 0) {
      return NextResponse.json(
        { error: 'No jobs found. Try different cities or career paths.' },
        { status: 404 }
      );
    }

    // Pre-filter jobs
    const userPrefs = {
      email: userData.email,
      target_cities: userData.target_cities,
      career_path: userData.career_path ? [userData.career_path] : [],
      entry_level_preference: userData.entry_level_preference,
      work_environment: userData.work_environment,
      languages_spoken: userData.languages_spoken || [],
      roles_selected: userData.roles_selected || [],
      company_types: userData.company_types || [],
      visa_status: userData.visa_status,
      professional_expertise: userData.career_path || '',
    };

    const preFilteredJobs = await preFilterJobsByUserPreferencesEnhanced(
      allJobs as any[],
      userPrefs as any
    );

    if (!preFilteredJobs || preFilteredJobs.length === 0) {
      return NextResponse.json(
        { error: 'No matches found. Try different cities or career paths.' },
        { status: 404 }
      );
    }

    // Run matching using YOUR matching engine
    const matcher = createConsolidatedMatcher(process.env.OPENAI_API_KEY);
    const jobsForAI = preFilteredJobs.slice(0, 50);
    const matchResult = await matcher.performMatching(jobsForAI, userPrefs as any);

    if (!matchResult.matches || matchResult.matches.length === 0) {
      return NextResponse.json(
        { error: 'No matches found. Try different cities or career paths.' },
        { status: 404 }
      );
    }

    // Get matched jobs with full data
    const matchedJobsRaw: any[] = [];
    for (const m of matchResult.matches) {
      const job = preFilteredJobs.find((j: any) => j.job_hash === m.job_hash);
      if (job) {
        matchedJobsRaw.push({
          ...job,
          match_score: m.match_score,
          match_reason: m.match_reason,
        });
      }
    }

    // Distribute jobs (max 5 for free)
    const distributedJobs = distributeJobsWithDiversity(matchedJobsRaw as any[], {
      targetCount: 5,
      targetCities: userData.target_cities,
      maxPerSource: 2,
      ensureCityBalance: true
    });

    const finalJobs = distributedJobs.length > 0 
      ? distributedJobs.slice(0, 5) 
      : matchedJobsRaw.slice(0, 5);

    // Store matches in YOUR matches table (uses user_email, not user_id!)
    const matchRecords = finalJobs.map((job: any) => ({
      user_email: normalizedEmail, // CRITICAL: Use user_email, not user_id!
      job_hash: job.job_hash,
      match_score: (job.match_score || 0.75) / 100, // Normalize to 0-1 if needed
      match_reason: job.match_reason || 'AI matched',
      match_quality: 'high',
      match_tags: userData.career_path || '',
      matched_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }));

    const { error: matchesError } = await supabase
      .from('matches')
      .upsert(matchRecords, { onConflict: 'user_email,job_hash' }); // Update if exists

    if (matchesError) {
      apiLogger.error('Failed to store matches', matchesError as Error, { email: normalizedEmail });
    }

    // Track analytics (optional)
    await supabase.from('free_signups_analytics').insert({
      email: normalizedEmail,
      cities: preferred_cities,
      career_path: career_paths[0],
    });

    // Set session cookie for client-side auth
    const response = NextResponse.json({
      success: true,
      matchCount: finalJobs.length,
      userId: userData.id,
    });

    // Set a session cookie (simple approach - you may want JWT instead)
    // Cookie expiration matches user expiration (30 days)
    response.cookies.set('free_user_email', normalizedEmail, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days to match free_expires_at
    });

    apiLogger.info('Free signup successful', { email: normalizedEmail, matchCount: finalJobs.length });

    return response;

  } catch (error) {
    apiLogger.error('Free signup failed', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

