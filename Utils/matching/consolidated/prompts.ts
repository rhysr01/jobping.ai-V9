/**
 * Prompts Domain - GPT-4o-mini system/user instructions and AI API calls
 * Extracted from consolidatedMatchingV2.ts for better organization
 */

import type OpenAI from "openai";
import type { ParsedMatch } from "@/lib/types";
import type { Job } from "../../../scrapers/types";
import type { JobMatch, UserPreferences } from "../types";
import { JOBS_TO_ANALYZE_FREE, JOBS_TO_ANALYZE_PREMIUM } from "./config";

// ============================================
// PROMPT BUILDING
// ============================================

/**
 * Enhanced prompt that uses full user profile for world-class matching
 * TIER-AWARE: Different prompt strategies for free vs premium users
 */
export function buildStablePrompt(
	jobs: Job[],
	userPrefs: UserPreferences,
): string {
	const jobsArray = Array.isArray(jobs) ? jobs : [];

	const isFreeTier =
		userPrefs.subscription_tier === "free" || !userPrefs.subscription_tier;
	const isPremiumTier = userPrefs.subscription_tier === "premium";

	const userCities = Array.isArray(userPrefs.target_cities)
		? userPrefs.target_cities.join(", ")
		: userPrefs.target_cities || "Europe";

	const userCareer = userPrefs.professional_expertise || "Graduate";
	const userLevel = userPrefs.entry_level_preference || "entry-level";

	const languages =
		Array.isArray(userPrefs.languages_spoken) &&
		userPrefs.languages_spoken.length > 0
			? userPrefs.languages_spoken.join(", ")
			: "";

	const roles =
		Array.isArray(userPrefs.roles_selected) &&
		userPrefs.roles_selected.length > 0
			? userPrefs.roles_selected.join(", ")
			: "";

	const careerPaths =
		Array.isArray(userPrefs.career_path) && userPrefs.career_path.length > 0
			? userPrefs.career_path.join(", ")
			: "";

	const workEnv = userPrefs.work_environment || "";

	const industries =
		Array.isArray(userPrefs.industries) &&
		userPrefs.industries.length > 0
			? userPrefs.industries.join(", ")
			: "";

	const skills =
		Array.isArray(userPrefs.skills) &&
		userPrefs.skills.length > 0
			? userPrefs.skills.join(", ")
			: "";

	const careerKeywords = userPrefs.career_keywords ? userPrefs.career_keywords : "";

	const jobsToAnalyze = isPremiumTier
		? jobsArray.slice(0, JOBS_TO_ANALYZE_PREMIUM)
		: jobsArray.slice(0, JOBS_TO_ANALYZE_FREE);

	const jobListParts: string[] = [];
	for (let i = 0; i < jobsToAnalyze.length; i++) {
		const job = jobsToAnalyze[i];
		jobListParts.push(
			`${i + 1}. [${job.job_hash}] ${job.title} @ ${job.company} | ${job.location}`,
		);
	}
	const jobList = jobListParts.join("\n");

	const tierContext = `\nNOTE: Provide amazing, high-quality matches for this user. Use ALL available preferences for precise matching.`;

	return `You are a career matching expert. Analyze these jobs and match them to the user's profile.${tierContext}

USER PROFILE:
- Experience Level: ${userLevel}
- Professional Expertise: ${userCareer}
- Target Locations: ${userCities}
${languages ? `- Languages: ${languages}` : ""}
${roles ? `- Target Roles: ${roles}` : ""}
${careerPaths ? `- Career Paths: ${careerPaths}` : ""}
${workEnv ? `- Work Environment Preference: ${workEnv}` : ""}
${industries ? `- Preferred Industries: ${industries}` : ""}
${skills ? `- Skills: ${skills}` : ""}
${careerKeywords ? `- Career Keywords: ${careerKeywords}` : ""}

AVAILABLE JOBS:
${jobList}

CRITICAL REQUIREMENTS (High-Quality Matching):
1. **LOCATION MATCH IS REQUIRED**: Jobs MUST be in one of these cities: ${userCities}
   - Exact city match required (e.g., "London" matches "London, UK" but NOT "New London")
   - Remote/hybrid jobs are acceptable if location preference allows
   - DO NOT recommend jobs in other cities, even if they seem relevant
${
	careerPaths
		? `2. **CAREER PATH MATCH IS REQUIRED**: Jobs MUST align with: ${careerPaths}
   - Job title or description must relate to these career paths
   - DO NOT recommend jobs outside these career paths`
		: ""
}
${
	roles
		? `3. **ROLE MATCH IS REQUIRED**: Jobs MUST match these roles: ${roles}
   - Job title or description must include these role keywords
   - DO NOT recommend jobs that don't match these roles`
		: ""
}
${
	languages
		? `4. **LANGUAGE REQUIREMENTS ARE CRITICAL**: User speaks: ${languages}
   - DO NOT recommend jobs that require languages the user doesn't speak
   - If job requires "Japanese speaker", "Chinese speaker", "Mandarin speaker", "Korean speaker", etc., and user doesn't speak that language, EXCLUDE the job
   - Only recommend jobs where user speaks at least one required language`
		: ""
}
${
	industries
		? `5. **INDUSTRY PREFERENCE**: User prefers: ${industries}
   - Prioritize jobs in these industries
   - Still consider other industries if strong match otherwise`
		: ""
}
${
	skills
		? `6. **SKILLS MATCH**: User has these skills: ${skills}
   - Prioritize jobs that require or prefer these skills
   - Stronger matches if job explicitly mentions these skills`
		: ""
}

