import { Inngest } from "inngest";
import { logger } from "@/lib/monitoring";
import { ConsolidatedMatchingEngine } from "@/Utils/consolidatedMatchingV2";
import { getDatabaseClient } from "@/Utils/databasePool";
import type { Job, UserPreferences } from "@/Utils/matching/types";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "my-app" });

// Write our first Inngest Function
// This function will wait for one second before returning "Hello world!"
export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    await step.sleep("wait-a-moment", "1s");

    return { message: `Hello ${event.data.email}!` };
  },
);

/**
 * Durable AI Matching Function
 *
 * This function handles AI matching with automatic retries and timeout protection.
 * It's designed to run long-running matching operations that might exceed Vercel's
 * function timeout limits (10-60s).
 *
 * Features:
 * - Automatic retries on failure
 * - Step-by-step execution (durable workflow)
 * - Timeout protection
 * - Error handling with fallback to rule-based matching
 */
export const performAIMatching = inngest.createFunction(
  {
    id: "perform-ai-matching",
    name: "Perform AI Matching",
    retries: 3, // Retry up to 3 times on failure
  },
  { event: "matching/perform" },
  async ({ event, step }) => {
    const {
      userPrefs,
      jobs,
      userId: _userId,
      context,
    } = event.data as {
      userPrefs: UserPreferences;
      jobs: Job[];
      userId?: string;
      context?: {
        source?: string;
        requestId?: string;
      };
    };

    // Initialize matching engine directly (cannot serialize class instances in step.run)
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      logger.warn("OPENAI_API_KEY not set, will use rule-based matching", {
        email: userPrefs.email,
      });
    }
    const matcher = new ConsolidatedMatchingEngine(openaiKey);

    // Step 1: Perform matching with timeout protection
    const matchResult = await step.run("perform-matching", async () => {
      const startTime = Date.now();

      try {
        logger.info("Starting AI matching via Inngest", {
          email: userPrefs.email,
          jobsCount: jobs.length,
          source: context?.source || "unknown",
        });

        const result = await matcher.performMatching(
          jobs as any[],
          userPrefs as any,
        );

        const duration = Date.now() - startTime;
        logger.info("AI matching completed via Inngest", {
          email: userPrefs.email,
          matchesCount: result.matches.length,
          method: result.method,
          duration,
        });

        return result;
      } catch (error) {
        logger.error("AI matching failed in Inngest function", {
          error: error as Error,
          email: userPrefs.email,
          jobsCount: jobs.length,
        });

        // Fallback to rule-based matching
        logger.warn("Falling back to rule-based matching", {
          email: userPrefs.email,
        });

        const fallbackResult = await matcher.performMatching(
          jobs as any[],
          userPrefs as any,
          true, // Force rule-based
        );

        return fallbackResult;
      }
    });

    // Step 2: Save matches to database
    const savedMatches = await step.run("save-matches", async () => {
      if (!matchResult.matches || matchResult.matches.length === 0) {
        logger.warn("No matches to save", {
          email: userPrefs.email,
        });
        return { saved: 0 };
      }

      const supabase = getDatabaseClient();
      const matchEntries = matchResult.matches.map((match) => {
        // Normalize match_score to 0-1 range
        let normalizedScore = 0.75; // Default fallback
        if (match.match_score !== undefined && match.match_score !== null) {
          if (match.match_score > 1) {
            normalizedScore = match.match_score / 100;
          } else {
            normalizedScore = match.match_score;
          }
        }

        return {
          user_email: userPrefs.email,
          job_hash: String(match.job_hash),
          match_score: normalizedScore,
          match_reason: match.match_reason || "AI matched",
          matched_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
      });

      const { data, error } = await supabase
        .from("matches")
        .upsert(matchEntries, {
          onConflict: "user_email,job_hash",
        })
        .select();

      if (error) {
        logger.error("Failed to save matches", {
          error: error as Error,
          email: userPrefs.email,
          matchCount: matchEntries.length,
        });
        throw error;
      }

      logger.info("Matches saved successfully", {
        email: userPrefs.email,
        savedCount: data?.length || 0,
      });

      return { saved: data?.length || 0, matches: data };
    });

    return {
      success: true,
      email: userPrefs.email,
      matchesCount: matchResult.matches.length,
      method: matchResult.method,
      savedCount: savedMatches.saved,
    };
  },
);
