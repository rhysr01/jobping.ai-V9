/**
 * Orchestration Domain - Main matching orchestration logic
 * Handles user/job fetching, batch vs individual processing, and match persistence
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { apiLogger } from "@/lib/api-logger";
import { triggerMatchingEvent } from "@/lib/inngest/matching-helpers";
import { logger } from "@/lib/monitoring";
import type { MatchProvenance } from "@/lib/types";
import type { Job as ScrapersJob } from "@/scrapers/types";
import { createConsolidatedMatcher } from "@/Utils/consolidatedMatchingV2";
import { batchMatchingProcessor } from "@/Utils/matching/batch-processor.service";
import {
	distributeJobsWithDiversity,
	getDistributionStats,
} from "@/Utils/matching/jobDistribution";
import { fetchCandidateJobs } from "@/Utils/matching/jobSearchService";
import { logMatchSession } from "@/Utils/matching/logging.service";
import { semanticRetrievalService } from "@/Utils/matching/semanticRetrieval";
import type { JobMatch, UserPreferences } from "@/Utils/matching/types";
import {
	fetchActiveUsers,
	transformUsers,
} from "@/Utils/matching/userBatchService";
import { SEMANTIC_RETRIEVAL_ENABLED } from "./config";
import { ensureCityDiversity, ensureSourceDiversity } from "./diversity";
import type { MatchResult, User } from "./types";

/**
 * Fetch users and jobs
 */
export async function fetchUsersAndJobs(
	supabase: SupabaseClient,
	userCap: number,
	jobCap: number,
): Promise<{
	users: User[];
	transformedUsers: Array<{ email?: string; preferences: UserPreferences }>;
	jobs: ScrapersJob[];
	isSemanticAvailable: boolean;
}> {
	// Fetch users
	const users = await fetchActiveUsers(supabase, userCap);
	if (!users || users.length === 0) {
		throw new Error("No users found");
	}

	logger.info("Active users found", {
		metadata: { userCount: users.length },
	});

	const transformedUsers = transformUsers(users);

	// Check semantic search availability
	const isSemanticAvailable =
		await semanticRetrievalService.isSemanticSearchAvailable();
	apiLogger.debug(`Semantic search available: ${isSemanticAvailable}`, {
		isSemanticAvailable,
	});

	// Fetch jobs
	let jobs: ScrapersJob[] = [];
	const { jobs: fetchedJobs } = await fetchCandidateJobs(
		supabase,
		jobCap,
		transformedUsers,
	);
	jobs = fetchedJobs.map((job) => ({
		...job,
		location: job.location ?? "Remote", // Ensures location is never null
	})) as ScrapersJob[];

	// Augment with semantic candidates
	if (SEMANTIC_RETRIEVAL_ENABLED && isSemanticAvailable) {
		const existingHashes = new Set(jobs.map((job: any) => job.job_hash));
		let semanticAdds = 0;

		for (const user of transformedUsers) {
			try {
				const semanticCandidates =
					await semanticRetrievalService.getSemanticCandidates(
						user.preferences as UserPreferences,
						120,
					);

				for (const candidate of semanticCandidates) {
					if (!candidate?.job_hash || existingHashes.has(candidate.job_hash)) {
						continue;
					}
					jobs.push(candidate);
					existingHashes.add(candidate.job_hash);
					semanticAdds++;
				}
			} catch (error) {
				apiLogger.debug("Semantic retrieval failed for user", {
					user: user.email,
					error: error instanceof Error ? error.message : error,
				});
			}
		}

		if (semanticAdds > 0) {
			apiLogger.info("Semantic retrieval augmented job pool", {
				semanticAdds,
				totalJobs: jobs.length,
				usersProcessed: transformedUsers.length,
			});
		}
	}

	if (!jobs || jobs.length === 0) {
		throw new Error("No active jobs to process");
	}

	logger.info("Jobs fetched successfully", {
		metadata: { jobCount: jobs.length },
	});

	return {
		users,
		transformedUsers,
		jobs,
		isSemanticAvailable,
	};
}

/**
 * Process a single user's matching
 */
