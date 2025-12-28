/**
 * AI Metadata Types
 * Types for tracking AI usage, costs, and model information
 */

export interface AIMetadata {
  model: string;           // e.g., 'gpt-4o-mini'
  tokensUsed: number;      // Total tokens consumed
  costUsd: number;         // Calculated cost in USD
  latencyMs: number;       // Processing time in milliseconds
}

export interface AICostCalculation {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCostUsd: number;
  outputCostUsd: number;
  totalCostUsd: number;
}

/**
 * Calculate AI cost based on model and token usage
 * GPT-4o-mini pricing (as of 2025):
 * - Input: $0.15 per 1M tokens
 * - Output: $0.60 per 1M tokens
 */
export function calculateAICost(
  totalTokens: number,
  model: string = 'gpt-4o-mini',
  inputRatio: number = 0.8 // Typical ratio for function calling
): AICostCalculation {
  if (model === 'gpt-4o-mini') {
    const inputTokens = Math.floor(totalTokens * inputRatio);
    const outputTokens = totalTokens - inputTokens;
    
    const inputCostUsd = (inputTokens / 1_000_000) * 0.15;
    const outputCostUsd = (outputTokens / 1_000_000) * 0.60;
    const totalCostUsd = inputCostUsd + outputCostUsd;
    
    return {
      inputTokens,
      outputTokens,
      totalTokens,
      inputCostUsd,
      outputCostUsd,
      totalCostUsd
    };
  }
  
  // For other models, return zeros (can extend later)
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens,
    inputCostUsd: 0,
    outputCostUsd: 0,
    totalCostUsd: 0
  };
}

