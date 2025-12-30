/**
 * Integration module for batch processing and embeddings
 * Provides wrapper functions to integrate with existing architecture
 */

import type { Job } from "@/scrapers/types";
import { batchMatchingProcessor } from "./batch-processor.service";
import { semanticRetrievalService } from "./semanticRetrieval";
import type { JobMatch, UserPreferences } from "./types";

export interface BatchProcessingOptions {
	enabled: boolean;
	useEmbeddings?: boolean;
	maxBatchSize?: number;
	minUsersForBatch?: number;
}

/**
 * Integrated matching service that uses batch processing when beneficial
 */
export class IntegratedMatchingService {
	/**
	 * Process users with batch optimization when group size is large enough
	 */
	async processUsersWithBatchOptimization(
		users: Array<{ email: string; preferences: UserPreferences }>,
		jobs: Job[],
		options: BatchProcessingOptions = {
			enabled: true,
			useEmbeddings: true,
			maxBatchSize: 10,
			minUsersForBatch: 5,
		},
	): Promise<
		Map<string, { matches: JobMatch[]; method: string; processingTime: number }>
	> {
		const results = new Map<
			string,
			{ matches: JobMatch[]; method: string; processingTime: number }
		>();

		// Use batch processing if enabled and user count is sufficient
		if (options.enabled && users.length >= (options.minUsersForBatch || 5)) {
			console.log(`Using batch processing for ${users.length} users`);

			const batchResults = await batchMatchingProcessor.processBatch(
				users,
				jobs,
				{
					useEmbeddings: options.useEmbeddings ?? true,
					maxBatchSize: options.maxBatchSize ?? 10,
				},
			);

			// Convert batch results to expected format
			batchResults.forEach((result, email) => {
				results.set(email, {
					matches: result.matches,
					method: result.method,
					processingTime: result.processingTime,
				});
			});
		} else {
			// Fall back to individual processing for small groups
			console.log(`Using individual processing for ${users.length} users`);

			const { createConsolidatedMatcher } = await import(
				"@/Utils/consolidatedMatchingV2"
			);
			const matcher = createConsolidatedMatcher(process.env.OPENAI_API_KEY);

			await Promise.all(
				users.map(async (user) => {
					const startTime = Date.now();
					const matchResult = await matcher.performMatching(
						jobs,
						user.preferences,
						false,
					);

					results.set(user.email, {
						matches: matchResult.matches,
						method: matchResult.method,
						processingTime: Date.now() - startTime,
					});
				}),
			);
		}

		return results;
	}

	/**
	 * Get semantic job candidates with fallback
	 */
	async getSemanticJobs(
		userPrefs: UserPreferences,
		limit: number = 200,
	): Promise<Array<Job & { semantic_score: number }>> {
		const isAvailable =
			await semanticRetrievalService.isSemanticSearchAvailable();

		if (isAvailable) {
			return await semanticRetrievalService.getSemanticCandidates(
				userPrefs,
				limit,
			);
		}

		// Fallback: return empty array, will use traditional filtering
		return [];
	}
}

// Export singleton
export const integratedMatchingService = new IntegratedMatchingService();
