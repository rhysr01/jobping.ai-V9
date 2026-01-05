/**
 * Embedding Service
 * Generates and manages vector embeddings for jobs and users
 */

import OpenAI from "openai";
import type { Job } from "@/scrapers/types";
import { getDatabaseClient } from "@/Utils/databasePool";
import type { UserPreferences } from "./types";

export class EmbeddingService {
  private openai: OpenAI | null = null;
  private supabase = getDatabaseClient();
  private readonly MODEL = "text-embedding-3-small"; // 1536 dimensions, cheapest
  private readonly BATCH_SIZE = 100; // OpenAI allows up to 2048 per batch
  private readonly EMBEDDING_DIMENSION = 1536;

  /**
   * Get or initialize OpenAI client (lazy initialization)
   */
  private getOpenAIClient(): OpenAI {
    if (!this.openai) {
      const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY;

      if (!apiKey) {
        throw new Error("OPENAI_API_KEY not configured");
      }

      // Clean the API key (remove quotes, newlines, whitespace)
      const cleanedKey = apiKey
        .trim()
        .replace(/^["']|["']$/g, "") // Remove surrounding quotes
        .replace(/\n/g, "") // Remove newlines
        .replace(/\r/g, "") // Remove carriage returns
        .trim();

      if (!cleanedKey.startsWith("sk-")) {
        throw new Error(
          `Invalid OpenAI API key format: should start with "sk-" but found "${cleanedKey.substring(0, 10)}..."`,
        );
      }

      this.openai = new OpenAI({ apiKey: cleanedKey });
    }
    return this.openai;
  }

  /**
   * Generate embedding for a job
   */
  async generateJobEmbedding(job: Job): Promise<number[]> {
    const text = this.buildJobText(job);
    return await this.generateEmbedding(text);
  }

  /**
   * Generate embedding for user preferences
   */
  async generateUserEmbedding(preferences: UserPreferences): Promise<number[]> {
    const text = this.buildUserPreferencesText(preferences);
    return await this.generateEmbedding(text);
  }

  /**
   * Batch generate embeddings for multiple user preferences
   * OPTIMIZED: Single API call for all users
   */
  async batchGenerateUserEmbeddings(
    users: Array<{ email: string; preferences: UserPreferences }>,
  ): Promise<Map<string, number[]>> {
    const embeddings = new Map<string, number[]>();

    if (users.length === 0) return embeddings;

    // Build texts for batch embedding
    const texts = users.map((u) => ({
      email: u.email,
      text: this.buildUserPreferencesText(u.preferences),
    }));

    try {
      // Single API call for all users
      const response = await this.getOpenAIClient().embeddings.create({
        model: this.MODEL,
        input: texts.map((t) => t.text),
      });

      // Map embeddings back to emails
      response.data.forEach((embedding, index) => {
        embeddings.set(texts[index].email, embedding.embedding);
      });
    } catch (error) {
      console.error("Batch user embedding generation failed:", error);
      // Return empty map - will fall back to heuristic grouping
    }

    return embeddings;
  }

  /**
   * Get user embedding from cache/database or generate new one
   * OPTIMIZED: Caches embeddings by hash(profile+skills) to skip duplicates
   */
  async getUserEmbeddingWithCache(
    userEmail: string,
    preferences: UserPreferences,
  ): Promise<number[]> {
    // Generate hash of user preferences for cache key
    const prefsText = this.buildUserPreferencesText(preferences);
    const prefsHash = this.hashString(prefsText);

    // Check database first - look for user with matching hash
    try {
      const { data: user } = await this.supabase
        .from("users")
        .select("preference_embedding, preference_hash")
        .eq("email", userEmail)
        .single();

      // If embedding exists and hash matches, return cached embedding
      if (
        user?.preference_embedding &&
        Array.isArray(user.preference_embedding)
      ) {
        if (user.preference_hash === prefsHash) {
          console.log(
            `Cache hit: User ${userEmail} embedding (hash: ${prefsHash.substring(0, 8)})`,
          );
          return user.preference_embedding;
        } else {
          console.log(
            `Cache miss: User ${userEmail} preferences changed (hash mismatch)`,
          );
        }
      }
    } catch (_error) {
      // If not found or error, continue to generate
    }

    // Generate and store if not found or hash changed
    const embedding = await this.generateUserEmbedding(preferences);
    await this.storeUserEmbedding(userEmail, embedding, prefsHash);

    return embedding;
  }

  /**
   * Simple hash function for preference text
   * Returns first 16 chars of SHA-256 hash
   */
  private hashString(text: string): string {
    const crypto = require("node:crypto");
    return crypto
      .createHash("sha256")
      .update(text)
      .digest("hex")
      .substring(0, 16);
  }

  /**
   * Batch generate embeddings for multiple jobs
   * Returns map of job_hash -> embedding
   * ENHANCED: Logs token count and cost per batch for monitoring
   */
  async batchGenerateJobEmbeddings(
    jobs: Job[],
  ): Promise<Map<string, number[]>> {
    const embeddings = new Map<string, number[]>();
    let totalTokens = 0;
    let totalCost = 0;
    const startTime = Date.now();

    // Process in batches
    for (let i = 0; i < jobs.length; i += this.BATCH_SIZE) {
      const batch = jobs.slice(i, i + this.BATCH_SIZE);

      const texts = batch.map((job) => ({
        id: job.job_hash,
        text: this.buildJobText(job),
      }));

      try {
        const response = await this.getOpenAIClient().embeddings.create({
          model: this.MODEL,
          input: texts.map((t) => t.text),
        });

        // Track token usage and cost
        const batchTokens = response.usage?.total_tokens || 0;
        totalTokens += batchTokens;
        // text-embedding-3-small: $0.02 per 1M tokens
        const batchCost = (batchTokens / 1_000_000) * 0.02;
        totalCost += batchCost;

        // Map embeddings back to job hashes
        response.data.forEach((embedding, index) => {
          const key = texts[index].id ?? String((batch[index] as any).id);
          embeddings.set(key, embedding.embedding);
        });

        // Log batch metrics
        console.log(
          `Embedding batch ${Math.floor(i / this.BATCH_SIZE) + 1}: ${batch.length} jobs, ${batchTokens} tokens, $${batchCost.toFixed(6)}`,
        );

        // Rate limiting: OpenAI allows 3000 RPM for embeddings
        if (i + this.BATCH_SIZE < jobs.length) {
          await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay between batches
        }
      } catch (error) {
        console.error(`Failed to generate embeddings for batch ${i}:`, error);
        // Continue with other batches
      }
    }

    // Log total metrics for this run
    const duration = Date.now() - startTime;
    console.log(
      `[EMBEDDING COST] ${embeddings.size} embeddings, ${totalTokens} total tokens, $${totalCost.toFixed(6)} total cost, ${duration}ms duration`,
    );

    // Log to monitoring system (if available)
    try {
      const { BusinessMetrics } = await import("@/lib/monitoring");
      if (BusinessMetrics) {
        BusinessMetrics.recordAPICall(
          "/api/generate-embeddings",
          "POST",
          200,
          duration,
        );
      }
    } catch {
      // Monitoring not available, continue
    }

    return embeddings;
  }

  /**
   * Store job embeddings in database using batch update
   * OPTIMIZED: Batch updates instead of individual updates
   */
  async storeJobEmbeddings(embeddings: Map<string, number[]>): Promise<void> {
    if (embeddings.size === 0) return;

    // Update jobs individually (Supabase doesn't support batch update with different WHERE clauses)
    // But we can use Promise.all for parallel updates
    const entries = Array.from(embeddings.entries());
    const batchSize = 50; // Process 50 at a time in parallel

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);

      // Update each job individually but in parallel
      const updatePromises = batch.map(async ([jobHash, embedding]) => {
        try {
          if (!Array.isArray(embedding)) {
            console.error(
              `Embedding for job ${jobHash} is not an array`,
              typeof embedding,
            );
            return false;
          }
          if (embedding.length !== this.EMBEDDING_DIMENSION) {
            console.error(
              `Embedding length mismatch for job ${jobHash}: expected ${this.EMBEDDING_DIMENSION}, got ${embedding.length}`,
            );
            return false;
          }

          const { data: existing, error: fetchError } = await this.supabase
            .from("jobs")
            .select("id, embedding")
            .eq("job_hash", jobHash)
            .maybeSingle();

          if (fetchError) {
            console.error(
              `Pre-update fetch error for job ${jobHash}:`,
              fetchError.message,
            );
            return false;
          }

          if (!existing) {
            console.error(`No job found for hash ${jobHash} before update`);
            return false;
          }

          const { error, data } = await this.supabase
            .from("jobs")
            .update({
              embedding,
            })
            .eq("job_hash", jobHash)
            .select("id")
            .single();

          if (error || !data) {
            console.error(
              `Failed to store embedding for job ${jobHash}:`,
              error?.message ?? "no rows updated",
            );
            return false;
          }
          return true;
        } catch (error) {
          console.error(`Error storing embedding for job ${jobHash}:`, error);
          return false;
        }
      });

      const results = await Promise.all(updatePromises);
      successCount += results.filter((r) => r).length;
      errorCount += results.filter((r) => !r).length;

      // Log progress every batch
      if ((i + batchSize) % 500 === 0 || i + batchSize >= entries.length) {
        console.log(
          `  Stored ${successCount}/${entries.length} embeddings (${errorCount} errors)`,
        );
      }
    }

    console.log(
      `✅ Successfully stored ${successCount} embeddings, ${errorCount} errors`,
    );
  }

