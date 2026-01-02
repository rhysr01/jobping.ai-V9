/**
 * Scoring Domain - Tier-aware match scoring with weights, seniority, and bonuses
 * Extracted from consolidatedMatchingV2.ts for better organization
 */

import { apiLogger } from "@/lib/api-logger";
import { withRedis } from "@/lib/redis-client";
import { getDatabaseClient } from "@/Utils/databasePool";
import type { Job } from "../../../scrapers/types";
import type { UserPreferences } from "../types";

// ============================================
// SCORING FUNCTIONS
// ============================================

/**
 * Calculate weighted score for a job match
 * TIER-AWARE: Different base scores and weights for free vs premium users
 */
export async function calculateWeightedScore(
	job: Job,
	userPrefs: UserPreferences,
	userCities: string[],
	userCareer: string,
	userCareerPaths: string[],
): Promise<{ score: number; reasons: string[] }> {
	// TIER-AWARE: Different base scores and weights
	const isFreeTier =
		userPrefs.subscription_tier === "free" || !userPrefs.subscription_tier;
	const isPremiumTier = userPrefs.subscription_tier === "premium";

	// Same quality scoring for all users - amazing matches for everyone
	let score = 50; // Consistent base score for high-quality matching
	const reasons: string[] = [];

	const title = job.title?.toLowerCase() || "";
	const description = (job.description || "").toLowerCase();
	const company = (job.company || "").toLowerCase();
	const location = (job.location || "").toLowerCase();
	const jobText = `${title} ${description}`.toLowerCase();

	// 0. Cold-start boost for new users
	const coldStartScore = calculateColdStartScore(jobText, title, userPrefs);
	const coldStartMultiplier = isFreeTier ? 1.3 : 1.0; // Free users get 30% more boost
	score += coldStartScore.points * coldStartMultiplier;
	if (coldStartScore.points > 0) {
		reasons.push(coldStartScore.reason);
	}

	// 1. Role Type Match
	const earlyCareerScore = calculateEarlyCareerScore(
		jobText,
		title,
		job,
		userPrefs,
	);
	const roleMatchMultiplier = isFreeTier ? 1.2 : 1.0; // Free: 20% more weight
	score += earlyCareerScore.points * roleMatchMultiplier;
	if (earlyCareerScore.points > 0) {
		reasons.push(earlyCareerScore.reason);
	}

	// 2. Location Match
	const euLocationScore = calculateEULocationScore(location, userCities);
	const locationMatchMultiplier = isFreeTier ? 1.25 : 1.0; // Free: 25% more weight
	score += euLocationScore.points * locationMatchMultiplier;
	if (euLocationScore.points > 0) {
		reasons.push(euLocationScore.reason);
	}

	// 3. Career Path/Skills
	const skillScore = calculateSkillOverlapScore(
		jobText,
		userCareer,
		userCareerPaths,
	);
	const skillMatchMultiplier = 1.22; // Same quality for all users
	score += skillScore.points * skillMatchMultiplier;
	if (skillScore.points > 0) {
		reasons.push(skillScore.reason);
	}

	// 4. Company Tier
	const companyScore = calculateCompanyTierScore(company, jobText);
	const companyMatchMultiplier = 1.25; // Same quality for all users
	score += companyScore.points * companyMatchMultiplier;
	if (companyScore.points > 0) {
		reasons.push(companyScore.reason);
	}

	// 5. Extended preferences (available for all users)
	{
		// Industries match bonus (5 pts max)
		if (userPrefs.industries && userPrefs.industries.length > 0) {
			const jobIndustry = (job as any).industry || "";
			const matchesIndustry = userPrefs.industries.some(
				(industry) =>
					jobIndustry.toLowerCase().includes(industry.toLowerCase()) ||
					jobText.includes(industry.toLowerCase()),
			);
			if (matchesIndustry) {
				score += 5;
				reasons.push("Matches preferred industry");
			}
		}

		// Skills match bonus (5 pts max)
		if (userPrefs.skills && userPrefs.skills.length > 0) {
			const skillMatches = userPrefs.skills.filter((skill) =>
				jobText.includes(skill.toLowerCase()),
			).length;
			if (skillMatches > 0) {
				const skillBonus = Math.min(5, skillMatches * 1.5);
				score += skillBonus;
				reasons.push(`Matches ${skillMatches} preferred skill(s)`);
			}
		}

		// Company size preference bonus (3 pts max)
		if (
			userPrefs.company_size_preference &&
			userPrefs.company_size_preference !== "any"
		) {
			const companySize = (job as any).company_size || "";
			const matchesSize = companySize
				.toLowerCase()
				.includes(userPrefs.company_size_preference.toLowerCase());
			if (matchesSize) {
				score += 3;
				reasons.push("Matches company size preference");
			}
		}
	}

	// Apply feedback-driven penalty (multiplicative)
	const finalScore = await applyFeedbackPenalty(score, job, userPrefs);

	return { score: Math.min(100, Math.max(0, finalScore)), reasons };
}

