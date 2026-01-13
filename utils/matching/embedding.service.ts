/**
 * Embedding Service for Job Matching
 * Handles generation and storage of job embeddings using OpenAI
 */

import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface JobEmbedding {
  job_hash: string;
  embedding: number[];
  created_at: string;
}

export class EmbeddingService {
  /**
   * Generate embeddings for a batch of jobs
   */
  static async batchGenerateJobEmbeddings(jobs: any[]): Promise<Map<string, number[]>> {
    const embeddings = new Map<string, number[]>();

    for (const job of jobs) {
      try {
        // Create a text representation of the job for embedding
        const jobText = `${job.title || ''} ${job.company || ''} ${job.description || ''} ${job.location || ''}`.trim();

        if (!jobText || jobText.length < 10) {
          console.warn(`⚠️  Skipping job ${job.job_hash} - insufficient content for embedding`);
          continue;
        }

        // Generate embedding using OpenAI
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: jobText,
          encoding_format: 'float',
        });

        const embedding = response.data[0]?.embedding;
        if (embedding && embedding.length > 0) {
          embeddings.set(job.job_hash, embedding);
        } else {
          console.warn(`⚠️  No embedding generated for job ${job.job_hash}`);
        }
      } catch (error) {
        console.error(`❌ Failed to generate embedding for job ${job.job_hash}:`, error);
        // Continue with other jobs
      }
    }

    return embeddings;
  }

  /**
   * Store job embeddings in the database
   */
  static async storeJobEmbeddings(embeddings: Map<string, number[]>): Promise<void> {
    // This would typically store embeddings in a vector database
    // For now, we'll just log that embeddings were generated
    console.log(`📊 Generated ${embeddings.size} embeddings`);

    // In a full implementation, this would store to a vector database like:
    // - Pinecone
    // - Weaviate
    // - Supabase with pgvector
    // - etc.
  }
}

export const embeddingService = EmbeddingService;