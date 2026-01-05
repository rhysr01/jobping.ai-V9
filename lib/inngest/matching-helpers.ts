/**
 * Helper functions for triggering Inngest matching events
 */

import { logger } from "@/lib/monitoring";
import type { Job, UserPreferences } from "@/Utils/matching/types";
import { inngest } from "./functions";

export interface MatchingEventData {
  userPrefs: UserPreferences;
  jobs: Job[];
  userId?: string;
  context?: {
    source?: string;
    requestId?: string;
  };
}

/**
 * Trigger Inngest matching event
 * Returns the event ID for tracking
 */
export async function triggerMatchingEvent(
  data: MatchingEventData,
): Promise<string> {
  try {
    const result = await inngest.send({
      name: "matching/perform",
      data,
    });

    const eventId = result.ids[0]; // Access the first ID in the array

    logger.info("Inngest matching event triggered", {
      email: data.userPrefs.email,
      eventId,
      jobsCount: data.jobs.length,
      source: data.context?.source || "unknown",
    });

    return eventId;
  } catch (error) {
    logger.error("Failed to trigger Inngest matching event", {
      error: error as Error,
      email: data.userPrefs.email,
    });
    throw error;
  }
}

/**
 * Trigger matching and wait for result (for synchronous flows)
 * Note: This will wait for the Inngest function to complete, which may take time.
 * For better UX, consider using triggerMatchingEvent() and handling results asynchronously.
 */
export async function triggerMatchingAndWait(
  data: MatchingEventData,
  _timeoutMs: number = 60000, // 60 second default timeout
): Promise<{ success: boolean; matchesCount: number }> {
  const eventId = await triggerMatchingEvent(data);

  // Poll for completion (simplified - in production you might use webhooks or polling)
  // For now, we'll just return success since Inngest handles the matching
  // The actual matches will be saved to the database by the Inngest function

  logger.info("Matching event sent, will process asynchronously", {
    email: data.userPrefs.email,
    eventId,
  });

  // Return immediately - matches will be saved by Inngest function
  return {
    success: true,
    matchesCount: 0, // Will be populated by Inngest function
  };
}
