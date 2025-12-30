/**
 * Helpers Domain - Utility functions for matching orchestration
 */

import type { Job as ScrapersJob } from "@/scrapers/types";
import {
	getStudentSatisfactionScore,
	mapFormLabelToDatabase,
	WORK_TYPE_CATEGORIES,
} from "@/Utils/matching/categoryMapper";
import { SEND_PLAN } from "@/Utils/sendConfiguration";
import type { MatchMetrics } from "./types";

/**
 * Student satisfaction job distribution - prioritizes what students told us they want
 */
export function distributeJobs(
	jobs: ScrapersJob[],
	userTier: "free" | "premium" = "free",
	_userId: string,
	userCareerPath?: string,
	userFormValues?: string[],
): { jobs: ScrapersJob[]; metrics: MatchMetrics } {
	const startTime = Date.now();

	const validJobs = jobs.filter(
		(job) => job.job_hash && job.title && job.company,
	);

	const config = SEND_PLAN[userTier];
	const targetCount = config.perSend;

	const selectedJobs = validJobs
		.sort((a, b) => {
			const satisfactionScoreA = getStudentSatisfactionScore(
				a.categories || [],
				userFormValues || [],
			);
			const satisfactionScoreB = getStudentSatisfactionScore(
				b.categories || [],
				userFormValues || [],
			);
			if (satisfactionScoreA !== satisfactionScoreB) {
				return satisfactionScoreB - satisfactionScoreA;
			}

			const userDatabaseCategory = userCareerPath
				? mapFormLabelToDatabase(userCareerPath)
				: null;
			const userPrefersAllCategories =
				!userCareerPath || userCareerPath === "Not Sure Yet / General";

			let categoryMatchA = 0;
			let categoryMatchB = 0;

			if (userDatabaseCategory && userDatabaseCategory !== "all-categories") {
				categoryMatchA = a.categories?.includes(userDatabaseCategory) ? 1 : 0;
				categoryMatchB = b.categories?.includes(userDatabaseCategory) ? 1 : 0;
			} else if (userPrefersAllCategories) {
				categoryMatchA =
					a.categories?.filter((cat: string) =>
						WORK_TYPE_CATEGORIES.includes(cat),
					).length || 0;
				categoryMatchB =
					b.categories?.filter((cat: string) =>
						WORK_TYPE_CATEGORIES.includes(cat),
					).length || 0;
			}

			if (categoryMatchA !== categoryMatchB) {
				return categoryMatchB - categoryMatchA;
			}

			const studentCriticalA =
				(a.city ? 1 : 0) +
				(a.work_environment ? 1 : 0) +
				(a.experience_required ? 1 : 0) +
				0;

			const studentCriticalB =
				(b.city ? 1 : 0) +
				(b.work_environment ? 1 : 0) +
				(b.experience_required ? 1 : 0) +
				0;

			if (studentCriticalA !== studentCriticalB) {
				return studentCriticalB - studentCriticalA;
			}

			const qualityA =
				(a.title?.length || 0) +
				(a.company?.length || 0) +
				(a.description?.length || 0);
			const qualityB =
				(b.title?.length || 0) +
				(b.company?.length || 0) +
				(b.description?.length || 0);
			if (qualityA !== qualityB) {
				return qualityB - qualityA;
			}

			const dateA = new Date(a.original_posted_date || a.created_at);
			const dateB = new Date(b.original_posted_date || b.created_at);
			return dateB.getTime() - dateA.getTime();
		})
		.slice(0, targetCount);

	const processingTime = Date.now() - startTime;

	return {
		jobs: selectedJobs,
		metrics: {
			totalJobs: jobs.length,
			distributedJobs: selectedJobs.length,
			processingTime,
			originalJobCount: jobs.length,
			validJobCount: validJobs.length,
			selectedJobCount: selectedJobs.length,
			tierDistribution: { [userTier]: selectedJobs.length },
		},
	};
}

/**
 * Performance monitoring utility
 */
export function trackPerformance(): {
	startTime: number;
	startMemory: number;
	getMetrics: () => {
		jobFetchTime: number;
		tierDistributionTime: number;
		aiMatchingTime: number;
		totalProcessingTime: number;
		memoryUsage: number;
		errors: number;
		totalRequests: number;
	};
} {
	const startTime = Date.now();
	const startMemory = process.memoryUsage().heapUsed;

	return {
		startTime,
		startMemory,
		getMetrics: () => ({
			jobFetchTime: 0,
			tierDistributionTime: 0,
			aiMatchingTime: 0,
			totalProcessingTime: Date.now() - startTime,
			memoryUsage: process.memoryUsage().heapUsed - startMemory,
			errors: 0,
			totalRequests: 1,
		}),
	};
}

/**
 * Check if job location matches target city
 */
export function matchesLocation(
	jobLocation: string,
	targetCity: string,
): boolean {
	const locLower = jobLocation.toLowerCase();
	const cityLower = targetCity.toLowerCase();
	return locLower.includes(cityLower) || cityLower.includes(locLower);
}

/**
 * Query with timeout wrapper
 */
export async function queryWithTimeout<T>(
	queryPromise: Promise<any>,
	timeoutMs: number = 10000,
): Promise<{
	data: T | null;
	error: { code: string; message: string; details?: unknown } | null;
}> {
	try {
		const timeoutPromise = new Promise((_, reject) =>
			setTimeout(() => reject(new Error("Query timeout")), timeoutMs),
		);

		const result = await Promise.race([queryPromise, timeoutPromise]);
		return {
			data: result as T,
			error: null,
		};
	} catch (err) {
		const error =
			err instanceof Error
				? {
						code: "QUERY_ERROR",
						message: err.message,
						details: err,
					}
				: {
						code: "UNKNOWN_ERROR",
						message: "Unknown query error",
						details: err,
					};

		return {
			data: null,
			error,
		};
	}
}
