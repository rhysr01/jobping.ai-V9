/**
 * AI Matching Service
 * Extracted from jobMatching.ts for better organization
 */

import OpenAI from "openai";
import type { Job } from "../../scrapers/types";
import { getCareerPathLabel, mapDatabaseToForm } from "./categoryMapper";
import { enrichJobData } from "./job-enrichment.service";
import { timeout } from "./normalizers";
import type { EnrichedJob, JobMatch, NormalizedUserProfile } from "./types";

// ================================
// AI MATCHING CACHE SYSTEM
// ================================

interface LRUCacheEntry<T> {
	value: T;
	timestamp: number;
	accessCount: number;
}

class LRUCache<K, V> {
	private cache = new Map<K, LRUCacheEntry<V>>();
	private maxSize: number;
	private ttl: number;

	constructor(maxSize: number, ttlMs: number) {
		this.maxSize = maxSize;
		this.ttl = ttlMs;
	}

	get(key: K): V | undefined {
		const entry = this.cache.get(key);
		if (!entry) return undefined;

		const now = Date.now();
		if (now - entry.timestamp > this.ttl) {
			this.cache.delete(key);
			return undefined;
		}

		entry.accessCount++;
		return entry.value;
	}

	set(key: K, value: V): void {
		const now = Date.now();

		if (this.cache.size >= this.maxSize) {
			this.evictLeastUsed();
		}

		this.cache.set(key, {
			value,
			timestamp: now,
			accessCount: 1,
		});
	}

	private evictLeastUsed(): void {
		let leastUsedKey: K | undefined;
		let leastUsedCount: number = Infinity;

		for (const [key, entry] of this.cache.entries()) {
			if (entry.accessCount < leastUsedCount) {
				leastUsedCount = entry.accessCount;
				leastUsedKey = key;
			}
		}

		if (leastUsedKey !== undefined) {
			this.cache.delete(leastUsedKey);
		}
	}

	clear(): void {
		this.cache.clear();
	}

	size(): number {
		return this.cache.size;
	}
}

export class AIMatchingCache {
	private static cache = new LRUCache<string, any[]>(10000, 1000 * 60 * 30); // 10k entries, 30 minutes TTL

	static get(key: string): any[] | undefined {
		return AIMatchingCache.cache.get(key);
	}

	static set(key: string, value: any[]): void {
		AIMatchingCache.cache.set(key, value);
	}

	static clear(): void {
		AIMatchingCache.cache.clear();
	}

	static size(): number {
		return AIMatchingCache.cache.size();
	}
}

// ================================
// AI MATCHING SERVICE
// ================================

export class AIMatchingService {
	private openai: OpenAI;

