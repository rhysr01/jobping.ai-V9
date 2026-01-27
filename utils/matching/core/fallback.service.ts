/**
 * Fallback Service - Rule-based Job Matching
 * Combines rule-based matcher and guaranteed matching logic
 */

import type { Job } from "@/scrapers/types";
import { logger } from "../../../lib/monitoring";
import {
	generateScoreExplanation,
	ScoreComponents,
	UnifiedScore,
} from "../scoring-standard";
import type { UserPreferences } from "../types";

export interface FallbackMatch {
	job: Job;
	unifiedScore: UnifiedScore;
	matchReason: string;
}

export class FallbackService {
	/**
	 * Generate fallback matches using sophisticated rule-based logic
	 * Implements proper semantic matching, weighted scoring, and balanced distribution
	 */
	generateFallbackMatches(
		jobs: Job[],
		user: UserPreferences,
		maxMatches: number = 10,
	): FallbackMatch[] {
		const startTime = Date.now();

		// Score all jobs using advanced rule-based logic
		const scoredJobs = jobs.map((job) => this.scoreJobAdvanced(job, user));

		// Sort by match score (highest first)
		scoredJobs.sort((a, b) => b.unifiedScore.overall - a.unifiedScore.overall);

		// Apply balanced distribution to ensure all user preferences are represented
		const matches = this.applyBalancedDistribution(
			scoredJobs,
			user,
			maxMatches,
		);

		logger.info("Advanced fallback matching completed", {
			metadata: {
				userEmail: user.email,
				jobsProcessed: jobs.length,
				matchesFound: matches.length,
				averageScore:
					matches.length > 0
						? matches.reduce((sum, m) => sum + m.unifiedScore.overall, 0) /
							matches.length
						: 0,
				processingTime: Date.now() - startTime,
			},
		});

		return matches;
	}

	/**
	 * Advanced job scoring with unified scoring standard
	 */
	private scoreJobAdvanced(job: Job, user: UserPreferences): FallbackMatch {
		const userTier =
			user.subscription_tier === "premium" ||
			user.subscription_tier === "premium_pending"
				? "premium"
				: "free";

		// Calculate component scores using existing advanced logic
		const components: ScoreComponents = {
			relevance: this.calculateRelevanceComponent(job, user),
			quality: this.calculateQualityComponent(job, user),
			opportunity: this.calculateOpportunityComponent(job, user),
			timing: this.calculateTimingComponent(job),
		};

		// Calculate overall score using unified formula
		const overallScore = this.calculateOverallFromComponents(
			components,
			userTier,
		);

		// Create unified score object
		const unifiedScore: UnifiedScore = {
			overall: overallScore,
			components,
			confidence: 75, // Rule-based has good confidence with advanced logic
			method: "rule-based",
		};

		// Add explanation for transparency
		unifiedScore.explanation = generateScoreExplanation(
			unifiedScore,
			job.title || "Unknown Position",
		);

		return {
			job,
			unifiedScore,
			matchReason:
				unifiedScore.explanation?.reason || "Rule-based algorithmic match",
		};
	}

	/**
	 * Calculate relevance component (skills, experience, career path alignment)
	 */
	private calculateRelevanceComponent(job: Job, user: UserPreferences): number {
		let relevance = 0;

		// Skills matching (35% of old algorithm)
		const skillsScore = this.calculateSemanticSkillsMatch(job, user);
		relevance += skillsScore * 0.4; // 40% of relevance

		// Experience matching (25% of old algorithm)
		const experienceScore = this.calculateAdvancedExperienceMatch(job, user);
		relevance += experienceScore * 0.3; // 30% of relevance

		// Career path matching (15% of old algorithm)
		const careerScore = this.calculateAdvancedCareerPathMatch(job, user);
		relevance += careerScore * 0.2; // 20% of relevance

		// Location relevance (10% of old algorithm)
		const locationScore = this.calculateAdvancedLocationMatch(job, user);
		relevance += locationScore * 0.1; // 10% of relevance

		return Math.min(100, Math.max(0, relevance));
	}