export async function processUserMatching(
	user: { email?: string; preferences: UserPreferences },
	jobs: ScrapersJob[],
	matcher: ReturnType<typeof createConsolidatedMatcher>,
	supabase: SupabaseClient,
	startTime: number,
): Promise<MatchResult> {
	try {
		const previousJobHashes = new Set<string>();
		const unseenJobs = jobs.filter(
			(job) => !previousJobHashes.has(job.job_hash),
		);

		logger.debug("Starting matching pipeline", {
			metadata: {
				userEmail: user.email,
				totalJobs: unseenJobs.length,
			},
		});

		// AI matching
		let matches: JobMatch[] = [];
		let matchType: "ai_success" | "fallback" | "ai_failed" = "ai_success";
		const userProvenance: MatchProvenance = {
			match_algorithm: "ai",
			cache_hit: false,
			ai_latency_ms: 0,
			ai_cost_usd: 0,
		};
		const aiMatchingStart = Date.now();

		// Use Inngest if enabled
		const useInngest = process.env.USE_INNGEST_FOR_MATCHING === "true";
		if (useInngest) {
			apiLogger.info("Triggering Inngest matching event for user", {
				email: user.email,
				jobsCount: unseenJobs.length,
			});

			try {
				await triggerMatchingEvent({
					userPrefs: user as unknown as UserPreferences,
					jobs: unseenJobs as any[],
					context: {
						source: "match-users",
						requestId: crypto.randomUUID(),
					},
				});
				apiLogger.info(
					"Inngest matching triggered, continuing with sync matching",
					{ email: user.email },
				);
			} catch (inngestError) {
				apiLogger.error(
					"Failed to trigger Inngest matching, using synchronous matching only",
					inngestError as Error,
					{ email: user.email },
				);
			}
		}

		// Perform matching
		const jobsForMatching = unseenJobs as any[];
		const result = await matcher.performMatching(
			jobsForMatching,
			user as unknown as UserPreferences,
			process.env.MATCH_USERS_DISABLE_AI === "true",
		);

		matches = result.matches;
		matchType =
			result.method === "ai_success"
				? "ai_success"
				: result.method === "rule_based"
					? "fallback"
					: "ai_failed";

		const aiMatchingTime = Date.now() - aiMatchingStart;

		// Apply distribution
		if (matches && matches.length > 0) {
			const matchedJobsRaw = matches
				.map((m) => {
					const job = unseenJobs.find((j) => j.job_hash === m.job_hash);
					return job
						? {
								...job,
								match_score: m.match_score,
								match_reason: m.match_reason,
							}
						: null;
				})
				.filter((j) => j !== null);

			const targetCities = user.preferences.target_cities || [];
			const targetCount = Math.min(5, matchedJobsRaw.length);

			let targetWorkEnvironments: string[] = [];
			if (user.preferences.work_environment) {
				if (Array.isArray(user.preferences.work_environment)) {
					targetWorkEnvironments = user.preferences.work_environment;
				} else if (typeof user.preferences.work_environment === "string") {
					targetWorkEnvironments = user.preferences.work_environment
						.split(",")
						.map((env) => env.trim())
						.filter(Boolean);
				}
			}

			const distributedMatchedJobs = distributeJobsWithDiversity(
				matchedJobsRaw as any[],
				{
					targetCount,
					targetCities,
					maxPerSource: Math.ceil(targetCount / 3),
					ensureCityBalance: true,
					targetWorkEnvironments: targetWorkEnvironments,
					ensureWorkEnvironmentBalance: targetWorkEnvironments.length > 0,
				},
			);

			const stats = getDistributionStats(distributedMatchedJobs);
			apiLogger.info("Job distribution stats after AI matching", {
				email: user.email,
				sourceDistribution: stats.sourceDistribution,
				cityDistribution: stats.cityDistribution,
				workEnvironmentDistribution: stats.workEnvironmentDistribution,
				totalJobs: stats.totalJobs,
				targetWorkEnvironments: targetWorkEnvironments,
			});

			matches = distributedMatchedJobs
				.filter((job) => job.job_hash)
				.map((job, idx) => ({
					job_index: idx + 1,
					job_hash: job.job_hash!,
					match_score: job.match_score || 85,
					match_reason: job.match_reason || "AI match",
					confidence_score: 0.85,
				}));
		}

		// Apply diversity checks
		if (matches && matches.length >= 3) {
			apiLogger.debug(`Running diversity check`, {
				method: result.method,
				cached: result.method === "ai_success" && aiMatchingTime < 100,
			});

			const matchedJobs = matches.map((m) => {
				const job = unseenJobs.find((j) => j.job_hash === m.job_hash);
				return job
					? {
							...m,
							source: (job as any).source,
							location: job.location,
						}
					: m;
			});

			matches = ensureCityDiversity(matches, unseenJobs, user.preferences);
			matches = ensureSourceDiversity(
				matches,
				matchedJobs,
				unseenJobs,
				user.email || "",
			);
		}

		// Save matches
		if (matches && matches.length > 0) {
			const finalProvenance = {
				match_algorithm: matchType === "ai_success" ? "ai" : "rules",
				ai_latency_ms: aiMatchingTime,
				cache_hit: userProvenance.cache_hit || false,
				fallback_reason:
					matchType !== "ai_success" ? "ai_failed_or_fallback" : undefined,
				ai_model: result.aiModel || null,
				ai_cost_usd: result.aiCostUsd || null,
			};

			const matchesWithEmail = matches.map((m) => ({
				...m,
				user_email: user.email,
			}));

			try {
				const matchEntries = matchesWithEmail
					.filter((m) => m.job_hash)
					.map((match) => ({
						user_email: match.user_email,
						job_hash: match.job_hash,
						match_score:
							typeof match.match_score === "number"
								? match.match_score > 1
									? match.match_score / 100
									: match.match_score
								: 0.85,
						match_reason: match.match_reason || "AI match",
						matched_at: new Date().toISOString(),
						created_at: new Date().toISOString(),
						match_algorithm: finalProvenance.match_algorithm || "ai",
						ai_latency_ms: finalProvenance.ai_latency_ms || null,
						cache_hit: finalProvenance.cache_hit || false,
						fallback_reason: finalProvenance.fallback_reason || null,
						ai_model: finalProvenance.ai_model || null,
						ai_cost_usd: finalProvenance.ai_cost_usd || null,
					}));

				if (matchEntries.length > 0) {
					const { error: saveError } = await supabase
						.from("matches")
						.upsert(matchEntries, {
							onConflict: "user_email,job_hash",
						});

					if (saveError) {
						apiLogger.error(
							`Failed to save matches for user`,
							saveError as Error,
							{
								userEmail: user.email,
								error: saveError.message,
							},
						);
					} else {
						apiLogger.info(`Saved ${matchEntries.length} matches for user`, {
							userEmail: user.email,
							matchCount: matchEntries.length,
						});
					}
				}
			} catch (error) {
				apiLogger.error(`Failed to save matches for user`, error as Error, {
					userEmail: user.email,
				});
			}
		}

		await logMatchSession(user.email || "", matchType, matches.length, {
			processingTimeMs: Date.now() - startTime,
			aiModel: "gpt-4",
		});

		return { user: user.email || "", success: true, matches: matches.length };
	} catch (userError) {
		apiLogger.error(`Error processing user`, userError as Error, {
			userEmail: user.email,
		});

		return {
			user: user.email || "",
			success: false,
			error: userError instanceof Error ? userError.message : "Unknown error",
		};
	}
}