  /**
   * Store user preference embedding with hash for cache invalidation
   */
  async storeUserEmbedding(
    userEmail: string,
    embedding: number[],
    preferenceHash?: string,
  ): Promise<void> {
    try {
      const vectorLiteral = `[${embedding.join(",")}]`;
      const updateData: any = {
        preference_embedding: vectorLiteral,
      };

      if (preferenceHash) {
        updateData.preference_hash = preferenceHash;
      }

      await this.supabase
        .from("users")
        .update(updateData)
        .eq("email", userEmail);
    } catch (error) {
      console.error(`Failed to store user embedding for ${userEmail}:`, error);
    }
  }

  /**
   * Generate embedding for text using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.getOpenAIClient().embeddings.create({
        model: this.MODEL,
        input: text.substring(0, 8000), // Truncate to max token limit
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error("Failed to generate embedding:", error);
      throw error;
    }
  }

  /**
   * Build text representation of job for embedding
   */
  private buildJobText(job: Job): string {
    const metadata = job as unknown as Record<string, unknown>;
    const parts: string[] = [];

    if (job.title) parts.push(`Title: ${job.title}`);
    if (job.company) parts.push(`Company: ${job.company}`);
    if (job.location) parts.push(`Location: ${job.location}`);
    if (job.city) parts.push(`City: ${job.city}`);
    if (job.country) parts.push(`Country: ${job.country}`);

    // Add categories as keywords
    if (job.categories && job.categories.length > 0) {
      parts.push(`Categories: ${job.categories.join(", ")}`);
    }

    const salaryRange = metadata.salary_range as string | undefined;
    if (salaryRange) {
      parts.push(`Salary: ${salaryRange}`);
    }

    const experienceLevel = metadata.experience_level as string | undefined;
    if (experienceLevel) {
      parts.push(`Experience: ${experienceLevel}`);
    }

    const remoteWork = metadata.remote_work_allowed as boolean | undefined;
    if (typeof remoteWork === "boolean") {
      parts.push(`Remote work: ${remoteWork ? "Yes" : "No"}`);
    }

    const educationRequirements = metadata.education_requirements as
      | string
      | undefined;
    if (educationRequirements) {
      parts.push(`Education: ${educationRequirements}`);
    }

    const languageRequirements = metadata.language_requirements as
      | string[]
      | undefined;
    if (
      Array.isArray(languageRequirements) &&
      languageRequirements.length > 0
    ) {
      parts.push(`Languages: ${languageRequirements.join(", ")}`);
    }

    // Add work environment
    if (job.work_environment) {
      parts.push(`Work environment: ${job.work_environment}`);
    }

    return parts.join(". ");
  }