	/**
	 * Calculate quality component (company reputation, role stability)
	 */
	private calculateQualityComponent(job: Job, _user: UserPreferences): number {
		let quality = 50; // Base quality

		// Company reputation (simplified assessment)
		if (job.company) {
			const company = job.company.toLowerCase();
			if (
				company.includes("google") ||
				company.includes("microsoft") ||
				company.includes("amazon") ||
				company.includes("apple")
			) {
				quality += 25; // Top tech companies
			} else if (
				company.includes("consulting") ||
				company.includes("investment")
			) {
				quality += 15; // Professional services
			}
		}

		// Role stability indicators
		if (job.title) {
			const title = job.title.toLowerCase();
			if (
				title.includes("permanent") ||
				title.includes("full-time") ||
				title.includes("fte")
			) {
				quality += 10; // Stable employment
			}
		}

		return Math.min(100, Math.max(0, quality));
	}

	/**
	 * Calculate opportunity component (career advancement potential)
	 */
	private calculateOpportunityComponent(
		job: Job,
		user: UserPreferences,
	): number {
		let opportunity = 40; // Base opportunity

		// Premium users get enhanced opportunity assessment
		if (
			user.subscription_tier === "premium" ||
			user.subscription_tier === "premium_pending"
		) {
			// Growth keywords in description
			if (job.description) {
				const desc = job.description.toLowerCase();
				const growthKeywords = [
					"growth",
					"development",
					"progression",
					"learning",
					"training",
					"mentorship",
					"career advancement",
				];

				const growthMatches = growthKeywords.filter((keyword) =>
					desc.includes(keyword),
				);
				opportunity += Math.min(growthMatches.length * 10, 30);
			}

			// Company growth indicators
			if (job.company) {
				const company = job.company.toLowerCase();
				if (
					company.includes("startup") ||
					company.includes("scaleup") ||
					company.includes("series")
				) {
					opportunity += 20; // High growth potential
				}
			}
		}

		return Math.min(100, Math.max(0, opportunity));
	}

	/**
	 * Calculate timing component (freshness, market fit)
	 */
	private calculateTimingComponent(job: Job): number {
		let timing = 50; // Base timing

		// Recency scoring (5% of old algorithm, now 100% of timing)
		const recencyScore = this.calculateAdvancedRecencyScore(job);
		timing += recencyScore * 0.8; // 80% of timing

		// Market timing bonus
		const currentDate = new Date();
		const month = currentDate.getMonth();

		// Graduate hiring season (Sep-Dec)
		if (month >= 8 && month <= 11) {
			timing += 10;
		}

		return Math.min(100, Math.max(0, timing));
	}

	/**
	 * Calculate overall score from components using tier-specific weights
	 */
	private calculateOverallFromComponents(
		components: ScoreComponents,
		userTier: "free" | "premium",
	): number {
		const weights =
			userTier === "premium"
				? { relevance: 0.35, quality: 0.25, opportunity: 0.25, timing: 0.15 }
				: { relevance: 0.5, quality: 0.3, opportunity: 0.1, timing: 0.1 };

		const weightedScore =
			components.relevance * weights.relevance +
			components.quality * weights.quality +
			components.opportunity * weights.opportunity +
			components.timing * weights.timing;

		return Math.round(Math.max(0, Math.min(100, weightedScore)));
	}