/**
 * Apply feedback-driven penalty to match score
 * Formula: finalScore = initialScore * (1 - penalty)
 * Penalty is 0-0.3 (max 30% reduction) based on user's negative feedback
 */
async function applyFeedbackPenalty(
	initialScore: number,
	job: Job,
	userPrefs: UserPreferences,
): Promise<number> {
	const penaltyEnabled = process.env.ENABLE_FEEDBACK_PENALTY !== "false";
	if (!penaltyEnabled) {
		return initialScore;
	}

	const userEmail = userPrefs.email;
	if (!userEmail) {
		return initialScore;
	}

	try {
		const penalty = await getUserAvoidancePenalty(userEmail, job);
		const finalScore = initialScore * (1 - penalty);

		if (penalty > 0) {
			apiLogger.debug("Feedback penalty applied", {
				email: userEmail,
				jobHash: job.job_hash,
				initialScore,
				penalty,
				finalScore,
				penaltyReason: `User has ${penalty > 0.2 ? "strong" : "moderate"} avoidance pattern for this category`,
			});
		}

		return finalScore;
	} catch (error) {
		apiLogger.warn("Failed to calculate feedback penalty", {
			email: userEmail,
			jobHash: job.job_hash,
			error: error instanceof Error ? error.message : String(error),
		});
		return initialScore;
	}
}

/**
 * Get user avoidance penalty for a job category
 * Uses Redis caching to minimize database queries
 * Returns penalty value 0-0.3 (max 30% reduction)
 */