/**
 * Process users with batch or individual matching
 */
export async function processUsers(
	transformedUsers: Array<{ email?: string; preferences: UserPreferences }>,
	jobs: ScrapersJob[],
	supabase: SupabaseClient,
	startTime: number,
): Promise<MatchResult[]> {
	const USE_BATCH_PROCESSING =
		transformedUsers.length >= 5 &&
		process.env.ENABLE_BATCH_MATCHING !== "false";

	if (USE_BATCH_PROCESSING) {
		apiLogger.info(
			`Using batch processing for ${transformedUsers.length} users`,
			{ userCount: transformedUsers.length },
		);

		const usersForBatch = transformedUsers.map((user) => ({
			email: user.email || "",
			preferences: user.preferences as UserPreferences,
		}));

		const batchStartTime = Date.now();
		const batchResults = await batchMatchingProcessor.processBatch(
			usersForBatch,
			jobs as any[],
			{
				useEmbeddings:
					await semanticRetrievalService.isSemanticSearchAvailable(),
				maxBatchSize: 10,
			},
		);

		const totalAIProcessingTime = Date.now() - batchStartTime;
		apiLogger.info("Batch processing completed", {
			totalAIProcessingTime,
			usersProcessed: transformedUsers.length,
		});

		return transformedUsers.map((user) => {
			const batchResult = batchResults.get(user.email || "");
			if (batchResult) {
				return {
					user: user.email || "",
					success: true,
					matches: batchResult.matches.length,
				};
			}
			return {
				user: user.email || "",
				success: false,
				error: "No matches found",
			};
		});
	} else {
		apiLogger.info(
			`Using individual processing for ${transformedUsers.length} users`,
			{ userCount: transformedUsers.length },
		);

		// Get OpenAI API key (same validation as embedding service)
		const openaiKey = process.env.OPENAI_API_KEY;
		const hasOpenAIKey = openaiKey && openaiKey.startsWith("sk-");
		const matcher = createConsolidatedMatcher(hasOpenAIKey ? openaiKey : undefined);
		const userPromises = transformedUsers.map((user) =>
			processUserMatching(user, jobs, matcher, supabase, startTime),
		);

		return await Promise.all(userPromises);
	}
}