	/**
	 * Semantic skills matching with synonym recognition and skill importance
	 */
	private calculateSemanticSkillsMatch(
		job: Job,
		user: UserPreferences,
	): number {
		if (!user.career_keywords) return 0;

		const jobText = `${job.title} ${job.description}`.toLowerCase();
		const userKeywords = user.career_keywords
			.split(",")
			.map((k) => k.trim().toLowerCase());
		const jobWords = jobText.split(/\s+/);

		let totalScore = 0;
		let matchedKeywords = 0;

		// Skill synonym mapping for better matching
		const skillSynonyms: Record<string, string[]> = {
			javascript: [
				"js",
				"es6",
				"es2015",
				"typescript",
				"ts",
				"node",
				"nodejs",
				"react",
				"vue",
				"angular",
			],
			python: ["django", "flask", "pandas", "numpy", "tensorflow", "pytorch"],
			react: ["reactjs", "nextjs", "redux", "hooks", "jsx"],
			node: ["nodejs", "express", "npm", "javascript"],
			aws: ["amazon web services", "ec2", "s3", "lambda", "cloudformation"],
			docker: ["kubernetes", "k8s", "containers", "microservices"],
			sql: ["mysql", "postgresql", "mongodb", "database", "oracle"],
			marketing: ["growth", "seo", "content", "social media", "analytics"],
			finance: ["accounting", "investment", "fp&a", "analysis", "banking"],
			design: ["ui", "ux", "figma", "sketch", "photoshop", "illustrator"],
		};

		for (const keyword of userKeywords) {
			if (!keyword) continue;

			let keywordScore = 0;

			// Direct match in job text
			if (jobText.includes(keyword)) {
				keywordScore = 100;
			}
			// Synonym match
			else if (skillSynonyms[keyword]) {
				const synonyms = skillSynonyms[keyword];
				const synonymMatches = synonyms.filter((synonym) =>
					jobText.includes(synonym),
				);
				if (synonymMatches.length > 0) {
					keywordScore = 85; // High score for synonyms
				}
			}
			// Partial word match (for compound terms)
			else {
				const partialMatches = jobWords.filter(
					(word) =>
						word.includes(keyword) ||
						(keyword.includes(word) && word.length > 3),
				);
				if (partialMatches.length > 0) {
					keywordScore = 70; // Good score for partial matches
				}
			}

			if (keywordScore > 0) {
				totalScore += keywordScore;
				matchedKeywords++;
			}
		}

		// Return weighted average with bonus for multiple matches
		if (matchedKeywords === 0) return 0;

		const averageScore = totalScore / userKeywords.length;
		const coverageBonus = Math.min(25, matchedKeywords * 4); // Bonus for covering multiple keywords

		return Math.min(100, averageScore + coverageBonus);
	}

	/**
	 * Advanced experience matching considering level hierarchy and compatibility
	 */
	private calculateAdvancedExperienceMatch(
		job: Job,
		user: UserPreferences,
	): number {
		if (!user.entry_level_preference || !job.experience_required) return 50; // Neutral score

		const userLevel = user.entry_level_preference.toLowerCase();
		const jobLevel = job.experience_required.toLowerCase();

		// Experience level hierarchy (from junior to senior)
		const levelHierarchy: Record<string, number> = {
			internship: 0,
			intern: 0,
			"entry-level": 1,
			junior: 1,
			graduate: 1,
			"mid-level": 2,
			intermediate: 2,
			senior: 3,
			lead: 4,
			principal: 4,
			manager: 5,
			director: 6,
		};

		const userScore = levelHierarchy[userLevel] ?? 2;
		const jobScore = levelHierarchy[jobLevel] ?? 2;

		const levelDifference = Math.abs(userScore - jobScore);

		// Perfect match
		if (levelDifference === 0) return 100;

		// Good match (adjacent levels)
		if (levelDifference === 1) return 80;

		// Acceptable match (2 levels apart, user can grow into role)
		if (levelDifference === 2 && userScore < jobScore) return 65;

		// Poor match (too senior for user or too junior for experienced user)
		if (levelDifference >= 2) return 25;

		return 50; // Fallback
	}

	/**
	 * Advanced location matching with multiple preference tiers
	 */
	private calculateAdvancedLocationMatch(
		job: Job,
		user: UserPreferences,
	): number {
		const targetCities = Array.isArray(user.target_cities)
			? user.target_cities
			: user.target_cities
				? [user.target_cities]
				: [];

		if (targetCities.length === 0) return 50; // Neutral if no preferences

		const jobCity = job.city?.toLowerCase() || "";
		const jobCountry = job.country?.toLowerCase() || "";
		const jobLocation = job.location?.toLowerCase() || "";

		// Primary preferences (exact city match)
		const primaryMatches = targetCities.filter(
			(city) =>
				jobCity === city.toLowerCase() ||
				jobCity.includes(city.toLowerCase()) ||
				jobLocation.includes(city.toLowerCase()),
		);

		if (primaryMatches.length > 0) return 100;

		// Secondary preferences (country match)
		const countryMatches = targetCities.filter(
			(city) =>
				jobCountry.includes(city.toLowerCase()) ||
				jobLocation.includes(city.toLowerCase()),
		);

		if (countryMatches.length > 0) return 75;

		// Tertiary preferences (region/cultural proximity)
		const regionMatches = targetCities.filter((city) => {
			// European cities get regional bonus
			const europeanCities = [
				"london",
				"paris",
				"berlin",
				"amsterdam",
				"barcelona",
				"madrid",
				"rome",
				"munich",
			];
			const targetIsEuropean = europeanCities.some((ec) =>
				city.toLowerCase().includes(ec),
			);
			const jobIsEuropean = europeanCities.some(
				(ec) =>
					jobCity.includes(ec) ||
					jobCountry.includes("europe") ||
					jobCountry.includes("germany") ||
					jobCountry.includes("france") ||
					jobCountry.includes("spain") ||
					jobCountry.includes("italy") ||
					jobCountry.includes("netherlands"),
			);

			return targetIsEuropean && jobIsEuropean;
		});

		if (regionMatches.length > 0) return 50;

		// Remote work consideration
		if (
			job.work_environment?.toLowerCase().includes("remote") ||
			job.work_environment?.toLowerCase().includes("hybrid")
		) {
			return 35; // Some value for remote flexibility
		}

		// No strong match but not a complete penalty
		return 15;
	}

