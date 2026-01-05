/**
 * ENGAGEMENT TRACKING SYSTEM
 * Tracks user email engagement and pauses delivery for inactive users
 */

import { getDatabaseClient } from "./databasePool";

export interface UserEngagement {
  email: string;
  full_name: string | null;
  email_engagement_score: number;
  delivery_paused: boolean;
  last_engagement_date: string | null;
  last_email_opened: string | null;
  last_email_clicked: string | null;
  re_engagement_sent: boolean;
}

export interface EngagementStats {
  total_users: number;
  engaged_users: number;
  inactive_users: number;
  paused_users: number;
  re_engagement_candidates: number;
}

/**
 * Check if user is engaged (has opened/clicked emails in last 30 days)
 */
export async function isUserEngaged(email: string): Promise<boolean> {
  const supabase = getDatabaseClient();

  const { data: user, error } = await supabase
    .from("users")
    .select("email_engagement_score, delivery_paused, last_engagement_date")
    .eq("email", email)
    .single();

  if (error || !user) {
    console.error("Error checking user engagement:", error);
    return false; // Default to not engaged if we can't check
  }

  // User is engaged if:
  // 1. Engagement score >= 30
  // 2. Has engagement in last 30 days
  // 3. Not delivery paused
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const hasRecentEngagement =
    user.last_engagement_date &&
    new Date(user.last_engagement_date) > thirtyDaysAgo;

  return (
    user.email_engagement_score >= 30 &&
    hasRecentEngagement &&
    !user.delivery_paused
  );
}

/**
 * Update user engagement when they open/click emails
 */
export async function updateUserEngagement(
  email: string,
  engagementType: "email_opened" | "email_clicked" | "email_sent",
): Promise<void> {
  const supabase = getDatabaseClient();

  try {
    // Use the database function to update engagement
    const { error } = await supabase.rpc("update_user_engagement", {
      user_email: email,
      engagement_type: engagementType,
    });

    if (error) {
      console.error("Error updating user engagement:", error);
    } else {
      console.log(` Updated engagement for ${email}: ${engagementType}`);
    }
  } catch (error) {
    console.error("Failed to update user engagement:", error);
  }
}

/**
 * Get users who should receive re-engagement emails
 */
export async function getReEngagementCandidates(): Promise<UserEngagement[]> {
  const supabase = getDatabaseClient();

  const { data: users, error } = await supabase.rpc(
    "get_users_for_re_engagement",
  );

  if (error) {
    console.error("Error getting re-engagement candidates:", error);
    return [];
  }

  return users || [];
}

/**
 * Mark re-engagement email as sent
 */
export async function markReEngagementSent(email: string): Promise<void> {
  const supabase = getDatabaseClient();

  const { error } = await supabase
    .from("users")
    .update({ re_engagement_sent: true })
    .eq("email", email);

  if (error) {
    console.error("Error marking re-engagement as sent:", error);
  } else {
    console.log(` Marked re-engagement sent for ${email}`);
  }
}

/**
 * Get engagement statistics
 */
export async function getEngagementStats(): Promise<EngagementStats> {
  const supabase = getDatabaseClient();

  // Get total active users
  const { data: totalUsers, error: totalError } = await supabase
    .from("users")
    .select("email", { count: "exact" })
    .eq("active", true);

  if (totalError) {
    console.error("Error getting total users:", totalError);
    return {
      total_users: 0,
      engaged_users: 0,
      inactive_users: 0,
      paused_users: 0,
      re_engagement_candidates: 0,
    };
  }

  // Get engaged users (score >= 30, not paused)
  const { data: engagedUsers } = await supabase
    .from("users")
    .select("email", { count: "exact" })
    .eq("active", true)
    .gte("email_engagement_score", 30)
    .eq("delivery_paused", false);

  // Get paused users
  const { data: pausedUsers } = await supabase
    .from("users")
    .select("email", { count: "exact" })
    .eq("active", true)
    .eq("delivery_paused", true);

  // Get re-engagement candidates
  const reEngagementCandidates = await getReEngagementCandidates();

  return {
    total_users: totalUsers?.length || 0,
    engaged_users: engagedUsers?.length || 0,
    inactive_users: pausedUsers?.length || 0,
    paused_users: pausedUsers?.length || 0,
    re_engagement_candidates: reEngagementCandidates.length,
  };
}

/**
 * Check if user should receive emails (not paused and engaged)
 */
export async function shouldSendEmailToUser(email: string): Promise<boolean> {
  const supabase = getDatabaseClient();

  const { data: user, error } = await supabase
    .from("users")
    .select("delivery_paused, email_engagement_score, last_engagement_date")
    .eq("email", email)
    .eq("active", true)
    .single();

  if (error || !user) {
    console.error("Error checking if user should receive emails:", error);
    return false;
  }

  // Don't send if delivery is paused
  if (user.delivery_paused) {
    return false;
  }

  // Check if user is engaged
  return await isUserEngaged(email);
}

/**
 * Get users eligible for regular email delivery
 */
export async function getEngagedUsersForDelivery(): Promise<string[]> {
  const supabase = getDatabaseClient();

  const { data: users, error } = await supabase
    .from("users")
    .select("email")
    .eq("active", true)
    .eq("delivery_paused", false)
    .gte("email_engagement_score", 30);

  if (error) {
    console.error("Error getting engaged users:", error);
    return [];
  }

  return users?.map((user) => user.email) || [];
}

/**
 * Reset engagement for testing (development only)
 */
export async function resetUserEngagement(email: string): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    console.warn("Cannot reset engagement in production");
    return;
  }

  const supabase = getDatabaseClient();

  const { error } = await supabase
    .from("users")
    .update({
      email_engagement_score: 100,
      delivery_paused: false,
      re_engagement_sent: false,
      last_engagement_date: new Date().toISOString(),
    })
    .eq("email", email);

  if (error) {
    console.error("Error resetting user engagement:", error);
  } else {
    console.log(` Reset engagement for ${email}`);
  }
}