async function getUserAvoidancePenalty(
	userEmail: string,
	job: Job,
): Promise<number> {
	const category = job.categories?.[0] || "";
	if (!category) {
		return 0;
	}

	const normalizedCategory = category.toLowerCase().replace(/[^a-z0-9-]/g, "-");
	const cacheKey = `user:avoidance:${userEmail}:${normalizedCategory}`;
	const cacheTTL = 300; // 5 minutes

	const cached = await withRedis(async (client) => {
		const cached = await client.get(cacheKey);
		if (cached) {
			return parseFloat(cached);
		}
		return null;
	});

	if (cached !== null && !Number.isNaN(cached)) {
		return cached;
	}

	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const supabase = getDatabaseClient();
	const { data: feedback, error } = await supabase
		.from("match_logs")
		.select("match_quality, job_context, match_tags, created_at")
		.eq("user_email", userEmail)
		.gte("created_at", thirtyDaysAgo.toISOString())
		.order("created_at", { ascending: false })
		.limit(100);

	if (error) {
		apiLogger.warn("Failed to fetch feedback for penalty calculation", {
			email: userEmail,
			error: error.message,
		});
		await withRedis(async (client) => {
			await client.setEx(cacheKey, cacheTTL, "0");
		});
		return 0;
	}

	if (!feedback || feedback.length < 3) {
		await withRedis(async (client) => {
			await client.setEx(cacheKey, cacheTTL, "0");
		});
		return 0;
	}

	const categoryFeedback = feedback.filter((f) => {
		const ctx = f.job_context as any;
		if (!ctx) return false;

		const jobCategory =
			ctx.category || ctx.categories?.[0] || ctx.career_path || "";
		const jobCategories = Array.isArray(ctx.categories) ? ctx.categories : [];

		return (
			jobCategory.toLowerCase() === category.toLowerCase() ||
			jobCategories.some(
				(cat: string) => String(cat).toLowerCase() === category.toLowerCase(),
			)
		);
	});

	if (categoryFeedback.length < 3) {
		await withRedis(async (client) => {
			await client.setEx(cacheKey, cacheTTL, "0");
		});
		return 0;
	}

	const hides = categoryFeedback.filter(
		(f) => f.match_quality === "negative" || f.match_quality === "hide",
	).length;

	const applyClicks = categoryFeedback.filter((f) => {
		const tags = f.match_tags as any;
		if (!tags || typeof tags !== "object") return false;
		return tags.action === "apply_clicked";
	}).length;

	const regularClicks = categoryFeedback.filter((f) => {
		const tags = f.match_tags as any;
		const isApplyClick =
			tags && typeof tags === "object" && tags.action === "apply_clicked";
		return (
			!isApplyClick &&
			(f.match_quality === "positive" || f.match_quality === "click")
		);
	}).length;

	const total = categoryFeedback.length;
	const weightedClicks = regularClicks * 2 + applyClicks * 5;
	const netAvoidance = (hides - weightedClicks) / total;
	const penalty = Math.min(0.3, Math.max(0, netAvoidance));

	await withRedis(async (client) => {
		await client.setEx(cacheKey, cacheTTL, penalty.toString());
	});

	return penalty;
}

/**
 * Calculate cold-start score for new users with programme keyword boosts
 */
export function calculateColdStartScore(
	jobText: string,
	title: string,
	userPrefs: UserPreferences,
): { points: number; reason: string } {
	const isNewUser =
		!userPrefs.professional_expertise &&
		(!userPrefs.career_path || userPrefs.career_path.length === 0);

	if (!isNewUser) {
		return { points: 0, reason: "" };
	}

	const programmeKeywords = [
		"graduate scheme",
		"graduate program",
		"graduate programme",
		"trainee program",
		"internship program",
		"rotation program",
		"campus recruiting",
		"university",
		"entry level program",
		"junior program",
		"associate program",
		"apprentice",
	];

	for (const keyword of programmeKeywords) {
		if (jobText.includes(keyword)) {
			return { points: 15, reason: "graduate programme" };
		}
	}

	const structuredRoles = [
		"graduate",
		"intern",
		"trainee",
		"associate",
		"entry level",
		"junior",
		"campus hire",
		"new grad",
		"recent graduate",
	];

	for (const role of structuredRoles) {
		if (title.includes(role)) {
			return { points: 10, reason: "structured early-career role" };
		}
	}

	const largeCompanyIndicators = [
		"multinational",
		"fortune 500",
		"ftse 100",
		"dax 30",
		"cac 40",
		"blue chip",
		"established",
		"leading",
		"global",
	];

	for (const indicator of largeCompanyIndicators) {
		if (jobText.includes(indicator)) {
			return { points: 5, reason: "established company" };
		}
	}

	return { points: 0, reason: "" };
}

/**
 * Calculate early career relevance score with role type distinction
 */
