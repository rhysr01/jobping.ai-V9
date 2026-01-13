/**
 * Prefilter Service - Simplified Job Filtering & Scoring
 * Consolidates all prefilter logic into a single, focused service
 */

import { logger } from "@/lib/monitoring";
import type { Job as ScrapersJob } from "@/scrapers/types";
import type { UserPreferences } from "@/utils/matching/types";

export interface PrefilterResult {
	jobs: (ScrapersJob & { freshnessTier: string; prefilterScore: number })[];
	matchLevel: "exact" | "nearby" | "broad";
	filteredCount: number;
	sourceDistribution: Record<string, number>;
}

export class PrefilterService {
	/**
	 * Main prefilter method - simplified from the complex prefilter system
	 */
	async prefilterJobs(
		jobs: (ScrapersJob & { freshnessTier: string })[],
		user: UserPreferences,
	): Promise<PrefilterResult> {
		const startTime = Date.now();

		// Basic location filtering
		const locationFiltered = this.filterByLocation(jobs, user);
		const matchLevel = locationFiltered.matchLevel;

		// Language filtering
		const languageFiltered = this.filterByLanguage(locationFiltered.jobs, user);

		// Basic quality filtering
		const qualityFiltered = this.filterByQuality(languageFiltered, user);

		// Score jobs
		const scoredJobs = this.scoreJobs(qualityFiltered, user, matchLevel);

		// Ensure diversity and limit results
		const finalJobs = this.ensureDiversity(scoredJobs);

		// Track source distribution
		const sourceDistribution = this.getSourceDistribution(finalJobs);

		logger.info("Prefilter completed", {
			metadata: {
				userEmail: user.email,
				originalCount: jobs.length,
				filteredCount: finalJobs.length,
				matchLevel,
				sourceDistribution,
				processingTime: Date.now() - startTime,
			},
		});

		return {
			jobs: finalJobs,
			matchLevel,
			filteredCount: finalJobs.length,
			sourceDistribution,
		};
	}

	/**
	 * Simple location filtering
	 */
	private filterByLocation(
		jobs: (ScrapersJob & { freshnessTier: string })[],
		user: UserPreferences,
	): {
		jobs: (ScrapersJob & { freshnessTier: string })[];
		matchLevel: "exact" | "nearby" | "broad";
	} {
		const targetCities = Array.isArray(user.target_cities)
			? user.target_cities
			: user.target_cities
				? [user.target_cities]
				: [];

		if (targetCities.length === 0) {
			return { jobs, matchLevel: "broad" };
		}

		// Exact city matches
		const exactMatches = jobs.filter((job) =>
			targetCities.some(
				(city) =>
					job.city?.toLowerCase() === city.toLowerCase() ||
					job.location?.toLowerCase().includes(city.toLowerCase()),
			),
		);

		if (exactMatches.length >= 10) {
			return { jobs: exactMatches, matchLevel: "exact" };
		}

		// Nearby matches (same country/region)
		const nearbyMatches = jobs.filter((job) => {
			const jobCountry = job.country?.toLowerCase();
			const jobCity = job.city?.toLowerCase();

			return targetCities.some((city) => {
				// Same country logic (simplified)
				if (jobCountry && this.isSameRegion(jobCountry, city)) {
					return true;
				}
				// Broad location match
				return jobCity && this.isNearbyLocation(jobCity, city);
			});
		});

		if (nearbyMatches.length >= 5) {
			return { jobs: nearbyMatches, matchLevel: "nearby" };
		}

		// Fallback to all jobs if not enough matches
		return { jobs: jobs.slice(0, 50), matchLevel: "broad" };
	}

	/**
	 * Language requirement filtering
	 */
	private filterByLanguage(
		jobs: (ScrapersJob & { freshnessTier: string })[],
		user: UserPreferences,
	): (ScrapersJob & { freshnessTier: string })[] {
		// If user specified languages, filter jobs that match
		if (user.languages_spoken && user.languages_spoken.length > 0) {
			return jobs.filter((job) => {
				const jobLangs = this.extractJobLanguages(job);
				return (
					user.languages_spoken?.some((userLang) =>
						jobLangs.some((jobLang) =>
							jobLang.toLowerCase().includes(userLang.toLowerCase()),
						),
					) ?? false
				);
			});
		}

		return jobs;
	}

	/**
	 * Basic quality filtering
	 */
	private filterByQuality(
		jobs: (ScrapersJob & { freshnessTier: string })[],
		user: UserPreferences,
	): (ScrapersJob & { freshnessTier: string })[] {
		return jobs.filter((job) => {
			// Basic quality checks
			if (!job.title || !job.company || !job.description) {
				return false;
			}

			// Filter out very old jobs (older than 30 days for free users)
			if (user.subscription_tier === "free") {
				const jobDate = job.posted_at ? new Date(job.posted_at) : new Date();
				const daysOld =
					(Date.now() - jobDate.getTime()) / (1000 * 60 * 60 * 24);
				if (daysOld > 30) {
					return false;
				}
			}

			// Filter by experience level if specified
			if (user.entry_level_preference && job.experience_required) {
				if (
					!this.isExperienceMatch(
						user.entry_level_preference,
						job.experience_required,
					)
				) {
					return false;
				}
			}

			return true;
		});
	}

