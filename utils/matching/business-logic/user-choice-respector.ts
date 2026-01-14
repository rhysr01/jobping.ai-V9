/**
 * UserChoiceRespector - Business Logic for Respecting User Preferences
 *
 * Ensures that job matches respect and honor user selections:
 * - City Balance: Distribute across selected cities (1-3 cities)
 * - Source Diversity: Show platform value with multiple sources
 * - Career Path Balance: Premium users get balanced career path distribution
 */

import { logger } from "../../../lib/monitoring";

import type { JobMatch } from "../types";

export class UserChoiceRespector {
	/**
	 * Ensure city distribution matches user selections (1-3 cities)
	 * Distributes matches evenly across user's selected cities
	 */
	static distributeBySelectedCities(
		matches: JobMatch[],
		userCities: string[],
	): JobMatch[] {
		if (!userCities || userCities.length <= 1 || matches.length === 0) {
			return matches; // No distribution needed for single city or no matches
		}

		const cityCounts = new Map<string, number>();
		const targetPerCity = Math.floor(matches.length / userCities.length);
		const remainder = matches.length % userCities.length;

		// Group matches by city (case-insensitive matching)
		const matchesByCity = new Map<string, JobMatch[]>();
		matches.forEach((match) => {
			const jobCity = match.job?.city?.toLowerCase();
			if (!jobCity) return;

			const matchedUserCity = userCities.find(
				(userCity) =>
					jobCity.includes(userCity.toLowerCase()) ||
					userCity.toLowerCase().includes(jobCity),
			);

			if (matchedUserCity) {
				if (!matchesByCity.has(matchedUserCity)) {
					matchesByCity.set(matchedUserCity, []);
				}
				matchesByCity.get(matchedUserCity)?.push(match);
			}
		});

		// Distribute evenly across selected cities
		const distributed: JobMatch[] = [];
		userCities.forEach((city, index) => {
			const cityMatches = matchesByCity.get(city) || [];
			const targetCount = targetPerCity + (index < remainder ? 1 : 0);

			// Take target number from this city's matches
			distributed.push(...cityMatches.slice(0, targetCount));
			cityCounts.set(city, cityMatches.slice(0, targetCount).length);
		});

		// Fill remaining slots with best available matches
		const remainingSlots = matches.length - distributed.length;
		if (remainingSlots > 0) {
			const usedIds = new Set(distributed.map((m) => m.job?.id));
			const remainingMatches = matches.filter((m) => !usedIds.has(m.job?.id));
			distributed.push(...remainingMatches.slice(0, remainingSlots));
		}

		logger.info("Applied city distribution", {
			userCities,
			originalCount: matches.length,
			distribution: Object.fromEntries(cityCounts),
			finalCount: distributed.length,
		});

		return distributed.slice(0, matches.length); // Ensure we don't exceed original count
	}

	/**
	 * Ensure at least 2 job sources in matches (shows platform value)
	 * Demonstrates the breadth of your multi-source job aggregation
	 */
	static ensureSourceDiversity(matches: JobMatch[]): JobMatch[] {
		if (matches.length < 3) return matches; // Don't force diversity for small sets

		const sourceGroups = new Map<string, JobMatch[]>();
		matches.forEach((match) => {
			const source = match.job?.source || "unknown";
			if (!sourceGroups.has(source)) {
				sourceGroups.set(source, []);
			}
			sourceGroups.get(source)?.push(match);
		});

		// If we already have multiple sources, ensure at least 2 are well represented
		if (sourceGroups.size >= 2) {
			const diverseMatches: JobMatch[] = [];
			const sources = Array.from(sourceGroups.keys());

			// Take roughly half from first source
			const firstSourceCount = Math.ceil(matches.length / 2);
			diverseMatches.push(
				...(sourceGroups.get(sources[0])?.slice(0, firstSourceCount) || []),
			);

			// Take remaining from second source
			const secondSourceCount = matches.length - firstSourceCount;
			diverseMatches.push(
				...(sourceGroups.get(sources[1])?.slice(0, secondSourceCount) || []),
			);

			// Fill any remaining slots from other sources
			const remainingNeeded = matches.length - diverseMatches.length;
			if (remainingNeeded > 0) {
				const usedIds = new Set(diverseMatches.map((m) => m.job?.id));
				const remainingMatches = matches.filter((m) => !usedIds.has(m.job?.id));
				diverseMatches.push(...remainingMatches.slice(0, remainingNeeded));
			}

			logger.info("Applied source diversity", {
				totalSources: sourceGroups.size,
				representedSources: Math.min(2, sourceGroups.size),
				originalCount: matches.length,
				diverseCount: diverseMatches.length,
			});

			return diverseMatches.slice(0, matches.length);
		}

		// If only one source, return as-is (can't force diversity)
		logger.debug("Source diversity not applied - only one source available", {
			source: Array.from(sourceGroups.keys())[0],
			matchCount: matches.length,
		});

		return matches;
	}