export function calculateEarlyCareerScore(
	jobText: string,
	title: string,
	job?: Job,
	userPrefs?: UserPreferences,
): { points: number; reason: string } {
	const internshipTerms = [
		"intern",
		"internship",
		"stage",
		"praktikum",
		"prácticas",
		"tirocinio",
		"stagiar",
	];
	const graduateTerms = [
		"graduate",
		"new grad",
		"grad scheme",
		"grad program",
		"graduate programme",
		"trainee program",
		"grad trainee",
	];
	const juniorTerms = [
		"junior",
		"entry level",
		"associate",
		"assistant",
		"junior analyst",
		"junior consultant",
	];
	const programmeTerms = [
		"programme",
		"program",
		"scheme",
		"rotation",
		"campus",
	];
	const workingStudentTerms = [
		"werkstudent",
		"working student",
		"part-time student",
		"student worker",
		"student job",
	];

	const userPreference = userPrefs?.entry_level_preference?.toLowerCase() || "";

	let isWorkingStudentJob = false;
	for (let termIdx = 0; termIdx < workingStudentTerms.length; termIdx++) {
		const term = workingStudentTerms[termIdx];
		if (jobText.includes(term) || title.includes(term)) {
			isWorkingStudentJob = true;
			break;
		}
	}

	if (job) {
		if (job.is_internship) {
			if (userPreference.includes("intern")) {
				return { points: 25, reason: "internship (perfect match)" };
			}
			if (userPreference.includes("working student")) {
				return isWorkingStudentJob
					? { points: 25, reason: "working student role (perfect match)" }
					: {
							points: 22,
							reason: "internship (good match for working student)",
						};
			}
			return { points: 20, reason: "internship role" };
		}
		if (job.is_graduate) {
			if (userPreference.includes("grad")) {
				return { points: 25, reason: "graduate programme (perfect match)" };
			}
			return { points: 20, reason: "graduate programme" };
		}
	}

	if (userPreference.includes("working student") && isWorkingStudentJob) {
		return { points: 23, reason: "working student role (text match)" };
	}

	for (const term of internshipTerms) {
		if (jobText.includes(term) || title.includes(term)) {
			if (userPreference.includes("intern")) {
				return { points: 25, reason: "internship (preference match)" };
			}
			if (userPreference.includes("working student")) {
				return {
					points: 22,
					reason: "internship (good match for working student)",
				};
			}
			return { points: 20, reason: "internship role" };
		}
	}

	for (const term of graduateTerms) {
		if (jobText.includes(term) || title.includes(term)) {
			if (userPreference.includes("grad")) {
				return {
					points: 25,
					reason: "graduate programme (preference match)",
				};
			}
			return { points: 20, reason: "graduate programme" };
		}
	}

	for (const term of juniorTerms) {
		if (jobText.includes(term) || title.includes(term)) {
			if (
				userPreference.includes("junior") ||
				userPreference.includes("analyst")
			) {
				return { points: 22, reason: "junior role (preference match)" };
			}
			return { points: 18, reason: "junior role" };
		}
	}

	for (const term of programmeTerms) {
		if (jobText.includes(term)) {
			return { points: 20, reason: "structured programme" };
		}
	}

	const mediumValueTerms = ["coordinator", "specialist", "analyst"];
	for (const term of mediumValueTerms) {
		if (jobText.includes(term)) {
			return { points: 15, reason: "entry-level position" };
		}
	}

	const seniorTerms = [
		"senior",
		"staff",
		"principal",
		"lead",
		"manager",
		"director",
		"head",
		"vp",
		"chief",
		"executive",
	];
	for (const term of seniorTerms) {
		if (title.includes(term)) {
			return { points: -20, reason: "senior role penalty" };
		}
	}

	return { points: 0, reason: "" };
}

/**
 * Calculate EU location relevance score
 */
export function calculateEULocationScore(
	location: string,
	userCities: string[],
): { points: number; reason: string } {
	const euHints = [
		"uk",
		"united kingdom",
		"ireland",
		"germany",
		"france",
		"spain",
		"portugal",
		"italy",
		"netherlands",
		"belgium",
		"luxembourg",
		"denmark",
		"sweden",
		"norway",
		"finland",
		"amsterdam",
		"rotterdam",
		"london",
		"dublin",
		"paris",
		"berlin",
		"munich",
		"madrid",
		"barcelona",
		"lisbon",
		"milan",
		"rome",
		"stockholm",
		"copenhagen",
	];

	if (location.includes("remote") || location.includes("work from home")) {
		return { points: -10, reason: "remote job penalty" };
	}

	if (userCities.length > 0) {
		for (const city of userCities) {
			if (location.includes(city.toLowerCase())) {
				return { points: 20, reason: "target city match" };
			}
		}
	}

	for (const hint of euHints) {
		if (location.includes(hint)) {
			return { points: 15, reason: "EU location" };
		}
	}

	return { points: 0, reason: "" };
}

