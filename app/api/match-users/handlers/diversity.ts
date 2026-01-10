/**
 * Diversity Domain - City and source diversity enforcement
 */

import { apiLogger } from "@/lib/api-logger";
import { logger } from "@/lib/monitoring";
import type { Job as ScrapersJob } from "@/scrapers/types";
import type { JobMatch, UserPreferences } from "@/utils/matching/types";

/**
 * Score job relevance based on user preferences
 */
function scoreJobRelevance(
	job: ScrapersJob & { freshnessTier: string },
	user: UserPreferences,
): number {
	let score = 50;
	const jobTitle = job.title.toLowerCase();
	const jobDesc = (job.description || "").toLowerCase();

	if (user.career_path && user.career_path.length > 0) {
		const roles = user.career_path;
		const hasRoleMatch = roles.some(
			(role: string) =>
				role &&
				(jobTitle.includes(role.toLowerCase()) ||
					jobDesc.includes(role.toLowerCase())),
		);
		if (hasRoleMatch) score += 30;
		else score -= 20;
	}

	if (user.career_path && user.career_path.length > 0) {
		const careerPaths = user.career_path;
		const hasCareerMatch = careerPaths.some(
			(path: string) =>
				path &&
				(jobTitle.includes(path.toLowerCase()) ||
					jobDesc.includes(path.toLowerCase())),
		);
		if (hasCareerMatch) score += 20;
	}

	if (user.entry_level_preference) {
		const entryKeywords = [
			"intern",
			"internship",
			"graduate",
			"grad",
			"entry",
			"junior",
			"trainee",
			"associate",
		];
		const seniorKeywords = [
			"senior",
			"lead",
			"principal",
			"manager",
			"director",
			"head",
		];

		const isEntryLevel = entryKeywords.some((kw) => jobTitle.includes(kw));
		const isSenior = seniorKeywords.some((kw) => jobTitle.includes(kw));

		if (
			user.entry_level_preference.toLowerCase().includes("entry") &&
			isEntryLevel
		)
			score += 15;
		if (user.entry_level_preference.toLowerCase().includes("entry") && isSenior)
			score -= 30;
	}

	return score;
}

/**
 * Ensure city diversity in matches
 */
export function ensureCityDiversity(
	matches: JobMatch[],
	unseenJobs: ScrapersJob[],
	user: UserPreferences,
): JobMatch[] {
	const userTargetCities = user.target_cities || [];

	if (userTargetCities.length < 2 || matches.length < 3) {
		apiLogger.debug(`City diversity check skipped`, {
			cityCount: userTargetCities.length,
		});
		return matches;
	}

	apiLogger.debug(`Ensuring even city distribution`, {
		targetCities: userTargetCities.length,
		availableJobs: unseenJobs.length,
	});

	const jobsPerCity = Math.floor(matches.length / userTargetCities.length);
	const extraJobs = matches.length % userTargetCities.length;

	const cityAllocations = userTargetCities.map(
		(city: string, index: number) => ({
			city,
			target: jobsPerCity + (index < extraJobs ? 1 : 0),
		}),
	);

	apiLogger.debug(`City allocation targets`, {
		allocations: cityAllocations.map((c: { city: string; target: number }) => ({
			city: c.city,
			target: c.target,
		})),
	});

	const newMatches: JobMatch[] = [];

	for (const allocation of cityAllocations) {
		const cityJobs = unseenJobs.filter((job) => {
			const jobCity = ((job as any).city || "").toLowerCase();
			const targetCity = allocation.city.toLowerCase();
			const cityMatch = jobCity === targetCity;
			const locMatch =
				!jobCity && (job.location || "").toLowerCase().includes(targetCity);
			return (
				(cityMatch || locMatch) &&
				!newMatches.some((m) => m.job_hash === job.job_hash)
			);
		});

		apiLogger.debug(`City job allocation`, {
			city: allocation.city,
			availableJobs: cityJobs.length,
			targetJobs: allocation.target,
		});

		const scoredCityJobs = cityJobs
			.map((job) => ({
				job: { ...job, freshnessTier: "unknown" },
				relevanceScore: scoreJobRelevance(
					{ ...job, freshnessTier: "unknown" },
					user,
				),
			}))
			.sort((a, b) => b.relevanceScore - a.relevanceScore);

		const jobsToAdd = scoredCityJobs.slice(0, allocation.target);

		jobsToAdd.forEach(({ job, relevanceScore }, idx) => {
			newMatches.push({
				job_index: newMatches.length + 1,
				job_hash: job.job_hash,
				match_score: relevanceScore,
				match_reason: `Top ${idx + 1} match in ${allocation.city} (relevance: ${relevanceScore})`,
				confidence_score: 0.85,
			});

			apiLogger.debug(`Added job to city matches`, {
				city: allocation.city,
				jobTitle: job.title,
				relevanceScore,
			});
		});
	}

	if (newMatches.length >= 3) {
		apiLogger.info(`Rebuilt ${newMatches.length} matches with city diversity`, {
			matchCount: newMatches.length,
		});
		return newMatches.slice(0, matches.length);
	} else {
		apiLogger.debug(`Not enough jobs across all cities`, {
			matchCount: newMatches.length,
		});
		return matches;
	}
}

