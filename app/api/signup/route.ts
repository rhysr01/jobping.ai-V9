import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';
import { createConsolidatedMatcher } from '@/Utils/consolidatedMatching';
import { sendWelcomeEmail, sendMatchedJobsEmail } from '@/Utils/email/sender';
import { apiLogger } from '@/lib/api-logger';
import { preFilterJobsByUserPreferencesEnhanced } from '@/Utils/matching/preFilterJobs';
import { getDatabaseCategoriesForForm } from '@/Utils/matching/categoryMapper';
import { distributeJobsWithDiversity, getDistributionStats } from '@/Utils/matching/jobDistribution';
import { sendVerificationEmail } from '@/Utils/emailVerification';

// Helper function to safely send welcome email and update tracking
async function sendWelcomeEmailAndTrack(
  email: string,
  userName: string,
  tier: 'free' | 'premium',
  matchCount: number,
  supabase: any,
  context: string
): Promise<boolean> {
  try {
    await sendWelcomeEmail({
      to: email,
      userName,
      matchCount,
      tier,
    });

    await supabase
      .from('users')
      .update({
        last_email_sent: new Date().toISOString(),
        email_count: 1,
      })
      .eq('email', email);

    apiLogger.info(`Welcome email (${context}) sent to user`, { email });
    console.log(`[SIGNUP] ✅ Welcome email (${context}) sent successfully to ${email}`);
    return true;
  } catch (emailError) {
    const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
    const errorStack = emailError instanceof Error ? emailError.stack : undefined;
    console.error(`[SIGNUP] ❌ Welcome email (${context}) failed:`, errorMessage);
    apiLogger.error(`Welcome email (${context}) failed`, emailError as Error, { 
      email,
      errorMessage,
      errorStack,
      errorType: emailError?.constructor?.name,
      rawError: String(emailError)
    });
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Validate required fields
    if (!data.email || !data.fullName || !data.cities || data.cities.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getDatabaseClient();
    
    // Check if user already exists
    const normalizedEmail = data.email.toLowerCase().trim();
    const { data: existingUser } = await supabase
      .from('users')
      .select('email, last_email_sent, email_count')
      .eq('email', normalizedEmail)
      .single();

    if (existingUser) {
      apiLogger.info('User already exists', { email: normalizedEmail });
      return NextResponse.json({ 
        error: 'Email already registered',
        code: 'DUPLICATE_EMAIL'
      }, { status: 409 });
    }
    
    // Determine subscription tier from request (defaults to 'free')
    const subscriptionTier = (data.tier === 'premium' ? 'premium' : 'free') as 'free' | 'premium';
    
    // Create user in database
    const userData = {
      email: normalizedEmail,
      full_name: data.fullName.trim(),
      target_cities: data.cities,
      languages_spoken: data.languages || [],
      start_date: data.startDate || null,
      professional_experience: data.experience || null,
      professional_expertise: data.careerPath || 'entry', // For matching system
      work_environment: Array.isArray(data.workEnvironment) && data.workEnvironment.length > 0 
        ? data.workEnvironment.join(', ') 
        : null,
      visa_status: data.visaStatus || null,
      entry_level_preference: Array.isArray(data.entryLevelPreferences) && data.entryLevelPreferences.length > 0
        ? data.entryLevelPreferences.join(', ')
        : null,
      company_types: data.targetCompanies || [],
      career_path: data.careerPath || null,
      roles_selected: data.roles || [],
      // NEW MATCHING PREFERENCES
      remote_preference: Array.isArray(data.workEnvironment) && data.workEnvironment.includes('Remote') 
        ? 'remote' 
        : Array.isArray(data.workEnvironment) && data.workEnvironment.includes('Hybrid') 
        ? 'hybrid' 
        : 'flexible',
      industries: data.industries || [],
      company_size_preference: data.companySizePreference || 'any',
      skills: data.skills || [],
      career_keywords: data.careerKeywords || null,
      subscription_tier: subscriptionTier,
      email_verified: true, // Optimistically verify; formal verification email dispatched separately
      subscription_active: true,
      email_phase: 'welcome', // Start in welcome phase
      onboarding_complete: false, // Will be set to true after first email
      email_count: 0, // Will increment after first email
      last_email_sent: null, // Will be set after first email
      created_at: new Date().toISOString(),
    };

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (userError) {
      // Handle duplicate email case (shouldn't happen due to check above, but handle gracefully)
      if (userError.code === '23505' || userError.message?.includes('duplicate key')) {
        apiLogger.warn('Duplicate email detected during insert', { email: normalizedEmail });
        return NextResponse.json({ 
          error: 'Email already registered',
          code: 'DUPLICATE_EMAIL'
        }, { status: 409 });
      }
      
      apiLogger.error('Failed to create user', userError as Error, { 
        email: data.email,
        errorCode: userError.code,
        errorMessage: userError.message
      });
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    apiLogger.info(`User created`, { email: data.email });
    console.log(`[SIGNUP] User created: ${data.email}`);

    try {
      await sendVerificationEmail(normalizedEmail);
      apiLogger.info('Verification email dispatched', { email: normalizedEmail });
    } catch (verificationError) {
      const message = verificationError instanceof Error ? verificationError.message : String(verificationError);
      apiLogger.error('Failed to send verification email', verificationError as Error, {
        email: normalizedEmail,
        errorMessage: message,
      });
      console.error(`[SIGNUP] ⚠️ Verification email failed for ${normalizedEmail}: ${message}`);
    }

    // Trigger instant matching and email
    let matchesCount = 0;
    let emailSent = false;
    
    apiLogger.info('Starting email sending process', { email: data.email });
    console.log(`[SIGNUP] Starting email sending process for: ${data.email}`);
    
    try {
      console.log(`[SIGNUP] Creating matcher...`);
      const matcher = createConsolidatedMatcher(process.env.OPENAI_API_KEY);
      console.log(`[SIGNUP] Matcher created successfully`);
      
      // OPTIMIZED: Fetch jobs using database-level filtering for better performance
      // Use the same optimized approach as match-users route
      apiLogger.info('Fetching jobs for matching', { email: data.email, cities: userData.target_cities });
      console.log(`[SIGNUP] Fetching jobs for cities: ${JSON.stringify(userData.target_cities)}`);
      
      // Map career path to database categories for filtering
      let careerPathCategories: string[] = [];
      if (userData.career_path) {
        careerPathCategories = getDatabaseCategoriesForForm(userData.career_path);
      }
      
      // Build optimized query using database indexes
      let query = supabase
        .from('jobs')
        .select('*')
        .eq('is_active', true)
        .eq('status', 'active')
        .is('filtered_reason', null);
      
      // CRITICAL: Filter by cities at database level (uses idx_jobs_city index)
      if (userData.target_cities && userData.target_cities.length > 0) {
        query = query.in('city', userData.target_cities);
      }
      
      // QUALITY-FOCUSED: Filter by career path at database level for quality matches
      // This ensures graduates get relevant, high-quality matches
      // But we'll still show quality jobs even if exact match isn't found
      if (careerPathCategories.length > 0) {
        // Use overlaps to find jobs with ANY matching category (flexible but quality-focused)
        query = query.overlaps('categories', careerPathCategories);
      }
      
      query = query.order('created_at', { ascending: false }).limit(1000);
      
      const { data: allJobs, error: jobsError } = await query;
      
      if (jobsError) {
        apiLogger.error('Failed to fetch jobs', jobsError as Error, { email: data.email });
        throw jobsError;
      }

      // CRITICAL: Use the same strict pre-filtering as match-users route
      // This ensures welcome email jobs match user preferences perfectly
      const userPrefs = {
        email: userData.email,
        target_cities: userData.target_cities,
        languages_spoken: userData.languages_spoken,
        career_path: userData.career_path ? [userData.career_path] : [],
        roles_selected: userData.roles_selected,
        entry_level_preference: userData.entry_level_preference,
        professional_expertise: userData.career_path || '',
        work_environment: userData.work_environment,
        visa_status: userData.visa_status,
        company_types: userData.company_types || [],
      };
      
      // Use the same enhanced pre-filtering that ensures strict location/career matching
      const preFilteredJobs = await preFilterJobsByUserPreferencesEnhanced(
        (allJobs || []) as any[],
        userPrefs as any
      );
      
      apiLogger.info('Jobs filtered', { 
        email: data.email, 
        allJobsCount: allJobs?.length || 0,
        preFilteredCount: preFilteredJobs.length 
      });
      console.log(`[SIGNUP] Jobs filtered: ${allJobs?.length || 0} total, ${preFilteredJobs.length} after strict pre-filtering`);

      if (preFilteredJobs && preFilteredJobs.length > 0) {
        console.log(`[SIGNUP] Found ${preFilteredJobs.length} pre-filtered jobs, attempting AI matching...`);
        
        // Send top 50 pre-filtered jobs to AI (same as match-users route)
        const jobsForAI = preFilteredJobs.slice(0, 50);
        
        const matchResult = await matcher.performMatching(jobsForAI, userPrefs as any);
        console.log(`[SIGNUP] Matching complete: ${matchResult.matches?.length || 0} matches found`);
        
        if (matchResult.matches && matchResult.matches.length > 0) {
          // Get matched jobs with full data
          const matchedJobsRaw = matchResult.matches.map(m => {
            const job = preFilteredJobs.find(j => j.job_hash === m.job_hash);
            return job ? {
              ...job,
              match_score: m.match_score,
              match_reason: m.match_reason,
            } : null;
          }).filter(j => j !== null);

          // DISTRIBUTION: Ensure source diversity and city balance
          const targetCount = Math.min(10, matchedJobsRaw.length);
          const distributedJobs = distributeJobsWithDiversity(matchedJobsRaw as any[], {
            targetCount,
            targetCities: userData.target_cities || [],
            maxPerSource: Math.ceil(targetCount / 3), // Max 1/3 from any source
            ensureCityBalance: true
          });

          // Log distribution stats
          const stats = getDistributionStats(distributedJobs);
          apiLogger.info('Job distribution stats', { 
            email: data.email,
            sourceDistribution: stats.sourceDistribution,
            cityDistribution: stats.cityDistribution,
            totalJobs: stats.totalJobs
          });
          console.log(`[SIGNUP] Distribution: Sources=${JSON.stringify(stats.sourceDistribution)}, Cities=${JSON.stringify(stats.cityDistribution)}`);

          // Save matches
          const matchesToSave = distributedJobs
            .filter(job => job.job_hash) // Filter out jobs without job_hash
            .map(job => ({
              user_email: userData.email,
              job_hash: job.job_hash!,
              match_score: job.match_score || 85,
              match_reason: job.match_reason || 'AI match',
            }));

          const matchEntries = matchesToSave.map(match => ({
            user_email: match.user_email,
            job_hash: match.job_hash,
            match_score: (match.match_score || 85) / 100,
            match_reason: match.match_reason,
            matched_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            match_algorithm: matchResult.method,
          }));

          await supabase.from('matches').upsert(matchEntries, {
            onConflict: 'user_email,job_hash',
          });

          matchesCount = matchEntries.length;
          apiLogger.info(`Saved ${matchesCount} matches for user`, { email: data.email, matchCount: matchesCount });

          // Send welcome email with matched jobs
          try {
            apiLogger.info('Preparing to send matched jobs email', { email: data.email, matchesCount });
            console.log(`[SIGNUP] Preparing to send matched jobs email to ${data.email}`);
            const matchedJobs = distributedJobs;

            await sendMatchedJobsEmail({
              to: userData.email,
              jobs: matchedJobs,
              userName: userData.full_name,
              subscriptionTier: 'free',
              isSignupEmail: true,
              subjectOverride: ` Welcome to JobPing - Your First ${matchesCount} Matches!`,
            });

            // Update user tracking fields after successful email send
            await supabase
              .from('users')
              .update({
                last_email_sent: new Date().toISOString(),
                email_count: 1,
              })
              .eq('email', userData.email);

            emailSent = true;
            apiLogger.info(`Welcome email sent to user`, { email: data.email, matchCount: matchesCount });
            console.log(`[SIGNUP] ✅ Matched jobs email sent successfully to ${data.email}`);
          } catch (emailError) {
            console.error(`[SIGNUP] ❌ Email send failed:`, emailError);
            const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
            const errorStack = emailError instanceof Error ? emailError.stack : undefined;
            apiLogger.error('Email send failed (non-fatal)', emailError as Error, { 
              email: data.email,
              errorMessage,
              errorStack,
              errorType: emailError?.constructor?.name,
              rawError: String(emailError)
            });
          }
        } else {
          // No matches found, send welcome email anyway
          apiLogger.info('No matches found, sending welcome email', { email: data.email });
          console.log(`[SIGNUP] No matches found, sending welcome email to ${data.email}`);
          emailSent = await sendWelcomeEmailAndTrack(
            userData.email,
            userData.full_name,
            userData.subscription_tier as 'free' | 'premium',
            0,
            supabase,
            'no matches'
          );
        }
      } else {
        // No jobs found in database, send welcome email anyway
        apiLogger.info(`No jobs found for user cities, sending welcome email`, { email: data.email, cities: userData.target_cities });
        console.log(`[SIGNUP] No jobs found for cities ${JSON.stringify(userData.target_cities)}, sending welcome email to ${data.email}`);
        emailSent = await sendWelcomeEmailAndTrack(
          userData.email,
          userData.full_name,
          userData.subscription_tier as 'free' | 'premium',
          0,
          supabase,
          'no jobs'
        );
      }
    } catch (matchError) {
      console.error(`[SIGNUP] ❌ Matching process failed:`, matchError);
      apiLogger.warn('Matching failed (non-fatal)', matchError as Error, { email: data.email });
      // Send welcome email even if matching fails
      apiLogger.info('Matching failed, attempting to send welcome email anyway', { email: data.email });
      console.log(`[SIGNUP] Matching failed, attempting to send welcome email anyway to ${data.email}`);
      emailSent = await sendWelcomeEmailAndTrack(
        userData.email,
        userData.full_name,
        userData.subscription_tier as 'free' | 'premium',
        0,
        supabase,
        'matching failed'
      );
    }

    // Log final status
    apiLogger.info(`Signup completed`, { 
      email: data.email, 
      matchesCount, 
      emailSent,
      emailStatus: emailSent ? 'sent' : 'not_sent'
    });
    console.log(`[SIGNUP] ===== FINAL STATUS =====`);
    console.log(`[SIGNUP] Email: ${data.email}`);
    console.log(`[SIGNUP] Matches: ${matchesCount}`);
    console.log(`[SIGNUP] Email Sent: ${emailSent ? 'YES ✅' : 'NO ❌'}`);
    console.log(`[SIGNUP] ========================`);

    // SAFETY NET: Ensure email is sent even if something went wrong
    if (!emailSent) {
      console.log(`[SIGNUP] ⚠️ Email not sent yet, attempting safety net send...`);
      apiLogger.warn('Email not sent during normal flow, attempting safety net', { email: data.email });
      emailSent = await sendWelcomeEmailAndTrack(
        userData.email,
        userData.full_name,
        userData.subscription_tier as 'free' | 'premium',
        matchesCount,
        supabase,
        'safety net'
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Signup successful! Check your email for your first matches.',
      matchesCount,
      emailSent,
      email: userData.email,
      redirectUrl: `/signup/success?tier=${subscriptionTier}&email=${encodeURIComponent(userData.email)}`
    });

  } catch (error) {
    apiLogger.error('Signup error', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