/**
 * Calculate skill/career overlap score with profile vectors lite
 */
export function calculateSkillOverlapScore(
	jobText: string,
	userCareer: string,
	userCareerPaths: string[],
): { points: number; reason: string } {
	let maxScore = 0;
	let bestReason = "";

	const userProfile = createUserProfileVector(userCareer, userCareerPaths);
	const jobProfile = createJobProfileVector(jobText);

	const overlapScore = calculateProfileOverlap(userProfile, jobProfile);
	if (overlapScore > 0) {
		maxScore = Math.max(maxScore, overlapScore);
		bestReason = `profile overlap (${overlapScore} points)`;
	}

	if (userCareer && jobText.includes(userCareer.toLowerCase())) {
		if (18 > maxScore) {
			maxScore = 18;
			bestReason = "direct career match";
		}
	}

	for (const path of userCareerPaths) {
		if (jobText.includes(path.toLowerCase())) {
			if (18 > maxScore) {
				maxScore = 18;
				bestReason = "career path match";
			}
		}
	}

	const careerMappings: Record<string, string[]> = {
		software: [
			"developer",
			"engineer",
			"programmer",
			"software",
			"frontend",
			"backend",
			"full stack",
			"mobile",
		],
		data: [
			"analyst",
			"data",
			"analytics",
			"data science",
			"machine learning",
			"ai",
			"business intelligence",
		],
		marketing: [
			"marketing",
			"brand",
			"digital",
			"content",
			"social media",
			"growth",
			"product marketing",
		],
		sales: [
			"sales",
			"business development",
			"account",
			"revenue",
			"partnerships",
			"commercial",
		],
		consulting: [
			"consultant",
			"advisory",
			"strategy",
			"management consulting",
			"business analysis",
		],
		finance: [
			"finance",
			"financial",
			"accounting",
			"investment",
			"banking",
			"trading",
			"risk",
		],
		product: [
			"product",
			"product management",
			"product owner",
			"product analyst",
			"product designer",
		],
		design: [
			"designer",
			"design",
			"ui",
			"ux",
			"graphic",
			"visual",
			"user experience",
		],
		operations: [
			"operations",
			"operational",
			"process",
			"supply chain",
			"logistics",
			"project management",
		],
	};

	for (const [career, keywords] of Object.entries(careerMappings)) {
		const careerLower = userCareer.toLowerCase();
		if (careerLower.includes(career)) {
			let matchCount = 0;
			for (let kwIdx = 0; kwIdx < keywords.length; kwIdx++) {
				if (jobText.includes(keywords[kwIdx])) {
					matchCount++;
				}
			}
			if (matchCount > 0) {
				const score = Math.min(15, 5 + matchCount * 3);
				if (score > maxScore) {
					maxScore = score;
					bestReason = `${career} alignment (${matchCount} keywords)`;
				}
			}
		}
	}

	return { points: maxScore, reason: bestReason };
}

/**
 * Create user profile vector (skills/industries/locations as sets)
 */
