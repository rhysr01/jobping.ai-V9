/**
 * PREMIUM MATCH BUILDER - Consolidated
 *
 * Handles all premium tier matching logic: prompts, config, and career-focused scoring.
 * Focused on quality and long-term career guidance for paying users.
 */

import type { Job, UserPreferences } from "../../types";

export class PremiumMatchBuilder {
	/**
	 * Build prompt for premium tier matching
	 */
	static buildPrompt(user: UserPreferences, jobs: Job[]): string {
		const profile = PremiumMatchBuilder.buildUserProfile(user);
		const jobList = PremiumMatchBuilder.formatJobList(jobs);

		return `${PremiumMatchBuilder.systemPrompt}

${profile}

${PremiumMatchBuilder.taskInstruction(user)}

${PremiumMatchBuilder.outputSchema}

OPPORTUNITIES:
${jobList}`;
	}

	/**
	 * Get match count for premium tier
	 */
	static getMatchCount(): number {
		return 15;
	}

	/**
	 * Get AI config for premium tier
	 */
	static getConfig() {
		return {
			useAI: true,
			maxJobsForAI: 30,
			fallbackThreshold: 5,
			includePrefilterScore: true,
		};
	}

	/**
	 * System prompt - premium career counselor (4-step form depth)
	 */
	private static get systemPrompt(): string {
		return `You are JobPing's premium career strategist for €5/month subscribers.
You provide detailed career guidance based on comprehensive student profiles from our 4-step assessment.

STUDENT PERSPECTIVE: "I've completed JobPing's detailed career assessment. Now I need strategic advice on my next 15 career moves."
YOUR ROLE: Act as their personal career counselor, providing strategic recommendations that align with their long-term professional trajectory.

Focus on TRUST: Show you understand their detailed profile and career goals by recommending positions they would confidently pursue.`;
	}

	/**
	 * Build comprehensive user profile for premium tier
	 */
	private static buildUserProfile(user: UserPreferences): string {
		const skills = Array.isArray(user.skills)
			? user.skills.join(", ")
			: user.skills || "Open";
		const industries = Array.isArray(user.industries)
			? user.industries.join(", ")
			: user.industries || "Flexible";
		const cities = Array.isArray(user.target_cities)
			? user.target_cities.join(", ")
			: user.target_cities || "Flexible";
		const roles = Array.isArray(user.roles_selected)
			? user.roles_selected.join(", ")
			: user.roles_selected || "Open";
		const careerPaths = Array.isArray(user.career_path)
			? user.career_path.join(" or ")
			: user.career_path || "Open";

		return `STUDENT REQUEST: "${careerPaths} roles in ${cities}"

COMPREHENSIVE STUDENT PROFILE (4-Step Career Assessment Completed):
- Career paths: ${careerPaths} (can explore up to 2 career directions)
- Detailed career assessment: ${user.career_keywords || "Career growth focused"}
- Technical & soft skills: ${skills}
- Preferred industries: ${industries}
- Target roles: ${roles}
- Geographic preferences: ${cities}
- Experience level: ${user.entry_level_preference || "Progressive"}
- Company size preference: ${user.company_size_preference || "Open"}
- Work environment: ${user.work_environment || "Flexible"}
- Visa considerations: ${user.visa_status || "EU citizen"}
- Professional expertise: ${user.professional_expertise || "Business foundation"}

NOTE: This premium student can explore up to 2 career paths. Show you understand their multi-path career exploration by recommending positions across their chosen career directions.`;
	}

	/**
	 * Task instruction for premium tier - career counselor with 4-step depth
	 */
	private static taskInstruction(_user: UserPreferences): string {
		return `As this student's premium career counselor, recommend 15 strategic positions that represent genuine career progression opportunities. Leverage their comprehensive 4-step profile:

CAREER COUNSELING APPROACH:
- Multi-path career exploration (they can choose up to 2 career directions)
- Long-term career trajectory alignment across their chosen paths
- Realistic advancement opportunities in each career direction
- Company culture fit for their detailed work style preferences
- Industry growth potential that matches their strategic thinking
- Skill development pathways that align with their stated goals
- Geographic considerations that support their career plans

Focus on TRUST: Show you understand their multi-path career exploration by recommending positions across their chosen career directions. They should feel like personalized career advice from someone who understands they want to explore multiple professional paths, not generic job matches.`;
	}

	/**
	 * Output schema for premium tier - career counselor reasoning
	 */
	private static get outputSchema(): string {
		return `{
  "matches": [
    {
      "jobIndex": 0,
      "matchScore": 87,
      "confidenceScore": 92,
      "matchReason": "Strategic career move: Product Manager role at growing SaaS company matches your interest in digital transformation, offers clear path to senior leadership, company culture emphasizes innovation and work-life balance you prefer, located in Munich with excellent public transport",
      "scoreBreakdown": {
        "skills": 85,
        "experience": 90,
        "location": 88,
        "company": 85,
        "overall": 87
      }
    }
  ]
}`;
	}

	/**
	 * Format job list for prompt - include more details for premium analysis
	 */
	private static formatJobList(jobs: Job[]): string {
		return jobs
			.map(
				(job, i) =>
					`${i}: ${job.title} | ${job.company} | ${job.city} | Industry: ${job.categories?.[0] || "Tech"}`,
			)
			.join("\n");
	}
}
