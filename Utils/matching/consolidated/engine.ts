/**
 * Matching Engine Orchestrator
 * Coordinates scoring, prompts, validation, and AI matching
 * Extracted from consolidatedMatchingV2.ts for better organization
 */

import OpenAI from "openai";
import { apiLogger } from "@/lib/api-logger";
import type { Job } from "@/scrapers/types";
import { matchesCity } from "../distribution/cityMatching";
import type { JobMatch, UserPreferences } from "../types";
import { LRUMatchCache } from "./cache";
import { CircuitBreaker } from "./circuitBreaker";
import {
	AI_MAX_RETRIES,
	AI_TIMEOUT_MS,
	CACHE_TTL_HOURS,
	CIRCUIT_BREAKER_THRESHOLD,
	JOBS_TO_ANALYZE_FREE,
	JOBS_TO_ANALYZE_PREMIUM,
	MAX_CACHE_SIZE,
} from "./config";
import * as prompts from "./prompts";
import * as scoring from "./scoring";
import type { ConsolidatedMatchResult } from "./types";
import * as validation from "./validation";
import { aiMonitor } from "../../monitoring/ai-monitor";

// ============================================
// SHARED CACHE INSTANCE
// ============================================

const SHARED_MATCH_CACHE = new LRUMatchCache(
	MAX_CACHE_SIZE,
	CACHE_TTL_HOURS * 60 * 60 * 1000,
);

// ============================================
// CONSOLIDATED MATCHING ENGINE
// ============================================

export class ConsolidatedMatchingEngine {
	private openai: OpenAI | null = null;
	private costTracker: Record<
		string,
		{ calls: number; tokens: number; cost?: number }
	> = {
		gpt4omini: { calls: 0, tokens: 0, cost: 0 },
		gpt4: { calls: 0, tokens: 0, cost: 0 },
		gpt35: { calls: 0, tokens: 0, cost: 0 },
	};
	private matchCache = SHARED_MATCH_CACHE;
	private circuitBreaker = new CircuitBreaker();
	private lastAIMetadata: {
		model: string;
		tokens: number;
		cost: number;
	} | null = null;

	constructor(openaiApiKey?: string) {
		if (openaiApiKey) {
			this.openai = new OpenAI({ apiKey: openaiApiKey });
		}
	}

	/**
	 * Generate cache key from user preferences and top job hashes
	 */
	private generateCacheKey(jobs: Job[], userPrefs: UserPreferences): string {
		const jobsArray = Array.isArray(jobs) ? jobs : [];

		const careerPath = Array.isArray(userPrefs.career_path)
			? userPrefs.career_path[0]
			: userPrefs.career_path || "general";

		const cities = Array.isArray(userPrefs.target_cities)
			? userPrefs.target_cities.sort().join("+")
			: userPrefs.target_cities || "europe";

		const level = userPrefs.entry_level_preference || "entry";

		const workEnv = userPrefs.work_environment
			? userPrefs.work_environment === "unclear"
				? "any"
				: userPrefs.work_environment
			: "any";

		const tier = userPrefs.subscription_tier || "free";

		const userSegment = `${careerPath}_${cities}_${level}_${workEnv}_${tier}`
			.toLowerCase()
			.replace(/[^a-z0-9_+]/g, "");

		const today = new Date().toISOString().split("T")[0];
		const jobCountRange = Math.floor(jobsArray.length / 1000) * 1000;
		const jobPoolVersion = `v${today}_${jobCountRange}+`;

		return `${userSegment}_${jobPoolVersion}`;
	}

	/**
	 * Main matching function - "Funnel of Truth" architecture
	 */
	async performMatching(
		jobs: Job[],
		userPrefs: UserPreferences,
		forceRulesBased: boolean = false,
	): Promise<ConsolidatedMatchResult> {
		const jobsArray = Array.isArray(jobs) ? jobs : [];
		const startTime = Date.now();

		if (!jobsArray || jobsArray.length === 0) {
			return {
				matches: [],
				method: "rule_based",
				processingTime: Date.now() - startTime,
				confidence: 0.0,
				aiModel: undefined,
				aiCostUsd: 0,
				aiTokensUsed: 0,
			};
		}

		// STAGE 2: Apply Hard Gates
		const { preFilterByHardGates } = await import("../preFilterHardGates");
		const eligibleJobs = preFilterByHardGates(jobsArray, userPrefs);

		// 🆕 NEW: Route to stratified vs global matching
		const targetCities = Array.isArray(userPrefs.target_cities)
			? userPrefs.target_cities
			: userPrefs.target_cities ? [userPrefs.target_cities] : [];

		if (targetCities.length > 1) {
			// Multiple cities: Use weighted stratified matching
			return this.performWeightedStratifiedMatching(jobsArray, eligibleJobs, userPrefs, targetCities, startTime, forceRulesBased);
		} else {
			// Single city: Use enhanced matching with pre-filtering
			return this.performEnhancedMatching(eligibleJobs, userPrefs, startTime);
		}
	}

