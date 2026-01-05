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
      // Step 1: Generate user embedding
      const userEmbedding =
        await embeddingService.generateUserEmbedding(userPrefs);

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
        console.warn(
          "Semantic search failed, falling back to keyword search:",
          error,
        );
        return await this.getSemanticCandidatesFallback(userPrefs, limit);
      }

      // Transform results to match SemanticJob interface
      return (jobs || []).map((job: any) => ({
        ...job,
        semantic_score: job.semantic_score || 0,
        embedding_distance: job.embedding_distance || 0,
      })) as SemanticJob[];
    } catch (error) {
      console.warn("Semantic retrieval error:", error);
      // Fallback to text-based search if embeddings not available
      return await this.getSemanticCandidatesFallback(userPrefs, limit);
    }
  }

  /**
   * Fallback to text-based semantic search if embeddings not available
   */
  private async getSemanticCandidatesFallback(
    userPrefs: UserPreferences,
    limit: number,
  ): Promise<SemanticJob[]> {
    try {
      const semanticQuery = this.buildSemanticQuery(userPrefs);

      const { data: jobs, error } = await this.supabase.rpc(
        "search_jobs_semantic",
        {
          query_text: semanticQuery,
          match_threshold: 0.3,
          match_count: limit,
        },
      );

      if (error) {
        console.warn("Fallback semantic search also failed:", error);
        return [];
      }

      return (jobs || []).map((job: any) => ({
        ...job,
        semantic_score: job.semantic_score || 0,
        embedding_distance: job.embedding_distance || 0,
      })) as SemanticJob[];
    } catch (error) {
      console.warn("Fallback semantic retrieval error:", error);
      return [];
    }
  }

  /**
   * Build a semantic query string from user preferences
   * This creates a rich text representation for vector search
   */
  private buildSemanticQuery(userPrefs: UserPreferences): string {
    const parts: string[] = [];

    // Career path and roles
    if (userPrefs.career_path && userPrefs.career_path.length > 0) {
      parts.push(`Career: ${userPrefs.career_path.join(", ")}`);
    }

    if (userPrefs.roles_selected && userPrefs.roles_selected.length > 0) {
      parts.push(`Roles: ${userPrefs.roles_selected.join(", ")}`);
    }

    // Work environment preferences
    if (userPrefs.work_environment) {
      parts.push(`Work environment: ${userPrefs.work_environment}`);
    }

    // Experience level
    if (userPrefs.entry_level_preference) {
      parts.push(`Experience level: ${userPrefs.entry_level_preference}`);
    }

    // Company types
    if (userPrefs.company_types && userPrefs.company_types.length > 0) {
      parts.push(`Company types: ${userPrefs.company_types.join(", ")}`);
    }

    // Languages
    if (userPrefs.languages_spoken && userPrefs.languages_spoken.length > 0) {
      parts.push(`Languages: ${userPrefs.languages_spoken.join(", ")}`);
    }

    // Target cities
    if (userPrefs.target_cities && userPrefs.target_cities.length > 0) {
      parts.push(`Location: ${userPrefs.target_cities.join(", ")}`);
    }

    return parts.join(". ");
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
