/**
 * FREE MATCH BUILDER - Consolidated
 *
 * Handles all free tier matching logic: prompts, config, and scoring.
 * Focused on speed and immediate applicability for free users.
 */

import type { Job, UserPreferences } from "../../types";

export class FreeMatchBuilder {
	/**
	 * Build prompt for free tier matching
	 */
	static buildPrompt(user: UserPreferences, jobs: Job[]): string {
		const profile = FreeMatchBuilder.buildUserProfile(user);
		const jobList = FreeMatchBuilder.formatJobList(jobs);

		return `${FreeMatchBuilder.systemPrompt}

${profile}

${FreeMatchBuilder.taskInstruction(user)}

${FreeMatchBuilder.outputSchema}

JOBS:
${jobList}`;
	}

	/**
	 * Get match count for free tier
	 */
	static getMatchCount(): number {
		return 5;
	}

	/**
	 * Get AI config for free tier
	 */
	static getConfig() {
		return {
			useAI: true,
			maxJobsForAI: 10,
			fallbackThreshold: 2,
			includePrefilterScore: false,
		};
	}

	/**
	 * System prompt - career counselor for business students (free tier)
	 */
	private static get systemPrompt(): string {
		return `You are JobPing's career counselor for business students starting their careers.
Your free service helps students find their first professional roles.

STUDENT PERSPECTIVE: "I'm a business graduate looking for my first job. What roles should I actually apply for?"
YOUR ROLE: Find 5 realistic entry-level positions this student would genuinely consider and have a chance of getting.

This isn't about perfect matches - it's about jobs they would actually pursue in their job search.`;
	}

	/**
	 * Build user profile string for free tier (1-step form simplicity)
	 */
	private static buildUserProfile(user: UserPreferences): string {
		const cities = Array.isArray(user.target_cities)
			? user.target_cities.join(", ")
			: user.target_cities || "Flexible";

		const career = Array.isArray(user.career_path)
			? user.career_path.join(", ")
			: user.career_path || "Open";

		return `STUDENT REQUEST: "${career} roles in ${cities}"

STUDENT PROFILE:
- Career focus: ${career} (single career path)
- Target location: ${cities}
- Experience level: Entry-level/Graduate
- Visa status: ${user.visa_status || "EU citizen"}

NOTE: This student used JobPing's simple form - focus on one clear career direction and find realistic opportunities they would genuinely apply for.`;
	}

	/**
	 * Task instruction for free tier - career counselor approach
	 */
	private static taskInstruction(_user: UserPreferences): string {
		return `As this student's career counselor, select 5 REALISTIC entry-level positions they would genuinely apply for. Consider what a business graduate would actually pursue:

REALITY CHECKS FOR BUSINESS STUDENTS:
- Entry-level roles in their chosen career path
- Graduate programs, internships and early career rolesin their specific field
- Locations they're willing to work in
- Roles where they have reasonable qualifications for their single career direction

Focus on TRUST: These should be jobs they would confidently apply for in their chosen career path and discuss in interviews as "good fits" for their focused career interests and experience level.

Return JSON with practical matches that build confidence in JobPing's understanding of their specific career direction.`;
	}

	/**
	 * Output schema for free tier - career counselor reasoning
	 */
	private static get outputSchema(): string {
		return `{
  "matches": [
    {
      "jobIndex": 0,
      "matchScore": 78,
      "confidenceScore": 85,
      "matchReason": "Business Analyst role at consulting firm - perfect for business graduate with analytical skills, realistic entry-level position with growth potential"
    }
  ]
}`;
	}

	/**
	 * Format job list for prompt
	 */
	private static formatJobList(jobs: Job[]): string {
		return jobs
			.map(
				(job, i) =>
					`${i}: ${job.title} | ${job.company} | ${job.city} | Posted: ${job.created_at || "Recent"}`,
			)
			.join("\n");
	}
}
