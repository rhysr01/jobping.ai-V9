/**
 * Metrics Tracking: Recall@50 and nDCG@5
 * Logs model performance metrics for monitoring and optimization
 */

import { getDatabaseClient } from '@/Utils/databasePool';
import { addBreadcrumb } from '@/lib/sentry-utils';

export interface MatchMetrics {
  recallAt50: number; // Recall@50: Percentage of relevant jobs in top 50 results
  ndcgAt5: number;    // nDCG@5: Normalized Discounted Cumulative Gain at position 5
  timestamp: string;
  userEmail?: string;
  matchType: 'ai' | 'rules' | 'hybrid';
}

/**
 * Calculate Recall@50
 * Recall@50 = (relevant jobs in top 50) / (total relevant jobs)
 */
export function calculateRecallAt50(
  top50Jobs: Array<{ job_hash: string; score: number }>,
  relevantJobHashes: Set<string>
): number {
  if (relevantJobHashes.size === 0) return 0;
  
  const relevantInTop50 = top50Jobs.filter(job => relevantJobHashes.has(job.job_hash)).length;
  return relevantInTop50 / relevantJobHashes.size;
}

/**
 * Calculate nDCG@5
 * nDCG@5 = DCG@5 / IDCG@5
 * DCG@5 = sum(rel_i / log2(i+1)) for i=1 to 5
 * IDCG@5 = ideal DCG (perfect ranking)
 */
export function calculateNDCGAt5(
  top5Jobs: Array<{ job_hash: string; score: number }>,
  relevantJobHashes: Set<string>
): number {
  if (top5Jobs.length === 0) return 0;
  
  // Calculate DCG@5
  let dcg = 0;
  top5Jobs.forEach((job, index) => {
    const relevance = relevantJobHashes.has(job.job_hash) ? 1 : 0;
    const position = index + 1;
    dcg += relevance / Math.log2(position + 1);
  });
  
  // Calculate IDCG@5 (perfect ranking: all relevant items first)
  const numRelevant = Math.min(5, relevantJobHashes.size);
  let idcg = 0;
  for (let i = 0; i < numRelevant; i++) {
    idcg += 1 / Math.log2(i + 2);
  }
  
  return idcg > 0 ? dcg / idcg : 0;
}

/**
 * Log metrics to database and monitoring
 */
export async function logMatchMetrics(metrics: MatchMetrics): Promise<void> {
  try {
    const supabase = getDatabaseClient();
    
    // Store metrics in database
    const { error } = await supabase
      .from('match_metrics')
      .insert({
        recall_at_50: metrics.recallAt50,
        ndcg_at_5: metrics.ndcgAt5,
        timestamp: metrics.timestamp,
        user_email: metrics.userEmail || null,
        match_type: metrics.matchType
      });
    
    if (error) {
      // Table might not exist yet - log to Sentry instead
      console.warn('Metrics table not available, logging to Sentry:', error);
    }
    
    // Log to Sentry for monitoring
    addBreadcrumb({
      message: 'Match metrics logged',
      level: 'info',
      data: {
        recallAt50: metrics.recallAt50,
        ndcgAt5: metrics.ndcgAt5,
        matchType: metrics.matchType
      }
    });
    
    // Log to console for cron job monitoring
    console.log(`[METRICS] recall@50=${metrics.recallAt50.toFixed(3)}, nDCG@5=${metrics.ndcgAt5.toFixed(3)}, type=${metrics.matchType}`);
    
  } catch (error) {
    console.error('Failed to log match metrics:', error);
    // Don't throw - metrics logging shouldn't break the main flow
  }
}

/**
 * Get recent metrics summary for dashboard
 */
export async function getMetricsSummary(days: number = 7): Promise<{
  avgRecallAt50: number;
  avgNDCGAt5: number;
  sampleCount: number;
}> {
  try {
    const supabase = getDatabaseClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const { data, error } = await supabase
      .from('match_metrics')
      .select('recall_at_50, ndcg_at_5')
      .gte('timestamp', cutoffDate.toISOString());
    
    if (error || !data || data.length === 0) {
      return { avgRecallAt50: 0, avgNDCGAt5: 0, sampleCount: 0 };
    }
    
    const avgRecallAt50 = data.reduce((sum, m) => sum + (m.recall_at_50 || 0), 0) / data.length;
    const avgNDCGAt5 = data.reduce((sum, m) => sum + (m.ndcg_at_5 || 0), 0) / data.length;
    
    return {
      avgRecallAt50,
      avgNDCGAt5,
      sampleCount: data.length
    };
  } catch (error) {
    console.error('Failed to get metrics summary:', error);
    return { avgRecallAt50: 0, avgNDCGAt5: 0, sampleCount: 0 };
  }
}

