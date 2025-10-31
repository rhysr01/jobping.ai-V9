// Native signup form handler

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';
import { createConsolidatedMatcher } from '@/Utils/consolidatedMatching';
import { sendWelcomeEmail, sendMatchedJobsEmail } from '@/Utils/email/sender';
import { apiLogger } from '@/lib/api-logger';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Validate required fields
    if (!data.email || !data.fullName || !data.cities || data.cities.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getDatabaseClient();
    
    // Determine subscription tier from request (defaults to 'free')
    const subscriptionTier = (data.tier === 'premium' ? 'premium' : 'free') as 'free' | 'premium';
    
    // Create user in database
    const userData = {
      email: data.email.toLowerCase().trim(),
      full_name: data.fullName.trim(),
      target_cities: data.cities,
      languages_spoken: data.languages,
      start_date: data.startDate || null,
      professional_experience: data.experience || null,
      professional_expertise: data.careerPath || 'entry', // For matching system
      work_environment: data.workEnvironment.join(', ') || null,
      visa_status: data.visaStatus || null,
      entry_level_preference: data.entryLevelPreferences?.join(', ') || null, // Changed to array
      company_types: data.targetCompanies,
        career_path: data.careerPath || null,
        roles_selected: data.roles,
        // NEW MATCHING PREFERENCES
        remote_preference: data.workEnvironment?.includes('Remote') ? 'remote' : data.workEnvironment?.includes('Hybrid') ? 'hybrid' : 'flexible',
        industries: data.industries || [],
        company_size_preference: data.companySizePreference || 'any',
        skills: data.skills || [],
        career_keywords: data.careerKeywords || null,
      subscription_tier: subscriptionTier,
      email_verified: true, // Auto-verify for now (can add email verification later)
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
      apiLogger.error('Failed to create user', userError as Error, { email: data.email });
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    apiLogger.info(`User created`, { email: data.email });

    // Trigger instant matching and email
    let matchesCount = 0;
    try {
      const matcher = createConsolidatedMatcher(process.env.OPENAI_API_KEY);
      
      // Fetch jobs for matching - PRE-FILTER by location for better matches
      const { data: allJobs } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'active')
        .is('filtered_reason', null)
        .in('city', userData.target_cities) // CRITICAL: Only jobs in user's cities!
        .order('created_at', { ascending: false })
        .limit(1000); // Get more since we're pre-filtering

      // Further filter by career path if available (85%+ of jobs have career path data)
      const jobs = allJobs?.filter(job => {
        // If job has career path data AND user selected a career path, check for alignment
        if (job.categories && job.categories.length > 0 && userData.career_path) {
          const careerPathSlug = userData.career_path.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
          const hasCareerMatch = job.categories.some((cat: string) => 
            cat.includes(careerPathSlug) || 
            cat.includes('early-career')
          );
          return hasCareerMatch;
        }
        // If no career path data, still include it (don't penalize missing data)
        return true;
      }) || [];

      if (jobs && jobs.length > 0) {
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
          // NEW MATCHING PREFERENCES
          remote_preference: userData.remote_preference,
          industries: userData.industries,
          company_size_preference: userData.company_size_preference,
          skills: userData.skills,
          career_keywords: userData.career_keywords,
        };

        const matchResult = await matcher.performMatching(jobs, userPrefs as any);
        
        if (matchResult.matches && matchResult.matches.length > 0) {
          // Save matches
          const matchesToSave = matchResult.matches.slice(0, 10).map(m => {
            const job = jobs.find(j => j.job_hash === m.job_hash);
            return {
              user_email: userData.email,
              job_hash: m.job_hash,
              match_score: m.match_score,
              match_reason: m.match_reason || 'AI match',
            };
          }).filter(m => m.job_hash);

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
            const matchedJobs = matchesToSave.map(m => {
              const job = jobs.find(j => j.job_hash === m.job_hash);
              return {
                ...job,
                match_score: m.match_score,
                match_reason: m.match_reason,
              };
            }).filter(j => j);

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

            apiLogger.info(`Welcome email sent to user`, { email: data.email, matchCount: matchesCount });
          } catch (emailError) {
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
          try {
            await sendWelcomeEmail({
              to: userData.email,
              userName: userData.full_name,
              matchCount: 0,
              tier: userData.subscription_tier as 'free' | 'premium',
            });

            // Update tracking even with no matches
            await supabase
              .from('users')
              .update({
                last_email_sent: new Date().toISOString(),
                email_count: 1,
              })
              .eq('email', userData.email);

            apiLogger.info(`Welcome email (no matches) sent to user`, { email: data.email });
          } catch (emailError) {
            const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
            const errorStack = emailError instanceof Error ? emailError.stack : undefined;
            apiLogger.error('Welcome email failed', emailError as Error, { 
              email: data.email,
              errorMessage,
              errorStack,
              errorType: emailError?.constructor?.name,
              rawError: String(emailError)
            });
          }
        }
      } else {
        // No jobs found in database, send welcome email anyway
        apiLogger.info(`No jobs found for user cities, sending welcome email`, { email: data.email, cities: userData.target_cities });
        try {
          await sendWelcomeEmail({
            to: userData.email,
            userName: userData.full_name,
            matchCount: 0,
            tier: userData.subscription_tier as 'free' | 'premium',
          });

          // Update tracking even with no jobs
          await supabase
            .from('users')
            .update({
              last_email_sent: new Date().toISOString(),
              email_count: 1,
            })
            .eq('email', userData.email);

          apiLogger.info(`Welcome email (no jobs) sent to user`, { email: data.email });
        } catch (emailError) {
          const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
          const errorStack = emailError instanceof Error ? emailError.stack : undefined;
          apiLogger.error('Welcome email failed', emailError as Error, { 
            email: data.email,
            errorMessage,
            errorStack,
            errorType: emailError?.constructor?.name,
            rawError: String(emailError)
          });
        }
      }
    } catch (matchError) {
      apiLogger.warn('Matching failed (non-fatal)', matchError as Error, { email: data.email });
      // Send welcome email even if matching fails
      try {
        await sendWelcomeEmail({
          to: userData.email,
          userName: userData.full_name,
          matchCount: 0,
          tier: userData.subscription_tier as 'free' | 'premium',
        });

        // Update tracking even if matching failed
        await supabase
          .from('users')
          .update({
            last_email_sent: new Date().toISOString(),
            email_count: 1,
          })
          .eq('email', userData.email);

        apiLogger.info(`Welcome email (matching failed) sent to user`, { email: data.email });
      } catch (emailError) {
        const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
        const errorStack = emailError instanceof Error ? emailError.stack : undefined;
        apiLogger.error('Welcome email failed', emailError as Error, { 
          email: data.email,
          errorMessage,
          errorStack,
          errorType: emailError?.constructor?.name,
          rawError: String(emailError)
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Signup successful! Check your email for your first matches.',
      matchesCount
    });

  } catch (error) {
    apiLogger.error('Signup error', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

