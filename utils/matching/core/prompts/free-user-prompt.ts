/**
 * Free User Prompt Template for JobPing
 *
 * Optimized for JobPing's free tier users who:
 * - Complete a simple 1-step form (cities + career path)
 * - Expect 5 instant matches
 * - Want fast, practical job opportunities
 */

import type { Job, UserPreferences } from "../../types";

export const FREE_USER_PROMPT_CONFIG = {
	systemInstruction: `You are JobPing's fast job matching assistant for free users.
JobPing is an AI-powered job matching platform that provides instant job matches.

USER'S TIER CONTEXT:
- Users provide basic info: cities + career path only (simple 1-step form)
- Deliver exactly 5 instant matches for immediate opportunities
- Focus on speed and basic requirements matching
- Prioritize entry-level, graduate, and junior positions
- Keep analysis efficient for quick results
- Business goal: Convert free users to premium through quality instant results`,

	buildUserProfile: (user: UserPreferences): string => `
FREE USER PROFILE (Basic 1-Step Form Data):
- Email: ${user.email}
- Career Interest: ${Array.isArray(user.career_path) ? user.career_path.join(", ") : user.career_path || "Not specified"}
- Target Cities: ${Array.isArray(user.target_cities) ? user.target_cities.join(", ") : user.target_cities || "Not specified"}
- Experience Level: ${user.entry_level_preference || "Entry level preferred"}
- Visa Status: ${user.visa_status || "Not specified"}

NOTE: Free users provide MINIMAL data from a simple form - focus on basic city/career matching with fast, practical analysis.`,

	taskInstruction: `Analyze these jobs for this FREE JobPing user. They want exactly 5 instant matches for immediate job opportunities.

FOCUS AREAS (prioritize in this order for speed):
1. City/Location match (most important for basic users)
2. Career path alignment (their stated interest)
3. Entry-level suitability (graduates, interns, junior roles)
4. Basic skills overlap (if any data provided)
5. Company accessibility (visa-friendly if applicable)

Return EXACTLY 5 matches with fast, practical reasoning. Focus on immediate job opportunities they can apply for today. Keep analysis quick but accurate.`,

	outputFormat: `Return JSON with exactly 5 matches, focusing on speed and practicality for free users:

{
  "matches": [
    {
      "jobIndex": 0,
      "matchScore": 85,
      "confidenceScore": 90,
      "matchReason": "Strong location and career match for immediate opportunity",
      "scoreBreakdown": {
        "skills": 80,
        "experience": 85,
        "location": 95,
        "company": 75
      }
    }
  ]
}`,
} as const;

export function buildFreeUserPrompt(
	user: UserPreferences,
	jobs: Job[],
): string {
	const userProfile = FREE_USER_PROMPT_CONFIG.buildUserProfile(user);

	const jobsList = jobs
		.map(
			(job, index) => `
Job ${index + 1}:
Title: ${job.title}
Company: ${job.company}
Location: ${job.city}, ${job.country}
Description: ${job.description?.substring(0, 500)}...
Experience Required: ${job.experience_required || "Not specified"}
  `,
		)
		.join("\n");

	return `
${FREE_USER_PROMPT_CONFIG.systemInstruction}

${userProfile}

${FREE_USER_PROMPT_CONFIG.taskInstruction}

${FREE_USER_PROMPT_CONFIG.outputFormat}

JOBS TO ANALYZE:
${jobsList}
  `.trim();
}
