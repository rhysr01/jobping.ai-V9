import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getProductionRateLimiter } from '@/Utils/productionRateLimiter';
import { sendMatchedJobsEmail } from '@/Utils/email';
import { 
  performEnhancedAIMatching, 
  generateRobustFallbackMatches,
  logMatchSession,
  type UserPreferences 
} from '@/Utils/jobMatching';
import OpenAI from 'openai';

// Helper function to safely normalize string/array fields
function normalizeStringToArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    // Handle both comma-separated and pipe-separated strings
    if (value.includes('|')) {
      return value.split('|').map(s => s.trim()).filter(Boolean);
    }
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function getSupabaseClient() {
  // Only initialize during runtime, not build time (but allow in test environment)
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
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

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function POST(req: NextRequest) {
  // PRODUCTION: Rate limiting for scheduled emails (should only be called by automation)
  const rateLimitResult = await getProductionRateLimiter().middleware(req, 'send-scheduled-emails');
  if (rateLimitResult) {
    return rateLimitResult;
  }

  // Verify API key for security
  const apiKey = req.headers.get('x-api-key');
  if (apiKey !== process.env.SCRAPE_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🚀 Starting scheduled email delivery...');
    const supabase = getSupabaseClient();

    // Get all active users who are eligible for scheduled emails based on tier-based timing
    const testingMode = process.env.NODE_ENV === 'production' && process.env.JOBPING_PILOT_TESTING === '1';
    const now = new Date();
    
    console.log('🔍 Querying users for scheduled emails with tier-based timing...');
    
    // Get all verified users with their email history and tracking fields
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('email, email_verified, subscription_active, subscription_tier, created_at, last_email_sent, email_count, onboarding_complete, email_phase, target_cities, languages_spoken, professional_expertise, entry_level_preference')
      .eq('email_verified', true)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (usersError) {
      console.error('❌ Failed to fetch users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    if (!allUsers || allUsers.length === 0) {
      console.log('ℹ️ No users found');
      return NextResponse.json({ 
        success: true, 
        message: 'No users found',
        usersProcessed: 0 
      }, { status: 200 });
    }

    // Filter users based on tier-based timing rules using tracking fields
    const eligibleUsers = allUsers.filter(user => {
      const userTier = user.subscription_tier || 'free';
      const signupTime = new Date(user.created_at);
      const lastEmailTime = user.last_email_sent ? new Date(user.last_email_sent) : null;
      const timeSinceSignup = now.getTime() - signupTime.getTime();
      const timeSinceLastEmail = lastEmailTime ? now.getTime() - lastEmailTime.getTime() : Infinity;
      const emailPhase = user.email_phase || 'welcome';
      const onboardingComplete = user.onboarding_complete || false;

      // Testing mode: 5 minutes instead of normal intervals
      if (testingMode) {
        const testThreshold = 5 * 60 * 1000; // 5 minutes
        return timeSinceLastEmail >= testThreshold;
      }

      // Phase 1: Welcome email (immediate) - handled by webhook-tally
      // Skip if user hasn't received their welcome email yet
      if (emailPhase === 'welcome' && !lastEmailTime) {
        return false;
      }

      // Phase 2: 48-hour follow-up (exactly 48 hours after signup)
      if (emailPhase === 'welcome' && timeSinceSignup >= 48 * 60 * 60 * 1000 && timeSinceSignup < 72 * 60 * 60 * 1000) {
        // User is in the 48-72 hour window and hasn't received the follow-up email
        return timeSinceLastEmail >= 48 * 60 * 60 * 1000;
      }

      // Phase 3: Regular distribution (tier-based) - only after onboarding is complete
      if (onboardingComplete && emailPhase === 'regular') {
        if (userTier === 'premium') {
          // Premium: every 48 hours
          return timeSinceLastEmail >= 48 * 60 * 60 * 1000;
        } else {
          // Free: every 7 days (168 hours)
          return timeSinceLastEmail >= 168 * 60 * 60 * 1000;
        }
      }

      return false;
    });

    console.log(`📧 Found ${eligibleUsers.length} eligible users out of ${allUsers.length} total users`);
    console.log('🔍 Eligibility breakdown:', {
      total: allUsers.length,
      eligible: eligibleUsers.length,
      testingMode: testingMode ? 'ENABLED' : 'DISABLED'
    });

    if (!eligibleUsers || eligibleUsers.length === 0) {
      console.log('ℹ️ No users eligible for scheduled emails');
      return NextResponse.json({ 
        success: true, 
        message: 'No users eligible for scheduled emails',
        usersProcessed: 0 
      }, { status: 200 });
    }

    console.log(`📧 Processing ${eligibleUsers.length} users for scheduled emails`);

    // Get fresh jobs from the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'active')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1000);

    if (jobsError) {
      console.error('❌ Failed to fetch jobs:', jobsError);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    if (!jobs || jobs.length === 0) {
      console.log('ℹ️ No active jobs available for matching');
      return NextResponse.json({ 
        success: true, 
        message: 'No active jobs available',
        usersProcessed: 0 
      });
    }

    console.log(`📋 Found ${jobs.length} active jobs for matching`);

    const openai = getOpenAIClient();
    let successCount = 0;
    let errorCount = 0;

    // Process each user
    for (const user of eligibleUsers) {
      try {
        console.log(`🎯 Processing user: ${user.email}`);

        // Convert user data to UserPreferences format
        // Parse comma-separated text fields into arrays per database schema
        const userPreferences: UserPreferences = {
          email: user.email,
          target_cities: normalizeStringToArray(user.target_cities),
          languages_spoken: normalizeStringToArray(user.languages_spoken),
          company_types: [], // Default empty array since field not available
          roles_selected: [], // Default empty array since field not available
          professional_expertise: user.professional_expertise || 'entry',
          work_environment: 'any', // Default since field not available
          career_path: [], // Default empty array since field not available
          entry_level_preference: user.entry_level_preference || 'entry'
        };

        // Perform matching (bypass AI in tests)
        let matches;
        let matchType: 'ai_success' | 'ai_failed' | 'fallback' = 'ai_success';
        
        // Check if AI is disabled (e.g., in tests)
        const aiDisabled = process.env.MATCH_USERS_DISABLE_AI === 'true';
        
        if (aiDisabled) {
          console.log(`🧠 AI disabled, using rule-based fallback for ${user.email}`);
          matchType = 'fallback';
          const fallbackResults = generateRobustFallbackMatches(jobs, userPreferences);
          // Convert MatchResult[] to the format expected by sendMatchedJobsEmail
          matches = fallbackResults.map((result, index) => ({
            ...result.job,
            match_score: result.match_score,
            match_reason: result.match_reason,
            match_quality: result.match_quality,
            match_tags: result.match_tags
          }));
        } else {
          try {
            const aiResult = await performEnhancedAIMatching(jobs, userPreferences, openai);
            matches = aiResult.matches;
            
            if (!matches || matches.length === 0) {
              matchType = 'fallback';
              const fallbackResults = generateRobustFallbackMatches(jobs, userPreferences);
              matches = fallbackResults.map((result, index) => ({
                ...result.job,
                match_score: result.match_score,
                match_reason: result.match_reason,
                match_quality: result.match_quality,
                match_tags: result.match_tags
              }));
            }
          } catch (aiError) {
            console.error(`❌ AI matching failed for ${user.email}:`, aiError);
            matchType = 'ai_failed';
            const fallbackResults = generateRobustFallbackMatches(jobs, userPreferences);
            matches = fallbackResults.map((result, index) => ({
              ...result.job,
              match_score: result.match_score,
              match_reason: result.match_reason,
              match_quality: result.match_quality,
              match_tags: result.match_tags
            }));
          }
        }

        // Determine match limits based on user's phase and tier
        const userTier = user.subscription_tier || 'free';
        const signupTime = new Date(user.created_at);
        const timeSinceSignup = now.getTime() - signupTime.getTime();
        
        let maxMatches: number;
        let isOnboardingPhase = false;
        
        // Phase 2: 48-hour follow-up (all users get 5 matches)
        if (timeSinceSignup >= 48 * 60 * 60 * 1000 && timeSinceSignup < 72 * 60 * 60 * 1000) {
          maxMatches = 5;
          isOnboardingPhase = true;
        }
        // Phase 3: Regular distribution (tier-based)
        else if (timeSinceSignup >= 72 * 60 * 60 * 1000) {
          if (userTier === 'premium') {
            maxMatches = 15; // Premium: 15 jobs every 48 hours
          } else {
            maxMatches = 6; // Free: 6 jobs per week
          }
        }
        // Fallback for edge cases
        else {
          maxMatches = 5;
        }
        
        matches = matches.slice(0, maxMatches);

        // Log match session
        await logMatchSession(
          user.email,
          matchType,
          matches.length
        );

        // Send email if we have matches
        if (matches.length > 0) {
          await sendMatchedJobsEmail({
            to: user.email,
            jobs: matches,
            userName: user.email.split('@')[0], // Use email prefix as name
            subscriptionTier: userTier,
            isSignupEmail: false
          });
          
          // Update tracking fields
          const updateData: any = {
            last_email_sent: new Date().toISOString(),
            email_count: (user.email_count || 0) + 1
          };

          // Update email phase based on current state
          if (isOnboardingPhase) {
            // This is the 48-hour follow-up email
            updateData.email_phase = 'regular';
            updateData.onboarding_complete = true;
          }
          
          const { error: updateError } = await supabase
            .from('users')
            .update(updateData)
            .eq('email', user.email);
          
          if (updateError) {
            console.error(`❌ Failed to update tracking fields for ${user.email}:`, updateError);
          }
          
          console.log(`✅ Email sent to ${user.email} with ${matches.length} matches (${userTier} tier, ${isOnboardingPhase ? 'onboarding' : 'regular'} phase)`);
          successCount++;
        } else {
          console.log(`⚠️ No matches found for ${user.email}`);
        }

        // Add small delay to avoid overwhelming the email service
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Failed to process user ${user.email}:`, error);
        errorCount++;
      }
    }

    console.log(`📊 Scheduled email delivery completed:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📧 Total processed: ${eligibleUsers.length}`);

    return NextResponse.json({
      success: true,
      message: 'Scheduled email delivery completed',
      usersProcessed: eligibleUsers.length,
      emailsSent: successCount,
      errors: errorCount
    });

  } catch (error) {
    console.error('❌ Scheduled email delivery failed:', error);
    return NextResponse.json({
      error: 'Scheduled email delivery failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    error: 'Method not allowed. This endpoint is designed for POST requests only.'
  }, { status: 405 });
}
