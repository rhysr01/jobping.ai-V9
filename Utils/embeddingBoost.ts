/**
 * Simple Embedding-Based Cosine Similarity Boost
 * Lightweight semantic matching without heavy ML dependencies
 */

export interface EmbeddingVector {
  id: string;
  vector: number[];
  type: 'job' | 'user';
  metadata?: any;
}

export interface EmbeddingMatch {
  jobId: string;
  similarity: number;
  boost: number;
  reason: string;
}

// Simple word-to-vector mapping for common tech/business terms
const WORD_EMBEDDINGS: Record<string, number[]> = {
  // Software Development
  'developer': [0.8, 0.6, 0.4, 0.2, 0.1],
  'engineer': [0.7, 0.7, 0.3, 0.3, 0.2],
  'programmer': [0.6, 0.5, 0.4, 0.1, 0.1],
  'software': [0.9, 0.4, 0.3, 0.2, 0.1],
  'frontend': [0.8, 0.2, 0.6, 0.1, 0.1],
  'backend': [0.7, 0.3, 0.5, 0.2, 0.1],
  'fullstack': [0.8, 0.3, 0.6, 0.2, 0.1],
  'mobile': [0.6, 0.2, 0.4, 0.3, 0.2],
  'web': [0.7, 0.1, 0.5, 0.1, 0.1],
  
  // Programming Languages
  'javascript': [0.8, 0.1, 0.6, 0.1, 0.1],
  'typescript': [0.8, 0.2, 0.6, 0.1, 0.1],
  'python': [0.7, 0.2, 0.5, 0.2, 0.1],
  'java': [0.6, 0.3, 0.4, 0.3, 0.2],
  'react': [0.8, 0.1, 0.7, 0.1, 0.1],
  'node': [0.7, 0.2, 0.5, 0.2, 0.1],
  'vue': [0.7, 0.1, 0.6, 0.1, 0.1],
  'angular': [0.7, 0.2, 0.5, 0.2, 0.1],
  
  // Data & Analytics
  'data': [0.2, 0.8, 0.3, 0.6, 0.4],
  'analyst': [0.1, 0.9, 0.2, 0.7, 0.5],
  'analytics': [0.2, 0.8, 0.2, 0.6, 0.4],
  'science': [0.3, 0.7, 0.4, 0.5, 0.3],
  'machine': [0.4, 0.6, 0.5, 0.4, 0.3],
  'learning': [0.3, 0.7, 0.4, 0.5, 0.3],
  'ai': [0.4, 0.6, 0.5, 0.4, 0.3],
  'sql': [0.3, 0.6, 0.4, 0.5, 0.3],
  
  // Business & Consulting
  'consultant': [0.1, 0.2, 0.8, 0.7, 0.6],
  'consulting': [0.1, 0.2, 0.8, 0.7, 0.6],
  'business': [0.1, 0.3, 0.7, 0.8, 0.6],
  'strategy': [0.1, 0.2, 0.7, 0.8, 0.7],
  'management': [0.1, 0.2, 0.6, 0.9, 0.7],
  'advisory': [0.1, 0.2, 0.8, 0.7, 0.6],
  'analysis': [0.2, 0.4, 0.6, 0.7, 0.5],
  
  // Marketing & Growth
  'marketing': [0.1, 0.2, 0.3, 0.6, 0.8],
  'digital': [0.3, 0.1, 0.4, 0.5, 0.7],
  'content': [0.2, 0.1, 0.3, 0.4, 0.8],
  'social': [0.2, 0.1, 0.2, 0.3, 0.7],
  'growth': [0.2, 0.2, 0.4, 0.6, 0.7],
  'brand': [0.1, 0.1, 0.2, 0.4, 0.8],
  'campaign': [0.1, 0.1, 0.2, 0.3, 0.7],
  
  // Finance & Operations
  'finance': [0.1, 0.3, 0.2, 0.7, 0.6],
  'financial': [0.1, 0.3, 0.2, 0.7, 0.6],
  'investment': [0.1, 0.4, 0.2, 0.8, 0.5],
  'banking': [0.1, 0.2, 0.1, 0.6, 0.7],
  'accounting': [0.1, 0.4, 0.1, 0.8, 0.5],
  'operations': [0.1, 0.2, 0.3, 0.6, 0.7],
  'process': [0.2, 0.2, 0.4, 0.6, 0.5],
  'project': [0.2, 0.2, 0.5, 0.7, 0.4],
  
  // Design & Product
  'designer': [0.3, 0.1, 0.2, 0.3, 0.6],
  'design': [0.3, 0.1, 0.2, 0.3, 0.6],
  'ui': [0.4, 0.1, 0.3, 0.2, 0.5],
  'ux': [0.4, 0.1, 0.3, 0.2, 0.5],
  'product': [0.3, 0.2, 0.4, 0.5, 0.6],
  'user': [0.2, 0.1, 0.2, 0.3, 0.5],
  'experience': [0.2, 0.1, 0.2, 0.3, 0.5],
  
  // Early Career Terms
  'graduate': [0.1, 0.1, 0.1, 0.1, 0.1],
  'junior': [0.1, 0.1, 0.1, 0.1, 0.1],
  'intern': [0.1, 0.1, 0.1, 0.1, 0.1],
  'entry': [0.1, 0.1, 0.1, 0.1, 0.1],
  'trainee': [0.1, 0.1, 0.1, 0.1, 0.1],
  'associate': [0.1, 0.1, 0.1, 0.1, 0.1]
};