function createUserProfileVector(
	userCareer: string,
	userCareerPaths: string[],
): {
	skills: Set<string>;
	industries: Set<string>;
	locations: Set<string>;
} {
	const skills = new Set<string>();
	const industries = new Set<string>();
	const locations = new Set<string>();

	if (userCareer) {
		const careerLower = userCareer.toLowerCase();
		skills.add(careerLower);

		const careerToSkills: Record<string, string[]> = {
			software: ["programming", "development", "coding", "engineering"],
			data: ["analytics", "statistics", "machine learning", "sql", "python"],
			marketing: [
				"digital marketing",
				"content creation",
				"social media",
				"branding",
			],
			sales: ["relationship building", "negotiation", "lead generation", "CRM"],
			consulting: [
				"problem solving",
				"strategic thinking",
				"presentation",
				"analysis",
			],
			finance: [
				"financial modeling",
				"accounting",
				"investment analysis",
				"risk assessment",
			],
			product: [
				"product strategy",
				"user research",
				"roadmapping",
				"stakeholder management",
			],
			design: [
				"user experience",
				"visual design",
				"prototyping",
				"design thinking",
			],
			operations: [
				"process improvement",
				"project management",
				"supply chain",
				"logistics",
			],
		};

		for (const [career, relatedSkills] of Object.entries(careerToSkills)) {
			if (careerLower.includes(career)) {
				for (let skillIdx = 0; skillIdx < relatedSkills.length; skillIdx++) {
					skills.add(relatedSkills[skillIdx]);
				}
			}
		}
	}

	for (let pathIdx = 0; pathIdx < userCareerPaths.length; pathIdx++) {
		const pathLower = userCareerPaths[pathIdx].toLowerCase();
		industries.add(pathLower);
	}

	return { skills, industries, locations };
}

/**
 * Create job profile vector from job text
 */
function createJobProfileVector(jobText: string): {
	skills: Set<string>;
	industries: Set<string>;
	locations: Set<string>;
} {
	const skills = new Set<string>();
	const industries = new Set<string>();
	const locations = new Set<string>();

	const skillKeywords = [
		"programming",
		"development",
		"coding",
		"engineering",
		"analytics",
		"statistics",
		"machine learning",
		"sql",
		"python",
		"javascript",
		"react",
		"node",
		"aws",
		"digital marketing",
		"content creation",
		"social media",
		"branding",
		"relationship building",
		"negotiation",
		"lead generation",
		"CRM",
		"problem solving",
		"strategic thinking",
		"presentation",
		"analysis",
		"financial modeling",
		"accounting",
		"investment analysis",
		"risk assessment",
		"product strategy",
		"user research",
		"roadmapping",
		"stakeholder management",
		"user experience",
		"visual design",
		"prototyping",
		"design thinking",
		"process improvement",
		"project management",
		"supply chain",
		"logistics",
	];

	for (let skillIdx = 0; skillIdx < skillKeywords.length; skillIdx++) {
		const skill = skillKeywords[skillIdx];
		if (jobText.includes(skill)) {
			skills.add(skill);
		}
	}

	const industryKeywords = [
		"technology",
		"fintech",
		"healthcare",
		"e-commerce",
		"consulting",
		"finance",
		"marketing",
		"advertising",
		"media",
		"entertainment",
		"retail",
		"manufacturing",
		"automotive",
		"aerospace",
		"energy",
		"real estate",
		"education",
		"government",
	];

	for (
		let industryIdx = 0;
		industryIdx < industryKeywords.length;
		industryIdx++
	) {
		const industry = industryKeywords[industryIdx];
		if (jobText.includes(industry)) {
			industries.add(industry);
		}
	}

	return { skills, industries, locations };
}

/**
 * Calculate profile overlap boost (2 overlaps = boost)
 */
function calculateProfileOverlap(
	userProfile: {
		skills: Set<string>;
		industries: Set<string>;
		locations: Set<string>;
	},
	jobProfile: {
		skills: Set<string>;
		industries: Set<string>;
		locations: Set<string>;
	},
): number {
	let overlapCount = 0;

	for (const userSkill of userProfile.skills) {
		if (jobProfile.skills.has(userSkill)) {
			overlapCount++;
		}
	}

	for (const userIndustry of userProfile.industries) {
		if (jobProfile.industries.has(userIndustry)) {
			overlapCount++;
		}
	}

	for (const userLocation of userProfile.locations) {
		if (jobProfile.locations.has(userLocation)) {
			overlapCount++;
		}
	}

	if (overlapCount >= 2) {
		return Math.min(20, 5 + overlapCount * 2);
	}

	return 0;
}

/**
 * Calculate company tier/quality score
 */