	/**
	 * Enhanced single-city matching with pre-filtering and quality validation
	 */
	private async performEnhancedMatching(
		eligibleJobs: Job[],
		userPrefs: UserPreferences,
		startTime: number,
	): Promise<ConsolidatedMatchResult> {
		// STEP 1: Enhanced hard filtering BEFORE AI sees jobs
		const hardFilteredJobs = this.getHardFilteredJobs(eligibleJobs, userPrefs);

		if (hardFilteredJobs.length === 0) {
			console.warn(`[ENHANCED MATCHING] No jobs passed hard filters for ${userPrefs.email}`);
			return {
				matches: [],
				method: "ai_failed",
				processingTime: Date.now() - startTime,
				confidence: 0.0,
				aiModel: undefined,
				aiCostUsd: 0,
				aiTokensUsed: 0,
			};
		}

		console.log(`[ENHANCED MATCHING] ${hardFilteredJobs.length}/${eligibleJobs.length} jobs passed hard filters`);

		// STEP 2: Single enhanced AI pass on pre-filtered jobs
		const aiMatches = await this.performAIMatchingWithRetry(hardFilteredJobs, userPrefs);

		if (aiMatches.length === 0) {
			console.warn(`[ENHANCED MATCHING] AI returned no matches for ${userPrefs.email} - using semantic fallback`);
			return this.performSemanticFallback(hardFilteredJobs, userPrefs);
		}

		console.log(`[ENHANCED MATCHING] AI returned ${aiMatches.length} candidates`);

		// STEP 3: Post-AI validation and quality assurance
		const { validateAIOutput } = await import("./validation");
		const validatedMatches = validateAIOutput(aiMatches, hardFilteredJobs, userPrefs);

		console.log(`[ENHANCED MATCHING] ${validatedMatches.length} matches passed validation`);

		// Cache successful results
		if (validatedMatches.length > 0) {
			const cacheKey = this.generateCacheKey(hardFilteredJobs, userPrefs);
			this.matchCache.set(cacheKey, validatedMatches);
		}

		// Log quality metrics
		const avgScore = validatedMatches.length > 0
			? validatedMatches.reduce((sum, m) => sum + m.match_score, 0) / validatedMatches.length
			: 0;
		const avgConfidence = validatedMatches.length > 0
			? validatedMatches.reduce((sum, m) => sum + (m.confidence_score || 0), 0) / validatedMatches.length
			: 0;

		apiLogger.info("Enhanced match quality metrics", {
			email: userPrefs.email,
			matchCount: validatedMatches.length,
			avgScore: avgScore.toFixed(1),
			avgConfidence: avgConfidence.toFixed(2),
			hardFiltered: hardFilteredJobs.length,
			aiCandidates: aiMatches.length,
			validationPassed: validatedMatches.length,
		});

		return {
			matches: validatedMatches,
			method: "ai_success",
			processingTime: Date.now() - startTime,
			confidence: avgConfidence,
			aiModel: this.lastAIMetadata?.model || "gpt-4o-mini",
			aiCostUsd: this.lastAIMetadata?.cost,
			aiTokensUsed: this.lastAIMetadata?.tokens,
		};
	}

	/**
	 * Pre-filter jobs by HARD REQUIREMENTS before AI sees them
	 * This prevents AI hallucinations on location, visa, language
	 */
	private getHardFilteredJobs(jobs: Job[], userPrefs: UserPreferences): Job[] {
		const userCities = (Array.isArray(userPrefs.target_cities)
			? userPrefs.target_cities
			: userPrefs.target_cities ? [userPrefs.target_cities] : []
		).map(c => c.toLowerCase());

		const needsVisa = (userPrefs.visa_status?.toLowerCase() || "").includes("require") ||
		                 (userPrefs.visa_status?.toLowerCase() || "").includes("sponsor");

		const userLanguages = (userPrefs.languages_spoken || ["english"]).map(l => l.toLowerCase());

		return jobs.filter(job => {
			// 1. LOCATION CHECK (CRITICAL)
			const jobCity = (job.city || job.location || "").toLowerCase();
			const locationMatch = userCities.some(city =>
				jobCity.includes(city) || city.includes(jobCity)
			);

			if (!locationMatch) {
				console.log(`[HARD FILTER] Rejected: ${job.title} - Wrong location (${job.city})`);
				return false;
			}

			// 2. VISA CHECK (CRITICAL)
			if (needsVisa) {
				const visaFriendly = (job as any).visa_friendly === true ||
				                    (job.description || "").toLowerCase().includes("visa sponsor");

				if (!visaFriendly) {
					console.log(`[HARD FILTER] Rejected: ${job.title} - No visa sponsorship`);
					return false;
				}
			}

			// 3. LANGUAGE CHECK (IMPORTANT)
			const jobLanguages = (job.language_requirements || []).map(l => l.toLowerCase());
			const hasAllRequiredLanguages = jobLanguages.every(required =>
				userLanguages.some(spoken => spoken === required || required === "english")
			);

			if (!hasAllRequiredLanguages) {
				console.log(`[HARD FILTER] Rejected: ${job.title} - Language mismatch`);
				return false;
			}

			return true;
		});
	}

