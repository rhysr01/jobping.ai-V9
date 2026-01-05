/**
 * Feedback Domain - Load and apply user feedback boosts
 */

import { logger } from "@/lib/monitoring";
import { getDatabaseClient } from "@/Utils/databasePool";
import type { UserPreferences } from "@/Utils/matching/types";

/**
 * Load user feedback history and create boost map
 */
export async function loadFeedbackBoosts(
  user: UserPreferences,
): Promise<Map<string, number>> {
  const feedbackBoosts: Map<string, number> = new Map();

  try {
    const supabase = getDatabaseClient();
    const { data: feedback } = await supabase
      .from("user_feedback")
      .select("relevance_score, job_context")
      .eq("user_email", user.email)
      .gte("relevance_score", 4)
      .limit(10);

    if (feedback && feedback.length > 0) {
      feedback.forEach((f) => {
        const ctx = f.job_context;
        if (!ctx) return;

        if (ctx.location) {
          const city = ctx.location.toLowerCase();
          feedbackBoosts.set(
            `loc:${city}`,
            (feedbackBoosts.get(`loc:${city}`) || 0) + 10,
          );
        }

        if (ctx.company?.toLowerCase().includes("startup")) {
          feedbackBoosts.set(
            "type:startup",
            (feedbackBoosts.get("type:startup") || 0) + 10,
          );
        }

        if (ctx.location?.toLowerCase().includes("remote")) {
          feedbackBoosts.set(
            "env:remote",
            (feedbackBoosts.get("env:remote") || 0) + 15,
          );
        }
      });

      if (feedbackBoosts.size > 0) {
        logger.debug("Feedback boosts applied", {
          metadata: {
            userEmail: user.email,
            boostCount: feedbackBoosts.size,
            boostTypes: Object.fromEntries(feedbackBoosts),
          },
        });
      }
    }
  } catch (error) {
    console.warn("Failed to load feedback boosts:", error);
  }

  return feedbackBoosts;
}

/**
 * Apply feedback boosts to a job score
 */
export function applyFeedbackBoosts(
  score: number,
  job: { location?: string; title?: string; description?: string },
  feedbackBoosts: Map<string, number>,
): number {
  let boostedScore = score;
  const jobLocation = (job.location || "").toLowerCase();
  const jobTitle = (job.title || "").toLowerCase();
  const jobDesc = (job.description || "").toLowerCase();

  feedbackBoosts.forEach((boost, key) => {
    const [type, value] = key.split(":");

    if (type === "loc" && jobLocation.includes(value)) {
      boostedScore += boost;
    }
    if (
      type === "type" &&
      (jobTitle.includes(value) || jobDesc.includes(value))
    ) {
      boostedScore += boost;
    }
    if (type === "env" && jobLocation.includes(value)) {
      boostedScore += boost;
    }
  });

  return boostedScore;
}
