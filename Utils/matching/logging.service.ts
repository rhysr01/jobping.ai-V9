/**
 * Match logging service
 * Extracted from the massive jobMatching.ts file
 */

import { getDatabaseClient } from "@/Utils/databasePool";

// Use centralized database pool directly
// (Removed local wrapper function for consistency)

export interface MatchSessionLog {
  user_email: string;
  match_type: "ai_success" | "ai_failed" | "fallback";
  matches_count: number;
  processing_time_ms?: number;
  ai_model?: string;
  ai_cost_usd?: number;
  error_message?: string;
  session_id?: string;
}

export async function logMatchSession(
  userEmail: string,
  matchType: "ai_success" | "ai_failed" | "fallback",
  matchesCount: number,
  additionalData?: {
    processingTimeMs?: number;
    aiModel?: string;
    aiCostUsd?: number;
    errorMessage?: string;
    sessionId?: string;
  },
): Promise<void> {
  try {
    const supabase = getDatabaseClient();

    const logData: MatchSessionLog = {
      user_email: userEmail,
      match_type: matchType,
      matches_count: matchesCount,
      processing_time_ms: additionalData?.processingTimeMs,
      ai_model: additionalData?.aiModel,
      ai_cost_usd: additionalData?.aiCostUsd,
      error_message: additionalData?.errorMessage,
      session_id: additionalData?.sessionId,
    };

    const { error } = await supabase.from("match_logs").insert([logData]);

    if (error) {
      console.error("Failed to log match session:", error);
    } else {
      console.log(
        ` Logged match session: ${userEmail} - ${matchType} - ${matchesCount} matches`,
      );
    }
  } catch (error) {
    console.error("Error in logMatchSession:", error);
  }
}

export async function getMatchSessionStats(
  userEmail?: string,
  timeRange?: { start: Date; end: Date },
): Promise<{
  totalSessions: number;
  aiSuccessRate: number;
  averageMatches: number;
  totalCost: number;
}> {
  try {
    const supabase = getDatabaseClient();

    let query = supabase.from("match_logs").select("*");

    if (userEmail) {
      query = query.eq("user_email", userEmail);
    }

    if (timeRange) {
      query = query
        .gte("created_at", timeRange.start.toISOString())
        .lte("created_at", timeRange.end.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to get match session stats:", error);
      return {
        totalSessions: 0,
        aiSuccessRate: 0,
        averageMatches: 0,
        totalCost: 0,
      };
    }

    const sessions = data || [];
    const totalSessions = sessions.length;
    const aiSuccessSessions = sessions.filter(
      (s) => s.match_type === "ai_success",
    ).length;
    const aiSuccessRate =
      totalSessions > 0 ? (aiSuccessSessions / totalSessions) * 100 : 0;
    const averageMatches =
      totalSessions > 0
        ? sessions.reduce((sum, s) => sum + (s.matches_count || 0), 0) /
          totalSessions
        : 0;
    const totalCost = sessions.reduce(
      (sum, s) => sum + (s.ai_cost_usd || 0),
      0,
    );

    return {
      totalSessions,
      aiSuccessRate,
      averageMatches,
      totalCost,
    };
  } catch (error) {
    console.error("Error in getMatchSessionStats:", error);
    return {
      totalSessions: 0,
      aiSuccessRate: 0,
      averageMatches: 0,
      totalCost: 0,
    };
  }
}
