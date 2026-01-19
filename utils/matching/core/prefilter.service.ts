/**
 * Prefilter Service - Simplified Job Filtering & Scoring
 * Consolidates all prefilter logic into a single, focused service
 */

import { logger } from "@/lib/monitoring";
import type { Job as ScrapersJob } from "@/scrapers/types";
import type { UserPreferences } from "@/utils/matching/types";
import {
	calculateOverallScore,
	ScoreComponents,
	UnifiedScore,
} from "../scoring-standard";

export interface PrefilterResult {
	jobs: (ScrapersJob & { freshnessTier: string; unifiedScore: UnifiedScore })[];
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

		logger.info("After location filtering", {
			metadata: {
				userEmail: user.email,
				originalCount: jobs.length,
				afterLocation: locationFiltered.jobs.length,
			},
		});

		// Career path filtering - map form values to database categories
		const careerFiltered = this.filterByCareerPath(locationFiltered.jobs, user);

		logger.info("After career path filtering", {
			metadata: {
				userEmail: user.email,
				afterLocation: locationFiltered.jobs.length,
				afterCareer: careerFiltered.length,
				userCareerPaths: user.career_path,
			},
		});

		// 🔴 CRITICAL: Visa filtering - must happen before quality filtering
		const visaFiltered = this.filterByVisa(careerFiltered, user);

		logger.info("After visa filtering", {
			metadata: {
				userEmail: user.email,
				afterCareer: careerFiltered.length,
				afterVisa: visaFiltered.length,
				userNeedsSponsorship: user.visa_status === "need-sponsorship",
			},
		});

		// Basic quality filtering
		const qualityFiltered = this.filterByQuality(visaFiltered, user);

		logger.info("After quality filtering", {
			metadata: {
				userEmail: user.email,
				afterVisa: visaFiltered.length,
				afterQuality: qualityFiltered.length,
				subscriptionTier: user.subscription_tier,
			},
		});

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
	 * Enhanced location filtering with city variations (moved from signup route)
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

		// Build comprehensive city variations (moved from signup route)
		const cityVariations = this.buildCityVariations(targetCities);

		// City filtering with variations (includes native language names, case variations, etc.)
		const cityMatches = jobs.filter((job) => {
			const jobCity = job.city?.toLowerCase();
			const jobLocation = job.location?.toLowerCase();

			// Check city variations with explicit null checks
			// @ts-ignore - TypeScript doesn't properly narrow string | undefined with && check
			if (jobCity && cityVariations.has(jobCity)) {
				return true;
			}
			// @ts-ignore - TypeScript doesn't properly narrow string | undefined with && check
			if (jobLocation && cityVariations.has(jobLocation)) {
				return true;
			}

			// Check if location contains any variation
			if (jobLocation) {
				return Array.from(cityVariations).some((variation) =>
					jobLocation.includes(variation),
				);
			}

			return false;
		});

		if (cityMatches.length >= 10) {
			return { jobs: cityMatches, matchLevel: "exact" };
		}

		// Country-level fallback (if no city matches)
		const countryMatches = jobs.filter((job) => {
			const jobCountry = job.country?.toLowerCase();
			return targetCities.some((city) => {
				const cityCountry = this.getCountryForCity(city);
				return jobCountry === cityCountry?.toLowerCase();
			});
		});

		if (countryMatches.length >= 5) {
			return { jobs: countryMatches, matchLevel: "nearby" };
		}