	/**
	 * Single-city matching using global ranking
	 */
	private async performGlobalMatching(
		jobsArray: Job[],
		eligibleJobs: Job[],
		userPrefs: UserPreferences,
		startTime: number,
		forceRulesBased: boolean = false
	): Promise<ConsolidatedMatchResult> {

		if (eligibleJobs.length === 0) {
			apiLogger.warn("No jobs passed hard gates", {
				email: userPrefs.email || "unknown",
				originalJobCount: jobsArray.length,
				reason: "All jobs filtered by visa/language/location requirements",
			});

			// Try guaranteed matching as fallback (even with 0 eligible jobs, we can relax)
			try {
				const { getGuaranteedMatches } = await import("../guaranteed");
				const { getDatabaseClient } = await import("@/Utils/databasePool");
				const supabase = getDatabaseClient();

				const guaranteedResult = await getGuaranteedMatches(
					jobsArray, // Use all jobs, not just eligible (guaranteed will apply its own filtering)
					userPrefs,
					supabase,
				);

				if (guaranteedResult.matches.length > 0) {
					apiLogger.info("Guaranteed matching provided fallback matches", {
						email: userPrefs.email,
						matchesFound: guaranteedResult.matches.length,
						relaxationLevel: guaranteedResult.metadata.relaxationLevel,
					});

					// Convert to JobMatch format
					const guaranteedMatches: JobMatch[] = guaranteedResult.matches.map(
						(m) => ({
							job_index: 0, // Not used
							job_hash: m.job.job_hash,
							match_score: m.match_score,
							match_reason: m.match_reason,
							confidence_score: m.confidence_score,
						}),
					);

					return {
						matches: guaranteedMatches,
						method: "guaranteed_fallback",
						processingTime: Date.now() - startTime,
						confidence: 0.6, // Lower confidence due to relaxation
						aiModel: undefined,
						aiCostUsd: 0,
						aiTokensUsed: 0,
					};
				}
			} catch (error) {
				apiLogger.warn("Guaranteed matching fallback failed", {
					error: (error as Error).message,
					email: userPrefs.email,
				});
			}

			return {
				matches: [],
				method: "rule_based",
				processingTime: Date.now() - startTime,
				confidence: 0.0,
				aiModel: undefined,
				aiCostUsd: 0,
				aiTokensUsed: 0,
			};
		}

		// Check cache
		const cacheKey = this.generateCacheKey(eligibleJobs, userPrefs);
		const shouldBypass = await this.shouldBypassCache(
			cacheKey,
			userPrefs,
			eligibleJobs,
		);
		const cached = shouldBypass ? null : await this.matchCache.get(cacheKey);

		if (cached) {
			return {
				matches: cached,
				method: "ai_success",
				processingTime: Date.now() - startTime,
				confidence: 0.9,
				aiModel: "gpt-4o-mini",
				aiCostUsd: 0,
				aiTokensUsed: 0,
			};
		}

		// Check why AI might be unavailable and log diagnostics
		const aiUnavailable = forceRulesBased || !this.openai || !this.circuitBreaker.canExecute();
		const aiUnavailableReasons: string[] = [];
		if (forceRulesBased) aiUnavailableReasons.push("forceRulesBased=true");
		if (!this.openai) aiUnavailableReasons.push("OpenAI client not initialized (missing/invalid API key)");
		if (!this.circuitBreaker.canExecute()) {
			const breakerStatus = this.circuitBreaker.getStatus();
			aiUnavailableReasons.push(`Circuit breaker open (failures: ${breakerStatus.failures}, threshold: ${CIRCUIT_BREAKER_THRESHOLD})`);
		}

		if (aiUnavailable) {
			// Log with both console and structured logger for visibility
			const reasonStr = aiUnavailableReasons.join(", ");
			console.warn(`[MATCHING] AI unavailable for ${userPrefs.email} - Reasons: ${reasonStr}`);
			apiLogger.warn(`[MATCHING] AI unavailable for ${userPrefs.email}`, {
				reasons: aiUnavailableReasons,
				willUseFallback: true,
			});
		}

		// STAGE 3: Rank by semantic similarity using embeddings (doesn't require AI)
		const { SemanticRetrievalService } = await import("../semanticRetrieval");
		const semanticService = new SemanticRetrievalService();
		const semanticJobs = await semanticService.getSemanticCandidates(
			userPrefs,
			200, // Get broader set, then filter to eligible jobs
		);

		// Filter to only jobs that passed hard gates, then rank by semantic score
		const eligibleJobHashes = new Set(eligibleJobs.map(job => job.job_hash));
		const filteredSemanticJobs = semanticJobs.filter(job =>
			eligibleJobHashes.has(job.job_hash)
		);

		// Convert to scored format for compatibility
		const scoredJobs = filteredSemanticJobs.slice(0, 50).map((job) => ({
			job,
			score: job.semantic_score || 85, // Use semantic score or default
		}));

		// STAGE 4: Try AI matching if available, otherwise use semantic fallback
		if (!aiUnavailable) {
			// AI is available - proceed with AI matching
			const isPremiumTier = userPrefs.subscription_tier === "premium";
			const jobsToAnalyze = isPremiumTier
				? JOBS_TO_ANALYZE_PREMIUM
				: JOBS_TO_ANALYZE_FREE;
			const topJobs = scoredJobs.slice(0, jobsToAnalyze).map((item) => item.job);

			// Try AI matching with timeout and retry
			try {
				const aiMatches = await this.performAIMatchingWithRetry(
					topJobs,
					userPrefs,
				);
				if (aiMatches && aiMatches.length > 0) {
					const validatedMatches = validation.validateAIMatches(
						aiMatches,
						topJobs,
						userPrefs,
					);

					if (validatedMatches.length === 0) {
						console.warn(
							"All AI matches failed validation - falling back to semantic",
						);
						apiLogger.warn("AI matches failed validation", {
							reason: "all_matches_filtered_out",
							originalMatchCount: aiMatches.length,
							validatedMatchCount: 0,
							willUseSemanticFallback: true,
						});
						// Fall through to semantic fallback below
					} else {
						// AI succeeded - return results
						// Cache successful AI matches
						await this.matchCache.set(cacheKey, validatedMatches);
						this.circuitBreaker.recordSuccess();

						// Evidence verification: Auto-downgrade scores when word count is too low
						validatedMatches.forEach((match) => {
							const reason = match.match_reason || "";
							const wordCount = reason
								.trim()
								.split(/\s+/)
								.filter((w) => w.length > 0).length;

							if (match.match_score >= 90 && wordCount < 20) {
								const originalScore = match.match_score;
								match.match_score = Math.max(65, match.match_score - 10);
								apiLogger.warn("Match score downgraded due to weak evidence", {
									originalScore,
									newScore: match.match_score,
									wordCount,
									jobHash: match.job_hash,
									email: userPrefs.email || "unknown",
								});
							}

							if (match.match_score > 85 && wordCount < 30) {
								const originalScore = match.match_score;
								match.match_score = Math.max(70, match.match_score - 5);
								apiLogger.warn(
									"Match score downgraded - insufficient evidence density",
									{
										originalScore,
										newScore: match.match_score,
										wordCount,
										required: 30,
										jobHash: match.job_hash,
										email: userPrefs.email || "unknown",
									},
								);
							}
						});

						// Log match quality metrics
						const matchQuality = scoring.calculateMatchQualityMetrics(
							validatedMatches,
							topJobs,
							userPrefs,
						);

						const reasonLengths = validatedMatches.map((m) => {
							const reason = m.match_reason || "";
							return reason
								.trim()
								.split(/\s+/)
								.filter((w) => w.length > 0).length;
						});
						const avgReasonLength =
							reasonLengths.length > 0
								? Math.round(
										reasonLengths.reduce((sum, len) => sum + len, 0) /
											reasonLengths.length,
									)
								: 0;
						const minReasonLength =
							reasonLengths.length > 0 ? Math.min(...reasonLengths) : 0;
						const shortReasons = reasonLengths.filter((len) => len < 20).length;
						const insufficientEvidence = reasonLengths.filter(
							(len) => len < 30,
						).length;

						apiLogger.info("Match quality metrics", {
							email: userPrefs.email || "unknown",
							averageScore: matchQuality.averageScore,
							scoreDistribution: matchQuality.scoreDistribution,
							cityCoverage: matchQuality.cityCoverage,
							sourceDiversity: matchQuality.sourceDiversity,
							method: "ai_success",
							matchCount: validatedMatches.length,
							eligibleJobsAfterHardGates: eligibleJobs.length,
							topJobsPreRanked: topJobs.length,
							matchReasonLengths: {
								average: avgReasonLength,
								minimum: minReasonLength,
								all: reasonLengths,
								shortReasonsCount: shortReasons,
								insufficientEvidenceCount: insufficientEvidence,
								hasWeakEvidence: shortReasons > 0,
								hasInsufficientEvidence: insufficientEvidence > 0,
							},
						});

						if (shortReasons > 0) {
							apiLogger.warn("AI match reasons may lack evidence", {
								email: userPrefs.email || "unknown",
								shortReasonsCount: shortReasons,
								totalMatches: validatedMatches.length,
								minReasonLength,
								avgReasonLength,
								note: "Short match reasons (<20 words) may indicate AI struggled to find strong evidence linking user skills to job requirements",
							});
						}

						const aiMetadata = this.lastAIMetadata;
						this.lastAIMetadata = null;

						return {
							matches: validatedMatches,
							method: "ai_success",
							processingTime: Date.now() - startTime,
							confidence: 0.9,
							aiModel: aiMetadata?.model || "gpt-4o-mini",
							aiCostUsd: aiMetadata?.cost,
							aiTokensUsed: aiMetadata?.tokens,
						};
					}
				}
			} catch (error) {
				this.circuitBreaker.recordFailure();
				console.warn(
					"AI matching failed, falling back to semantic:",
					error instanceof Error ? error.message : "Unknown error",
				);
				apiLogger.warn("AI matching failed", {
					error: error instanceof Error ? error.message : String(error),
					email: userPrefs.email,
					willUseSemanticFallback: true,
				});
				// Fall through to semantic fallback below
			}
		}

		// AI unavailable or failed - use semantic matching as fallback
		const topSemanticJobs = scoredJobs.slice(0, 20).map((item) => item.job);
			
			if (topSemanticJobs.length > 0) {
				// Convert semantic results to JobMatch format
				const semanticMatches: JobMatch[] = topSemanticJobs.slice(0, 10).map((job, index) => ({
					job_index: index + 1,
					job_hash: job.job_hash,
					match_score: Math.max(60, 85 - (index * 3)), // Decreasing scores: 85, 82, 79, etc.
					match_reason: `Semantic similarity match - job aligns with your profile based on embedding analysis. ${aiUnavailable ? 'AI analysis unavailable.' : 'AI analysis failed.'}`,
					confidence_score: 0.5, // Lower confidence for semantic-only matches
				}));

				apiLogger.info("Using semantic fallback matches", {
					email: userPrefs.email || "unknown",
					matchesFound: semanticMatches.length,
					aiUnavailable,
					aiUnavailableReasons: aiUnavailable ? aiUnavailableReasons : undefined,
				});

				// Try guaranteed matching for better results if we don't have enough
				const tier = userPrefs.subscription_tier || "free";
				const minMatches = tier === "premium" ? 10 : 5;

				if (semanticMatches.length < minMatches) {
					try {
						const { getGuaranteedMatches } = await import("../guaranteed");
						const { getDatabaseClient } = await import("@/Utils/databasePool");
						const supabase = getDatabaseClient();

						const guaranteedResult = await getGuaranteedMatches(
							jobsArray,
							userPrefs,
							supabase,
						);

						if (guaranteedResult.matches.length >= semanticMatches.length) {
							apiLogger.info("Guaranteed matching provided better results than semantic", {
								email: userPrefs.email,
								guaranteedMatches: guaranteedResult.matches.length,
								semanticMatches: semanticMatches.length,
								relaxationLevel: guaranteedResult.metadata.relaxationLevel,
							});

							const guaranteedMatches: JobMatch[] = guaranteedResult.matches.map(
								(m) => ({
									job_index: 0,
									job_hash: m.job.job_hash,
									match_score: m.match_score,
									match_reason: m.match_reason,
									confidence_score: m.confidence_score,
								}),
							);

							this.lastAIMetadata = null;
							return {
								matches: guaranteedMatches,
								method: "guaranteed_fallback",
								processingTime: Date.now() - startTime,
								confidence: 0.6,
								aiModel: undefined,
								aiCostUsd: 0,
								aiTokensUsed: 0,
							};
						}
					} catch (error) {
						apiLogger.warn("Guaranteed matching fallback failed", {
							error: (error as Error).message,
							email: userPrefs.email,
						});
					}
				}

				// Return semantic matches
				this.lastAIMetadata = null;
				return {
					matches: semanticMatches,
					method: aiUnavailable ? "semantic_fallback" : "ai_failed_semantic_fallback",
					processingTime: Date.now() - startTime,
					confidence: 0.5,
					aiModel: undefined,
					aiCostUsd: 0,
					aiTokensUsed: 0,
				};
			}

			// Last resort: try guaranteed matching even if semantic failed
			try {
				const { getGuaranteedMatches } = await import("../guaranteed");
				const { getDatabaseClient } = await import("@/Utils/databasePool");
				const supabase = getDatabaseClient();

				const guaranteedResult = await getGuaranteedMatches(
					jobsArray,
					userPrefs,
					supabase,
				);

				if (guaranteedResult.matches.length > 0) {
					const guaranteedMatches: JobMatch[] = guaranteedResult.matches.map(
						(m) => ({
							job_index: 0,
							job_hash: m.job.job_hash,
							match_score: m.match_score,
							match_reason: m.match_reason,
							confidence_score: m.confidence_score,
						}),
					);

					apiLogger.info("Using guaranteed matching as last resort", {
						email: userPrefs.email,
						matchesFound: guaranteedMatches.length,
						relaxationLevel: guaranteedResult.metadata.relaxationLevel,
					});

					this.lastAIMetadata = null;
					return {
						matches: guaranteedMatches,
						method: "guaranteed_fallback",
						processingTime: Date.now() - startTime,
						confidence: 0.6,
						aiModel: undefined,
						aiCostUsd: 0,
						aiTokensUsed: 0,
					};
				}
			} catch (error) {
				apiLogger.warn("All fallbacks failed", {
					error: (error as Error).message,
					email: userPrefs.email,
				});
			}

			// Only return empty matches if ALL fallbacks failed
			this.lastAIMetadata = null;
			apiLogger.warn("No matches found - all fallbacks exhausted", {
				email: userPrefs.email,
				eligibleJobsCount: eligibleJobs.length,
				aiUnavailable,
				aiUnavailableReasons: aiUnavailable ? aiUnavailableReasons : undefined,
			});

			return {
				matches: [],
				method: "ai_failed",
				processingTime: Date.now() - startTime,
				confidence: 0,
				aiModel: undefined,
				aiCostUsd: 0,
				aiTokensUsed: 0,
			};
	}