	/**
	 * Simple scoring system
	 */
	private scoreJobs(
		jobs: (ScrapersJob & { freshnessTier: string })[],
		user: UserPreferences,
		matchLevel: string,
	): (ScrapersJob & { freshnessTier: string; prefilterScore: number })[] {
		return jobs
			.map((job) => {
				let score = 50; // Base score

				// Location match bonus
				if (matchLevel === "exact") score += 20;
				else if (matchLevel === "nearby") score += 10;

				// Freshness bonus
				if (job.freshnessTier === "hot") score += 15;
				else if (job.freshnessTier === "warm") score += 10;

				// Company reputation bonus (simplified)
				if (this.isTopCompany(job.company)) score += 10;

				// Experience match bonus
				if (user.entry_level_preference && job.experience_required) {
					if (
						this.isExperienceMatch(
							user.entry_level_preference,
							job.experience_required,
						)
					) {
						score += 15;
					}
				}

				// Keyword matching bonus
				if (user.career_keywords && job.description) {
					const keywords = user.career_keywords.split(",").map((k) => k.trim());
					const keywordMatches = keywords.filter(
						(keyword) =>
							job.description?.toLowerCase().includes(keyword.toLowerCase()) ??
							false,
					);
					score += keywordMatches.length * 5;
				}

				return { ...job, prefilterScore: Math.min(score, 100) };
			})
			.sort((a, b) => b.prefilterScore - a.prefilterScore);
	}

	/**
	 * Ensure source diversity in results
	 */
	private ensureDiversity(
		jobs: (ScrapersJob & { freshnessTier: string; prefilterScore: number })[],
	): (ScrapersJob & { freshnessTier: string; prefilterScore: number })[] {
		const sourceMap = new Map<string, number>();
		const diverseJobs: (ScrapersJob & {
			freshnessTier: string;
			prefilterScore: number;
		})[] = [];

		for (const job of jobs) {
			const source = (job as any).source || "unknown";
			const sourceCount = sourceMap.get(source) || 0;

			// Limit to 3 jobs per source
			if (sourceCount < 3) {
				diverseJobs.push(job);
				sourceMap.set(source, sourceCount + 1);
			}

			// Limit total results
			if (diverseJobs.length >= 100) break;
		}

		return diverseJobs;
	}

	/**
	 * Helper methods
	 */
	private isSameRegion(country: string, city: string): boolean {
		// Simplified region matching
		const regions: Record<string, string[]> = {
			uk: [
				"london",
				"manchester",
				"birmingham",
				"leeds",
				"glasgow",
				"edinburgh",
			],
			us: ["new york", "san francisco", "los angeles", "chicago", "seattle"],
			germany: ["berlin", "munich", "hamburg", "cologne", "frankfurt"],
		};

		for (const [region, cities] of Object.entries(regions)) {
			if (cities.includes(city.toLowerCase()) && country.includes(region)) {
				return true;
			}
		}

		return false;
	}

	private isNearbyLocation(jobCity: string, targetCity: string): boolean {
		// Very basic proximity check - in real app would use geolocation
		return jobCity
			.toLowerCase()
			.includes(targetCity.toLowerCase().split(" ")[0]);
	}

	private extractJobLanguages(job: ScrapersJob): string[] {
		const text = `${job.title} ${job.description}`.toLowerCase();
		const languages = [];

		if (text.includes("english")) languages.push("English");
		if (text.includes("german") || text.includes("deutsch"))
			languages.push("German");
		if (text.includes("french") || text.includes("français"))
			languages.push("French");

		return languages;
	}

	private isExperienceMatch(userLevel: string, jobLevel: string): boolean {
		const levels = {
			"entry-level": ["entry", "junior", "graduate"],
			"mid-level": ["mid", "intermediate", "3-5 years"],
			senior: ["senior", "lead", "principal", "5+ years"],
		};

		const userKeywords = levels[userLevel as keyof typeof levels] || [];
		const jobKeywords = levels[jobLevel as keyof typeof levels] || [];

		return (
			userKeywords.some((keyword) =>
				jobLevel.toLowerCase().includes(keyword.toLowerCase()),
			) ||
			jobKeywords.some((keyword) =>
				userLevel.toLowerCase().includes(keyword.toLowerCase()),
			) ||
			userLevel === jobLevel
		);
	}

	private isTopCompany(company: string): boolean {
		const topCompanies = [
			"google",
			"microsoft",
			"amazon",
			"apple",
			"meta",
			"netflix",
			"tesla",
			"uber",
			"airbnb",
			"spotify",
			"slack",
			"notion",
		];
		return topCompanies.some((tc) => company.toLowerCase().includes(tc));
	}

	private getSourceDistribution(jobs: any[]): Record<string, number> {
		const distribution: Record<string, number> = {};
		jobs.forEach((job) => {
			const source = job.source || "unknown";
			distribution[source] = (distribution[source] || 0) + 1;
		});
		return distribution;
	}
}

export const prefilterService = new PrefilterService();
