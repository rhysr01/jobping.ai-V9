// Utils/matching/semanticRetrieval.ts

import type { Job as ScrapersJob } from "@/scrapers/types";
import { getDatabaseClient } from "@/Utils/databasePool";
import type { UserPreferences } from "@/Utils/matching/types";
import { getDatabaseCategoriesForForm } from "./categoryMapper";
import { embeddingService } from "./embedding.service";

export interface SemanticJob extends ScrapersJob {
	semantic_score: number;
	embedding_distance: number;
}

/**
 * Semantic retrieval using pgvector for better job matching
 * This addresses the issue where keyword matching misses semantically relevant jobs
 */
export class SemanticRetrievalService {
	private supabase = getDatabaseClient();

	/**
	 * Get top 200 semantically relevant jobs for a user using vector embeddings
	 * Uses pgvector similarity search with cosine distance
	 */
	async getSemanticCandidates(
		userPrefs: UserPreferences,
		limit: number = 200,
	): Promise<SemanticJob[]> {
		try {
			// Check if semantic search is available first
			const isAvailable = await this.isSemanticSearchAvailable();
			if (!isAvailable) {
				console.warn("Semantic search not available - pgvector extension or embeddings missing");
				return [];
			}

			// Step 1: Generate user embedding
			const userEmbedding =
				await embeddingService.generateUserEmbedding(userPrefs);

			if (!userEmbedding || userEmbedding.length === 0) {
				console.warn("Failed to generate user embedding");
				return [];
			}

			// Step 2: Query jobs using embedding similarity
			const cityFilter = Array.isArray(userPrefs.target_cities)
				? userPrefs.target_cities
				: userPrefs.target_cities
					? [userPrefs.target_cities]
					: null;

			// CRITICAL: Map form career path values to database categories
			// Form values: ['strategy', 'finance'] → DB categories: ['strategy-business-design', 'finance-investment']
			let careerPathFilter: string[] | null = null;
			if (userPrefs.career_path && userPrefs.career_path.length > 0) {
				careerPathFilter = [];
				userPrefs.career_path.forEach((formValue) => {
					// Map form value to database categories
					const dbCategories = getDatabaseCategoriesForForm(formValue);
					careerPathFilter?.push(...dbCategories);
				});
				// Remove duplicates
				careerPathFilter = [...new Set(careerPathFilter)];
			}

			// Convert embedding to Postgres array format for RPC call
			// Note: Supabase RPC expects the embedding as a string representation
			const { data: jobs, error } = await this.supabase.rpc(
				"match_jobs_by_embedding",
				{
					query_embedding: userEmbedding, // Pass as array directly
					match_threshold: 0.65, // 65% similarity threshold (adjustable)
					match_count: limit,
					city_filter: cityFilter,
					career_path_filter: careerPathFilter, // Now properly mapped to DB categories
				},
			);

			if (error) {
				// Check if it's a vector operator error (pgvector not installed)
				if (error.message?.includes("operator does not exist") || 
				    error.message?.includes("vector") ||
				    error.code === "42883") {
					console.warn(
						"pgvector extension not available - semantic search disabled",
						error,
					);
					return [];
				}
				console.warn(
					"Semantic search failed, falling back to rule-based matching:",
					error,
				);
				return [];
			}

			// Transform results to match SemanticJob interface
			return (jobs || []).map((job: any) => ({
				...job,
				semantic_score: job.semantic_score || 0,
				embedding_distance: job.embedding_distance || 0,
			})) as SemanticJob[];
		} catch (error) {
			console.warn("Semantic retrieval error:", error);
			return [];
		}
	}



	/**
	 * Check if semantic search is available
	 * Returns true if pgvector extension and job embeddings are set up
	 */
	async isSemanticSearchAvailable(): Promise<boolean> {
		try {
			const { data, error } = await this.supabase
				.from("jobs")
				.select("id")
				.not("embedding", "is", null)
				.limit(1);

			return !error && data && data.length > 0;
		} catch {
			return false;
		}
	}
}

// Export singleton instance
export const semanticRetrievalService = new SemanticRetrievalService();