// Job title embeddings (precomputed for common titles)
const JOB_TITLE_EMBEDDINGS: Record<string, number[]> = {
  'frontend developer': [0.8, 0.2, 0.6, 0.1, 0.1],
  'backend developer': [0.7, 0.3, 0.5, 0.2, 0.1],
  'full stack developer': [0.8, 0.3, 0.6, 0.2, 0.1],
  'software engineer': [0.8, 0.4, 0.5, 0.2, 0.1],
  'data analyst': [0.2, 0.8, 0.2, 0.6, 0.4],
  'data scientist': [0.3, 0.8, 0.3, 0.5, 0.3],
  'business analyst': [0.1, 0.4, 0.6, 0.7, 0.5],
  'product manager': [0.3, 0.2, 0.4, 0.5, 0.6],
  'marketing manager': [0.1, 0.2, 0.3, 0.6, 0.8],
  'sales manager': [0.1, 0.1, 0.4, 0.6, 0.8],
  'consultant': [0.1, 0.2, 0.8, 0.7, 0.6],
  'financial analyst': [0.1, 0.4, 0.2, 0.7, 0.6],
  'ux designer': [0.4, 0.1, 0.3, 0.2, 0.5],
  'ui designer': [0.4, 0.1, 0.3, 0.2, 0.5],
  'project manager': [0.2, 0.2, 0.5, 0.7, 0.4],
  'operations analyst': [0.1, 0.3, 0.3, 0.6, 0.7]
};

/**
 * Create embedding vector from text
 */
export function createEmbeddingFromText(text: string): number[] {
  if (!text) return [0, 0, 0, 0, 0];
  
  const words = text.toLowerCase().split(/\s+/);
  const embedding = [0, 0, 0, 0, 0];
  let wordCount = 0;
  
  // Check for exact job title matches first
  for (const [title, vector] of Object.entries(JOB_TITLE_EMBEDDINGS)) {
    if (text.toLowerCase().includes(title)) {
      return vector;
    }
  }
  
  // Aggregate word embeddings
  for (const word of words) {
    const cleanWord = word.replace(/[^\w]/g, '');
    if (WORD_EMBEDDINGS[cleanWord]) {
      const wordEmbedding = WORD_EMBEDDINGS[cleanWord];
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] += wordEmbedding[i];
      }
      wordCount++;
    }
  }
  
  // Normalize by word count
  if (wordCount > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= wordCount;
    }
  }
  
  return embedding;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Create user profile embedding
 */
export function createUserProfileEmbedding(
  professionalExpertise: string,
  careerPath: string[],
  rolesSelected: string[]
): number[] {
  const text = [
    professionalExpertise || '',
    ...(careerPath || []),
    ...(rolesSelected || [])
  ].join(' ').toLowerCase();
  
  return createEmbeddingFromText(text);
}

/**
 * Create job embedding
 */
export function createJobEmbedding(
  title: string,
  description: string,
  categories: string[]
): number[] {
  const text = [
    title || '',
    description || '',
    ...(categories || [])
  ].join(' ').toLowerCase();
  
  return createEmbeddingFromText(text);
}

/**
 * Calculate embedding-based similarity boost
 */
export function calculateEmbeddingBoost(
  userEmbedding: number[],
  jobEmbedding: number[],
  baseScore: number
): { boost: number; similarity: number; reason: string } {
  const similarity = cosineSimilarity(userEmbedding, jobEmbedding);
  
  // Convert similarity to boost points (0-15 points)
  let boost = 0;
  let reason = '';
  
  if (similarity > 0.8) {
    boost = 15;
    reason = 'Excellent semantic match';
  } else if (similarity > 0.6) {
    boost = 12;
    reason = 'Strong semantic match';
  } else if (similarity > 0.4) {
    boost = 8;
    reason = 'Good semantic match';
  } else if (similarity > 0.2) {
    boost = 4;
    reason = 'Moderate semantic match';
  } else {
    boost = 0;
    reason = 'Low semantic similarity';
  }
  
  // Cap the boost based on base score
  const maxBoost = Math.min(boost, Math.max(0, 100 - baseScore));
  
  return {
    boost: maxBoost,
    similarity: Math.round(similarity * 100) / 100,
    reason
  };
}

