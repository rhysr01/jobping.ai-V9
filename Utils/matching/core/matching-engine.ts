/**
 * Simplified Matching Engine - Orchestrates 3 Core Services
 * Replaces the massive consolidated engine with clean orchestration
 */

import { apiLogger } from "@/lib/api-logger";
import type { Job } from "@/scrapers/types";
import type { UserPreferences, JobMatch } from "@/utils/matching/types";
import { prefilterService, type PrefilterResult } from "./prefilter.service";
import { aiMatchingService, type AIMatchResult } from "./ai-matching.service";
import { fallbackService, type FallbackMatch } from "./fallback.service";

export interface MatchingOptions {
	useAI: boolean;
	maxJobsForAI: number;
	fallbackThreshold: number;
	includePrefilterScore: boolean;
}

export interface MatchingResult {
	matches: JobMatch[];
	method: "ai" | "fallback";
	totalJobsProcessed: number;
	prefilterResults: PrefilterResult;
	processingTime: number;
}

export class SimplifiedMatchingEngine {
	/**
	 * Main matching method - orchestrates the 3 services
	 */
	async findMatchesForUser(
		user: UserPreferences,
		allJobs: Job[],
		options: Partial<MatchingOptions> = {}
	): Promise<MatchingResult> {
		const startTime = Date.now();
		const opts: MatchingOptions = {
			useAI: true,
			maxJobsForAI: 20,
			fallbackThreshold: 3,
			includePrefilterScore: true,
			...options,
		};

		try {
			// Step 1: Prefilter jobs
			const prefilterResult = await prefilterService.prefilterJobs(allJobs, user);

			if (prefilterResult.jobs.length === 0) {
				apiLogger.warn("No jobs passed prefilter", {
					userEmail: user.email,
					totalJobs: allJobs.length,
				});

				return {
					matches: [],
					method: "fallback",
					totalJobsProcessed: allJobs.length,
					prefilterResults: prefilterResult,
					processingTime: Date.now() - startTime,
				};
			}

			// Step 2: Try AI matching first
			let matches: JobMatch[] = [];
			let method: "ai" | "fallback" = "fallback";

			if (opts.useAI && prefilterResult.jobs.length >= opts.fallbackThreshold) {
				try {
					const aiResults = await aiMatchingService.findMatches(
						user,
						prefilterResult.jobs.slice(0, opts.maxJobsForAI).map(j => j as Job)
					);

					if (aiResults.length > 0) {
						matches = this.convertAIMatchesToJobMatches(aiResults, opts);
						method = "ai";

						apiLogger.info("AI matching successful", {
							userEmail: user.email,
							aiMatches: aiResults.length,
							processingTime: Date.now() - startTime,
						});
					}
				} catch (aiError) {
					apiLogger.warn("AI matching failed, falling back to rules", aiError as Error, {
						userEmail: user.email,
					});
				}
			}

			// Step 3: Use fallback if AI didn't work or wasn't enough
			if (matches.length < opts.fallbackThreshold) {
				const fallbackResults = fallbackService.generateFallbackMatches(
					prefilterResult.jobs.map(j => j as Job),
					user,
					opts.fallbackThreshold * 2
				);

				const fallbackMatches = this.convertFallbackMatchesToJobMatches(fallbackResults, opts);

				// Combine with AI results if any
				matches = [...matches, ...fallbackMatches]
					.filter((match, index, arr) =>
						// Remove duplicates by job URL
						arr.findIndex(m => m.job.job_url === match.job.job_url) === index
					)
					.sort((a, b) => b.match_score - a.match_score)
					.slice(0, opts.fallbackThreshold * 2);

				method = matches.some(m => m.method === "ai") ? "ai" : "fallback";
			}

			const result: MatchingResult = {
				matches,
				method,
				totalJobsProcessed: allJobs.length,
				prefilterResults: prefilterResult,
				processingTime: Date.now() - startTime,
			};

			apiLogger.info("Matching completed", {
				metadata: {
					userEmail: user.email,
					method,
					matchesFound: matches.length,
					totalJobsProcessed: allJobs.length,
					prefilteredJobs: prefilterResult.jobs.length,
					processingTime: result.processingTime,
				},
			});

			return result;

		} catch (error) {
			apiLogger.error("Matching engine failed", error as Error, {
				userEmail: user.email,
				totalJobs: allJobs.length,
			});

			// Emergency fallback - return basic matches
			const emergencyMatches = fallbackService.generateFallbackMatches(allJobs, user, 5);

			return {
				matches: this.convertFallbackMatchesToJobMatches(emergencyMatches, opts),
				method: "fallback",
				totalJobsProcessed: allJobs.length,
				prefilterResults: {
					jobs: [],
					matchLevel: "broad",
					filteredCount: 0,
					sourceDistribution: {},
				},
				processingTime: Date.now() - startTime,
			};
		}
	}

	/**
	 * Convert AI match results to standard JobMatch format
	 */
	private convertAIMatchesToJobMatches(
		aiResults: AIMatchResult[],
		options: MatchingOptions
	): JobMatch[] {
		return aiResults.map(aiMatch => ({
			job: aiMatch.job,
			match_score: aiMatch.matchScore,
			match_reason: aiMatch.matchReason,
			confidence_score: aiMatch.confidenceScore,
			score_breakdown: aiMatch.scoreBreakdown,
			method: "ai" as const,
			timestamp: new Date().toISOString(),
		}));
	}

	/**
	 * Convert fallback match results to standard JobMatch format
	 */
	private convertFallbackMatchesToJobMatches(
		fallbackResults: FallbackMatch[],
		options: MatchingOptions
	): JobMatch[] {
		return fallbackResults.map(fallbackMatch => ({
			job: fallbackMatch.job,
			match_score: fallbackMatch.matchScore,
			match_reason: fallbackMatch.matchReason,
			confidence_score: fallbackMatch.confidenceScore,
			score_breakdown: fallbackMatch.scoreBreakdown,
			method: "fallback" as const,
			timestamp: new Date().toISOString(),
		}));
	}
}

export const simplifiedMatchingEngine = new SimplifiedMatchingEngine();