	/**
	 * Advanced career path matching with semantic understanding
	 */
	private calculateAdvancedCareerPathMatch(
		job: Job,
		user: UserPreferences,
	): number {
		const userCareerPaths = Array.isArray(user.career_path)
			? user.career_path
			: user.career_path
				? [user.career_path]
				: [];

		if (
			userCareerPaths.length === 0 ||
			!job.categories ||
			job.categories.length === 0
		) {
			return 40; // Neutral score
		}

		let totalRelevance = 0;
		let matchedCategories = 0;
		let strongMatches = 0;

		for (const jobCategory of job.categories) {
			let categoryScore = 0;
			let bestMatch = 0;

			// Check each user career path
			for (const userPath of userCareerPaths) {
				const matchScore = this.calculateCategoryMatchScore(
					jobCategory,
					userPath,
				);
				bestMatch = Math.max(bestMatch, matchScore);

				if (matchScore >= 80) strongMatches++;
				if (matchScore >= 60) matchedCategories++;
			}

			categoryScore = bestMatch;
			totalRelevance += categoryScore;
		}

		// Calculate overall career path compatibility
		const averageRelevance = totalRelevance / job.categories.length;
		const coverageBonus = Math.min(
			25,
			(matchedCategories / userCareerPaths.length) * 25,
		);
		const strongMatchBonus = Math.min(20, strongMatches * 5);

		return Math.min(100, averageRelevance + coverageBonus + strongMatchBonus);
	}

	/**
	 * Calculate match score between job category and user career path
	 * SIMPLIFIED: Using short form categories everywhere now
	 */
	private calculateCategoryMatchScore(
		jobCategory: string,
		userPath: string,
	): number {
		// First try exact match (most direct - preferred now with short form)
		if (this.categoryMatchesCareerPath(jobCategory, userPath)) {
			return 100;
		}

		// Try advanced matching with synonyms and related terms
		// SIMPLIFIED: Using short form category names
		const careerPathSynonyms: Record<string, string[]> = {
			strategy: ["strategy", "business-design", "consulting", "management", "planning"],
			data: ["data", "analytics", "data-science", "bi", "business-intelligence", "insights"],
			sales: ["sales", "business-development", "client-success", "account-management", "revenue"],
			marketing: ["marketing", "growth", "brand", "content", "social", "campaign"],
			finance: ["finance", "accounting", "investment", "fp&a", "financial", "budget"],
			operations: ["operations", "supply-chain", "logistics", "procurement", "efficiency"],
			product: ["product", "product-management", "innovation", "roadmap", "features"],
			tech: ["tech", "technology", "transformation", "it", "digital", "software"],
			sustainability: ["sustainability", "esg", "environmental", "social", "governance", "csr"],
			unsure: ["general", "graduate", "trainee", "rotational", "development"],
		};

		const synonyms = careerPathSynonyms[userPath] || [userPath.toLowerCase()];
		const jobCategoryLower = jobCategory.toLowerCase();

		// Check for strong synonym matches
		for (const synonym of synonyms) {
			if (jobCategoryLower.includes(synonym)) {
				return 90;
			}
		}

		// Check for partial matches
		for (const synonym of synonyms) {
			const words = synonym.split("-");
			const partialMatch = words.some(
				(word) => jobCategoryLower.includes(word) && word.length > 3,
			);
			if (partialMatch) {
				return 70;
			}
		}

		return 0;
	}

