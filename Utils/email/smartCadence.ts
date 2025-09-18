/**
 * Smart Email Cadence Control System
 * Dynamic email frequency based on user engagement and behavior
 */

import { createClient } from '@supabase/supabase-js';

export interface UserEmailProfile {
  email: string;
  currentCadence: 'daily' | '3x_week' | 'weekly' | 'bi_weekly' | 'paused';
  engagementScore: number;
  openRate: number;
  clickRate: number;
  lastEmailSent: Date | null;
  lastEmailOpened: Date | null;
  lastEmailClicked: Date | null;
  feedbackCount: number;
  negativeFeedbackRate: number;
  preferredTimeOfDay: 'morning' | 'afternoon' | 'evening';
  timezone: string;
  subscriptionTier: 'free' | 'premium';
  daysSinceSignup: number;
  totalEmailsSent: number;
  totalEmailsOpened: number;
  totalEmailsClicked: number;
}

export interface CadenceRecommendation {
  newCadence: 'daily' | '3x_week' | 'weekly' | 'bi_weekly' | 'paused';
  reason: string;
  confidence: number;
  metrics: {
    currentEngagement: number;
    predictedEngagement: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

// Initialize Supabase client
function getSupabaseClient() {
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

/**
 * Get user email profile with engagement metrics
 */
export async function getUserEmailProfile(userEmail: string): Promise<UserEmailProfile | null> {
  try {
    const supabase = getSupabaseClient();

    // Get user data
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (!user) return null;

    // Get email tracking data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: emailTracking } = await supabase
      .from('email_sends')
      .select('*')
      .eq('user_email', userEmail)
      .gte('sent_at', thirtyDaysAgo.toISOString())
      .order('sent_at', { ascending: false });

    const { data: implicitSignals } = await supabase
      .from('implicit_signals')
      .select('*')
      .eq('user_email', userEmail)
      .eq('signal_type', 'open')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const { data: feedback } = await supabase
      .from('match_logs')
      .select('*')
      .eq('user_email', userEmail)
      .eq('match_algorithm', 'user_feedback')
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Calculate metrics
    const totalEmailsSent = emailTracking?.length || 0;
    const totalEmailsOpened = implicitSignals?.length || 0;
    const openRate = totalEmailsSent > 0 ? (totalEmailsOpened / totalEmailsSent) * 100 : 0;

    // Calculate click rate from feedback
    const positiveFeedback = feedback?.filter(f => f.match_quality === 'positive').length || 0;
    const clickRate = totalEmailsSent > 0 ? (positiveFeedback / totalEmailsSent) * 100 : 0;

    // Calculate engagement score (0-100)
    const engagementScore = Math.min(100, Math.max(0, 
      (openRate * 0.4) + (clickRate * 0.6)
    ));

    // Calculate negative feedback rate
    const negativeFeedback = feedback?.filter(f => f.match_quality === 'negative').length || 0;
    const negativeFeedbackRate = feedback && feedback.length > 0 ? (negativeFeedback / feedback.length) * 100 : 0;

    // Determine preferred time of day
    const hourCounts = new Array(24).fill(0);
    implicitSignals?.forEach(signal => {
      const hour = new Date(signal.created_at).getHours();
      hourCounts[hour]++;
    });
    const mostActiveHour = hourCounts.indexOf(Math.max(...hourCounts));
    const preferredTimeOfDay = mostActiveHour < 12 ? 'morning' : mostActiveHour < 17 ? 'afternoon' : 'evening';

    // Calculate days since signup
    const daysSinceSignup = user.created_at ? 
      Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return {
      email: userEmail,
      currentCadence: user.email_cadence || '3x_week',
      engagementScore,
      openRate,
      clickRate,
      lastEmailSent: emailTracking?.[0]?.sent_at ? new Date(emailTracking[0].sent_at) : null,
      lastEmailOpened: implicitSignals?.[0]?.created_at ? new Date(implicitSignals[0].created_at) : null,
      lastEmailClicked: feedback?.[0]?.created_at ? new Date(feedback[0].created_at) : null,
      feedbackCount: feedback?.length || 0,
      negativeFeedbackRate,
      preferredTimeOfDay,
      timezone: user.timezone || 'UTC',
      subscriptionTier: user.subscription_tier || 'free',
      daysSinceSignup,
      totalEmailsSent,
      totalEmailsOpened,
      totalEmailsClicked: 0
    };

  } catch (error) {
    console.error('Error getting user email profile:', error);
    return null;
  }
}

/**
 * Generate cadence recommendation based on user behavior
 */
export function generateCadenceRecommendation(profile: UserEmailProfile): CadenceRecommendation {
  const {
    engagementScore,
    openRate,
    clickRate,
    negativeFeedbackRate,
    daysSinceSignup,
    subscriptionTier,
    lastEmailSent,
    totalEmailsSent
  } = profile;

  // Default recommendation
  let newCadence: 'daily' | '3x_week' | 'weekly' | 'bi_weekly' | 'paused' = '3x_week';
  let reason = 'Default recommendation';
  let confidence = 0.5;

  // High engagement users - increase frequency
  if (engagementScore >= 70 && clickRate >= 15 && negativeFeedbackRate <= 10) {
    newCadence = subscriptionTier === 'premium' ? 'daily' : '3x_week';
    reason = 'High engagement - increasing frequency';
    confidence = 0.9;
  }
  // Low engagement users - decrease frequency
  else if (engagementScore <= 30 || clickRate <= 5 || negativeFeedbackRate >= 30) {
    newCadence = 'weekly';
    reason = 'Low engagement - reducing frequency to avoid fatigue';
    confidence = 0.8;
  }
  // Very low engagement - pause
  else if (engagementScore <= 15 || clickRate <= 2 || negativeFeedbackRate >= 50) {
    newCadence = 'paused';
    reason = 'Very low engagement - pausing emails to prevent unsubscribes';
    confidence = 0.9;
  }
  // New users (less than 7 days) - start with 3x/week
  else if (daysSinceSignup < 7) {
    newCadence = '3x_week';
    reason = 'New user - starting with standard frequency';
    confidence = 0.7;
  }
  // Users with no recent opens - reduce frequency
  else if (lastEmailSent && (Date.now() - lastEmailSent.getTime()) > 7 * 24 * 60 * 60 * 1000) {
    newCadence = 'weekly';
    reason = 'No recent email engagement - reducing frequency';
    confidence = 0.8;
  }
  // Premium users with decent engagement - optimize for their tier
  else if (subscriptionTier === 'premium' && engagementScore >= 50) {
    newCadence = 'daily';
    reason = 'Premium user with good engagement - maximizing value';
    confidence = 0.8;
  }

  // Calculate risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (engagementScore <= 20 || negativeFeedbackRate >= 40) {
    riskLevel = 'high';
  } else if (engagementScore <= 40 || negativeFeedbackRate >= 20) {
    riskLevel = 'medium';
  }

  // Predict engagement for new cadence
  let predictedEngagement = engagementScore;
  if (newCadence === 'daily' && engagementScore < 60) {
    predictedEngagement = Math.max(0, engagementScore - 10); // Risk of fatigue
  } else if (newCadence === 'weekly' && engagementScore > 50) {
    predictedEngagement = Math.min(100, engagementScore + 5); // Recovery potential
  }

  return {
    newCadence,
    reason,
    confidence,
    metrics: {
      currentEngagement: engagementScore,
      predictedEngagement,
      riskLevel
    }
  };
}

/**
 * Check if user should receive email based on cadence
 */
export function shouldSendEmail(profile: UserEmailProfile): boolean {
  const { currentCadence, lastEmailSent, engagementScore } = profile;

  // Don't send if paused
  if (currentCadence === 'paused') {
    return false;
  }

  // Don't send if very low engagement
  if (engagementScore <= 10) {
    return false;
  }

  if (!lastEmailSent) {
    return true; // First email
  }

  const hoursSinceLastEmail = (Date.now() - lastEmailSent.getTime()) / (1000 * 60 * 60);

  switch (currentCadence) {
    case 'daily':
      return hoursSinceLastEmail >= 20; // 20+ hours
    case '3x_week':
      return hoursSinceLastEmail >= 48; // 2+ days
    case 'weekly':
      return hoursSinceLastEmail >= 144; // 6+ days
    case 'bi_weekly':
      return hoursSinceLastEmail >= 288; // 12+ days
    default:
      return false;
  }
}

/**
 * Get optimal send time for user
 */
export function getOptimalSendTime(profile: UserEmailProfile): Date {
  const { preferredTimeOfDay, timezone } = profile;
  
  const now = new Date();
  const sendTime = new Date(now);

  // Set hour based on preference
  switch (preferredTimeOfDay) {
    case 'morning':
      sendTime.setHours(9, 0, 0, 0); // 9 AM
      break;
    case 'afternoon':
      sendTime.setHours(14, 0, 0, 0); // 2 PM
      break;
    case 'evening':
      sendTime.setHours(18, 0, 0, 0); // 6 PM
      break;
    default:
      sendTime.setHours(10, 0, 0, 0); // Default 10 AM
  }

  // If the time has already passed today, schedule for tomorrow
  if (sendTime <= now) {
    sendTime.setDate(sendTime.getDate() + 1);
  }

  return sendTime;
}

/**
 * Update user email cadence in database
 */
export async function updateUserEmailCadence(
  userEmail: string, 
  newCadence: string, 
  reason: string
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('users')
      .update({ 
        email_cadence: newCadence,
        email_cadence_reason: reason,
        email_cadence_updated_at: new Date().toISOString()
      })
      .eq('email', userEmail);

    if (error) {
      console.error('Error updating email cadence:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating email cadence:', error);
    return false;
  }
}

/**
 * Get email cadence statistics for all users
 */
export async function getEmailCadenceStats(): Promise<{
  totalUsers: number;
  cadenceDistribution: Record<string, number>;
  averageEngagement: number;
  usersNeedingAttention: number;
}> {
  try {
    const supabase = getSupabaseClient();

    // Get all users with email cadence data
    const { data: users } = await supabase
      .from('users')
      .select('email, email_cadence, created_at');

    if (!users) {
      return {
        totalUsers: 0,
        cadenceDistribution: {},
        averageEngagement: 0,
        usersNeedingAttention: 0
      };
    }

    // Calculate cadence distribution
    const cadenceDistribution: Record<string, number> = {};
    let totalEngagement = 0;
    let usersNeedingAttention = 0;

    for (const user of users) {
      const cadence = user.email_cadence || '3x_week';
      cadenceDistribution[cadence] = (cadenceDistribution[cadence] || 0) + 1;

      // Get user profile for engagement calculation
      const profile = await getUserEmailProfile(user.email);
      if (profile) {
        totalEngagement += profile.engagementScore;
        
        // Users with very low engagement need attention
        if (profile.engagementScore <= 20) {
          usersNeedingAttention++;
        }
      }
    }

    const averageEngagement = users.length > 0 ? totalEngagement / users.length : 0;

    return {
      totalUsers: users.length,
      cadenceDistribution,
      averageEngagement: Math.round(averageEngagement * 100) / 100,
      usersNeedingAttention
    };

  } catch (error) {
    console.error('Error getting email cadence stats:', error);
    return {
      totalUsers: 0,
      cadenceDistribution: {},
      averageEngagement: 0,
      usersNeedingAttention: 0
    };
  }
}