export function calculateCompanyTierScore(
	company: string,
	_jobText: string,
): { points: number; reason: string } {
	const famousCompanies = [
		"google",
		"microsoft",
		"apple",
		"amazon",
		"meta",
		"facebook",
		"netflix",
		"uber",
		"airbnb",
		"tesla",
		"mckinsey",
		"bain",
		"bcg",
		"boston consulting",
		"deloitte",
		"pwc",
		"ey",
		"kpmg",
		"accenture",
		"goldman sachs",
		"jpmorgan",
		"jp morgan",
		"morgan stanley",
		"citigroup",
		"citi",
		"barclays",
		"hsbc",
		"blackrock",
		"vanguard",
		"state street",
		"unilever",
		"nestlé",
		"nestle",
		"lvmh",
		"loreal",
		"l'oreal",
		"volkswagen",
		"bmw",
		"mercedes",
		"siemens",
		"salesforce",
		"oracle",
		"sap",
		"adobe",
		"spotify",
		"booking.com",
	];

	for (const famous of famousCompanies) {
		if (company.includes(famous)) {
			return { points: 12, reason: "famous company" };
		}
	}

	return { points: 10, reason: "established company" };
}

/**
 * Calculate match quality metrics for logging and analytics
 */
export function calculateMatchQualityMetrics(
	matches: Array<{ job_hash: string; match_score: number }>,
	jobs: Job[],
	userPrefs: UserPreferences,
): {
	averageScore: number;
	scoreDistribution: {
		excellent: number;
		good: number;
		fair: number;
		poor: number;
	};
	cityCoverage: number;
	sourceDiversity: number;
} {
	const jobsArray = Array.isArray(jobs) ? jobs : [];

	if (matches.length === 0) {
		return {
			averageScore: 0,
			scoreDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
			cityCoverage: 0,
			sourceDiversity: 0,
		};
	}

	let scoreSum = 0;
	for (let i = 0; i < matches.length; i++) {
		scoreSum += matches[i].match_score;
	}
	const averageScore = scoreSum / matches.length;

	let excellent = 0;
	let good = 0;
	let fair = 0;
	let poor = 0;

	for (let i = 0; i < matches.length; i++) {
		const score = matches[i].match_score;
		if (score >= 90) {
			excellent++;
		} else if (score >= 75) {
			good++;
		} else if (score >= 65) {
			fair++;
		} else {
			poor++;
		}
	}

	const scoreDistribution = { excellent, good, fair, poor };

	const targetCities = Array.isArray(userPrefs.target_cities)
		? userPrefs.target_cities
		: userPrefs.target_cities
			? [userPrefs.target_cities]
			: [];

	const matchedCities = new Set<string>();
	for (let i = 0; i < matches.length; i++) {
		const match = matches[i];

		let job: Job | undefined;
		for (let j = 0; j < jobsArray.length; j++) {
			if (jobsArray[j].job_hash === match.job_hash) {
				job = jobsArray[j];
				break;
			}
		}

		if (job) {
			const jobLocation = (job.location || "").toLowerCase();
			for (let k = 0; k < targetCities.length; k++) {
				const city = targetCities[k];
				if (jobLocation.includes(city.toLowerCase())) {
					matchedCities.add(city);
					break;
				}
			}
		}
	}
	const cityCoverage =
		targetCities.length > 0 ? matchedCities.size / targetCities.length : 0;

	const sources = new Set<string>();
	for (let i = 0; i < matches.length; i++) {
		const match = matches[i];

		let job: Job | undefined;
		for (let j = 0; j < jobsArray.length; j++) {
			if (jobsArray[j].job_hash === match.job_hash) {
				job = jobsArray[j];
				break;
			}
		}

		if (job && (job as any).source) {
			sources.add((job as any).source);
		}
	}
	const sourceDiversity = sources.size;

	return {
		averageScore: Math.round(averageScore * 10) / 10,
		scoreDistribution,
		cityCoverage: Math.round(cityCoverage * 100) / 100,
		sourceDiversity,
	};
}