	/**
	 * Weighted stratified matching for multiple cities
	 * Ensures each selected city gets representation in results
	 */
	private async performWeightedStratifiedMatching(
		jobsArray: Job[],
		eligibleJobs: Job[],
		userPrefs: UserPreferences,
		targetCities: string[],
		startTime: number,
		forceRulesBased: boolean = false
	): Promise<ConsolidatedMatchResult> {
		const allMatches: JobMatch[] = [];
		let totalTokens = 0;
		let totalCost = 0;
		let aiModelUsed: string | undefined;

		// 1. Run global matching for EACH city separately
		const cityResults = await Promise.all(
			targetCities.map(async (city) => {
				// Filter eligible jobs to this city only
				const cityEligibleJobs = eligibleJobs.filter(job => {
					const jobCity = (job.city || "").toLowerCase();
					const jobLocation = ((job as any).location || "").toLowerCase();
					return matchesCity(jobCity, jobLocation, city);
				});

				if (cityEligibleJobs.length === 0) {
					return { city, matches: [], tokens: 0, cost: 0, model: undefined };
				}

				// Run your existing 4-step flow for this city only
				const result = await this.performGlobalMatching(
					jobsArray,
					cityEligibleJobs,
					{ ...userPrefs, target_cities: [city] }, // Override with single city
					startTime,
					forceRulesBased
				);

				return {
					city,
					matches: result.matches,
					tokens: result.aiTokensUsed || 0,
					cost: result.aiCostUsd || 0,
					model: result.aiModel
				};
			})
		);

		// 2. Collect all matches and calculate distribution
		const cityBuckets = cityResults.map(result => ({
			city: result.city,
			matches: result.matches,
			count: result.matches.length
		}));

		const totalMatches = cityBuckets.reduce((sum, bucket) => sum + bucket.count, 0);

		// 3. Calculate weighted slots (ensure minimum 1 per city)
		const distribution = cityBuckets.map(bucket => {
			const weight = bucket.count / Math.max(totalMatches, 1);
			const slots = Math.max(1, Math.floor(weight * 5)); // Min 1, max based on weight
			return {
				city: bucket.city,
				slots,
				matches: bucket.matches
			};
		});

		// 4. Adjust if over-allocated
		let totalSlots = distribution.reduce((sum, d) => sum + d.slots, 0);
		while (totalSlots > 5) {
			const largest = distribution
				.filter(d => d.slots > 1)
				.sort((a, b) => b.slots - a.slots)[0];
			if (largest) {
				largest.slots--;
				totalSlots--;
			} else break;
		}

		// 5. Fill slots from each city
		for (const bucket of distribution) {
			const cityMatches = bucket.matches
				.sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
				.slice(0, bucket.slots);
			allMatches.push(...cityMatches);
		}

		// 6. Aggregate costs and metadata
		for (const result of cityResults) {
			totalTokens += result.tokens;
			totalCost += result.cost;
			if (!aiModelUsed && result.model) {
				aiModelUsed = result.model;
			}
		}

		return {
			matches: allMatches.slice(0, 5).sort((a, b) => (b.match_score || 0) - (a.match_score || 0)),
			method: forceRulesBased ? "rule_based" : "ai_success",
			processingTime: Date.now() - startTime,
			confidence: forceRulesBased ? 0.8 : 0.9,
			aiModel: aiModelUsed,
			aiCostUsd: totalCost,
			aiTokensUsed: totalTokens,
		};
	}