  /**
   * Build text representation of user preferences for embedding
   */
  private buildUserPreferencesText(preferences: UserPreferences): string {
    const pref = preferences as unknown as Record<string, unknown>;
    const parts: string[] = [];

    const jobTitle = pref.job_title as string | undefined;
    if (jobTitle) parts.push(`Job Title: ${jobTitle}`);

    const company = pref.company as string | undefined;
    if (company) parts.push(`Company: ${company}`);

    const location = pref.location as string | undefined;
    if (location) parts.push(`Location: ${location}`);

    const city = pref.city as string | undefined;
    if (city) parts.push(`City: ${city}`);

    const country = pref.country as string | undefined;
    if (country) parts.push(`Country: ${country}`);

    const salaryRange = pref.salary_range as string | undefined;
    if (salaryRange) {
      parts.push(`Salary: ${salaryRange}`);
    }

    const experienceLevel = pref.experience_level as string | undefined;
    if (experienceLevel) {
      parts.push(`Experience: ${experienceLevel}`);
    }

    const remoteWork = pref.remote_work_allowed as boolean | undefined;
    if (typeof remoteWork === "boolean") {
      parts.push(`Remote work: ${remoteWork ? "Yes" : "No"}`);
    }

    const educationLevel = pref.education_level as string | undefined;
    if (educationLevel) {
      parts.push(`Education: ${educationLevel}`);
    }

    const skills = pref.skills as string[] | undefined;
    if (Array.isArray(skills) && skills.length > 0) {
      parts.push(`Skills: ${skills.join(", ")}`);
    }

    const preferredLocation = pref.preferred_location as string | undefined;
    if (preferredLocation) {
      parts.push(`Preferred Location: ${preferredLocation}`);
    }

    const preferredSalary = pref.preferred_salary as string | undefined;
    if (preferredSalary) {
      parts.push(`Preferred Salary: ${preferredSalary}`);
    }

    const preferredExperience = pref.preferred_experience as string | undefined;
    if (preferredExperience) {
      parts.push(`Preferred Experience: ${preferredExperience}`);
    }

    const preferredRemoteWork = pref.preferred_remote_work as
      | boolean
      | undefined;
    if (typeof preferredRemoteWork === "boolean") {
      parts.push(
        `Preferred Remote Work: ${preferredRemoteWork ? "Yes" : "No"}`,
      );
    }

    const preferredEducation = pref.preferred_education as string | undefined;
    if (preferredEducation) {
      parts.push(`Preferred Education: ${preferredEducation}`);
    }

    const preferredSkills = pref.preferred_skills as string[] | undefined;
    if (Array.isArray(preferredSkills) && preferredSkills.length > 0) {
      parts.push(`Preferred Skills: ${preferredSkills.join(", ")}`);
    }

    return parts.join(". ");
  }