	constructor() {
		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey) {
			throw new Error("Missing OPENAI_API_KEY environment variable");
		}
		this.openai = new OpenAI({
			apiKey,
		});
	}

	async performEnhancedAIMatching(
		jobs: Job[],
		userPrefs: NormalizedUserProfile,
	): Promise<JobMatch[]> {
		const startTime = Date.now();

		try {
			// Check cache first (with feedback-aware key)
			const cacheKey = await this.generateCacheKey(jobs, userPrefs);
			const cachedResult = AIMatchingCache.get(cacheKey);

			if (cachedResult) {
				console.log("� Cache hit for AI matching");
				return cachedResult;
			}

			// Enrich jobs with additional data
			const enrichedJobs = jobs.map((job) => enrichJobData(job));

			// Build prompt (with feedback learning)
			const prompt = await this.buildMatchingPrompt(enrichedJobs, userPrefs);

			// Call OpenAI with timeout
			const response = await Promise.race([
				this.openai.chat.completions.create({
					model: "gpt-4o-mini",
					messages: [
						{
							role: "system",
							content: `You are an expert career advisor for EARLY-CAREER business school candidates.

DATABASE QUALITY (use this info):
- 100% of jobs have verified city data (14 target cities)
- 100% of jobs have country data
- 91.9% flagged as early-career appropriate
- 85%+ labeled by career path category
- 84% have language requirements

YOUR MATCHING PRIORITY:
1. CAREER PATH + ROLE TYPE: Match BOTH the broad path AND specific role type
   Example: User wants "Tech + Sales" = Tech Sales/BDR (NOT Software Engineer)
   Example: User wants "Tech + Engineer" = Software Engineer (NOT Sales)
2. LOCATION: Match job city to user's target cities
3. LANGUAGE: Ensure user speaks required languages
4. RELEVANCE: Is role description compelling for early-career?

Return ONLY valid JSON array with matches.`,
						},
						{
							role: "user",
							content: prompt,
						},
					],
					temperature: 0.1, // Low temperature for consistent scoring
					max_tokens: 2500, // More room for exciting match reasons
				}),
				timeout<OpenAI.Chat.Completions.ChatCompletion>(
					20000,
					"AI matching timeout",
				),
			]);

			// Parse and validate response
			const matches = this.parseAndValidateMatches(
				response.choices[0]?.message?.content || "",
				jobs,
			);

			// Cache result
			AIMatchingCache.set(cacheKey, matches);

			const latency = Date.now() - startTime;
			console.log(
				`�� AI matching completed in ${latency}ms, found ${matches.length} matches`,
			);

			return matches;
		} catch (error) {
			console.error("AI matching failed:", error);
			throw new Error(
				`AI matching failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	private async generateCacheKey(
		jobs: Job[],
		userPrefs: NormalizedUserProfile,
	): Promise<string> {
		const jobHashes = jobs
			.map((j) => j.job_hash)
			.sort()
			.join(",");

		// Include feedback count in cache key
		let feedbackFingerprint: string = "no-feedback";
		try {
			const summary = await this.getFeedbackSummary(userPrefs.email);
			if (summary && summary.total >= 3) {
				// Include feedback count and positive ratio in cache key
				feedbackFingerprint = `fb${summary.total}-pos${summary.positive}`;
			}
		} catch {
			// Ignore errors, use default
		}

		const userKey = `${userPrefs.email}-${userPrefs.careerFocus}-${feedbackFingerprint}`;
		return `ai-match:${userKey}:${jobHashes}`;
	}

	private async buildMatchingPrompt(
		jobs: EnrichedJob[],
		userProfile: NormalizedUserProfile,
	): Promise<string> {
		const userContext = await this.buildUserContextWithFeedback(userProfile);
		const jobsContext = this.buildJobsContext(jobs);

		return `
${userContext}

${jobsContext}

You are a professional career advisor focused on evidence-based matching.

Your job: Find relevant job matches and explain WHY they're relevant using factual evidence.

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

For each match, return JSON with:
- job_index: Index in jobs array (1-based, matches the number in the job list: 1, 2, 3...)
- match_score: 1-100
- match_reason: Evidence-based explanation (2-3 sentences max) linking user profile to specific job requirements
- confidence_score: 0.0-1.0

Return ONLY valid JSON array, no other text.
`;
	}

	private buildUserContext(profile: NormalizedUserProfile): string {
		const careerPaths =
			profile.career_path && profile.career_path.length > 0
				? profile.career_path
						.map((p) => `   ${this.formatCareerPath(p)}`)
						.join("\n")
				: "  (Open to all career paths)";

		const specificRoles =
			profile.roles_selected && profile.roles_selected.length > 0
				? profile.roles_selected.map((r) => `   ${r}`).join("\n")
				: "  (Open to all role types)";

		return `
USER PROFILE:
- Email: ${profile.email}

CAREER PATH PREFERENCES (Priority #1 for matching):
${careerPaths}

SPECIFIC ROLE TYPES (Priority #2 - BE PRECISE HERE!):
${specificRoles}

 IMPORTANT: Career Path + Role Type must BOTH match!
Examples:
  � "Tech & Transformation" + "Software Engineer" = Software Intern/Engineer roles
  � "Tech & Transformation" + "Sales" = Tech Sales/Business Development roles
  � "Finance & Investment" + "Analyst" = Financial Analyst/Investment Analyst roles
  � "Marketing & Growth" + "Content" = Content Marketing roles

Available Career Paths:
  � Strategy & Business Design
  � Data & Analytics  
  � Retail & Luxury
  � Sales & Client Success
  � Marketing & Growth
  � Finance & Investment
  � Operations & Supply Chain
  � Product & Innovation
  � Tech & Transformation
  � Sustainability & ESG

TARGET CITIES (100% verified location data):
${profile.target_cities?.map((c) => `  � ${c}`).join("\n") || "  � Flexible across all 14 cities"}

LANGUAGES SPOKEN:
${profile.languages_spoken?.map((l) => `  � ${l}`).join("\n") || "  � English"}

OTHER PREFERENCES:
- Work Environment: ${profile.work_environment || "Flexible"}
- Experience Level: ${profile.entry_level_preference || "Entry-level"}
- Start Date: ${profile.start_date || "Flexible"}
- Company Types: ${profile.company_types?.join(", ") || "Open"}
- Remote Preference: ${profile.remote_preference || "Flexible"}
- Industries: ${profile.industries?.join(", ") || "Open to all"}
- Company Size: ${profile.company_size_preference || "Any size"}
- Skills: ${profile.skills?.join(", ") || "Open to learning"}
- Career Keywords: ${profile.career_keywords || "Open to all opportunities"}

MATCHING RULES - ONLY 2 REQUIREMENTS, EVERYTHING ELSE IS OPTIONAL:

 ABSOLUTE REQUIREMENTS (MUST MATCH):
1. **Career Path + Role Type** - Job title/description MUST align with user's selected career path AND specific roles
   - Example: User selects "Tech" path + "Sales Representative" role = Match "Tech Sales" jobs
   - Example: User selects "Finance" path + "Analyst" role = Match "Financial Analyst" jobs

2. **Location** - Job city MUST be in one of user's target cities (we have 100% location data)

 OPTIONAL PREFERENCES (BOOST SCORE IF MATCH, BUT JOBS CAN BE GREAT WITHOUT THEM):
3. **Languages** - Bonus if job lists languages user speaks (but 16% of jobs have NO language data - still show them!)
4. **Remote Work** - Bonus if matches user preference (but missing data is OK)
5. **Industry** - Bonus if matches user interests (but many jobs don't list industry - still show them!)
6. **Company Size** - Bonus if matches preference (but often not listed - still show them!)
7. **Skills** - Bonus if job mentions skills user has (but don't exclude jobs without skill tags!)
8. **Career Keywords** - Bonus for jobs that match user's free-form description

� SCORING PHILOSOPHY:
- A job with ONLY career path + location match can be a 95+ score if it's perfect for the role!
- Jobs with MORE metadata get BONUS points (not required points)
- Don't penalize jobs for missing optional fields
- Rank based on career fit first, then use optional data to fine-tune
`;
	}

	// Helper to format career path names nicely
	// Handles both form values (simple) and database categories (hyphenated)
	private formatCareerPath(slug: string): string {
		// First try to get label for simple form value
		const label = getCareerPathLabel(slug);
		if (label !== slug) return label;

		// If not found, might be a database category - convert to form value first
		const formValue = mapDatabaseToForm(slug);
		return getCareerPathLabel(formValue) || slug;
	}

	// NEW: Build user context WITH feedback learning AND CV insights
	private async buildUserContextWithFeedback(
		profile: NormalizedUserProfile,
	): Promise<string> {
		// Get basic context
		const basicContext = this.buildUserContext(profile);

		// Get CV insights
		const cvInsights = await this.getCVInsights(profile.email);

		// Get feedback summary
		const feedbackSummary = await this.getFeedbackSummary(profile.email);

		let enhancedContext: string = basicContext;

		// Add CV insights if available
		if (cvInsights.length > 0) {
			enhancedContext += `

CV HIGHLIGHTS (use these for WOW factor):
${cvInsights.map((insight: string) => `- ${insight}`).join("\n")}
`;
		}

		// Add feedback insights if available
		if (feedbackSummary && feedbackSummary.total >= 3) {
			enhancedContext += `

LEARNED PREFERENCES (from ${feedbackSummary.total} ratings):
 USER LOVES:
  ${feedbackSummary.loved.map((item: string) => `- ${item}`).join("\n  ")}

 USER AVOIDS:
  ${feedbackSummary.disliked.map((item: string) => `- ${item}`).join("\n  ")}
`;
		}

		return enhancedContext;
	}

	// NEW: Get CV insights for WOW factor
	private async getCVInsights(userEmail: string): Promise<string[]> {
		try {
			const { createClient } = await import("@supabase/supabase-js");
			const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
			const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
			if (!supabaseUrl || !supabaseKey) {
				throw new Error("Missing Supabase configuration");
			}
			const supabase = createClient(supabaseUrl, supabaseKey);

			// Check if we have cached CV data
			const { data: cvCache } = await supabase
				.from("user_cv_data")
				.select("cv_data")
				.eq("user_email", userEmail)
				.single();

			if (cvCache?.cv_data) {
				const cvData = cvCache.cv_data as any;

				// Generate WOW insights from CV
				const insights: string[] = [];

				if (cvData.total_years_experience) {
					insights.push(`${cvData.total_years_experience} years experience`);
				}

				if (cvData.previous_companies && cvData.previous_companies.length > 0) {
					insights.push(
						`Worked at: ${cvData.previous_companies.slice(0, 2).join(", ")}`,
					);
				}

				if (cvData.technical_skills && cvData.technical_skills.length > 0) {
					insights.push(
						`Skills: ${cvData.technical_skills.slice(0, 3).join(", ")}`,
					);
				}

				if (cvData.unique_strengths && cvData.unique_strengths.length > 0) {
					insights.push(...cvData.unique_strengths.slice(0, 2));
				}

				return insights;
			}

			return [];
		} catch (error) {
			console.error("Error fetching CV insights:", error);
			return [];
		}
	}

	// NEW: Fetch and analyze user feedback
	private async getFeedbackSummary(userEmail: string): Promise<any> {
		try {
			const { createClient } = await import("@supabase/supabase-js");
			const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
			const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
			if (!supabaseUrl || !supabaseKey) {
				throw new Error("Missing Supabase configuration");
			}
			const supabase = createClient(supabaseUrl, supabaseKey);

			// Get last 20 feedback entries
			const { data: feedback, error } = await supabase
				.from("user_feedback")
				.select("verdict, relevance_score, job_context")
				.eq("user_email", userEmail)
				.order("created_at", { ascending: false })
				.limit(20);

			if (error || !feedback || feedback.length === 0) {
				return null;
			}

			// Analyze patterns
			const positive = feedback.filter((f) => f.relevance_score >= 4);
			const negative = feedback.filter((f) => f.relevance_score <= 2);

			// Extract what they loved (top 3 things from 5-star jobs)
			const loved: string[] = [];
			positive.slice(0, 5).forEach((f) => {
				const ctx = f.job_context;
				if (ctx?.location) loved.push(`${ctx.location} location`);
				if (ctx?.company) loved.push(`${ctx.company}-type companies`);
			});

			// Extract what they disliked (top 3 things from 1-2 star jobs)
			const disliked: string[] = [];
			negative.slice(0, 5).forEach((f) => {
				const ctx = f.job_context;
				if (ctx?.location) disliked.push(`${ctx.location} location`);
				if (ctx?.title?.toLowerCase().includes("senior"))
					disliked.push("Senior roles");
			});

			return {
				total: feedback.length,
				positive: positive.length,
				negative: negative.length,
				loved: [...new Set(loved)].slice(0, 3), // Dedupe, top 3
				disliked: [...new Set(disliked)].slice(0, 3),
			};
		} catch (error) {
			console.error("Error fetching feedback:", error);
			return null;
		}
	}

	private buildJobsContext(jobs: EnrichedJob[]): string {
		return jobs
			.map((job, index) => {
				const careerPaths =
					job.categories
						?.filter((c: string) => c !== "early-career")
						.map((c: string) => this.formatCareerPath(c))
						.join(" + ") || "General Business";

				const languages =
					job.language_requirements && job.language_requirements.length > 0
						? job.language_requirements.join(", ")
						: "English (inferred)";

				return `
JOB ${index + 1}: (1-based indexing for user-friendly numbering)
�������������������������������������
 Title: ${job.title}
� Company: ${job.company}
 Location: ${job.city}, ${job.country} (verified)
� Career Path(s): ${careerPaths}
� Languages Required: ${languages}
 Experience: ${job.experience_required || "Entry-level"}
 Posted: ${job.original_posted_date || job.created_at}

 Description (first 400 chars):
${job.description?.substring(0, 400).trim()}...

MATCH CRITERIA:
 Career path matches user's selected paths?
 Role type matches user's specific role preferences? (e.g., "sales" vs "engineer")
 City in user's target cities?
 User speaks required languages?
 Role appropriate for early-career?
�������������������������������������
`;
			})
			.join("\n");
	}

	parseAndValidateMatches(response: string, jobs: Job[]): JobMatch[] {
		try {
			// Clean up response
			const cleanedResponse = response
				.replace(/```json\n?/g, "")
				.replace(/```\n?/g, "")
				.trim();

			const matches = JSON.parse(cleanedResponse);

			if (!Array.isArray(matches)) {
				throw new Error("Response is not an array");
			}

			return matches
				.filter(
					(match) =>
						typeof match.job_index === "number" &&
						match.job_index >= 1 &&
						match.job_index <= jobs.length &&
						typeof match.match_score === "number" &&
						match.match_score >= 1 &&
						match.match_score <= 100,
				)
				.map((match) => ({
					job_index: match.job_index,
					job_hash: jobs[match.job_index - 1].job_hash, // Convert 1-based to 0-based for array access
					match_score: match.match_score,
					match_reason: match.match_reason || "AI match",
					confidence_score: match.confidence_score || 0.8,
				}));
		} catch (error) {
			console.error("Failed to parse AI response:", error);
			throw new Error("Invalid AI response format");
		}
	}

	convertToRobustMatches(
		aiMatches: any[],
		_user: NormalizedUserProfile,
		jobs: Job[],
	): any[] {
		return aiMatches
			.filter((match) => match.job_index >= 1 && match.job_index <= jobs.length)
			.map((match) => ({
				job: jobs[match.job_index - 1], // Convert 1-based to 0-based for array access
				match_score: match.match_score,
				match_reason: match.match_reason,
				confidence_score: match.confidence_score,
			}))
			.sort((a, b) => b.match_score - a.match_score);
	}

	async testConnection(): Promise<boolean> {
		try {
			await this.openai.chat.completions.create({
				model: "gpt-4o-mini",
				messages: [{ role: "user", content: "test" }],
				max_tokens: 1,
			});
			return true;
		} catch (_error) {
			return false;
		}
	}

	getStats(): any {
		return {
			model: "gpt-4o-mini",
			maxTokens: 4000,
			temperature: 0.7,
			timeout: 20000,
		};
	}
}