/**
 * Ensure source diversity in matches
 */
export function ensureSourceDiversity(
	matches: JobMatch[],
	matchedJobs: Array<JobMatch & { source?: string; location?: string }>,
	unseenJobs: ScrapersJob[],
	userEmail: string,
): JobMatch[] {
	const sourceCounts: Record<string, number> = {};
	matchedJobs.forEach((m) => {
		const source = m.source || "unknown";
		sourceCounts[source] = (sourceCounts[source] || 0) + 1;
	});

	const maxAllowedFromOneSource = Math.ceil(matches.length / 2);
	const dominantSource = Object.entries(sourceCounts).find(
		([_, count]) => count > maxAllowedFromOneSource,
	);

	if (!dominantSource || unseenJobs.length <= 10) {
		return matches;
	}

	const [primarySource, count] = dominantSource;
	const excess = count - maxAllowedFromOneSource;

	apiLogger.debug(`Enforcing source diversity`, {
		dominantSource: primarySource,
		currentCount: count,
		maxAllowed: maxAllowedFromOneSource,
		excess: excess,
		matchCount: matches.length,
	});

	const alternativeSources = unseenJobs.filter((j) => {
		const jobSource = (j as any).source || "unknown";
		return jobSource !== primarySource;
	});

	if (alternativeSources.length === 0) {
		return matches;
	}

	const jobsFromDominantSource = matchedJobs
		.map((m, idx) => ({ match: m, index: idx }))
		.filter(({ match }) => match.source === primarySource)
		.sort((a, b) => a.match.match_score - b.match.match_score);

	const toReplace = jobsFromDominantSource.slice(0, excess);
	const updatedMatches = [...matches];

	for (let i = 0; i < toReplace.length && i < alternativeSources.length; i++) {
		const { index } = toReplace[i];
		const alternativeJob = alternativeSources[i % alternativeSources.length];

		updatedMatches[index] = {
			job_index: index + 1,
			job_hash: alternativeJob.job_hash,
			match_score: matches[index].match_score - 5,
			match_reason: `Source diversity: ${alternativeJob.title} at ${alternativeJob.company}`,
			confidence_score: 0.75,
		};

		apiLogger.debug(`Replaced job for source diversity`, {
			replacedSource: primarySource,
			newSource: (alternativeJob as any).source,
			jobTitle: alternativeJob.title,
		});
	}

	logger.debug("Enforced source diversity", {
		metadata: {
			userEmail,
			dominantSource: primarySource,
			replacedCount: toReplace.length,
			alternativeSources: [
				...new Set(
					alternativeSources.slice(0, excess).map((j) => (j as any).source),
				),
			],
		},
	});

	return updatedMatches;
}
