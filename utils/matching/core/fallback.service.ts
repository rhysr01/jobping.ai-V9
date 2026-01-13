/**
 * Fallback Service - Rule-based Job Matching
 * Combines rule-based matcher and guaranteed matching logic
 */

import type { Job } from "@/scrapers/types";
import type { UserPreferences } from "../types";
import { logger } from "../../../lib/monitoring";

export interface FallbackMatch {
	job: Job;
	matchScore: number;
	matchReason: string;
	matchQuality: "excellent" | "good" | "fair" | "low";
	confidenceScore: number;
	scoreBreakdown: {
		skills: number;
		experience: number;
		location: number;
		recency: number;
	};
}

export class FallbackService {
	/**
	 * Generate fallback matches using rule-based logic with balanced distribution
	 */
	generateFallbackMatches(
		jobs: Job[],
		user: UserPreferences,
		maxMatches: number = 10
	): FallbackMatch[] {
		const startTime = Date.now();

		// Score all jobs using rule-based logic
		const scoredJobs = jobs.map(job => this.scoreJob(job, user));

		// Sort by match score
		scoredJobs.sort((a, b) => b.matchScore - a.matchScore);

		// Apply balanced distribution to ensure all user preferences are represented
		const matches = this.applyBalancedDistribution(scoredJobs, user, maxMatches);

		logger.info("Fallback matching completed", {
			metadata: {
				userEmail: user.email,
				jobsProcessed: jobs.length,
				matchesFound: matches.length,
				processingTime: Date.now() - startTime,
			},
		});

		return matches;
	}

	/**
	 * Score a single job using rule-based logic
	 */
	private scoreJob(job: Job, user: UserPreferences): FallbackMatch {
		let totalScore = 0;
		const breakdown = {
			skills: 0,
			experience: 0,
			location: 0,
			recency: 0,
			careerPath: 0,
		};

		// Skills matching (keywords)
		if (user.career_keywords) {
			const jobText = `${job.title} ${job.description}`.toLowerCase();
			const keywords = user.career_keywords.split(',').map(k => k.trim());
			let keywordMatches = 0;

			keywords.forEach(keyword => {
				if (keyword && jobText.includes(keyword.toLowerCase())) {
					keywordMatches++;
				}
			});

			breakdown.skills = Math.min(100, (keywordMatches / keywords.length) * 100);
		}
		totalScore += breakdown.skills * 0.4;

		// Experience level matching
		if (user.entry_level_preference && job.experience_required) {
			breakdown.experience = this.calculateExperienceMatch(user.entry_level_preference, job.experience_required);
		}
		totalScore += breakdown.experience * 0.25;

		// Location matching
		const targetCities = Array.isArray(user.target_cities)
			? user.target_cities
			: user.target_cities ? [user.target_cities] : [];

		if (targetCities.length > 0) {
			breakdown.location = this.calculateLocationMatch(job, targetCities);
		}
		totalScore += breakdown.location * 0.2;

		// Career path matching - more balanced approach
		const userCareerPaths = Array.isArray(user.career_path)
			? user.career_path
			: user.career_path ? [user.career_path] : [];

		if (userCareerPaths.length > 0 && job.categories && job.categories.length > 0) {
			// Calculate how many of the job's categories are relevant to user's career paths
			let relevantJobCategories = 0;
			let totalJobCategories = job.categories.length;

			for (const jobCategory of job.categories) {
				const matchesAnyUserPath = userCareerPaths.some(userPath =>
					this.categoryMatchesCareerPath(jobCategory, userPath)
				);
				if (matchesAnyUserPath) {
					relevantJobCategories++;
				}
			}

			// Use 40% relevance threshold with sliding scale (not hard cutoff)
			const relevanceRatio = relevantJobCategories / totalJobCategories;
			if (relevanceRatio >= 0.4) {
				// Score based on both coverage and user career path matches
				const userPathMatches = userCareerPaths.filter(path =>
					job.categories!.some(category =>
						this.categoryMatchesCareerPath(category, path)
					)
				).length;

				// Combine relevance ratio with user path coverage
				breakdown.careerPath = (relevanceRatio * 0.7 + (userPathMatches / userCareerPaths.length) * 0.3) * 100;
			} else {
				// Below 40% still gets partial score (sliding scale, not zero)
				breakdown.careerPath = relevanceRatio * 30;
			}
		}
		totalScore += breakdown.careerPath * 0.15;

		// Recency bonus
		breakdown.recency = this.calculateRecencyScore(job);
		totalScore += breakdown.recency * 0.1;

		// Determine match quality
		let matchQuality: "excellent" | "good" | "fair" | "low";
		if (totalScore >= 80) matchQuality = "excellent";
		else if (totalScore >= 65) matchQuality = "good";
		else if (totalScore >= 45) matchQuality = "fair";
		else matchQuality = "low";

		// Generate match reason
		const matchReason = this.generateMatchReason(breakdown, matchQuality);

		return {
			job,
			matchScore: Math.round(totalScore),
			matchReason,
			matchQuality,
			confidenceScore: 75, // Rule-based matching has decent confidence
			scoreBreakdown: breakdown,
		};
	}