	/**
	 * AI matching with retry logic and circuit breaker
	 */
	private async performAIMatchingWithRetry(
		jobs: Job[],
		userPrefs: UserPreferences,
	): Promise<JobMatch[]> {
		const jobsArray = Array.isArray(jobs) ? jobs : [];
		const maxRetries = AI_MAX_RETRIES;
		let lastError: Error | null = null;
		const startTime = Date.now();

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				const matches = await this.performAIMatchingWithTimeout(jobsArray, userPrefs);
				const latency = Date.now() - startTime;

				// Record successful AI call
				const qualityScore = aiMonitor.calculateQualityScore(matches);
				aiMonitor.recordRequest("gpt-4o-mini", latency, this.lastAIMetadata?.tokens || 0, this.lastAIMetadata?.cost || 0, true, false, qualityScore);

				return matches;
			} catch (error: any) {
				lastError = error instanceof Error ? error : new Error(String(error));
				const latency = Date.now() - startTime;
				const isRateLimit = error?.status === 429;

				// Record failed AI call
				aiMonitor.recordRequest("gpt-4o-mini", latency, 0, 0, false, isRateLimit);

				if (attempt < maxRetries) {
					const delay = Math.min(1000 * 2 ** (attempt - 1), 5000);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}

		throw lastError || new Error("AI matching failed after all retries");
	}

