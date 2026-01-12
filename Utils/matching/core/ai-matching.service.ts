/**
 * AI Matching Service - OpenAI-powered Semantic Job Matching
 * Extracted and simplified from the massive consolidated engine
 */

import OpenAI from "openai";
import { apiLogger } from "../../../lib/api-logger";
import type { Job } from "@/scrapers/types";
import type { UserPreferences } from "../types";
import { aiMatchingCache } from "../../../lib/cache";

export interface AIMatchResult {
	job: Job;
	matchScore: number;
	confidenceScore: number;
	matchReason: string;
	scoreBreakdown: {
		skills: number;
		experience: number;
		location: number;
		company: number;
		overall: number;
	};
}

export interface AIMatchingOptions {
	maxRetries?: number;
	timeoutMs?: number;
	useCache?: boolean;
	model?: string;
}

export class AIMatchingService {
	private openai: OpenAI | null = null;
	private cache = aiMatchingCache;

	constructor(openaiApiKey?: string) {
		if (openaiApiKey) {
			this.openai = new OpenAI({ apiKey: openaiApiKey });
		} else if (process.env.OPENAI_API_KEY) {
			this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
		}
	}

	/**
	 * Main AI matching method
	 */
	async findMatches(
		user: UserPreferences,
		jobs: Job[],
		options: AIMatchingOptions = {}
	): Promise<AIMatchResult[]> {
		const {
			maxRetries = 3,
			timeoutMs = 30000,
			useCache = true,
			model = "gpt-4o-mini"
		} = options;

		if (!this.openai) {
			throw new Error("OpenAI client not initialized");
		}

		const results: AIMatchResult[] = [];
		const startTime = Date.now();

		// Process jobs in batches to avoid rate limits
		const batchSize = 5;
		for (let i = 0; i < jobs.length; i += batchSize) {
			const batch = jobs.slice(i, i + batchSize);
			const batchResults = await this.processBatch(user, batch, {
				maxRetries,
				timeoutMs,
				useCache,
				model
			});
			results.push(...batchResults);

			// Rate limiting
			if (i + batchSize < jobs.length) {
				await new Promise(resolve => setTimeout(resolve, 1000));
			}
		}

		apiLogger.info("AI matching completed", {
			metadata: {
				userEmail: user.email,
				jobsProcessed: jobs.length,
				matchesFound: results.length,
				processingTime: Date.now() - startTime,
			},
		});

		return results.sort((a, b) => b.matchScore - a.matchScore);
	}

	/**
	 * Process a batch of jobs
	 */
	private async processBatch(
		user: UserPreferences,
		jobs: Job[],
		options: AIMatchingOptions
	): Promise<AIMatchResult[]> {
		const cacheKey = this.generateCacheKey(user, jobs);

		// Check cache first
		if (options.useCache) {
			const cached = this.cache.get(cacheKey);
			if (cached) {
				return cached;
			}
		}

		const results = await this.callOpenAI(user, jobs, options);

		// Cache results
		if (options.useCache) {
			this.cache.set(cacheKey, results);
		}

		return results;
	}

	/**
	 * Call OpenAI API for matching
	 */
	private async callOpenAI(
		user: UserPreferences,
		jobs: Job[],
		options: AIMatchingOptions
	): Promise<AIMatchResult[]> {
		const prompt = this.buildPrompt(user, jobs);

		try {
			const response = await this.openai!.chat.completions.create({
				model: options.model!,
				messages: [
					{
						role: "system",
						content: "You are an expert career counselor helping match job seekers with perfect job opportunities. Analyze job matches based on skills, experience, location preferences, and career goals."
					},
					{
						role: "user",
						content: prompt
					}
				],
				max_tokens: 2000,
				temperature: 0.3,
			});

			const content = response.choices[0]?.message?.content;
			if (!content) {
				throw new Error("No response from OpenAI");
			}

			return this.parseResponse(content, jobs);
		} catch (error) {
			apiLogger.error("OpenAI API call failed", error as Error, {
				userEmail: user.email,
				jobsCount: jobs.length,
			});

			// Return empty results on failure
			return [];
		}
	}

	/**
	 * Build the prompt for OpenAI
	 */
	private buildPrompt(user: UserPreferences, jobs: Job[]): string {
		const userProfile = `
User Profile:
- Email: ${user.email}
 - Experience Level: ${user.entry_level_preference || 'Not specified'}
- Target Cities: ${Array.isArray(user.target_cities) ? user.target_cities.join(', ') : user.target_cities || 'Not specified'}
 - Keywords: ${user.career_keywords || 'Not specified'}
 - Industries: ${user.industries?.join(', ') || 'Not specified'}
 - Languages: ${user.languages_spoken?.join(', ') || 'Not specified'}
- Work Environment: ${user.work_environment || 'Not specified'}
 - Work Environment: ${user.work_environment || 'Not specified'}
		`.trim();

		const jobsList = jobs.map((job, index) => `
Job ${index + 1}:
Title: ${job.title}
Company: ${job.company}
Location: ${job.city}, ${job.country}
Description: ${job.description?.substring(0, 500)}...
Experience Required: ${job.experience_required || 'Not specified'}
		`).join('\n');

		return `
${userProfile}

Please analyze the following jobs and rate how well they match this user's profile. For each job, provide:

1. Match Score (0-100): Overall compatibility
2. Confidence Score (0-100): How confident you are in this assessment
3. Match Reason: Brief explanation (max 50 words)
4. Score Breakdown:
   - Skills: 0-100
   - Experience: 0-100
   - Location: 0-100
   - Company: 0-100

Format your response as JSON:
{
  "matches": [
    {
      "jobIndex": 0,
      "matchScore": 85,
      "confidenceScore": 90,
      "matchReason": "Strong match due to relevant experience and location",
      "scoreBreakdown": {
        "skills": 88,
        "experience": 85,
        "location": 95,
        "company": 75
      }
    }
  ]
}

${jobsList}
		`.trim();
	}

	/**
	 * Parse OpenAI response
	 */
	private parseResponse(content: string, jobs: Job[]): AIMatchResult[] {
		try {
			const parsed = JSON.parse(content);
			const matches = parsed.matches || [];

			return matches.map((match: any) => {
				const jobIndex = match.jobIndex;
				const job = jobs[jobIndex];

				if (!job) return null;

				return {
					job,
					matchScore: Math.max(0, Math.min(100, match.matchScore || 0)),
					confidenceScore: Math.max(0, Math.min(100, match.confidenceScore || 0)),
					matchReason: match.matchReason || "AI analyzed match",
					scoreBreakdown: {
						skills: match.scoreBreakdown?.skills || 0,
						experience: match.scoreBreakdown?.experience || 0,
						location: match.scoreBreakdown?.location || 0,
						company: match.scoreBreakdown?.company || 0,
						overall: match.matchScore || 0,
					},
				};
			}).filter(Boolean) as AIMatchResult[];
		} catch (error) {
			apiLogger.error("Failed to parse OpenAI response", error as Error);
			return [];
		}
	}

	/**
	 * Generate cache key
	 */
	private generateCacheKey(user: UserPreferences, jobs: Job[]): string {
		const userKey = `${user.email}-${user.entry_level_preference}-${JSON.stringify(user.career_keywords)}`;
		const jobsKey = jobs.map(j => `${j.title}-${j.company}`).sort().join('|');
		return `${userKey}|${jobsKey}`;
	}
}

export const aiMatchingService = new AIMatchingService();