  async checkEmbeddingCoverage(): Promise<{
    total: number;
    withEmbeddings: number;
    coverage: number;
  }> {
    try {
      const totalQuery = await this.supabase
        .from("jobs")
        .select("id", { count: "exact", head: true });

      if (totalQuery.error) {
        throw totalQuery.error;
      }

      const withEmbeddingQuery = await this.supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .not("embedding", "is", null);

      if (withEmbeddingQuery.error) {
        throw withEmbeddingQuery.error;
      }

      const total = totalQuery.count ?? 0;
      const withEmbeddings = withEmbeddingQuery.count ?? 0;
      const coverage = total === 0 ? 0 : withEmbeddings / total;

      return { total, withEmbeddings, coverage };
    } catch (error) {
      console.error("Failed to calculate embedding coverage:", error);
      return { total: 0, withEmbeddings: 0, coverage: 0 };
    }
  }

  /**
   * Check if semantic search is available
   * Returns true if pgvector extension and job embeddings are set up
   */
  async isSemanticSearchAvailable(): Promise<boolean> {
    try {
      const { data: extension } = await this.supabase
        .from("pg_extension")
        .select("extname")
        .eq("extname", "pgvector")
        .single();

      if (!extension) {
        console.warn(
          "pgvector extension not found. Semantic search will not be available.",
        );
        return false;
      }

      const { data: jobsWithEmbeddings } = await this.supabase
        .from("jobs")
        .select("embedding")
        .not("embedding", "is", null)
        .limit(1);

      if (!jobsWithEmbeddings || jobsWithEmbeddings.length === 0) {
        console.warn(
          "No job embeddings found. Semantic search will not be available.",
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error("Failed to check semantic search availability:", error);
      return false;
    }
  }
}

export const embeddingService = new EmbeddingService();
