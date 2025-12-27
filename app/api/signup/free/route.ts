import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';
import { createConsolidatedMatcher } from '@/Utils/consolidatedMatchingV2';
import { preFilterJobsByUserPreferencesEnhanced } from '@/Utils/matching/preFilterJobs';
import { getDatabaseCategoriesForForm } from '@/Utils/matching/categoryMapper';
import { distributeJobsWithDiversity } from '@/Utils/matching/jobDistribution';
import { apiLogger } from '@/lib/api-logger';
import { getProductionRateLimiter } from '@/Utils/productionRateLimiter';
import { getCountryFromCity } from '@/lib/countryFlags';
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
  // Rate limiting - prevent abuse (more lenient for legitimate users)
  const rateLimitResult = await getProductionRateLimiter().middleware(request, 'signup-free', {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 signup attempts per hour per IP (allows testing different preferences)
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

    // CRITICAL FIX: Ensure target_cities is always an array
    // Supabase might return it in different formats, so normalize it
    let targetCities: string[] = [];
    if (userData.target_cities) {
      if (Array.isArray(userData.target_cities)) {
        targetCities = userData.target_cities;
      } else if (typeof userData.target_cities === 'string') {
        // Handle case where it might be a JSON string
        try {
          targetCities = JSON.parse(userData.target_cities);
        } catch {
          // If not JSON, treat as single city
          targetCities = [userData.target_cities];
        }
      }
    }
    
    // Fallback to preferred_cities if target_cities is empty (shouldn't happen, but safety check)
    if (targetCities.length === 0 && preferred_cities && preferred_cities.length > 0) {
      targetCities = preferred_cities;
    }

    apiLogger.info('Free signup - cities normalized', { 
      email: normalizedEmail, 
      original: userData.target_cities,
      normalized: targetCities,
      type: typeof userData.target_cities,
      isArray: Array.isArray(userData.target_cities)
    });

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

    if (targetCities.length > 0) {
      query = query.in('city', targetCities);
      apiLogger.info('Free signup - filtering jobs by cities', { 
        email: normalizedEmail, 
        cities: targetCities,
        cityCount: targetCities.length
      });
    }

    if (careerPathCategories.length > 0) {
      query = query.overlaps('categories', careerPathCategories);
    }

    // Filter for early-career roles (same as preview API)
    // This ensures we get internships, graduate roles, or early-career jobs
    query = query.or('is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}');

    query = query.order('created_at', { ascending: false }).limit(1000);

    let { data: allJobs, error: jobsError } = await query;

    // Fallback logic: If no jobs found for exact cities, try country-level matching
    if ((jobsError || !allJobs || allJobs.length === 0) && targetCities.length > 0) {
      apiLogger.info('Free signup - no jobs for exact cities, trying country-level fallback', {
        email: normalizedEmail,
        cities: targetCities
      });

      // Get countries for the selected cities
      const countries = targetCities
        .map(city => getCountryFromCity(city))
        .filter(country => country !== '');

      if (countries.length > 0) {
        // Try filtering by country instead of city
        let fallbackQuery = supabase
          .from('jobs')
          .select('*')
          .eq('is_active', true)
          .eq('status', 'active')
          .is('filtered_reason', null)
          .in('country', countries);

        if (careerPathCategories.length > 0) {
          fallbackQuery = fallbackQuery.overlaps('categories', careerPathCategories);
        }

        // Also filter for early-career roles in fallback
        fallbackQuery = fallbackQuery.or('is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}');

        fallbackQuery = fallbackQuery.order('created_at', { ascending: false }).limit(1000);
        const fallbackResult = await fallbackQuery;

        if (!fallbackResult.error && fallbackResult.data && fallbackResult.data.length > 0) {
          allJobs = fallbackResult.data;
          jobsError = null;
          apiLogger.info('Free signup - found jobs using country-level fallback', {
            email: normalizedEmail,
            countries,
            jobCount: allJobs.length
          });
        } else {
          // Last resort: remove city/country filter entirely, just use career path
          apiLogger.info('Free signup - no jobs for countries either, trying career path only', {
            email: normalizedEmail,
            countries
          });

          let lastResortQuery = supabase
            .from('jobs')
            .select('*')
            .eq('is_active', true)
            .eq('status', 'active')
            .is('filtered_reason', null);

          if (careerPathCategories.length > 0) {
            lastResortQuery = lastResortQuery.overlaps('categories', careerPathCategories);
          }

          // Also filter for early-career roles in last resort
          lastResortQuery = lastResortQuery.or('is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}');

          lastResortQuery = lastResortQuery.order('created_at', { ascending: false }).limit(1000);
          const lastResortResult = await lastResortQuery;

          if (!lastResortResult.error && lastResortResult.data && lastResortResult.data.length > 0) {
            allJobs = lastResortResult.data;
            jobsError = null;
            apiLogger.info('Free signup - found jobs using career path only fallback', {
              email: normalizedEmail,
              jobCount: allJobs.length
            });
          }
        }
      }
    }

    // Final check: if still no jobs, return error
    if (jobsError || !allJobs || allJobs.length === 0) {
      apiLogger.warn('Free signup - no jobs found after all fallbacks', {
        email: normalizedEmail,
        cities: targetCities,
        careerPath: userData.career_path
      });
      return NextResponse.json(
        { error: 'No jobs found. Try different cities or career paths.' },
        { status: 404 }
      );
    }

    // Pre-filter jobs
    const userPrefs = {
      email: userData.email,
      target_cities: targetCities, // Use normalized array
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
    if (!process.env.OPENAI_API_KEY) {
      apiLogger.error('OPENAI_API_KEY not set', new Error('Missing API key'), { email: normalizedEmail });
      return NextResponse.json(
        { error: 'Matching service unavailable. Please try again later.' },
        { status: 500 }
      );
    }

    const matcher = createConsolidatedMatcher(process.env.OPENAI_API_KEY);
    const jobsForAI = preFilteredJobs.slice(0, 50);
    
    apiLogger.info('Starting AI matching', { 
      email: normalizedEmail,
      jobsCount: jobsForAI.length,
      cities: targetCities,
      careerPath: userData.career_path
    });

    let matchResult;
    try {
      matchResult = await matcher.performMatching(jobsForAI, userPrefs as any);
    } catch (matchingError) {
      apiLogger.error('AI matching failed', matchingError as Error, { 
        email: normalizedEmail,
        jobsCount: jobsForAI.length,
        errorMessage: matchingError instanceof Error ? matchingError.message : String(matchingError)
      });
      return NextResponse.json(
        { error: 'Matching failed. Please try again.' },
        { status: 500 }
      );
    }

    if (!matchResult || !matchResult.matches || matchResult.matches.length === 0) {
      apiLogger.warn('No matches returned from AI matching', { 
        email: normalizedEmail,
        jobsCount: jobsForAI.length,
        preFilteredCount: preFilteredJobs.length,
        cities: targetCities,
        careerPath: userData.career_path
      });
      return NextResponse.json(
        { error: 'No matches found. Try different cities or career paths.' },
        { status: 404 }
      );
    }

    apiLogger.info('AI matching completed', { 
      email: normalizedEmail,
      matchesCount: matchResult.matches.length
    });

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
    // Extract work environment preferences (may be comma-separated string or array)
    let targetWorkEnvironments: string[] = [];
    if (userData.work_environment) {
      if (Array.isArray(userData.work_environment)) {
        targetWorkEnvironments = userData.work_environment;
      } else if (typeof userData.work_environment === 'string') {
        // Parse comma-separated string: "Office, Hybrid" -> ["Office", "Hybrid"]
        targetWorkEnvironments = userData.work_environment.split(',').map((env: string) => env.trim()).filter(Boolean);
      }
    }
    
    // Log city and work environment distribution before distribution
    const cityDistributionBefore = matchedJobsRaw.reduce((acc: Record<string, number>, job: any) => {
      const city = job.city || 'unknown';
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {});
    const workEnvDistributionBefore = matchedJobsRaw.reduce((acc: Record<string, number>, job: any) => {
      const workEnv = job.work_environment || 'unknown';
      acc[workEnv] = (acc[workEnv] || 0) + 1;
      return acc;
    }, {});
    apiLogger.info('Free signup - jobs before distribution', { 
      email: normalizedEmail,
      totalJobs: matchedJobsRaw.length,
      cityDistribution: cityDistributionBefore,
      workEnvDistribution: workEnvDistributionBefore,
      targetCities: targetCities,
      targetWorkEnvironments: targetWorkEnvironments
    });

    const distributedJobs = distributeJobsWithDiversity(matchedJobsRaw as any[], {
      targetCount: 5,
      targetCities: targetCities, // Use normalized array
      maxPerSource: 2,
      ensureCityBalance: true,
      targetWorkEnvironments: targetWorkEnvironments,
      ensureWorkEnvironmentBalance: targetWorkEnvironments.length > 0
    });

    // Log city and work environment distribution after distribution
    const cityDistributionAfter = distributedJobs.reduce((acc: Record<string, number>, job: any) => {
      const city = job.city || 'unknown';
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {});
    const workEnvDistributionAfter = distributedJobs.reduce((acc: Record<string, number>, job: any) => {
      const workEnv = job.work_environment || 'unknown';
      acc[workEnv] = (acc[workEnv] || 0) + 1;
      return acc;
    }, {});
    apiLogger.info('Free signup - jobs after distribution', { 
      email: normalizedEmail,
      totalJobs: distributedJobs.length,
      cityDistribution: cityDistributionAfter,
      workEnvDistribution: workEnvDistributionAfter,
      targetCities: targetCities,
      targetWorkEnvironments: targetWorkEnvironments
    });

    const finalJobs = distributedJobs.length > 0 
      ? distributedJobs.slice(0, 5) 
      : matchedJobsRaw.slice(0, 5);

    // CRITICAL: Filter out jobs without job_hash before saving
    const validJobs = finalJobs.filter((job: any) => {
      if (!job || !job.job_hash) {
        apiLogger.warn('Skipping job without job_hash', { 
          email: normalizedEmail,
          hasJob: !!job,
          jobTitle: job?.title,
          jobCompany: job?.company
        });
        return false;
      }
      return true;
    });

    if (validJobs.length === 0) {
      const error = new Error('No valid jobs to save (all missing job_hash)');
      apiLogger.error('No valid jobs to save (all missing job_hash)', error, { 
        email: normalizedEmail,
        finalJobsCount: finalJobs.length,
        distributedJobsCount: distributedJobs.length,
        matchedJobsRawCount: matchedJobsRaw.length
      });
      return NextResponse.json(
        { error: 'No valid matches found. Please try again.' },
        { status: 500 }
      );
    }

    // Store matches in YOUR matches table (uses user_email, not user_id!)
    // match_score from AI is 0-100, normalize to 0-1 for database
    const matchRecords = validJobs.map((job: any) => {
      // match_score is 0-100 from matching engine, normalize to 0-1
      let normalizedScore = 0.75; // Default fallback
      if (job.match_score !== undefined && job.match_score !== null) {
        if (job.match_score > 1) {
          // Score is 0-100, normalize to 0-1
          normalizedScore = job.match_score / 100;
        } else {
          // Score is already 0-1
          normalizedScore = job.match_score;
        }
      }
      
      return {
      user_email: normalizedEmail, // CRITICAL: Use user_email, not user_id!
      job_hash: String(job.job_hash), // Ensure it's a string
        match_score: normalizedScore, // Normalized to 0-1
      match_reason: job.match_reason || 'AI matched',
      match_quality: 'high',
      match_tags: userData.career_path || '',
      matched_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      };
    });

    // CRITICAL: Save matches - fail if this doesn't work
    const { data: savedMatches, error: matchesError } = await supabase
      .from('matches')
      .upsert(matchRecords, { onConflict: 'user_email,job_hash' })
      .select();

    if (matchesError) {
      apiLogger.error('Failed to store matches', matchesError as Error, { email: normalizedEmail });
      return NextResponse.json(
        { error: 'Failed to save matches. Please try again.' },
        { status: 500 }
      );
    }

    // Verify matches were saved
    if (!savedMatches || savedMatches.length === 0) {
      apiLogger.error('No matches saved', new Error('Matches array empty'), { email: normalizedEmail, matchRecordsCount: matchRecords.length });
      return NextResponse.json(
        { error: 'Failed to save matches. Please try again.' },
        { status: 500 }
      );
    }

    // Log successful match creation for debugging
    apiLogger.info('Free signup - matches saved successfully', { 
      email: normalizedEmail, 
      savedMatchesCount: savedMatches.length,
      savedMatchHashes: savedMatches.map((m: any) => m.job_hash),
      matchRecordsCount: matchRecords.length,
      validJobsCount: validJobs.length
    });

    // Track analytics (optional - don't fail if this fails)
    try {
      await supabase.from('free_signups_analytics').insert({
        email: normalizedEmail,
        cities: preferred_cities,
        career_path: career_paths[0],
      });
    } catch (analyticsError) {
      // Non-critical - log but don't fail
      apiLogger.warn('Failed to track analytics', analyticsError as Error, { email: normalizedEmail });
    }

    // Set session cookie for client-side auth
    const response = NextResponse.json({
      success: true,
      matchCount: savedMatches.length,
      userId: userData.id,
    });

    // Set a session cookie (simple approach - you may want JWT instead)
    // Cookie expiration matches user expiration (30 days)
    // CRITICAL: Don't use secure flag if site might be accessed over HTTP
    const isProduction = process.env.NODE_ENV === 'production';
    const isHttps = request.headers.get('x-forwarded-proto') === 'https' || 
                     request.url.startsWith('https://');
    
    response.cookies.set('free_user_email', normalizedEmail, {
      httpOnly: true,
      secure: isProduction && isHttps, // Only secure in production HTTPS
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    // Optional: Still create session for future use, but don't rely on it
    try {
      const sessionId = crypto.randomUUID();
      await supabase.from('free_sessions').insert({
        session_id: sessionId,
        user_email: normalizedEmail,
        expires_at: freeExpiresAt.toISOString(),
        created_at: new Date().toISOString()
      });
    } catch (sessionError) {
      // Non-critical - log but don't fail
      apiLogger.warn('Failed to create session (non-critical)', sessionError as Error);
    }

    apiLogger.info('Cookie set for free user', { 
      email: normalizedEmail,
      secure: isProduction && isHttps,
      isProduction,
      isHttps
    });

    apiLogger.info('Free signup successful', { email: normalizedEmail, matchCount: savedMatches.length, savedMatchesCount: savedMatches.length });

    return response;

  } catch (error) {
    apiLogger.error('Free signup failed', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