	/**
	 * Calculate experience level match
	 */
	private calculateExperienceMatch(userLevel: string, jobLevel: string): number {
		const levelMap: Record<string, number> = {
			"entry-level": 1,
			"junior": 1,
			"graduate": 1,
			"mid-level": 2,
			"intermediate": 2,
			"senior": 3,
			"lead": 3,
			"principal": 3,
		};

		const userScore = levelMap[userLevel.toLowerCase()] || 2;
		const jobScore = levelMap[jobLevel.toLowerCase()] || 2;

		// Perfect match
		if (userScore === jobScore) return 100;

		// Close match (adjacent levels)
		if (Math.abs(userScore - jobScore) === 1) return 75;

		// Distant match
		return 25;
	}

	/**
	 * Calculate location match
	 */
	private calculateLocationMatch(job: Job, targetCities: string[]): number {
		const jobCity = job.city?.toLowerCase() || "";
		const jobCountry = job.country?.toLowerCase() || "";

		// Exact city match
		if (targetCities.some(city => jobCity === city.toLowerCase())) {
			return 100;
		}

		// Country match
		if (targetCities.some(city => jobCountry.includes(city.toLowerCase()))) {
			return 75;
		}

		// Partial match (city name in location string)
		if (targetCities.some(city =>
			jobCity.includes(city.toLowerCase()) ||
			(job.location && job.location.toLowerCase().includes(city.toLowerCase()))
		)) {
			return 60;
		}

		// No match
		return 0;
	}

	/**
	 * Calculate recency score
	 */
	private calculateRecencyScore(job: Job): number {
		const postedDate = job.posted_at ? new Date(job.posted_at) : new Date();
		const daysSincePosted = (Date.now() - postedDate.getTime()) / (1000 * 60 * 60 * 24);

		if (daysSincePosted <= 1) return 100; // Today
		if (daysSincePosted <= 3) return 90;  // This week
		if (daysSincePosted <= 7) return 75;  // This week
		if (daysSincePosted <= 14) return 50; // Two weeks
		if (daysSincePosted <= 30) return 25; // This month

		return 0; // Older than a month
	}

	/**
	 * Generate human-readable match reason
	 */
	private generateMatchReason(
		breakdown: { skills: number; experience: number; location: number; recency: number },
		quality: string
	): string {
		const reasons = [];

		if (breakdown.skills >= 70) {
			reasons.push("strong skills match");
		} else if (breakdown.skills >= 40) {
			reasons.push("some skills alignment");
		}

		if (breakdown.experience >= 70) {
			reasons.push("experience level match");
		}

		if (breakdown.location >= 80) {
			reasons.push("perfect location match");
		} else if (breakdown.location >= 50) {
			reasons.push("reasonable location");
		}

		if (breakdown.recency >= 80) {
			reasons.push("recently posted");
		}

		if (reasons.length === 0) {
			return "General job opportunity";
		}

		return reasons.join(", ") + ` (${quality} match)`;
	}