		// Fallback to all jobs if not enough matches
		return { jobs: jobs.slice(0, 50), matchLevel: "broad" };
	}

	/**
	 * Build comprehensive city variations (moved from signup route)
	 */
	private buildCityVariations(targetCities: string[]): Set<string> {
		const cityVariations = new Set<string>();

		targetCities.forEach((city) => {
			// Original city
			cityVariations.add(city);
			cityVariations.add(city.toUpperCase());
			cityVariations.add(city.toLowerCase());

			// Native language variations (from signup route)
			const cityVariants: Record<string, string[]> = {
				Vienna: ["Wien", "WIEN", "wien"],
				Zurich: ["Zürich", "ZURICH", "zürich"],
				Milan: ["Milano", "MILANO", "milano"],
				Rome: ["Roma", "ROMA", "roma"],
				Prague: ["Praha", "PRAHA", "praha"],
				Warsaw: ["Warszawa", "WARSZAWA", "warszawa"],
				Brussels: ["Bruxelles", "BRUXELLES", "bruxelles", "Brussel", "BRUSSEL"],
				Munich: ["München", "MÜNCHEN", "münchen"],
				Copenhagen: ["København", "KØBENHAVN"],
				Stockholm: ["Stockholms län"],
				Helsinki: ["Helsingfors"],
				Dublin: ["Baile Átha Cliath"],
			};

			if (cityVariants[city]) {
				cityVariants[city].forEach((variation) => {
					cityVariations.add(variation);
				});
			}

			// London area variations
			if (city.toLowerCase() === "london") {
				const londonAreas = [
					"Central London",
					"City Of London",
					"East London",
					"North London",
					"South London",
					"West London",
				];
				londonAreas.forEach((area) => {
					cityVariations.add(area);
					cityVariations.add(area.toUpperCase());
					cityVariations.add(area.toLowerCase());
				});
			}
		});

		return cityVariations;
	}

	/**
	 * Get country for a city (simplified mapping)
	 */
	private getCountryForCity(city: string): string | null {
		const cityToCountry: Record<string, string> = {
			// European cities mapping
			london: "United Kingdom",
			berlin: "Germany",
			munich: "Germany",
			vienna: "Austria",
			zurich: "Switzerland",
			milan: "Italy",
			rome: "Italy",
			prague: "Czech Republic",
			warsaw: "Poland",
			brussels: "Belgium",
			copenhagen: "Denmark",
			stockholm: "Sweden",
			helsinki: "Finland",
			dublin: "Ireland",
			amsterdam: "Netherlands",
			paris: "France",
		};

		return cityToCountry[city.toLowerCase()] || null;
	}

	/**
	 * 🔴 CRITICAL: Visa filtering - ensures users who need sponsorship only see eligible jobs
	 * This is make-or-break for international students
	 */
	private filterByVisa(
		jobs: (ScrapersJob & { freshnessTier: string })[],
		user: UserPreferences,
	): (ScrapersJob & { freshnessTier: string })[] {
		// If user doesn't need sponsorship, show all jobs
		if (user.visa_status !== "need-sponsorship") {
			return jobs;
		}

		// 🔴 CRITICAL: User needs sponsorship - ONLY show visa-friendly jobs
		const visaFriendlyJobs = jobs.filter((job) => job.visa_friendly === true);

		logger.info("Visa filtering applied", {
			metadata: {
				userEmail: user.email,
				userNeedsSponsorship: true,
				jobsBeforeFiltering: jobs.length,
				visaFriendlyJobs: visaFriendlyJobs.length,
				visaFriendlyJobsFound: visaFriendlyJobs.length > 0,
			},
		});

		return visaFriendlyJobs;
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
	 * Unified scoring system using standardized components
	 */
	private scoreJobs(
		jobs: (ScrapersJob & { freshnessTier: string })[],
		user: UserPreferences,
		matchLevel: string,
	): (ScrapersJob & { freshnessTier: string; unifiedScore: UnifiedScore })[] {
		const userTier = this.isPremiumUser(user) ? "premium" : "free";

		return jobs
			.map((job) => {
				// Calculate component scores
				const components: ScoreComponents = {
					relevance: this.calculateRelevanceScore(job, user, matchLevel),
					quality: this.calculateQualityScore(job, user),
					opportunity: this.calculateOpportunityScore(job, user),
					timing: this.calculateTimingScore(job),
				};

				// Calculate overall score using unified formula
				const overallScore = calculateOverallScore(components, userTier);

				// Create unified score object
				const unifiedScore: UnifiedScore = {
					overall: overallScore,
					components,
					confidence: 85, // Prefilter has good confidence in basic matching
					method: "rule-based",
				};

				return { ...job, unifiedScore };
			})
			.sort((a, b) => b.unifiedScore.overall - a.unifiedScore.overall);
	}

	/**
	 * Calculate relevance component (skills, experience, preferences alignment)
	 */
	private calculateRelevanceScore(
		job: ScrapersJob & { freshnessTier: string },
		user: UserPreferences,
		matchLevel: string,
	): number {
		let relevance = 50; // Base relevance

		// Location relevance
		if (matchLevel === "exact") relevance += 20;
		else if (matchLevel === "nearby") relevance += 10;

		// Experience relevance
		if (user.entry_level_preference && job.experience_required) {
			if (
				this.isExperienceMatch(
					user.entry_level_preference,
					job.experience_required,
				)
			) {
				relevance += 15;
			}
		}

		// Keyword relevance (semantic matching)
		if (user.career_keywords && job.description) {
			const keywords = user.career_keywords.split(",").map((k) => k.trim());
			const keywordMatches = keywords.filter(
				(keyword) =>
					job.description?.toLowerCase().includes(keyword.toLowerCase()) ??
					false,
			);
			relevance += Math.min(keywordMatches.length * 8, 20); // Cap at 20 points
		}

		// Language relevance for premium users
		if (this.isPremiumUser(user) && user.languages_spoken) {
			const jobLanguages = this.extractJobLanguages(job);
			const hasLanguageMatch = user.languages_spoken!.some((userLang) =>
				jobLanguages.some((jobLang) =>
					jobLang.toLowerCase().includes(userLang.toLowerCase()),
				),
			);

			if (hasLanguageMatch) {
				relevance += 15;
			}
		}

		return Math.min(100, Math.max(0, relevance));
	}

	/**
	 * Calculate quality component (company reputation, role stability)
	 */
	private calculateQualityScore(
		job: ScrapersJob,
		user: UserPreferences,
	): number {
		let quality = 40; // Base quality

		// Company reputation
		if (this.isTopCompany(job.company)) {
			quality += 25;
		}

		// Job title quality indicators
		if (job.title) {
			const title = job.title.toLowerCase();
			if (
				title.includes("senior") ||
				title.includes("lead") ||
				title.includes("principal")
			) {
				quality += 10; // Higher seniority often means better opportunities
			}
			if (title.includes("intern") || title.includes("junior")) {
				quality += 5; // Entry-level roles can still be quality opportunities
			}
		}

		// Premium users get enhanced quality assessment
		if (this.isPremiumUser(user)) {
			// Additional quality signals for premium users
			if (job.company && job.company.length > 0) {
				quality += 5; // Established companies get bonus
			}
		}

		return Math.min(100, Math.max(0, quality));
	}

	/**
	 * Calculate opportunity component (career advancement potential)
	 */
	private calculateOpportunityScore(
		job: ScrapersJob,
		user: UserPreferences,
	): number {
		let opportunity = 30; // Base opportunity

		// Premium users get more detailed opportunity assessment
		if (this.isPremiumUser(user)) {
			// Career progression keywords
			if (job.description) {
				const desc = job.description.toLowerCase();
				const progressionKeywords = [
					"growth",
					"development",
					"progression",
					"advancement",
					"learning",
					"training",
					"mentorship",
					"career",
				];

				const progressionMatches = progressionKeywords.filter((keyword) =>
					desc.includes(keyword),
				);

				opportunity += Math.min(progressionMatches.length * 8, 25);
			}

			// Company growth indicators
			if (job.company) {
				const company = job.company.toLowerCase();
				if (
					company.includes("tech") ||
					company.includes("startup") ||
					company.includes("scale") ||
					company.includes("growth")
				) {
					opportunity += 15; // Growth companies offer more advancement
				}
			}
		} else {
			// Basic opportunity for free users
			opportunity += 10; // Conservative estimate
		}

		return Math.min(100, Math.max(0, opportunity));
	}

	/**
	 * Calculate timing component (freshness, market fit)
	 */
	private calculateTimingScore(
		job: ScrapersJob & { freshnessTier: string },
	): number {
		let timing = 60; // Base timing score

		// Freshness bonus
		if (job.freshnessTier === "hot") timing += 25;
		else if (job.freshnessTier === "fresh") timing += 20;
		else if (job.freshnessTier === "recent") timing += 15;
		else if (job.freshnessTier === "week-old") timing += 10;
		else if (job.freshnessTier === "older") timing += 5;

		// Job market timing (simplified)
		const currentDate = new Date();
		const month = currentDate.getMonth();

		// Graduate season bonus (Sep-Dec)
		if (month >= 8 && month <= 11) {
			timing += 5;
		}

		return Math.min(100, Math.max(0, timing));
	}

	/**
	 * Ensure source diversity in results
	 */
	private ensureDiversity(
		jobs: (ScrapersJob & {
			freshnessTier: string;
			unifiedScore: UnifiedScore;
		})[],
	): (ScrapersJob & { freshnessTier: string; unifiedScore: UnifiedScore })[] {
		const sourceMap = new Map<string, number>();
		const diverseJobs: (ScrapersJob & {
			freshnessTier: string;
			unifiedScore: UnifiedScore;
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

	/**
	 * Check if user is premium tier
	 */
	private isPremiumUser(user: UserPreferences): boolean {
		return (
			user.subscription_tier === "premium" ||
			user.subscription_tier === "premium_pending"
		);
	}

	/**
	 * Filter jobs by career path - map form values to database categories
	 */
	private filterByCareerPath(
		jobs: (ScrapersJob & { freshnessTier: string })[],
		user: UserPreferences,
	): (ScrapersJob & { freshnessTier: string })[] {
		// If no career path specified, return all jobs
		if (
			!user.career_path ||
			(Array.isArray(user.career_path) && user.career_path.length === 0)
		) {
			return jobs;
		}

		// Map form career path values to database categories
		const careerPathMapping: Record<string, string[]> = {
			strategy: ["strategy-business-design"],
			data: ["data-analytics"],
			sales: ["sales-client-success"],
			marketing: ["marketing-growth"],
			finance: ["finance-investment"],
			operations: ["operations-supply-chain"],
			product: ["product-innovation"],
			tech: ["tech-transformation"],
			sustainability: ["sustainability-esg"],
			unsure: ["general", "early-career", "entry-level", "graduate-programme"],
		};

		// Get database categories that match user's career path selection
		const userCareerPaths = Array.isArray(user.career_path)
			? user.career_path
			: [user.career_path];
		const targetCategories = new Set<string>();

		userCareerPaths.forEach((path) => {
			const mappedCategories = careerPathMapping[path];
			if (mappedCategories) {
				mappedCategories.forEach((cat) => {
					targetCategories.add(cat);
				});
			}
		});

		// If no valid mappings found, return all jobs
		if (targetCategories.size === 0) {
			logger.warn("No career path mappings found for user selection", {
				metadata: {
					userCareerPaths,
					availableMappings: Object.keys(careerPathMapping),
				},
			});
			return jobs;
		}

		// Filter jobs that have matching categories
		const filtered = jobs.filter((job) => {
			if (!job.categories || !Array.isArray(job.categories)) {
				return false;
			}

			// Check if job has any of the target categories
			return job.categories.some((category) => targetCategories.has(category));
		});

		logger.info("Career path filtering completed", {
			metadata: {
				userEmail: user.email,
				userCareerPaths,
				targetCategories: Array.from(targetCategories),
				jobsBefore: jobs.length,
				jobsAfter: filtered.length,
			},
		});

		return filtered;
	}
}

export const prefilterService = new PrefilterService();
