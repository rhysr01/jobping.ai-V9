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
	 * Generate fallback matches using rule-based logic
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

		// Take top matches
		const matches = scoredJobs.slice(0, maxMatches);

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

		// Recency bonus
		breakdown.recency = this.calculateRecencyScore(job);
		totalScore += breakdown.recency * 0.15;

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
}

export const fallbackService = new FallbackService();