	/**
	 * AI matching with proper timeout and stable prompt
	 */
	private async performAIMatchingWithTimeout(
		jobs: Job[],
		userPrefs: UserPreferences,
	): Promise<JobMatch[]> {
		const jobsArray = Array.isArray(jobs) ? jobs : [];

		if (!this.openai) {
			throw new Error("OpenAI client not initialized");
		}

		const timeoutPromise = new Promise<never>((_, reject) => {
			if (process.env.NODE_ENV === "test") {
				return;
			}
			setTimeout(() => reject(new Error("AI_TIMEOUT")), AI_TIMEOUT_MS);
		});

		const aiPromise = (async () => {
			const result = await prompts.callOpenAIAPI(
				this.openai!,
				jobsArray,
				userPrefs,
				"gpt-4o-mini",
				validation.parseFunctionCallResponse,
			);

			// Track costs
			const trackerKey = "gpt4omini";
			this.costTracker[trackerKey] = this.costTracker[trackerKey] || {
				calls: 0,
				tokens: 0,
			};
			this.costTracker[trackerKey].calls++;
			this.costTracker[trackerKey].tokens += result.tokens;

			// Store metadata for database logging
			this.lastAIMetadata = {
				model: "gpt-4o-mini",
				tokens: result.tokens,
				cost: result.cost,
			};

			return result.matches;
		})();

		try {
			return process.env.NODE_ENV === "test"
				? await aiPromise
				: await Promise.race([aiPromise, timeoutPromise]);
		} catch (error) {
			if (error instanceof Error && error.message === "AI_TIMEOUT") {
				console.warn(`AI matching timed out after ${AI_TIMEOUT_MS}ms`);
				return [];
			}
			throw error;
		}
	}