	/**
	 * For premium users with 2 career paths: distribute matches across both paths
	 * Premium feature that justifies the subscription price
	 */
	static distributeByCareerPaths(
		matches: JobMatch[],
		userPaths: string[],
	): JobMatch[] {
		if (!userPaths || userPaths.length !== 2 || matches.length < 2) {
			return matches; // Only for users with exactly 2 paths and enough matches
		}

		const pathMatches = new Map<string, JobMatch[]>();

		// Group matches by career path
		matches.forEach((match) => {
			const jobCategories = match.job?.categories || [];
			const matchedPath = userPaths.find((path) =>
				jobCategories.some(
					(cat) =>
						cat.toLowerCase().includes(path.toLowerCase()) ||
						path.toLowerCase().includes(cat.toLowerCase()),
				),
			);

			if (matchedPath) {
				if (!pathMatches.has(matchedPath)) {
					pathMatches.set(matchedPath, []);
				}
				pathMatches.get(matchedPath)?.push(match);
			}
		});

		// If we have matches for both paths, distribute roughly 50/50
		if (pathMatches.size >= 2) {
			const distributed: JobMatch[] = [];
			const halfCount = Math.floor(matches.length / 2);
			const remainder = matches.length % 2;

			userPaths.forEach((path, index) => {
				const pathSpecificMatches = pathMatches.get(path) || [];
				const targetCount = halfCount + (index === 0 ? remainder : 0);
				distributed.push(...pathSpecificMatches.slice(0, targetCount));
			});

			// Fill remaining slots with best available matches
			const remainingSlots = matches.length - distributed.length;
			if (remainingSlots > 0) {
				const usedIds = new Set(distributed.map((m) => m.job?.id));
				const remainingMatches = matches.filter((m) => !usedIds.has(m.job?.id));
				distributed.push(...remainingMatches.slice(0, remainingSlots));
			}

			logger.info("Applied career path distribution", {
				userPaths,
				originalCount: matches.length,
				pathDistribution: Object.fromEntries(
					userPaths.map((path) => [path, pathMatches.get(path)?.length || 0]),
				),
				finalCount: distributed.length,
			});

			return distributed.slice(0, matches.length);
		}

		// If we don't have matches for both paths, return as-is
		logger.debug(
			"Career path distribution not applied - matches not found for both paths",
			{
				userPaths,
				availablePaths: Array.from(pathMatches.keys()),
				matchCount: matches.length,
			},
		);

		return matches;
	}

	/**
	 * Apply all user choice respect logic in the optimal order
	 */
	static applyAllBusinessLogic(
		matches: JobMatch[],
		userCities: string[],
		userPaths: string[],
		isPremium: boolean,
	): JobMatch[] {
		let processedMatches = [...matches];

		// 1. City distribution (fundamental user preference)
		processedMatches = UserChoiceRespector.distributeBySelectedCities(
			processedMatches,
			userCities,
		);

		// 2. Source diversity (platform value demonstration)
		processedMatches =
			UserChoiceRespector.ensureSourceDiversity(processedMatches);

		// 3. Career path balance (premium feature)
		if (isPremium && userPaths?.length === 2) {
			processedMatches = UserChoiceRespector.distributeByCareerPaths(
				processedMatches,
				userPaths,
			);
		}

		logger.info("Applied all user choice respect logic", {
			originalCount: matches.length,
			finalCount: processedMatches.length,
			cityDistribution: userCities.length > 1,
			sourceDiversity: true,
			careerBalance: isPremium && userPaths?.length === 2,
			isPremium,
		});

		return processedMatches;
	}
}
