import { NextRequest, NextResponse } from 'next/server';
import { getProductionRateLimiter } from '@/Utils/productionRateLimiter';
import { HTTP_STATUS, ERROR_CODES } from '@/Utils/constants';
import { errorResponse } from '@/Utils/errorResponse';
import { getSupabaseClient } from '@/Utils/supabase';
import { sendMatchedJobsEmail } from '@/Utils/email';
import { buildPersonalizedSubject } from '@/Utils/email/subjectBuilder';
import {
  generateRobustFallbackMatches
} from '@/Utils/matching';
import { 
  logMatchSession
} from '@/Utils/matching/logging.service';
import type { UserPreferences } from '@/Utils/matching/types';
import { createConsolidatedMatcher } from '@/Utils/consolidatedMatching';
import { aiCostManager } from '@/Utils/ai-cost-manager';
import { jobQueue } from '@/Utils/job-queue.service';
import { withAuth } from '@/Utils/auth/withAuth';
import OpenAI from 'openai';
import { shouldSendEmailToUser, updateUserEngagement } from '@/Utils/engagementTracker';

// Helper function to safely normalize string/array fields
function normalizeStringToArray(value: unknown): string[] {
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


function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

async function handleSendScheduledEmails(req: NextRequest) {
  // PRODUCTION: Rate limiting for scheduled emails (should only be called by automation)
  let rateLimitResult: NextResponse | null = null;
  try {
    const limiter: any = getProductionRateLimiter();
    if (limiter && typeof limiter.middleware === 'function') {
      rateLimitResult = await limiter.middleware(req, 'send-scheduled-emails');
    }
  } catch {
    // In tests or degraded mode, skip rate limiting
    rateLimitResult = null;
  }
  if (rateLimitResult) {
    return rateLimitResult;
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

    // Filter users based on tier-based timing rules AND engagement
    const eligibleUsers = [];
    
    for (const user of allUsers) {
      const userTier = user.subscription_tier || 'free';
      const signupTime = new Date(user.created_at);
      const lastEmailTime = user.last_email_sent ? new Date(user.last_email_sent) : null;
      const timeSinceSignup = now.getTime() - signupTime.getTime();
      const timeSinceLastEmail = lastEmailTime ? now.getTime() - lastEmailTime.getTime() : Infinity;
      const emailPhase = user.email_phase || 'welcome';
      const onboardingComplete = user.onboarding_complete || false;

      // Check if user should receive emails based on engagement
      const shouldReceiveEmail = await shouldSendEmailToUser(user.email);
      
      if (!shouldReceiveEmail) {
        console.log(`⏸️ Skipping ${user.email} - delivery paused or not engaged`);
        continue;
      }

      // Testing mode: 5 minutes instead of normal intervals
      if (testingMode) {
        const testThreshold = 5 * 60 * 1000; // 5 minutes
        if (timeSinceLastEmail >= testThreshold) {
          eligibleUsers.push(user);
        }
        continue;
      }

      // Phase 1: Welcome email (immediate) - handled by webhook-tally
      // Skip if user hasn't received their welcome email yet
      if (emailPhase === 'welcome' && !lastEmailTime) {
        continue;
      }

      // Phase 2: 48-hour follow-up (exactly 48 hours after signup)
      if (emailPhase === 'welcome' && timeSinceSignup >= 48 * 60 * 60 * 1000 && timeSinceSignup < 72 * 60 * 60 * 1000) {
        // User is in the 48-72 hour window and hasn't received the follow-up email
        if (timeSinceLastEmail >= 48 * 60 * 60 * 1000) {
          eligibleUsers.push(user);
        }
        continue;
      }

      // Phase 3: Regular distribution (tier-based) - only after onboarding is complete
      if (onboardingComplete && emailPhase === 'regular') {
        if (userTier === 'premium') {
          // Premium: every 48 hours
          if (timeSinceLastEmail >= 48 * 60 * 60 * 1000) {
            eligibleUsers.push(user);
          }
        } else {
          // Free: every 72 hours
          if (timeSinceLastEmail >= 72 * 60 * 60 * 1000) {
            eligibleUsers.push(user);
          }
        }
      }
    }

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
      .limit(10000); // Increased to fetch more jobs for better matching

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

    const matcher = createConsolidatedMatcher(process.env.OPENAI_API_KEY);

    // BATCH PROCESSING: Process users in batches of 10 to avoid timeouts
    const userResults = [];
    const BATCH_SIZE = 10;
    
    console.log(`📦 Processing ${eligibleUsers.length} users in batches of ${BATCH_SIZE}...`);
    
    for (let i = 0; i < eligibleUsers.length; i += BATCH_SIZE) {
      const batch = eligibleUsers.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(eligibleUsers.length / BATCH_SIZE);
      
      console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} users)...`);
      
      const batchPromises = batch.map(async (user) => {
        try {
          console.log(`🎯 Processing user: ${user.email}`);

          // Get jobs this user has already received (to prevent duplicates)
          const { data: previousMatches } = await supabase
            .from('matches')
            .select('job_hash')
            .eq('user_email', user.email);
          
          const previousJobHashes = new Set(previousMatches?.map(m => m.job_hash) || []);
          console.log(`User ${user.email} has already received ${previousJobHashes.size} jobs`);
          
          // Filter out jobs the user has already received
          const unseenJobs = jobs.filter(job => !previousJobHashes.has(job.job_hash));
          console.log(`${unseenJobs.length} new jobs available for ${user.email} (${jobs.length - unseenJobs.length} already sent)`);

          const userPreferences: UserPreferences = {
            email: user.email,
            target_cities: normalizeStringToArray(user.target_cities),
            languages_spoken: normalizeStringToArray(user.languages_spoken),
            company_types: [],
            roles_selected: [],
            professional_expertise: user.professional_expertise || 'entry',
            work_environment: 'unclear',
            career_path: [],
            entry_level_preference: user.entry_level_preference || 'entry'
          };

          let matches;
          let matchType: 'ai_success' | 'ai_failed' | 'fallback' = 'ai_success';

          const aiDisabled = process.env.MATCH_USERS_DISABLE_AI === 'true';

          if (aiDisabled) {
            console.log(`🧠 AI disabled, using rule-based fallback for ${user.email}`);
            matchType = 'fallback';
            const fallbackResults = generateRobustFallbackMatches(unseenJobs, userPreferences);
            matches = fallbackResults.map((result) => ({
              ...result.job,
              match_score: result.match_score,
              match_reason: result.match_reason,
              match_quality: result.match_quality,
            }));
          } else {
            try {
              // Check AI cost limits before making call
              const estimatedCost = aiCostManager.estimateCost('gpt-4', unseenJobs.length);
              const costCheck = await aiCostManager.canMakeAICall(user.email, estimatedCost);
              
              if (!costCheck.allowed) {
                console.log(`💰 AI call blocked for ${user.email}: ${costCheck.reason}`);
                matchType = 'fallback';
                const fallbackResults = generateRobustFallbackMatches(unseenJobs, userPreferences);
                matches = fallbackResults.map((result) => ({
                  ...result.job,
                  match_score: result.match_score,
                  match_reason: result.match_reason,
                  match_quality: result.match_quality,
                }));
              } else {
                // Use suggested model if provided
                const model = costCheck.suggestedModel || 'gpt-4';
                const aiRes = await matcher.performMatching(unseenJobs as any[], userPreferences);
                matches = aiRes.matches;
                
                // Record AI usage for cost tracking
                await aiCostManager.recordAICall(user.email, model, estimatedCost, 0);
                
                if (!matches || matches.length === 0) {
                  matchType = 'fallback';
                  const fallbackResults = generateRobustFallbackMatches(unseenJobs, userPreferences);
                  matches = fallbackResults.map((result) => ({
                    ...result.job,
                    match_score: result.match_score,
                    match_reason: result.match_reason,
                    match_quality: result.match_quality,
                  }));
                }
              }
            } catch (aiError) {
              console.error(`❌ AI matching failed for ${user.email}:`, aiError);
              matchType = 'ai_failed';
              const fallbackResults = generateRobustFallbackMatches(unseenJobs, userPreferences);
              matches = fallbackResults.map((result) => ({
                ...result.job,
                match_score: result.match_score,
                match_reason: result.match_reason,
                match_quality: result.match_quality,
              }));
            }
          }

          const userTier = user.subscription_tier || 'free';
          const signupTime = new Date(user.created_at);
          const timeSinceSignup = now.getTime() - signupTime.getTime();

          let maxMatches: number;
          let isOnboardingPhase = false;
          if (timeSinceSignup >= 48 * 60 * 60 * 1000 && timeSinceSignup < 72 * 60 * 60 * 1000) {
            maxMatches = 5;
            isOnboardingPhase = true;
          } else if (timeSinceSignup >= 72 * 60 * 60 * 1000) {
            maxMatches = userTier === 'premium' ? 15 : 6;
          } else {
            maxMatches = 5;
          }

          matches = matches.slice(0, maxMatches);

          await logMatchSession(
            user.email,
            matchType,
            matches.length
          );

          if (matches.length > 0) {
            // Save matches to database for tracking (this prevents duplicates per-user)
            const matchEntries = matches.map((match: any) => ({
              user_email: user.email,
              job_hash: match.job_hash,
              match_score: match.match_score,
              match_reason: match.match_reason,
              match_algorithm: matchType === 'ai_success' ? 'ai' : 'rules',
              matched_at: new Date().toISOString(),
              created_at: new Date().toISOString()
            }));

            const { error: matchInsertError } = await supabase
              .from('matches')
              .insert(matchEntries);

            if (matchInsertError) {
              console.error(`❌ Failed to save matches for ${user.email}:`, matchInsertError);
            }

            // Build personalized subject from user preferences and matches
            const subject = buildPersonalizedSubject({
              jobs: matches.map((m: any) => ({
                title: (m as any).title,
                company: (m as any).company,
                location: (m as any).location,
                match_score: (m as any).match_score
              })),
              preferences: {
                rolePreference: (user as any).professional_expertise || null,
                locationPreference: Array.isArray((user as any).target_cities) ? (user as any).target_cities[0] : (user as any).target_cities,
                salaryPreference: undefined
              }
            });
            await sendMatchedJobsEmail({
              to: user.email,
              jobs: matches,
              userName: user.email.split('@')[0],
              subscriptionTier: userTier,
              isSignupEmail: false,
              subjectOverride: subject,
              personalization: {
                role: (user as any).professional_expertise || undefined,
                location: Array.isArray((user as any).target_cities) ? (user as any).target_cities[0] : (user as any).target_cities,
                salaryRange: undefined,
                dayText: new Date().toLocaleDateString('en-GB', { weekday: 'long' }),
                entryLevelLabel: (user as any).entry_level_preference ? 'Graduate-level' : undefined
              }
            });

            const updateData: any = {
              last_email_sent: new Date().toISOString(),
              email_count: (user.email_count || 0) + 1
            };

            if (isOnboardingPhase) {
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

            // Track email engagement (email sent)
            await updateUserEngagement(user.email, 'email_sent');
            
            console.log(`✅ Email sent to ${user.email} with ${matches.length} matches (${userTier} tier, ${isOnboardingPhase ? 'onboarding' : 'regular'} phase)`);
            return { success: true, email: user.email };
          } else {
            console.log(`⚠️ No matches found for ${user.email}`);
            return { success: true, email: user.email, noMatches: true };
          }
        } catch (error) {
          console.error(`❌ Failed to process user ${user.email}:`, error);
          return { success: false, email: user.email, error };
        }
      });
      
      // Process this batch
      const batchResults = await Promise.all(batchPromises);
      userResults.push(...batchResults);
      
      console.log(`✅ Batch ${batchNumber}/${totalBatches} complete - ${batchResults.filter(r => r.success).length}/${batch.length} succeeded`);
      
      // Small delay between batches to avoid rate limits (100ms)
      if (i + BATCH_SIZE < eligibleUsers.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const successCount = userResults.filter(r => r.success && !r.noMatches).length;
    const errorCount = userResults.filter(r => !r.success).length;

    // Memory cleanup after batch processing
    if (global.gc) {
      global.gc();
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

// Apply auth middleware
export const POST = withAuth(handleSendScheduledEmails, {
  requireSystemKey: true,
  allowedMethods: ['POST']
});

export async function GET() {
  return NextResponse.json({ 
    error: 'Method not allowed. This endpoint is designed for POST requests only.'
  }, { status: 405 });
}
