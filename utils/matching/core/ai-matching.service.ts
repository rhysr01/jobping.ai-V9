/**
 * AI Matching Service - OpenAI-powered Semantic Job Matching
 * Extracted and simplified from the massive consolidated engine
 */

import OpenAI from "openai";
import type { Job } from "@/scrapers/types";
import { apiLogger } from "../../../lib/api-logger";
import { aiMatchingCache } from "../../../lib/cache";
import {
	generateScoreExplanation,
	ScoreComponents,
	UnifiedScore,
} from "../scoring-standard";
import type { UserPreferences } from "../types";
import { FreeMatchBuilder } from "./prompts/free-match-builder";
import { PremiumMatchBuilder } from "./prompts/premium-match-builder";

export interface AIMatchResult {
	job: Job;
	unifiedScore: UnifiedScore;
	matchReason: string;
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
		options: AIMatchingOptions = {},
	): Promise<AIMatchResult[]> {
		const {
			maxRetries = 3,
			timeoutMs = 30000,
			useCache = true,
			model = "gpt-4o-mini",
		} = options;

		apiLogger.info("AI matching starting", {
			metadata: {
				userEmail: user.email,
				jobsCount: jobs.length,
				model,
				useCache,
			},
		});

		if (!this.openai) {
			apiLogger.error("OpenAI client not initialized");
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
				model,
			});
			results.push(...batchResults);

			// Rate limiting
			if (i + batchSize < jobs.length) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
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

		return results.sort(
			(a, b) => b.unifiedScore.overall - a.unifiedScore.overall,
		);
	}

	/**
	 * Process a batch of jobs
	 */
	private async processBatch(
		user: UserPreferences,
		jobs: Job[],
		options: AIMatchingOptions,
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
		options: AIMatchingOptions,
	): Promise<AIMatchResult[]> {
		const prompt = this.buildPrompt(user, jobs);

		try {
			const response = await this.openai?.chat.completions.create({
				model: options.model || "gpt-4o-mini",
				messages: [
					{
						role: "system",
						content:
							"You are an expert career counselor helping match job seekers with perfect job opportunities. Analyze job matches based on skills, experience, location preferences, and career goals.",
					},
					{
						role: "user",
						content: prompt,
					},
				],
				max_tokens: 2000,
				temperature: 0.3,
			});

			if (!response) {
				throw new Error("No response from OpenAI");
			}

			const content = response.choices[0]?.message?.content;
			if (!content) {
				throw new Error("No response from OpenAI");
			}

			// Debug log the raw response
			apiLogger.info("OpenAI raw response", {
				metadata: {
					userEmail: user.email,
					responseLength: content.length,
					responsePreview: content.substring(0, 200),
				},
			});

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
		const isPremium =
			user.subscription_tier === "premium" ||
			user.subscription_tier === "premium_pending";

		return isPremium
			? PremiumMatchBuilder.buildPrompt(user, jobs)
			: FreeMatchBuilder.buildPrompt(user, jobs);
	}

	/**
	 * Parse OpenAI response
	 */
	private parseResponse(content: string, jobs: Job[]): AIMatchResult[] {
		try {
			// Strip markdown code block formatting if present
			let cleanContent = content.trim();
			if (cleanContent.startsWith("```json")) {
				cleanContent = cleanContent
					.replace(/^```json\s*/, "")
					.replace(/\s*```$/, "");
			}
			if (cleanContent.startsWith("```")) {
				cleanContent = cleanContent
					.replace(/^```\s*/, "")
					.replace(/\s*```$/, "");
			}

			const parsed = JSON.parse(cleanContent);
			const matches = parsed.matches || [];

			return matches
				.map((match: any) => {
					const jobIndex = match.jobIndex;
					const job = jobs[jobIndex];

					if (!job) return null;

					// Extract component scores from AI response
					const relevance =
						match.scoreBreakdown?.skills ||
						match.unifiedScore.overall * 0.4 ||
						50;
					const quality =
						match.scoreBreakdown?.company ||
						match.unifiedScore.overall * 0.3 ||
						50;
					const opportunity =
						match.scoreBreakdown?.experience ||
						match.unifiedScore.overall * 0.2 ||
						50;
					const timing =
						match.scoreBreakdown?.location ||
						match.unifiedScore.overall * 0.1 ||
						50;

					// Create unified score components
					const components: ScoreComponents = {
						relevance: Math.max(0, Math.min(100, relevance)),
						quality: Math.max(0, Math.min(100, quality)),
						opportunity: Math.max(0, Math.min(100, opportunity)),
						timing: Math.max(0, Math.min(100, timing)),
					};

					// Calculate overall score from components
					const overallScore = Math.max(
						0,
						Math.min(100, match.matchScore || 0),
					);

					// Create unified score object
					const unifiedScore: UnifiedScore = {
						overall: overallScore,
						components,
						confidence: Math.max(0, Math.min(100, match.confidenceScore || 85)),
						method: "ai",
					};

					// Add explanation for transparency
					unifiedScore.explanation = generateScoreExplanation(
						unifiedScore,
						job.title || "Unknown Position",
					);

					return {
						job,
						unifiedScore,
						matchReason: match.matchReason || "AI analyzed match",
					};
				})
				.filter(Boolean) as AIMatchResult[];
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
		const jobsKey = jobs
			.map((j) => `${j.title}-${j.company}`)
			.sort()
			.join("|");
		return `${userKey}|${jobsKey}`;
	}
}

export const aiMatchingService = new AIMatchingService();