	/**
	 * Check if a job category matches a user's career path
	 */
	private categoryMatchesCareerPath(jobCategory: string, careerPath: string): boolean {
		const careerPathMapping: Record<string, string[]> = {
			"Strategy & Business Design": ["strategy", "business-design", "consulting"],
			"Data & Analytics": ["data", "analytics", "data-science"],
			"Sales & Client Success": ["sales", "business-development", "client-success"],
			"Marketing & Growth": ["marketing", "growth", "brand"],
			"Finance & Investment": ["finance", "accounting", "investment"],
			"Operations & Supply Chain": ["operations", "supply-chain", "logistics"],
			"Product & Innovation": ["product", "product-management", "innovation"],
			"Tech & Transformation": ["tech", "technology", "transformation", "it"],
			"Sustainability & ESG": ["sustainability", "esg", "environmental", "social"],
			"Not Sure Yet / General": ["general", "graduate", "trainee", "rotational"],
		};

		const expectedCategories = careerPathMapping[careerPath] || [careerPath.toLowerCase()];
		return expectedCategories.some(expected =>
			jobCategory.toLowerCase().includes(expected.toLowerCase())
		);
	}

	/**
	 * Apply balanced distribution across locations and career paths
	 * Ensures all user preferences are fairly represented in results
	 */
	private applyBalancedDistribution(
		scoredJobs: FallbackMatch[],
		user: UserPreferences,
		maxMatches: number
	): FallbackMatch[] {
		const targetCities = Array.isArray(user.target_cities)
			? user.target_cities
			: user.target_cities ? [user.target_cities] : [];

		const userCareerPaths = Array.isArray(user.career_path)
			? user.career_path
			: user.career_path ? [user.career_path] : [];

		// If no specific preferences, just return top matches
		if (targetCities.length === 0 && userCareerPaths.length === 0) {
			return scoredJobs.slice(0, maxMatches);
		}

		const balancedMatches: FallbackMatch[] = [];
		const locationCounts: Record<string, number> = {};
		const careerPathCounts: Record<string, number> = {};

		// Initialize counters
		targetCities.forEach(city => locationCounts[city.toLowerCase()] = 0);
		userCareerPaths.forEach(path => careerPathCounts[path] = 0);

		// Calculate fair distribution targets
		const locationsPerCity = targetCities.length > 0
			? Math.floor(maxMatches / targetCities.length)
			: maxMatches;
		const jobsPerCareerPath = userCareerPaths.length > 0
			? Math.floor(maxMatches / userCareerPaths.length)
			: maxMatches;

		// Round 1: Distribute jobs fairly across all preferences
		for (const match of scoredJobs) {
			if (balancedMatches.length >= maxMatches) break;

			const job = match.job;
			const jobCity = job.city?.toLowerCase() || "";

			// Check if this job's location needs more representation
			let locationNeeded = false;
			let matchingLocation = "";
			for (const city of targetCities) {
				if (jobCity.includes(city.toLowerCase())) {
					if (locationCounts[city.toLowerCase()] < locationsPerCity) {
						locationNeeded = true;
						matchingLocation = city.toLowerCase();
						break;
					}
				}
			}

			// Check if this job's career path needs more representation
			let careerPathNeeded = false;
			let matchingCareerPath = "";
			for (const path of userCareerPaths) {
				if (job.categories?.some(cat => this.categoryMatchesCareerPath(cat, path))) {
					if (careerPathCounts[path] < jobsPerCareerPath) {
						careerPathNeeded = true;
						matchingCareerPath = path;
						break;
					}
				}
			}

			// Add job if it helps balance distribution
			if ((targetCities.length === 0 || locationNeeded) &&
				(userCareerPaths.length === 0 || careerPathNeeded)) {
				balancedMatches.push(match);

				if (matchingLocation) {
					locationCounts[matchingLocation]++;
				}
				if (matchingCareerPath) {
					careerPathCounts[matchingCareerPath]++;
				}
			}
		}

		// Round 2: Fill remaining slots with highest-scoring jobs
		for (const match of scoredJobs) {
			if (balancedMatches.length >= maxMatches) break;

			// Skip if already added
			if (balancedMatches.some(m => m.job.job_url === match.job.job_url)) {
				continue;
			}

			balancedMatches.push(match);
		}

		logger.info("Applied balanced distribution", {
			metadata: {
				userEmail: user.email,
				locationCounts,
				careerPathCounts,
				totalMatches: balancedMatches.length,
			},
		});

		return balancedMatches;
	}
}

export const fallbackService = new FallbackService();