	/**
	 * Check if cache should be bypassed due to stale data
	 */
	private async shouldBypassCache(
		cacheKey: string,
		userPrefs: UserPreferences,
		jobs: Job[],
	): Promise<boolean> {
		const cached = await this.matchCache.get(cacheKey);
		if (!cached) return false;

		const cities = Array.isArray(userPrefs.target_cities)
			? userPrefs.target_cities
			: userPrefs.target_cities
				? [userPrefs.target_cities]
				: [];

		const careerPaths = Array.isArray(userPrefs.career_path)
			? userPrefs.career_path
			: userPrefs.career_path
				? [userPrefs.career_path]
				: [];

		let matchingJobCount = 0;
		for (const job of jobs) {
			const jobCity = (job.city || "").toLowerCase();
			const matchesCity =
				cities.length === 0 ||
				cities.some((city) => jobCity.includes(city.toLowerCase()));

			const jobCategories = (job.categories || []).map((c) =>
				String(c).toLowerCase(),
			);
			const matchesCareer =
				careerPaths.length === 0 ||
				careerPaths.some((path) => {
					const pathLower = String(path).toLowerCase();
					return jobCategories.some(
						(cat) => cat.includes(pathLower) || pathLower.includes(cat),
					);
				});

			if (matchesCity && matchesCareer) {
				matchingJobCount++;
			}
		}

		const STALE_THRESHOLD = 20;
		return matchingJobCount > STALE_THRESHOLD;
	}