	/**
	 * Enhanced recency scoring with more granular tiers
	 */
	private calculateAdvancedRecencyScore(job: Job): number {
		const postedAt = job.posted_at ? new Date(job.posted_at) : new Date();
		const daysSincePosted =
			(Date.now() - postedAt.getTime()) / (1000 * 60 * 60 * 24);

		if (daysSincePosted <= 1) return 100; // Today
		if (daysSincePosted <= 2) return 95; // Yesterday
		if (daysSincePosted <= 3) return 85; // This week
		if (daysSincePosted <= 7) return 70; // This week
		if (daysSincePosted <= 14) return 50; // Two weeks
		if (daysSincePosted <= 21) return 35; // Three weeks
		if (daysSincePosted <= 30) return 20; // This month
		if (daysSincePosted <= 60) return 10; // Two months
		return 5; // Older posts
	}

	/**
	 * Generate detailed, contextual match reasons
	 */

	/**
	 * Check if a job category matches a user's career path
	 */
	private categoryMatchesCareerPath(
		jobCategory: string,
		careerPath: string,
	): boolean {
		// SIMPLIFIED: Using short form categories now
		// careerPath IS the database category (e.g., "finance", "data", "tech")
		const careerPathSynonyms: Record<string, string[]> = {
			strategy: ["strategy", "business-design", "consulting"],
			data: ["data", "analytics", "data-science"],
			sales: ["sales", "business-development", "client-success"],
			marketing: ["marketing", "growth", "brand"],
			finance: ["finance", "accounting", "investment"],
			operations: ["operations", "supply-chain", "logistics"],
			product: ["product", "product-management", "innovation"],
			tech: ["tech", "technology", "transformation", "it"],
			sustainability: ["sustainability", "esg", "environmental", "social"],
			unsure: ["general", "graduate", "trainee", "rotational"],
		};

		const expectedCategories = careerPathSynonyms[careerPath] || [
			careerPath.toLowerCase(),
		];
		return expectedCategories.some((expected) =>
			jobCategory.toLowerCase().includes(expected.toLowerCase()),
		);
	}

	/**
	 * Apply balanced distribution across locations and career paths
	 * Ensures all user preferences are fairly represented in results
	 */
	private applyBalancedDistribution(
		scoredJobs: FallbackMatch[],
		user: UserPreferences,
		maxMatches: number,
	): FallbackMatch[] {
		const targetCities = Array.isArray(user.target_cities)
			? user.target_cities
			: user.target_cities
				? [user.target_cities]
				: [];

		const userCareerPaths = Array.isArray(user.career_path)
			? user.career_path
			: user.career_path
				? [user.career_path]
				: [];

		// If no specific preferences, just return top matches
		if (targetCities.length === 0 && userCareerPaths.length === 0) {
			return scoredJobs.slice(0, maxMatches);
		}

		const balancedMatches: FallbackMatch[] = [];
		const locationCounts: Record<string, number> = {};
		const careerPathCounts: Record<string, number> = {};

		// Initialize counters
		targetCities.forEach((city) => {
			locationCounts[city.toLowerCase()] = 0;
		});
		userCareerPaths.forEach((path) => {
			careerPathCounts[path] = 0;
		});

		// Calculate fair distribution targets
		const locationsPerCity =
			targetCities.length > 0
				? Math.floor(maxMatches / targetCities.length)
				: maxMatches;
		const jobsPerCareerPath =
			userCareerPaths.length > 0
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
				if (
					job.categories?.some((cat) =>
						this.categoryMatchesCareerPath(cat, path),
					)
				) {
					if (careerPathCounts[path] < jobsPerCareerPath) {
						careerPathNeeded = true;
						matchingCareerPath = path;
						break;
					}
				}
			}

			// Add job if it helps balance distribution
			if (
				(targetCities.length === 0 || locationNeeded) &&
				(userCareerPaths.length === 0 || careerPathNeeded)
			) {
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
			if (balancedMatches.some((m) => m.job.job_url === match.job.job_url)) {
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