INSTRUCTIONS (Precise Matching):
Analyze each job carefully and return ONLY jobs that meet ALL critical requirements above.
${languages ? `**CRITICAL**: If a job requires languages the user doesn't speak (e.g., "Japanese speaker" but user doesn't speak Japanese), EXCLUDE it immediately.` : ""}
Then rank by:
1. Location match quality (exact city > remote/hybrid)
2. Experience level fit (entry-level, graduate, junior keywords)
3. Role alignment strength with career path and expertise
${languages ? `4. Language match (user must speak at least one required language)` : "4. Language requirements (if specified)"}
5. Industry preference match${industries ? ` (prioritize ${industries})` : ""}
6. Skills alignment${skills ? ` (prioritize jobs requiring: ${skills})` : ""}
7. Company type and culture fit

MATCH REASON GUIDELINES (Evidence-Based):
- BE SPECIFIC: Link user's stated skills/experience to job requirements
  Example: "Your React + TypeScript experience matches their requirement for 'frontend expertise with modern frameworks'"
- BE FACTUAL: Reference actual job description requirements
  Example: "The job requires '2+ years marketing experience' and you have 3 years in digital marketing"
- BE TRANSPARENT: Acknowledge gaps when relevant
  Example: "This role focuses on B2B marketing, which aligns with your experience, though it's more enterprise-focused than your previous B2C work"
- AVOID: Emotional hype ("This is the startup you'll tell your friends about")
- AVOID: Confidence claims about outcomes ("easy interview", "guaranteed fit")
- AVOID: Generic statements ("Good match for your skills", "Aligns with preferences")

EVIDENCE REQUIREMENT (High-Quality Matching):
- For match scores > 85, you MUST provide at least TWO distinct points of evidence from the job description
- Each evidence point should reference specific job requirements or user skills
- Minimum 30 words required for high-confidence matches (>85%)
- Example: "Your React experience matches their 'frontend framework' requirement, AND your TypeScript skills align with their 'strongly-typed codebase' preference"
- If you cannot provide at least two distinct evidence points, lower the match score to 80 or below

DIVERSITY REQUIREMENT:
When selecting your top 5 matches, prioritize variety:
- Include jobs from different company types (startup, corporate, agency)
- Include jobs from different sources when possible
- Balance work environments (if user allows multiple types)

Return JSON array with exactly 5 matches (or fewer if less than 5 meet requirements), ranked by relevance:
[{"job_index":1,"job_hash":"actual-hash","match_score":85,"match_reason":"Evidence-based reason linking user profile to job requirements"}]