	/**
	 * REMOVED: Rule-based matching replaced with holistic AI assessment
	 * All scoring now happens in AI prompts for intelligent judgment
	 */

	/**
	 * Semantic fallback when AI completely fails
	 * Uses embeddings for basic similarity matching (not rule-based scoring)
	 */
	private async performSemanticFallback(
		jobs: Job[],
		userPrefs: UserPreferences,
	): Promise<ConsolidatedMatchResult> {
		try {
			const { SemanticRetrievalService } = await import("../semanticRetrieval");
			const semanticService = new SemanticRetrievalService();

			// Get semantic candidates (basic embedding similarity)
			const candidates = await semanticService.getSemanticCandidates(userPrefs, 20);

			// Filter to jobs we actually have
			const jobHashes = new Set(jobs.map(j => j.job_hash));
			const availableCandidates = candidates.filter(c => jobHashes.has(c.job_hash));

			// Convert to JobMatch format with low confidence
			const matches: JobMatch[] = availableCandidates.slice(0, 5).map((candidate, index) => ({
				job_index: index + 1,
				job_hash: candidate.job_hash,
				match_score: Math.max(50, 80 - (index * 5)), // Decreasing scores: 80, 75, 70, 65, 60
				match_reason: `Semantic similarity match - embeddings suggest potential relevance to your profile. AI analysis unavailable.`,
				confidence_score: 0.4, // Low confidence - this is fallback only
			}));

			console.warn(`[SEMANTIC FALLBACK] AI failed, using ${matches.length} semantic matches for ${userPrefs.email}`);
			return {
				matches,
				method: "ai_failed",
				processingTime: 0, // Not tracking time for fallback
				confidence: 0.3, // Low confidence for fallback
			};

		} catch (error) {
			console.error("[SEMANTIC FALLBACK] Even semantic fallback failed:", error);
			return {
				matches: [],
				method: "ai_failed",
				processingTime: 0,
				confidence: 0,
			};
		}
	}

	/**
	 * Test AI connection
	 */
	async testConnection(): Promise<boolean> {
		if (!this.openai) return false;

		try {
			const response = await this.openai.chat.completions.create({
				model: "gpt-4o-mini",
				messages: [{ role: "user", content: "test" }],
				max_tokens: 1,
				temperature: 0,
			});

			return !!response.choices[0]?.message?.content;
		} catch (error) {
			console.error("AI connection test failed:", error);
			return false;
		}
	}

	/**
	 * Get cost metrics
	 */
	getCostMetrics() {
		return {
			totalCalls: Object.values(this.costTracker).reduce(
				(sum, model) => sum + model.calls,
				0,
			),
			totalTokens: Object.values(this.costTracker).reduce(
				(sum, model) => sum + model.tokens,
				0,
			),
			totalCost: Object.values(this.costTracker).reduce(
				(sum, model) => sum + (model.cost || 0),
				0,
			),
			byModel: this.costTracker,
		};
	}
}

// Export factory function for easy integration
export function createConsolidatedMatcher(
	openaiApiKey?: string,
): ConsolidatedMatchingEngine {
	return new ConsolidatedMatchingEngine(openaiApiKey);
}

// Cache-busting export
export const BUILD_TIMESTAMP = "2025-12-08T12:00:00Z";
export const BUILD_VERSION = "2.1.0";