/**
 * Batch process jobs for embedding similarity
 */
export function processJobEmbeddings(
  jobs: any[],
  userProfile: {
    professionalExpertise: string;
    careerPath: string[];
    rolesSelected: string[];
  }
): EmbeddingMatch[] {
  const userEmbedding = createUserProfileEmbedding(
    userProfile.professionalExpertise,
    userProfile.careerPath,
    userProfile.rolesSelected
  );
  
  const matches: EmbeddingMatch[] = [];
  
  for (const job of jobs) {
    const jobEmbedding = createJobEmbedding(
      job.title,
      job.description,
      job.categories
    );
    
    const { boost, similarity } = calculateEmbeddingBoost(
      userEmbedding,
      jobEmbedding,
      job.match_score || 50
    );
    
    if (boost > 0) {
      matches.push({
        jobId: job.id || job.job_hash,
        similarity,
        boost,
        reason: `Semantic similarity: ${Math.round(similarity * 100)}%`
      });
    }
  }
  
  return matches.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Enhanced matching with embedding boost
 */
export function enhanceMatchingWithEmbeddings(
  jobs: any[],
  userProfile: any,
  baseMatches: any[]
): any[] {
  // Get embedding matches
  const embeddingMatches = processJobEmbeddings(jobs, userProfile);
  
  // Create boost lookup
  const boostMap = new Map<string, number>();
  embeddingMatches.forEach(match => {
    boostMap.set(match.jobId, match.boost);
  });
  
  // Apply boosts to base matches
  return baseMatches.map(match => {
    const boost = boostMap.get(match.job_hash) || 0;
    return {
      ...match,
      match_score: Math.min(100, match.match_score + boost),
      embedding_boost: boost,
      embedding_similarity: embeddingMatches.find(m => m.jobId === match.job_hash)?.similarity || 0
    };
  }).sort((a, b) => b.match_score - a.match_score);
}

/**
 * Get embedding-based job recommendations
 */
export function getEmbeddingRecommendations(
  jobs: any[],
  userProfile: any,
  limit: number = 10
): any[] {
  const embeddingMatches = processJobEmbeddings(jobs, userProfile);
  
  // Filter jobs that have embedding matches
  const recommendedJobs = jobs.filter(job => 
    embeddingMatches.some(match => match.jobId === job.id || match.jobId === job.job_hash)
  );
  
  // Sort by similarity and apply boosts
  return recommendedJobs
    .map(job => {
      const match = embeddingMatches.find(m => 
        m.jobId === job.id || m.jobId === job.job_hash
      );
      return {
        ...job,
        embedding_similarity: match?.similarity || 0,
        embedding_boost: match?.boost || 0,
        enhanced_score: (job.match_score || 50) + (match?.boost || 0)
      };
    })
    .sort((a, b) => b.enhanced_score - a.enhanced_score)
    .slice(0, limit);
}

/**
 * Analyze embedding quality and provide insights
 */
export function analyzeEmbeddingQuality(
  jobs: any[],
  userProfile: any
): {
  averageSimilarity: number;
  topMatches: number;
  coveragePercentage: number;
  insights: string[];
} {
  const embeddingMatches = processJobEmbeddings(jobs, userProfile);
  
  const averageSimilarity = embeddingMatches.length > 0 
    ? embeddingMatches.reduce((sum, match) => sum + match.similarity, 0) / embeddingMatches.length
    : 0;
  
  const topMatches = embeddingMatches.filter(match => match.similarity > 0.6).length;
  const coveragePercentage = jobs.length > 0 ? (embeddingMatches.length / jobs.length) * 100 : 0;
  
  const insights: string[] = [];
  
  if (averageSimilarity > 0.5) {
    insights.push('Strong semantic alignment between user profile and available jobs');
  } else if (averageSimilarity > 0.3) {
    insights.push('Moderate semantic alignment - consider expanding job search criteria');
  } else {
    insights.push('Low semantic alignment - user profile may need refinement');
  }
  
  if (topMatches > 5) {
    insights.push(`${topMatches} jobs show excellent semantic similarity`);
  } else if (topMatches > 0) {
    insights.push(`${topMatches} jobs show good semantic similarity`);
  } else {
    insights.push('No jobs show strong semantic similarity');
  }
  
  return {
    averageSimilarity: Math.round(averageSimilarity * 100) / 100,
    topMatches,
    coveragePercentage: Math.round(coveragePercentage * 100) / 100,
    insights
  };
}