Requirements:
- job_index: Must be 1-${jobsToAnalyze.length}
- job_hash: Must match the hash from the job list above
- match_score: 50-100 (be selective, only recommend truly relevant jobs)
- match_reason: Evidence-based explanation (2-3 sentences) that explicitly links user's profile to job requirements
- Return exactly 5 matches (or fewer if less than 5 good matches exist)
- Valid JSON array only, no markdown or extra text`;
}

// ============================================
// AI API CALLS
// ============================================

/**
 * Calculate AI cost in USD based on tokens and model
 */
export function calculateAICost(tokens: number, model: string): number {
	if (model === "gpt-4o-mini") {
		const inputTokens = Math.floor(tokens * 0.8);
		const outputTokens = tokens - inputTokens;
		const inputCost = (inputTokens / 1_000_000) * 0.15;
		const outputCost = (outputTokens / 1_000_000) * 0.6;
		return inputCost + outputCost;
	}
	return 0;
}

/**
 * System message for AI matching
 */
export function getSystemMessage(): string {
	return `You're a professional career advisor focused on evidence-based matching.

Your job: Find 5 perfect job matches and explain WHY they're relevant using factual evidence.

Write match reasons that are:
- SPECIFIC: Link user's stated skills/experience to explicit job requirements
  Example: "Your React + TypeScript experience matches their requirement for 'frontend expertise with modern frameworks'"
- FACTUAL: Reference actual job description text and user profile data
  Example: "The job requires '2+ years marketing experience' and you have 3 years in digital marketing"
- TRANSPARENT: Acknowledge both strengths and potential gaps honestly
  Example: "This role focuses on B2B marketing, which aligns with your experience, though it's more enterprise-focused than your previous B2C work"
- PROFESSIONAL: Avoid emotional language, hype, or outcome predictions

NEVER use:
- "Easy interview" or confidence claims about outcomes
- "This is the startup you'll tell your friends about" (emotional hype)
- "Good match" or "Aligns with preferences" (too generic)

Keep match reasons 2-3 sentences max. Make every word count with evidence.`;
}

/**
 * Call OpenAI API with function calling
 * Returns raw ParsedMatch[] that needs to be validated
 */
export async function callOpenAIAPI(
	client: OpenAI,
	jobs: Job[],
	userPrefs: UserPreferences,
	model: "gpt-4o-mini" | "gpt-4" | "gpt-3.5-turbo" = "gpt-4o-mini",
	parseFunction: (matches: ParsedMatch[], jobs: Job[]) => JobMatch[],
): Promise<{
	matches: JobMatch[];
	tokens: number;
	cost: number;
}> {
	const jobsArray = Array.isArray(jobs) ? jobs : [];

	const prompt = buildStablePrompt(jobsArray, userPrefs);

	const completion = await client.chat.completions.create({
		model: model,
		messages: [
			{
				role: "system",
				content: getSystemMessage(),
			},
			{
				role: "user",
				content: prompt,
			},
		],
		temperature: 0.1,
		max_tokens: 1500,
		functions: [
			{
				name: "return_job_matches",
				description: "Return the top 5 most relevant job matches for the user",
				parameters: {
					type: "object",
					properties: {
						matches: {
							type: "array",
							minItems: 1,
							maxItems: 5,
							items: {
								type: "object",
								properties: {
									job_index: {
										type: "number",
										minimum: 1,
										description: "Index of the job from the list provided",
									},
									job_hash: {
										type: "string",
										description: "Exact job_hash from the job list",
									},
									match_score: {
										type: "number",
										minimum: 50,
										maximum: 100,
										description: "How well this job matches the user (50-100)",
									},
									match_reason: {
										type: "string",
										maxLength: 400,
										description:
											"Evidence-based reason (2-3 sentences max) that explicitly links user profile to job requirements. Reference specific skills, experience, or requirements. NO emotional hype or outcome predictions.",
									},
								},
								required: [
									"job_index",
									"job_hash",
									"match_score",
									"match_reason",
								],
							},
						},
					},
					required: ["matches"],
				},
			},
		],
		function_call: { name: "return_job_matches" },
	});

	const tokens = completion.usage?.total_tokens || 0;
	const cost = calculateAICost(tokens, model);

	const functionCall = completion.choices[0]?.message?.function_call;
	if (!functionCall || functionCall.name !== "return_job_matches") {
		throw new Error("Invalid function call response");
	}

	try {
		const functionArgs = JSON.parse(functionCall.arguments);
		const matches = parseFunction(functionArgs.matches, jobsArray);
		return { matches, tokens, cost };
	} catch (error) {
		throw new Error(`Failed to parse function call: ${error}`);
	}
}
