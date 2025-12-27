/**
 * SCHEDULED EMAIL SENDER
 * Sends weekly scheduled emails to users based on their tier
 * Free: Thursday
 * Premium: Monday, Wednesday, Friday
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';
import { getProductionRateLimiter } from '@/Utils/productionRateLimiter';
import { apiLogger } from '@/lib/api-logger';
import { sendMatchedJobsEmail } from '@/Utils/email/sender';
import { SEND_PLAN, isSendDay, getCurrentWeekStart } from '@/Utils/sendConfiguration';
import { createConsolidatedMatcher } from '@/Utils/consolidatedMatchingV2';
import { fetchCandidateJobs } from '@/Utils/matching/jobSearchService';
import { fetchActiveUsers, transformUsers } from '@/Utils/matching/userBatchService';
import { distributeJobsWithDiversity } from '@/Utils/matching/jobDistribution';
import { preFilterJobsByUserPreferencesEnhanced } from '@/Utils/matching/preFilterJobs';
import type { UserPreferences } from '@/Utils/matching/types';
import { Database } from '@/lib/database.types';

type User = Database['public']['Tables']['users']['Row'];

async function handleSendScheduledEmails(req: NextRequest) {
  const startTime = Date.now();
  
  // Rate limiting
  let rateLimitResult: NextResponse | null = null;
  try {
    const limiter: any = getProductionRateLimiter();
    if (limiter && typeof limiter.middleware === 'function') {
      rateLimitResult = await limiter.middleware(req, 'send-scheduled-emails');
    }
  } catch {
    rateLimitResult = null;
  }
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const supabase = getDatabaseClient();
    const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }) as string;
    const currentWeek = getCurrentWeekStart();
    
    apiLogger.info('Starting scheduled email send', { today, currentWeek });

    // Check if today is a send day for either tier
    const isFreeSendDay = isSendDay('free');
    const isPremiumSendDay = isSendDay('premium');

    if (!isFreeSendDay && !isPremiumSendDay) {
      apiLogger.info('Not a send day for any tier', { today });
      return NextResponse.json({
        success: true,
        message: 'Not a send day',
        today,
        emailsSent: 0
      });
    }

    // Build query for eligible users
    let userQuery = supabase
      .from('users')
      .select('*')
      .eq('active', true)
      .is('delivery_paused', false)
      .order('created_at', { ascending: false });

    // Filter by tier based on send day
    if (isFreeSendDay && isPremiumSendDay) {
      // Both tiers send today - get all users
      // No additional filter needed
    } else if (isFreeSendDay) {
      userQuery = userQuery.eq('subscription_tier', 'free');
    } else if (isPremiumSendDay) {
      userQuery = userQuery.eq('subscription_tier', 'premium');
    }

    // Get users who haven't received an email this week
    // Check last_email_sent to avoid duplicate sends
    // For free users on Thursday, check if they received email this week
    // For premium users, check if they received email on this specific day
    const weekStartDate = new Date(currentWeek);
    const weekStartISO = weekStartDate.toISOString();
    
    // More precise filtering: free users check weekly, premium users check per-send-day
    if (isFreeSendDay && !isPremiumSendDay) {
      // Free users: only send if they haven't received email this week
      userQuery = userQuery.or(
        `last_email_sent.is.null,last_email_sent.lt.${weekStartISO}`
      );
    } else if (isPremiumSendDay && !isFreeSendDay) {
      // Premium users: check if they received email today (to avoid duplicate sends on same day)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();
      userQuery = userQuery.or(
        `last_email_sent.is.null,last_email_sent.lt.${todayISO}`
      );
    } else {
      // Both tiers send today - use weekly check for free, daily check for premium
      // This is complex, so we'll handle it in the loop
      userQuery = userQuery.or(
        `last_email_sent.is.null,last_email_sent.lt.${weekStartISO}`
      );
    }

    const { data: users, error: usersError } = await userQuery.limit(100);

    if (usersError) {
      apiLogger.error('Failed to fetch users', usersError as Error);
      return NextResponse.json({
        error: 'Failed to fetch users',
        details: usersError.message
      }, { status: 500 });
    }

    if (!users || users.length === 0) {
      apiLogger.info('No eligible users found for scheduled send');
      return NextResponse.json({
        success: true,
        message: 'No eligible users',
        emailsSent: 0
      });
    }

    apiLogger.info(`Found ${users.length} eligible users for scheduled send`, {
      freeSendDay: isFreeSendDay,
      premiumSendDay: isPremiumSendDay,
      userCount: users.length
    });

    // Transform users to expected format
    const transformedUsers = transformUsers(users);

    // Create matcher
    const matcher = createConsolidatedMatcher(process.env.OPENAI_API_KEY);

    // Fetch jobs for matching
    const { jobs, filters } = await fetchCandidateJobs(
      supabase,
      10000, // Large job cap for matching
      transformedUsers.map(u => ({ preferences: u.preferences }))
    );

    apiLogger.info(`Fetched ${jobs.length} jobs for matching`, {
      jobCount: jobs.length,
      filters
    });

    let emailsSent = 0;
    let errors: Array<{ email: string; error: string }> = [];
    let usersWithoutMatches = 0;

    // Process each user
    for (let i = 0; i < transformedUsers.length; i++) {
      const user = transformedUsers[i];
      const originalUser = users[i] as User;
      
      try {
        const userTier = (user.subscription_tier || 'free') as 'free' | 'premium';
        
        // Skip free users entirely - they don't get emails
        if (userTier === 'free') {
          continue;
        }
        
        // Skip if not a send day for this user's tier
        if (userTier === 'premium' && !isPremiumSendDay) continue;
        
        // Additional check: for premium users, verify they haven't received email today
        if (userTier === 'premium' && user.last_email_sent) {
          const lastSent = new Date(user.last_email_sent);
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          if (lastSent >= todayStart) {
            apiLogger.debug('Premium user already received email today', {
              email: user.email,
              lastSent: user.last_email_sent
            });
            continue;
          }
        }
        
        const plan = SEND_PLAN[userTier];
        const jobsPerSend = plan.perSend;

        // Pre-filter jobs for this user
        const preFilteredJobs = await preFilterJobsByUserPreferencesEnhanced(
          jobs as any[],
          user as unknown as UserPreferences
        );

        // Get top candidates for AI matching
        const candidates = preFilteredJobs.slice(0, 50);

        // Perform AI matching
        const matchResult = await matcher.performMatching(
          candidates as any[],
          user as unknown as UserPreferences,
          false // Don't disable AI
        );

        if (!matchResult.matches || matchResult.matches.length === 0) {
          usersWithoutMatches++;
          apiLogger.debug('No matches found for user', { email: user.email });
          continue;
        }

        // Get matched jobs with full data
        const matchedJobs = matchResult.matches
          .map(match => {
            const job = jobs.find(j => j.job_hash === match.job_hash);
            if (!job) return null;
            return {
              ...job,
              match_score: match.match_score,
              match_reason: match.match_reason || 'AI-matched'
            };
          })
          .filter(j => j !== null)
          .slice(0, jobsPerSend);

        if (matchedJobs.length < jobsPerSend) {
          usersWithoutMatches++;
          apiLogger.debug('Insufficient matches for user', {
            email: user.email,
            found: matchedJobs.length,
            required: jobsPerSend
          });
          continue;
        }

        // Extract work environment preferences (may be comma-separated string or array)
        let targetWorkEnvironments: string[] = [];
        if (user.preferences.work_environment) {
          if (Array.isArray(user.preferences.work_environment)) {
            targetWorkEnvironments = user.preferences.work_environment;
          } else if (typeof user.preferences.work_environment === 'string') {
            // Parse comma-separated string: "Office, Hybrid" -> ["Office", "Hybrid"]
            targetWorkEnvironments = user.preferences.work_environment.split(',').map(env => env.trim()).filter(Boolean);
          }
        }

        // Apply job distribution for diversity (cities AND work environments)
        const distributedJobs = distributeJobsWithDiversity(matchedJobs as any[], {
          targetCount: jobsPerSend,
          targetCities: user.preferences.target_cities || [],
          maxPerSource: Math.ceil(jobsPerSend / 3),
          ensureCityBalance: true,
          targetWorkEnvironments: targetWorkEnvironments,
          ensureWorkEnvironmentBalance: targetWorkEnvironments.length > 0
        });

        // Send email
        await sendMatchedJobsEmail({
          to: user.email || '',
          jobs: distributedJobs,
          userName: user.full_name || undefined,
          subscriptionTier: userTier,
          isSignupEmail: false
        });

        // Update user's last_email_sent
        await supabase
          .from('users')
          .update({
            last_email_sent: new Date().toISOString(),
            email_count: (originalUser.email_count || 0) + 1
          })
          .eq('email', user.email);

        emailsSent++;
        apiLogger.info('Scheduled email sent successfully', {
          email: user.email,
          tier: userTier,
          jobsSent: distributedJobs.length
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          email: user.email || 'unknown',
          error: errorMessage
        });
        apiLogger.error('Failed to send scheduled email to user', error as Error, {
          email: user.email
        });
      }
    }

    const processingTime = Date.now() - startTime;

    apiLogger.info('Scheduled email send completed', {
      emailsSent,
      errors: errors.length,
      usersWithoutMatches,
      processingTime
    });

    return NextResponse.json({
      success: true,
      message: 'Scheduled email send completed',
      emailsSent,
      usersProcessed: users.length,
      usersWithoutMatches,
      errors: errors.length > 0 ? errors : undefined,
      processingTime
    });

  } catch (error) {
    apiLogger.error('Scheduled email send failed', error as Error);
    return NextResponse.json({
      error: 'Scheduled email send failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Export POST handler with authentication
// Supports two auth methods:
// 1. Vercel Cron: sends CRON_SECRET in Authorization header (optional, for extra security)
// 2. Manual calls: use SYSTEM_API_KEY in x-api-key header (required)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET; // Optional - only needed if you want to verify Vercel cron
    const systemKey = process.env.SYSTEM_API_KEY; // Required - for manual calls and fallback
    
    // Check if request is authorized
    // Option 1: Vercel cron with CRON_SECRET (if set)
    const isVercelCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
    
    // Option 2: Manual call with SYSTEM_API_KEY
    const apiKey = request.headers.get('x-api-key');
    const isSystemKey = systemKey && apiKey === systemKey;
    
    // Allow if either auth method passes
    // Note: If CRON_SECRET is not set, Vercel cron requests will still work via SYSTEM_API_KEY
    if (!isVercelCron && !isSystemKey) {
      apiLogger.warn('Unauthorized scheduled email send attempt', {
        hasAuthHeader: !!authHeader,
        hasApiKey: !!apiKey,
        hasCronSecret: !!cronSecret,
        hasSystemKey: !!systemKey
      });
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing authentication' },
        { status: 401 }
      );
    }

    // Call the handler
    return await handleSendScheduledEmails(request);
  } catch (error) {
    apiLogger.error('Scheduled email route error', error as Error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

