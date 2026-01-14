/**
 * Error Recovery Strategies for Matching Operations
 *
 * Implements 4-level fallback matching system to ensure users always get matches
 * Provides graceful degradation when primary matching fails
 */

import { apiLogger } from "../../lib/api-logger";
import type { JobWithMetadata } from "../../lib/types/job";

export interface UserPreferences {
  email: string;
  target_cities: string[];
  subscription_tier: "free" | "premium_pending";
  // Additional fields based on tier
  career_path?: string | null;
  skills?: string[];
  industries?: string[];
  languages_spoken?: string[];
}

export interface RecoveryResult {
  matches: JobWithMetadata[];
  matchCount: number;
  recoveryLevel: number;
  method: string;
  confidence: "high" | "medium" | "low";
  duration: number;
}

export interface RecoveryOptions {
  maxRecoveryLevel: number;
  minMatchesRequired: number;
  enableCityExpansion: boolean;
  enableSkillRelaxation: boolean;
  enableIndustryBroadening: boolean;
}

/**
 * 4-Level Error Recovery System for Job Matching
 *
 * Level 0: Primary matching (original algorithm)
 * Level 1: Relaxed filtering (broader criteria)
 * Level 2: City expansion (include nearby cities)
 * Level 3: Skill relaxation (partial skill matches)
 * Level 4: Industry broadening (related industries)
 */
export class ErrorRecoveryStrategies {
  private static readonly DEFAULT_OPTIONS: RecoveryOptions = {
    maxRecoveryLevel: 4,
    minMatchesRequired: 1,
    enableCityExpansion: true,
    enableSkillRelaxation: true,
    enableIndustryBroadening: true
  };

