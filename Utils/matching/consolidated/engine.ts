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
  JOBS_TO_ANALYZE_FREE,
  JOBS_TO_ANALYZE_PREMIUM,
  MAX_CACHE_SIZE,
} from "./config";
import * as prompts from "./prompts";
import * as scoring from "./scoring";
import type { ConsolidatedMatchResult } from "./types";
import * as validation from "./validation";

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

    // Skip AI if disabled or circuit breaker open
    if (forceRulesBased || !this.openai || !this.circuitBreaker.canExecute()) {
      const scoredJobs = await this.preRankJobsByScore(eligibleJobs, userPrefs);
      const topJobs = scoredJobs.slice(0, 8).map((item) => item.job);
      const ruleMatches = await this.performRuleBasedMatching(
        topJobs,
        userPrefs,
      );
      return {
        matches: ruleMatches,
        method: "rule_based",
        processingTime: Date.now() - startTime,
        confidence: 0.8,
        aiModel: undefined,
        aiCostUsd: 0,
        aiTokensUsed: 0,
      };
    }

    // STAGE 3: Stratified Matching (if multiple cities)
    // Use bucketized per-city matching to prevent "Global Top-N" bias
    const targetCities = Array.isArray(userPrefs.target_cities)
      ? userPrefs.target_cities
      : userPrefs.target_cities
        ? [userPrefs.target_cities]
        : [];

    const shouldUseStratifiedMatching =
      targetCities.length > 1 && !forceRulesBased && this.openai?.apiKey;

    if (shouldUseStratifiedMatching) {
      const stratifiedResult = await this.performStratifiedMatching(
        eligibleJobs,
        userPrefs,
        targetCities,
        cacheKey,
        startTime,
      );
      if (stratifiedResult) {
        return stratifiedResult;
      }
      // Fall through to global matching if stratified fails
    }

    // STAGE 3: Pre-rank by rule-based scoring (global matching fallback)
    const scoredJobs = await this.preRankJobsByScore(eligibleJobs, userPrefs);

    // STAGE 4: Send tier-aware number of highest-scoring jobs to AI
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
            "All AI matches failed validation, falling back to rules",
          );
          apiLogger.warn("AI matches failed validation", {
            reason: "all_matches_filtered_out",
            originalMatchCount: aiMatches.length,
            validatedMatchCount: 0,
          });

          const topScoredJobs = scoredJobs.slice(0, 8).map((item) => item.job);
          const ruleMatches = await this.performRuleBasedMatching(
            topScoredJobs,
            userPrefs,
          );
          this.lastAIMetadata = null;
          return {
            matches: ruleMatches,
            method: "ai_failed",
            processingTime: Date.now() - startTime,
            confidence: 0.7,
            aiModel: undefined,
            aiCostUsd: 0,
            aiTokensUsed: 0,
          };
        }

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
    } catch (error) {
      this.circuitBreaker.recordFailure();
      console.warn(
        "AI matching failed, falling back to rules:",
        error instanceof Error ? error.message : "Unknown error",
      );
    }

    // Fallback to rule-based matching
    const topScoredJobs = scoredJobs.slice(0, 8).map((item) => item.job);
    const ruleMatches = await this.performRuleBasedMatching(
      topScoredJobs,
      userPrefs,
    );

    // Check if we have enough matches, if not use guaranteed matching
    const tier = userPrefs.subscription_tier || "free";
    const minMatches = tier === "premium" ? 10 : 5;

    if (ruleMatches.length < minMatches) {
      apiLogger.info("Insufficient matches, trying guaranteed matching", {
        email: userPrefs.email || "unknown",
        currentMatches: ruleMatches.length,
        minRequired: minMatches,
      });

      try {
        const { getGuaranteedMatches } = await import("../guaranteed");
        const { getDatabaseClient } = await import("@/Utils/databasePool");
        const supabase = getDatabaseClient();

        const guaranteedResult = await getGuaranteedMatches(
          jobsArray, // Use all jobs
          userPrefs,
          supabase,
        );

        if (guaranteedResult.matches.length >= ruleMatches.length) {
          apiLogger.info("Guaranteed matching provided better results", {
            email: userPrefs.email,
            guaranteedMatches: guaranteedResult.matches.length,
            ruleMatches: ruleMatches.length,
            relaxationLevel: guaranteedResult.metadata.relaxationLevel,
          });

          // Convert to JobMatch format
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

    this.lastAIMetadata = null;

    return {
      matches: ruleMatches,
      method: "ai_failed",
      processingTime: Date.now() - startTime,
      confidence: 0.7,
      aiModel: undefined,
      aiCostUsd: 0,
      aiTokensUsed: 0,
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

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.performAIMatchingWithTimeout(jobsArray, userPrefs);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

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
   * Stratified Matching: Bucket jobs by city, match per-city, then merge
   * Prevents "Global Top-N" bias where high-volume cities dominate
   */
  private async performStratifiedMatching(
    eligibleJobs: Job[],
    userPrefs: UserPreferences,
    targetCities: string[],
    cacheKey: string,
    startTime: number,
  ): Promise<ConsolidatedMatchResult | null> {
    const MIN_JOBS_PER_CITY = 25; // Minimum jobs to analyze per city for quality
    const isPremiumTier = userPrefs.subscription_tier === "premium";
    const totalJobsToAnalyze = isPremiumTier
      ? JOBS_TO_ANALYZE_PREMIUM
      : JOBS_TO_ANALYZE_FREE;
    const jobsPerCity = Math.max(
      Math.ceil(totalJobsToAnalyze / targetCities.length),
      MIN_JOBS_PER_CITY,
    );

    // STEP 1: Bucket jobs by city
    const jobsByCity: Record<string, Job[]> = {};
    const cityJobCounts: Record<string, number> = {};

    for (const city of targetCities) {
      jobsByCity[city] = [];
      cityJobCounts[city] = 0;
    }

    // Also track jobs that don't match any city (fallback)
    const unmatchedJobs: Job[] = [];

    for (const job of eligibleJobs) {
      const jobCity = (job.city || "").toLowerCase();
      const jobLocation = ((job as any).location || "").toLowerCase();
      let matched = false;

      for (const targetCity of targetCities) {
        if (matchesCity(jobCity, jobLocation, targetCity)) {
          jobsByCity[targetCity].push(job);
          cityJobCounts[targetCity]++;
          matched = true;
          break; // Job can only match one city
        }
      }

      if (!matched) {
        unmatchedJobs.push(job);
      }
    }

    // Log city distribution for diagnostics
    apiLogger.info("Stratified matching - city buckets", {
      email: userPrefs.email || "unknown",
      targetCities,
      cityJobCounts,
      totalEligibleJobs: eligibleJobs.length,
      unmatchedJobs: unmatchedJobs.length,
      jobsPerCity,
    });

    // STEP 2: Match each city bucket in parallel (3-Bucket Sprint)
    // Helper function to match a single city and capture metadata
    const performCityMatch = async (
      city: string,
    ): Promise<{
      city: string;
      matches: JobMatch[];
      tokens: number;
      cost: number;
      model?: string;
      jobsAnalyzed: number;
    }> => {
      const cityJobs = jobsByCity[city];

      if (cityJobs.length === 0) {
        return { city, matches: [], tokens: 0, cost: 0, jobsAnalyzed: 0 };
      }

      try {
        // Pre-rank this city's jobs
        const scoredCityJobs = await this.preRankJobsByScore(
          cityJobs,
          userPrefs,
        );

        // Take top N from this city
        const topCityJobs = scoredCityJobs
          .slice(0, jobsPerCity)
          .map((item) => item.job);

        if (topCityJobs.length === 0) {
          return { city, matches: [], tokens: 0, cost: 0, jobsAnalyzed: 0 };
        }

        // Run AI matching on this city's jobs
        const cityAIMatches = await this.performAIMatchingWithRetry(
          topCityJobs,
          userPrefs,
        );

        // Capture metadata immediately after AI call (before it gets overwritten)
        // Note: With parallel execution, this.lastAIMetadata might be overwritten
        // by other concurrent calls, so we capture it as soon as possible
        const cityMetadata = this.lastAIMetadata
          ? { ...this.lastAIMetadata }
          : undefined;

        if (cityAIMatches && cityAIMatches.length > 0) {
          // Validate matches for this city
          const validatedCityMatches = validation.validateAIMatches(
            cityAIMatches,
            topCityJobs,
            userPrefs,
          );

          return {
            city,
            matches: validatedCityMatches,
            tokens: cityMetadata?.tokens || 0,
            cost: cityMetadata?.cost || 0,
            model: cityMetadata?.model,
            jobsAnalyzed: topCityJobs.length,
          };
        }

        return {
          city,
          matches: [],
          tokens: cityMetadata?.tokens || 0,
          cost: cityMetadata?.cost || 0,
          model: cityMetadata?.model,
          jobsAnalyzed: topCityJobs.length,
        };
      } catch (error) {
        apiLogger.warn("Stratified matching failed for city", {
          city,
          error: (error as Error).message,
          email: userPrefs.email || "unknown",
        });
        return { city, matches: [], tokens: 0, cost: 0, jobsAnalyzed: 0 };
      }
    };

    // Parallel execution: All cities match simultaneously (3-Bucket Sprint)
    const bucketResults = await Promise.all(
      targetCities.map((city) => performCityMatch(city)),
    );

    // STEP 3: Aggregate results and detect missing cities
    const allCityMatches: JobMatch[] = [];
    let totalTokens = 0;
    let totalCost = 0;
    let aiModel: string | undefined;

    const citiesWithMatches: string[] = [];
    const citiesWithoutMatches: string[] = [];

    for (const result of bucketResults) {
      if (result.matches.length > 0) {
        allCityMatches.push(...result.matches);
        citiesWithMatches.push(result.city);
      } else {
        citiesWithoutMatches.push(result.city);
      }
      totalTokens += result.tokens;
      totalCost += result.cost;
      if (!aiModel && result.model) {
        aiModel = result.model;
      }
    }

    // STEP 4: Safety Valve - Retry failed cities with relaxed matching
    if (citiesWithoutMatches.length > 0 && citiesWithMatches.length > 0) {
      apiLogger.info(
        "Stratified matching - retrying failed cities with relaxed matching",
        {
          email: userPrefs.email || "unknown",
          failedCities: citiesWithoutMatches,
          successfulCities: citiesWithMatches,
        },
      );

      // Helper function for relaxed retry
      const performRelaxedCityMatch = async (
        city: string,
      ): Promise<{
        city: string;
        matches: JobMatch[];
        tokens: number;
        cost: number;
      }> => {
        const cityJobs = jobsByCity[city];
        if (cityJobs.length === 0) {
          return { city, matches: [], tokens: 0, cost: 0 };
        }

        try {
          const scoredCityJobs = await this.preRankJobsByScore(
            cityJobs,
            userPrefs,
          );
          // Analyze more jobs (1.5x) for relaxed retry
          const topCityJobs = scoredCityJobs
            .slice(0, Math.ceil(jobsPerCity * 1.5))
            .map((item) => item.job);

          if (topCityJobs.length === 0) {
            return { city, matches: [], tokens: 0, cost: 0 };
          }

          const cityAIMatches = await this.performAIMatchingWithRetry(
            topCityJobs,
            userPrefs,
          );

          const cityMetadata = this.lastAIMetadata
            ? { ...this.lastAIMetadata }
            : undefined;

          if (cityAIMatches && cityAIMatches.length > 0) {
            // Relaxed validation: Accept lower scores (60 instead of default 65)
            const relaxedMatches = cityAIMatches.filter(
              (m) => (m.match_score || 0) >= 60,
            );

            // Still validate, but with lower threshold
            const validated = validation.validateAIMatches(
              relaxedMatches,
              topCityJobs,
              userPrefs,
            );

            return {
              city,
              matches: validated,
              tokens: cityMetadata?.tokens || 0,
              cost: cityMetadata?.cost || 0,
            };
          }
        } catch (_error) {
          // Silently fail retry
        }

        return { city, matches: [], tokens: 0, cost: 0 };
      };

      // Retry failed cities in parallel
      const relaxedRetries = await Promise.all(
        citiesWithoutMatches.map((city) => performRelaxedCityMatch(city)),
      );

      // Add relaxed matches and update tracking
      const remainingFailedCities: string[] = [];
      for (const retryResult of relaxedRetries) {
        if (retryResult.matches.length > 0) {
          allCityMatches.push(...retryResult.matches);
          citiesWithMatches.push(retryResult.city);
          totalTokens += retryResult.tokens;
          totalCost += retryResult.cost;
        } else {
          remainingFailedCities.push(retryResult.city);
        }
      }

      // Update citiesWithoutMatches for logging
      citiesWithoutMatches.length = 0;
      citiesWithoutMatches.push(...remainingFailedCities);
    }

    // STEP 5: Log city match distribution
    const cityMatchMetadata = bucketResults.map((result) => ({
      city: result.city,
      matches: result.matches.length,
      jobsAnalyzed: result.jobsAnalyzed,
      success: result.matches.length > 0,
    }));

    apiLogger.info("Stratified matching - city results", {
      email: userPrefs.email || "unknown",
      cityMatchMetadata,
      totalMatches: allCityMatches.length,
      totalTokens,
      totalCost,
      citiesWithMatches,
      citiesWithoutMatches:
        citiesWithoutMatches.length > 0 ? citiesWithoutMatches : undefined,
    });

    // STEP 6: Return results if we have matches
    if (allCityMatches.length > 0) {
      // Cache successful stratified matches
      await this.matchCache.set(cacheKey, allCityMatches);
      this.circuitBreaker.recordSuccess();
      this.lastAIMetadata = null; // Clear after aggregation

      return {
        matches: allCityMatches,
        method: "ai_success",
        processingTime: Date.now() - startTime,
        confidence: 0.9,
        aiModel: aiModel || "gpt-4o-mini",
        aiCostUsd: totalCost,
        aiTokensUsed: totalTokens,
      };
    }

    // Stratified matching failed, fall through to global matching
    this.lastAIMetadata = null; // Reset for global matching fallback
    return null;
  }

  /**
   * Pre-rank jobs using rule-based scoring before AI matching
   */
  private async preRankJobsByScore(
    jobs: Job[],
    userPrefs: UserPreferences,
  ): Promise<Array<{ job: Job; score: number }>> {
    const jobsArray = Array.isArray(jobs) ? jobs : [];
    const userCities = Array.isArray(userPrefs.target_cities)
      ? userPrefs.target_cities
      : userPrefs.target_cities
        ? [userPrefs.target_cities]
        : [];

    const userCareer = userPrefs.professional_expertise || "";
    const userCareerPaths = Array.isArray(userPrefs.career_path)
      ? userPrefs.career_path
      : userPrefs.career_path
        ? [userPrefs.career_path]
        : [];

    const scoredJobs: Array<{ job: Job; score: number }> = [];

    for (let i = 0; i < jobsArray.length; i++) {
      const job = jobsArray[i];
      const scoreResult = await scoring.calculateWeightedScore(
        job,
        userPrefs,
        userCities,
        userCareer,
        userCareerPaths,
      );

      scoredJobs.push({
        job,
        score: scoreResult.score,
      });
    }

    // Sort by score descending
    const sorted = [...scoredJobs];
    for (let i = 0; i < sorted.length - 1; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[i].score < sorted[j].score) {
          const temp = sorted[i];
          sorted[i] = sorted[j];
          sorted[j] = temp;
        }
      }
    }

    return sorted;
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
   * Enhanced rule-based matching with weighted linear scoring model
   */
  private async performRuleBasedMatching(
    jobs: Job[],
    userPrefs: UserPreferences,
  ): Promise<JobMatch[]> {
    const jobsArray = Array.isArray(jobs) ? jobs : [];

    const matches: JobMatch[] = [];
    const userCities = Array.isArray(userPrefs.target_cities)
      ? userPrefs.target_cities
      : [];
    const userCareer = userPrefs.professional_expertise || "";
    const userCareerPaths = Array.isArray(userPrefs.career_path)
      ? userPrefs.career_path
      : [];

    for (let i = 0; i < Math.min(jobsArray.length, 20); i++) {
      const job = jobsArray[i];
      const scoreResult = await scoring.calculateWeightedScore(
        job,
        userPrefs,
        userCities,
        userCareer,
        userCareerPaths,
      );

      if (scoreResult.score >= 65) {
        matches.push({
          job_index: i + 1,
          job_hash: job.job_hash,
          match_score: scoreResult.score,
          match_reason:
            scoreResult.reasons.join(", ") || "Enhanced rule-based match",
          confidence_score: 0.7,
        });
      }
    }

    // Sort by match score
    const sortedMatches = [...matches];
    for (let i = 0; i < sortedMatches.length - 1; i++) {
      for (let j = i + 1; j < sortedMatches.length; j++) {
        if (sortedMatches[i].match_score < sortedMatches[j].match_score) {
          const temp = sortedMatches[i];
          sortedMatches[i] = sortedMatches[j];
          sortedMatches[j] = temp;
        }
      }
    }

    return sortedMatches.slice(0, 8);
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
