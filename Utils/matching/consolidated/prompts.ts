/**
 * Prompts Domain - GPT-4o-mini system/user instructions and AI API calls
 * Extracted from consolidatedMatchingV2.ts for better organization
 */

import type OpenAI from "openai";
import type { ParsedMatch } from "@/lib/types";
import type { Job } from "@/scrapers/types";
import type { JobMatch, UserPreferences } from "../types";
import { JOBS_TO_ANALYZE_FREE, JOBS_TO_ANALYZE_PREMIUM } from "./config";

// ============================================
// INPUT SANITIZATION
// ============================================

/**
 * Sanitize text for safe inclusion in AI prompts
 * Prevents prompt injection and ensures clean output
 */
function sanitizeForPrompt(text: string | undefined | null): string {
	if (!text || typeof text !== "string") return "";

	// Remove or escape potentially dangerous characters
	return (
		text
			// Remove null bytes and other control characters
			.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
			// Escape backticks and curly braces that could break prompt structure
			.replace(/[`{}]/g, (match) => `\\${match}`)
			// Normalize whitespace
			.replace(/\s+/g, " ")
			// Remove extremely long words (potential attacks)
			.replace(/\b\w{100,}\b/g, "[LONG_WORD_REMOVED]")
			// Limit total length to prevent token bloat
			.substring(0, 1000)
			.trim()
	);
}

/**
 * Sanitize user preferences for prompt inclusion
 */
function sanitizeUserPreferences(userPrefs: UserPreferences): {
	email: string;
	target_cities: string;
	career_path: string;
	roles_selected: string;
	work_environment: string;
	visa_status: string;
	entry_level_preference: string;
	languages_spoken: string;
	skills: string;
	industries: string;
	company_size_preference: string;
	career_keywords: string;
} {
	return {
		email: sanitizeForPrompt(userPrefs.email),
		target_cities: Array.isArray(userPrefs.target_cities)
			? userPrefs.target_cities.map(sanitizeForPrompt).join(", ")
			: sanitizeForPrompt(userPrefs.target_cities),
		career_path: Array.isArray(userPrefs.career_path)
			? userPrefs.career_path.map(sanitizeForPrompt).join(", ")
			: sanitizeForPrompt(userPrefs.career_path),
		roles_selected: Array.isArray(userPrefs.roles_selected)
			? userPrefs.roles_selected.map(sanitizeForPrompt).join(", ")
			: sanitizeForPrompt(userPrefs.roles_selected),
		work_environment: sanitizeForPrompt(userPrefs.work_environment),
		visa_status: sanitizeForPrompt(userPrefs.visa_status),
		entry_level_preference: sanitizeForPrompt(userPrefs.entry_level_preference),
		languages_spoken: Array.isArray(userPrefs.languages_spoken)
			? userPrefs.languages_spoken.map(sanitizeForPrompt).join(", ")
			: sanitizeForPrompt(userPrefs.languages_spoken),
		skills: Array.isArray(userPrefs.skills)
			? userPrefs.skills.map(sanitizeForPrompt).join(", ")
			: sanitizeForPrompt(userPrefs.skills),
		industries: Array.isArray(userPrefs.industries)
			? userPrefs.industries.map(sanitizeForPrompt).join(", ")
			: sanitizeForPrompt(userPrefs.industries),
		company_size_preference: sanitizeForPrompt(
			userPrefs.company_size_preference,
		),
		career_keywords: sanitizeForPrompt(userPrefs.career_keywords),
	};
}

// ============================================
// PROMPT BUILDING
// ============================================

/**
 * Career insight prompt that demonstrates deep understanding of user's professional journey
 * Creates "wow" moments by showing JobPing gets their career direction and aspirations
 * TIER-AWARE: Enhanced insights for premium users with additional career data
 */
export function buildStablePrompt(
	jobs: Job[],
	userPrefs: UserPreferences,
): string {
	const jobsArray = Array.isArray(jobs) ? jobs : [];

	// Sanitize all user inputs to prevent prompt injection
	const safePrefs = sanitizeUserPreferences(userPrefs);

	// const isFreeTier =
	userPrefs.subscription_tier === "free" || !userPrefs.subscription_tier;
	const isPremiumTier = userPrefs.subscription_tier === "premium";

	const userCities = safePrefs.target_cities || "Europe";
	const userCareer = safePrefs.career_path || "Graduate";
	const userLevel = safePrefs.entry_level_preference || "entry-level";

	const languages = safePrefs.languages_spoken || "";
	const roles = safePrefs.roles_selected || "";
	const careerPaths = safePrefs.career_path || "";
	const workEnv = safePrefs.work_environment || "";
	const industries = safePrefs.industries || "";
	const skills = safePrefs.skills || "";
	const careerKeywords = safePrefs.career_keywords || "";
	const companySize = safePrefs.company_size_preference || "";

	// Check if user needs visa sponsorship
	const visaStatus = userPrefs.visa_status?.toLowerCase() || "";
	const needsVisaSponsorship =
		// Explicit non-EU/UK indicators
		(visaStatus.includes("non-eu") && !visaStatus.includes("non-eu citizen")) ||
		(visaStatus.includes("non-uk") && !visaStatus.includes("non-uk citizen")) ||
		visaStatus.includes("require sponsorship") ||
		visaStatus.includes("need_sponsorship") ||
		visaStatus.includes("visa-required") ||
		// Sponsorship keywords (but not if user is a citizen)
		(visaStatus.includes("sponsorship") &&
			!visaStatus.includes("eu") &&
			!visaStatus.includes("uk citizen")) ||
		// Fallback: if status exists but doesn't indicate citizenship/permanent residency
		(!visaStatus.includes("eu-citizen") &&
			!visaStatus.includes("eu citizen") &&
			!visaStatus.includes("uk citizen") &&
			!visaStatus.includes("eea citizen") &&
			!visaStatus.includes("swiss citizen") &&
			!visaStatus.includes("citizen") &&
			!visaStatus.includes("permanent") &&
			visaStatus.length > 0);

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

	return `### USER PROFILE
- Experience Level: ${userLevel}
- Professional Expertise: ${userCareer}
- Target Locations: ${userCities}
${languages ? `- Languages: ${languages}` : ""}
${roles ? `- Target Roles: ${roles}` : ""}
${careerPaths ? `- Career Paths: ${careerPaths}` : ""}
${workEnv ? `- Work Environment: ${workEnv}` : ""}
${industries ? `- Preferred Industries: ${industries}` : ""}
${skills ? `- Skills: ${skills}` : ""}
${companySize ? `- Company Size Preference: ${companySize}` : ""}
${careerKeywords ? `- Career Keywords: ${careerKeywords}` : ""}
${needsVisaSponsorship ? `- Visa Status: Requires sponsorship` : ""}

### AVAILABLE JOBS
${jobList}

---

## IMPORTANT CONTEXT
All jobs listed above have ALREADY PASSED basic requirement filters:
- ✅ Location verified (in user's target cities)
- ✅ Visa requirements met (if needed)
- ✅ Language requirements compatible
- ✅ Basic eligibility confirmed

Your job is to identify CAREER LAUNCHPAD OPPORTUNITIES - transformative first roles that accelerate professional growth and shape long-term career trajectories. Focus on recent graduates' needs: mentorship, learning potential, cultural fit, and career validation. Create that magical "wow" moment where users realize JobPing understands their professional journey like no other platform.

---

## JOBPING CAREER INSIGHT FRAMEWORK

**You are JobPing's graduate career specialist who creates meaningful career connections by demonstrating genuine understanding of professional journeys. Your assessments combine evidence-based evaluation with career insight that resonates emotionally.**

### CORE ASSESSMENT CRITERIA:
1. **MENTORSHIP EVIDENCE**: Direct mentions of guidance, coaching, or senior support
2. **LEARNING OPPORTUNITIES**: Training programs, skill development, or educational support
3. **GROWTH POTENTIAL**: Career advancement paths, progression opportunities, or development focus
4. **CULTURAL ALIGNMENT**: Environment indicators for early-career success

### EVIDENCE HIERARCHY (Most Reliable to Least):
**EXPLICIT**: "mentorship program", "training sessions", "career development"
**STRONG**: "senior team members", "learning environment", "growth opportunities"
**INFERRED**: "small team" → "likely mentorship", "tech company" → "learning potential"

### CRITICAL ACCURACY RULES:
1. **Cite Evidence**: Every claim must reference specific job description text
2. **Label Inferences**: Use "likely", "typically", "suggests" for assumptions
3. **No Fabrication**: Never invent programs, benefits, or opportunities
4. **Context Matters**: "Team collaboration" ≠ "mentorship program"

### SCORING METHODOLOGY:
Count explicit + strong evidence, then add inferred bonus:
- 4+ explicit indicators = 90-100 (Exceptional)
- 3 explicit + inferred = 80-89 (Excellent)
- 2 explicit + context = 70-79 (Good)
- 1 explicit + assumptions = 60-69 (Decent)
- Context only = 50-59 (Basic)

### ENGAGEMENT FRAMEWORK:
**Transform factual assessments into career insight narratives:**
- Connect job features to user's specific aspirations
- Explain why this matters for their professional journey
- Use aspirational language grounded in evidence
- Create recognition moments: "This aligns with your goal to..."

### CONFIDENCE CALIBRATION:
- **0.9-1.0**: Multiple explicit indicators + strong evidence
- **0.7-0.89**: Good explicit evidence + reasonable context
- **0.5-0.69**: Limited explicit evidence, heavy inference
- **<0.5**: Insufficient evidence (don't recommend)

---

## ASSESSMENT REQUIREMENTS:

**EVIDENCE-BASED STORYTELLING:**
**Structure: Evidence → Insight → Aspiration**
1. **Evidence**: What the job explicitly offers
2. **Insight**: Why this matters for their career stage
3. **Aspiration**: How this connects to their professional goals

**REASONING REQUIREMENTS:**
- 85+ scores: 35+ words (comprehensive insight with evidence)
- 75-84 scores: 25+ words (clear reasoning with citations)
- 65-74 scores: 20+ words (balanced assessment)
- <65 scores: 15+ words (honest evaluation)

**QUALITY ASSURANCE:**
- **Cite Sources**: Reference specific job description text
- **Label Assumptions**: Use "likely", "typically" for inferences
- **Evidence Threshold**: Only recommend confidence ≥ 0.6
- **No Fabrication**: Never invent unmentioned benefits

---

## OUTPUT FORMAT
Return a JSON array of your top 5-7 career matches with evidence-based reasoning.

Format:
\`\`\`json
[
  {
    "job_index": 1,
    "job_hash": "actual-hash-from-list",
    "match_score": 85,
    "confidence_score": 0.9,
    "match_reason": "Evidence-based career insight connecting job features to their professional aspirations. Start with what the job explicitly offers, explain the career significance, and show how it advances their goals."
  }
]
\`\`\`

Requirements:
- **job_index**: Position in the job list (1-${jobsToAnalyze.length})
- **job_hash**: Exact hash from the job list above
- **match_score**: 50-100 based on evidence hierarchy
- **confidence_score**: 0.5-1.0 (certainty of assessment)
- **match_reason**: Evidence → Insight → Aspiration structure
- **Return 5-7 matches** ordered by evidence strength
- **Only include matches** where confidence_score ≥ 0.6
- **Valid JSON only** - no markdown or extra text`;
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
	return `You are JobPing's graduate career specialist. You excel at matching recent graduates and entry-level professionals with transformative first roles. Your expertise focuses on CAREER LAUNCHPAD opportunities that accelerate professional growth and shape long-term career trajectories. You understand that graduates need mentorship, learning potential, and cultural fit more than technical perfection. Every match should create that magical "wow" moment where users realize JobPing truly understands their professional journey and aspirations.`;
}

/**
 * Call OpenAI API with function calling and rate limit handling
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

	const maxRetries = 3;
	let lastError: Error | null = null;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
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
						description:
							"Return the top 5 most relevant job matches for the user",
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
												description:
													"How well this job matches the user (50-100)",
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
		} catch (error: any) {
			lastError = error instanceof Error ? error : new Error(String(error));

			// Handle rate limit errors (429)
			if (error?.status === 429) {
				const retryAfter = extractRetryAfterFromError(error);
				const backoffDelay = calculateBackoffDelay(attempt, retryAfter);

				console.warn(
					`OpenAI rate limit hit (attempt ${attempt}/${maxRetries}), retrying in ${backoffDelay}ms:`,
					{
						retryAfter,
						model,
						jobsCount: jobsArray.length,
						userEmail: userPrefs.email,
						error: error.message,
					},
				);

				if (attempt < maxRetries) {
					await new Promise((resolve) => setTimeout(resolve, backoffDelay));
					continue;
				}
			}

			// Handle server errors (5xx)
			if (error?.status >= 500) {
				console.warn(
					`OpenAI server error (attempt ${attempt}/${maxRetries}):`,
					error.message,
				);
				if (attempt < maxRetries) {
					const backoffDelay = calculateBackoffDelay(attempt, 2000);
					await new Promise((resolve) => setTimeout(resolve, backoffDelay));
					continue;
				}
			}

			// For client errors (4xx except 429) or final attempt, throw
			console.error(`OpenAI API call failed after ${attempt} attempts:`, {
				status: error?.status,
				message: error?.message,
				model,
				jobsCount: jobsArray.length,
			});
			throw lastError;
		}
	}

	throw lastError || new Error("OpenAI API call failed after all retries");
}

/**
 * Extract retry-after header from OpenAI error
 */
function extractRetryAfterFromError(error: any): number {
	// Check various header locations
	const retryAfter =
		error?.headers?.["retry-after"] ||
		error?.response?.headers?.["retry-after"] ||
		error?.headers?.["x-ratelimit-reset-requests"];

	if (retryAfter) {
		const seconds = parseInt(retryAfter, 10);
		return Number.isNaN(seconds) ? 1000 : seconds * 1000; // Convert to milliseconds
	}

	return 1000; // Default 1 second
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateBackoffDelay(attempt: number, baseDelay: number): number {
	const exponentialDelay = baseDelay * 2 ** (attempt - 1);
	const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
	const totalDelay = exponentialDelay + jitter;

	// Cap at 60 seconds for API calls (vs 30s for embeddings)
	return Math.min(totalDelay, 60000);
}