  /**
   * Executes matching with automatic fallback to recovery strategies
   */
  static async executeWithRecovery(
    userPrefs: UserPreferences,
    jobs: JobWithMetadata[],
    primaryMatcher: (prefs: UserPreferences, jobs: JobWithMetadata[]) => Promise<JobWithMetadata[]>,
    options: Partial<RecoveryOptions> = {}
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    const config = { ...this.DEFAULT_OPTIONS, ...options };

    // Try primary matching first
    try {
      const primaryMatches = await primaryMatcher(userPrefs, jobs);
      if (primaryMatches.length >= config.minMatchesRequired) {
        return {
          matches: primaryMatches,
          matchCount: primaryMatches.length,
          recoveryLevel: 0,
          method: "primary",
          confidence: "high",
          duration: Date.now() - startTime
        };
      }

      apiLogger.warn("Primary matching returned insufficient results", {
        email: userPrefs.email,
        primaryMatches: primaryMatches.length,
        required: config.minMatchesRequired
      });
    } catch (error) {
      apiLogger.error("Primary matching failed", undefined, {
        email: userPrefs.email,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }

    // Apply recovery strategies in order
    for (let level = 1; level <= config.maxRecoveryLevel; level++) {
      try {
        const recoveryResult = await this.applyRecoveryLevel(level, userPrefs, jobs, config);
        if (recoveryResult.matchCount >= config.minMatchesRequired) {
          const totalDuration = Date.now() - startTime;
          return {
            ...recoveryResult,
            duration: totalDuration
          };
        }
      } catch (error) {
        apiLogger.warn(`Recovery level ${level} failed`, {
          email: userPrefs.email,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    // Final fallback - return any jobs if nothing else worked
    return await this.finalFallback(userPrefs, jobs, startTime);
  }

  /**
   * Applies a specific recovery level strategy
   */
  private static async applyRecoveryLevel(
    level: number,
    userPrefs: UserPreferences,
    jobs: JobWithMetadata[],
    config: RecoveryOptions
  ): Promise<Omit<RecoveryResult, "duration">> {
    switch (level) {
      case 1:
        return await this.level1RelaxedFiltering(userPrefs, jobs);
      case 2:
        return await this.level2CityExpansion(userPrefs, jobs, config);
      case 3:
        return await this.level3SkillRelaxation(userPrefs, jobs, config);
      case 4:
        return await this.level4IndustryBroadening(userPrefs, jobs, config);
      default:
        throw new Error(`Unknown recovery level: ${level}`);
    }
  }

  /**
   * Level 1: Relaxed Filtering
   * Broadens the matching criteria while maintaining core requirements
   */
  private static async level1RelaxedFiltering(
    userPrefs: UserPreferences,
    jobs: JobWithMetadata[]
  ): Promise<Omit<RecoveryResult, "duration">> {
    apiLogger.info("Applying Level 1 recovery: Relaxed filtering", {
      email: userPrefs.email
    });

    // Relax filters - keep cities but be more lenient on other criteria
    const matches = jobs.filter(job => {
      const cityMatch = this.matchesCityRelaxed(job, userPrefs.target_cities);
      return cityMatch;
    });

    // If we have matches, return top ones with basic ranking
    const rankedMatches = this.rankByBasicRelevance(matches, userPrefs);

    return {
      matches: rankedMatches.slice(0, this.getMaxMatchesForTier(userPrefs.subscription_tier)),
      matchCount: Math.min(rankedMatches.length, this.getMaxMatchesForTier(userPrefs.subscription_tier)),
      recoveryLevel: 1,
      method: "relaxed-filtering",
      confidence: "medium"
    };
  }

  /**
   * Level 2: City Expansion
   * Includes nearby cities and broader geographic areas
   */
  private static async level2CityExpansion(
    userPrefs: UserPreferences,
    jobs: JobWithMetadata[],
    config: RecoveryOptions
  ): Promise<Omit<RecoveryResult, "duration">> {
    if (!config.enableCityExpansion) {
      throw new Error("City expansion disabled");
    }

    apiLogger.info("Applying Level 2 recovery: City expansion", {
      email: userPrefs.email,
      originalCities: userPrefs.target_cities
    });

    // Expand cities to include nearby areas
    const expandedCities = this.expandCities(userPrefs.target_cities);

    const matches = jobs.filter(job => {
      const cityMatch = this.matchesCityRelaxed(job, expandedCities);
      return cityMatch;
    });

    const rankedMatches = this.rankByBasicRelevance(matches, userPrefs);

    return {
      matches: rankedMatches.slice(0, this.getMaxMatchesForTier(userPrefs.subscription_tier)),
      matchCount: Math.min(rankedMatches.length, this.getMaxMatchesForTier(userPrefs.subscription_tier)),
      recoveryLevel: 2,
      method: "city-expansion",
      confidence: "medium"
    };
  }

  /**
   * Level 3: Skill Relaxation
   * Accepts partial skill matches and related skills
   */
  private static async level3SkillRelaxation(
    userPrefs: UserPreferences,
    jobs: JobWithMetadata[],
    config: RecoveryOptions
  ): Promise<Omit<RecoveryResult, "duration">> {
    if (!config.enableSkillRelaxation || !userPrefs.skills) {
      throw new Error("Skill relaxation not applicable or disabled");
    }

    apiLogger.info("Applying Level 3 recovery: Skill relaxation", {
      email: userPrefs.email,
      originalSkills: userPrefs.skills
    });

    // Relax skill requirements - accept partial matches
    const matches = jobs.filter(job => {
      const skillMatch = this.matchesSkillsRelaxed(job, userPrefs.skills!);
      return skillMatch;
    });

    const rankedMatches = this.rankBySkillRelevance(matches, userPrefs);

    return {
      matches: rankedMatches.slice(0, this.getMaxMatchesForTier(userPrefs.subscription_tier)),
      matchCount: Math.min(rankedMatches.length, this.getMaxMatchesForTier(userPrefs.subscription_tier)),
      recoveryLevel: 3,
      method: "skill-relaxation",
      confidence: "low"
    };
  }

  /**
   * Level 4: Industry Broadening
   * Includes related industries and broader categories
   */
  private static async level4IndustryBroadening(
    userPrefs: UserPreferences,
    jobs: JobWithMetadata[],
    config: RecoveryOptions
  ): Promise<Omit<RecoveryResult, "duration">> {
    if (!config.enableIndustryBroadening || !userPrefs.industries) {
      throw new Error("Industry broadening not applicable or disabled");
    }

    apiLogger.info("Applying Level 4 recovery: Industry broadening", {
      email: userPrefs.email,
      originalIndustries: userPrefs.industries
    });

    // Broaden industry criteria
    const broadenedIndustries = this.broadenIndustries(userPrefs.industries);

    const matches = jobs.filter(job => {
      const industryMatch = this.matchesIndustryBroadened(job, broadenedIndustries);
      return industryMatch;
    });

    const rankedMatches = this.rankByIndustryRelevance(matches, userPrefs);

    return {
      matches: rankedMatches.slice(0, this.getMaxMatchesForTier(userPrefs.subscription_tier)),
      matchCount: Math.min(rankedMatches.length, this.getMaxMatchesForTier(userPrefs.subscription_tier)),
      recoveryLevel: 4,
      method: "industry-broadening",
      confidence: "low"
    };
  }

  /**
   * Final fallback - returns any available jobs as last resort
   */
  private static async finalFallback(
    userPrefs: UserPreferences,
    jobs: JobWithMetadata[],
    startTime: number
  ): Promise<RecoveryResult> {
    apiLogger.warn("All recovery strategies failed, using final fallback", {
      email: userPrefs.email,
      totalJobs: jobs.length
    });

    // Return any jobs we have, ranked by recency
    const fallbackMatches = jobs
      .sort((a, b) => {
        const dateA = a.posted_at ? new Date(a.posted_at).getTime() : 0;
        const dateB = b.posted_at ? new Date(b.posted_at).getTime() : 0;
        return dateB - dateA; // Most recent first
      })
      .slice(0, Math.min(5, jobs.length));

    return {
      matches: fallbackMatches,
      matchCount: fallbackMatches.length,
      recoveryLevel: 5,
      method: "final-fallback",
      confidence: "low",
      duration: Date.now() - startTime
    };
  }

  // Helper methods for matching logic

  private static matchesCityRelaxed(job: JobWithMetadata, cities: string[]): boolean {
    if (!job.city && !job.location) return false;

    const jobLocation = `${job.city} ${job.location}`.toLowerCase();
    return cities.some(city =>
      jobLocation.includes(city.toLowerCase())
    );
  }

  private static matchesSkillsRelaxed(job: JobWithMetadata, userSkills: string[]): boolean {
    if (!job.ai_labels || job.ai_labels.length === 0) return true; // No skills info = assume match

    const jobSkills = job.ai_labels.map(skill => skill.toLowerCase());
    const userSkillsLower = userSkills.map(skill => skill.toLowerCase());

    // Accept if at least one skill matches
    return userSkillsLower.some(userSkill =>
      jobSkills.some(jobSkill => jobSkill.includes(userSkill) || userSkill.includes(jobSkill))
    );
  }

  private static matchesIndustryBroadened(job: JobWithMetadata, industries: string[]): boolean {
    if (!job.ai_labels || job.ai_labels.length === 0) return true;

    const jobIndustries = job.ai_labels.map(label => label.toLowerCase());
    return industries.some(industry =>
      jobIndustries.some(jobIndustry => jobIndustry.includes(industry.toLowerCase()))
    );
  }

  private static expandCities(cities: string[]): string[] {
    const expansions: Record<string, string[]> = {
      'berlin': ['berlin', 'potsdam', 'brandenburg'],
      'munich': ['munich', 'münchen', 'bavaria', 'starnberg'],
      'hamburg': ['hamburg', 'schleswig-holstein', 'lüneburg'],
      'frankfurt': ['frankfurt', 'main', 'hessen', 'darmstadt'],
      'cologne': ['cologne', 'köln', 'north rhine-westphalia', 'bonn'],
      'london': ['london', 'greater london', 'home counties'],
      'paris': ['paris', 'ile-de-france', 'suburban paris'],
      'amsterdam': ['amsterdam', 'north holland', 'randstad']
    };

    const expanded = new Set(cities);
    cities.forEach(city => {
      const cityLower = city.toLowerCase();
      if (expansions[cityLower]) {
        expansions[cityLower].forEach(expandedCity => expanded.add(expandedCity));
      }
    });

    return Array.from(expanded);
  }

  private static broadenIndustries(industries: string[]): string[] {
    const broadenings: Record<string, string[]> = {
      'technology': ['technology', 'software', 'it', 'tech', 'digital'],
      'finance': ['finance', 'banking', 'financial services', 'fintech'],
      'healthcare': ['healthcare', 'medical', 'pharmaceutical', 'biotech'],
      'consulting': ['consulting', 'advisory', 'professional services'],
      'marketing': ['marketing', 'advertising', 'digital marketing', 'brand']
    };

    const broadened = new Set(industries);
    industries.forEach(industry => {
      const industryLower = industry.toLowerCase();
      if (broadenings[industryLower]) {
        broadenings[industryLower].forEach(broader => broadened.add(broader));
      }
    });

    return Array.from(broadened);
  }

  private static rankByBasicRelevance(jobs: JobWithMetadata[], _userPrefs: UserPreferences): JobWithMetadata[] {
    return jobs.sort((a, b) => {
      // Prefer jobs with more complete information
      const aScore = this.calculateCompletenessScore(a);
      const bScore = this.calculateCompletenessScore(b);
      return bScore - aScore;
    });
  }

  private static rankBySkillRelevance(jobs: JobWithMetadata[], userPrefs: UserPreferences): JobWithMetadata[] {
    if (!userPrefs.skills) return this.rankByBasicRelevance(jobs, userPrefs);

    return jobs.sort((a, b) => {
      const aSkillScore = this.calculateSkillMatchScore(a, userPrefs.skills!);
      const bSkillScore = this.calculateSkillMatchScore(b, userPrefs.skills!);
      return bSkillScore - aSkillScore;
    });
  }

  private static rankByIndustryRelevance(jobs: JobWithMetadata[], userPrefs: UserPreferences): JobWithMetadata[] {
    if (!userPrefs.industries) return this.rankByBasicRelevance(jobs, userPrefs);

    return jobs.sort((a, b) => {
      const aIndustryScore = this.calculateIndustryMatchScore(a, userPrefs.industries!);
      const bIndustryScore = this.calculateIndustryMatchScore(b, userPrefs.industries!);
      return bIndustryScore - aIndustryScore;
    });
  }

  private static calculateCompletenessScore(job: JobWithMetadata): number {
    let score = 0;
    if (job.title) score += 1;
    if (job.company) score += 1;
    if (job.description) score += 1;
    if (job.ai_labels && job.ai_labels.length > 0) score += 1;
    if (job.posted_at) score += 1;
    return score;
  }

  private static calculateSkillMatchScore(job: JobWithMetadata, userSkills: string[]): number {
    if (!job.ai_labels) return 0;

    const jobSkills = job.ai_labels.map(skill => skill.toLowerCase());
    const userSkillsLower = userSkills.map(skill => skill.toLowerCase());

    let matches = 0;
    userSkillsLower.forEach(userSkill => {
      if (jobSkills.some(jobSkill =>
        jobSkill.includes(userSkill) || userSkill.includes(jobSkill)
      )) {
        matches++;
      }
    });

    return matches / userSkills.length; // Percentage of skills matched
  }

  private static calculateIndustryMatchScore(job: JobWithMetadata, userIndustries: string[]): number {
    if (!job.ai_labels) return 0;

    const jobIndustries = job.ai_labels.map(label => label.toLowerCase());
    const userIndustriesLower = userIndustries.map(industry => industry.toLowerCase());

    let matches = 0;
    userIndustriesLower.forEach(userIndustry => {
      if (jobIndustries.some(jobIndustry =>
        jobIndustry.includes(userIndustry) || userIndustry.includes(jobIndustry)
      )) {
        matches++;
      }
    });

    return matches / userIndustries.length;
  }

  private static getMaxMatchesForTier(tier: string): number {
    return tier === "free" ? 5 : 15;
  }
}