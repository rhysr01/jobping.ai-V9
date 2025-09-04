/* ============================
   Cost-Optimized AI Orchestrator
   Automatically selects the most cost-effective model
   ============================ */

import OpenAI from 'openai';
import { aiMatchWithProvenance, type AiProvenance } from './aiProvenance';

// Cost per 1K tokens for different models
const MODEL_COSTS = {
  'gpt-4': { input: 0.03, output: 0.06, maxTokens: 8192 },
  'gpt-4-turbo': { input: 0.01, output: 0.03, maxTokens: 128000 },
  'gpt-3.5-turbo-16k': { input: 0.003, output: 0.004, maxTokens: 16384 },
  'gpt-3.5-turbo': { input: 0.0015, output: 0.002, maxTokens: 4096 }
} as const;

type ModelName = keyof typeof MODEL_COSTS;

interface CostOptimizationConfig {
  maxCostPerMatch: number;        // Maximum cost per match in USD
  maxTotalDailyCost: number;      // Maximum daily cost in USD
  preferCheaperModels: boolean;   // Whether to prefer cheaper models
  qualityThreshold: number;       // Minimum quality score (0-1)
}

export class CostOptimizedAI {
  private dailyCost = 0;
  private dailyReset = new Date().toDateString();
  private openai: OpenAI;
  private config: CostOptimizationConfig;

  constructor(openai: OpenAI, config: Partial<CostOptimizationConfig> = {}) {
    this.openai = openai;
    this.config = {
      maxCostPerMatch: 0.01,      // $0.01 per match
      maxTotalDailyCost: 1.00,    // $1.00 per day
      preferCheaperModels: true,  // Start with cheaper models
      qualityThreshold: 0.7,      // 70% quality threshold
      ...config
    };
  }

  /**
   * Select the most cost-effective model for the job
   */
  private selectOptimalModel(
    estimatedTokens: number,
    qualityRequired: number
  ): ModelName {
    // Reset daily cost if it's a new day
    if (new Date().toDateString() !== this.dailyReset) {
      this.dailyCost = 0;
      this.dailyReset = new Date().toDateString();
    }

    // Check if we've hit daily cost limit
    if (this.dailyCost >= this.config.maxTotalDailyCost) {
      throw new Error('Daily cost limit exceeded');
    }

    // Calculate estimated cost for each model
    const modelEstimates = Object.entries(MODEL_COSTS).map(([model, costs]) => {
      const estimatedCost = (estimatedTokens / 1000) * (costs.input + costs.output);
      const canHandleTokens = estimatedTokens <= costs.maxTokens;
      
      return {
        model: model as ModelName,
        estimatedCost,
        canHandleTokens,
        quality: this.getModelQuality(model as ModelName)
      };
    });

    // Filter models that can handle the token count
    const viableModels = modelEstimates.filter(m => m.canHandleTokens);

    if (viableModels.length === 0) {
      throw new Error('No model can handle the required token count');
    }

    // Sort by cost (ascending) and quality (descending)
    const sortedModels = viableModels.sort((a, b) => {
      if (this.config.preferCheaperModels) {
        // Prefer cheaper models, but ensure quality threshold
        if (a.quality >= this.config.qualityThreshold && b.quality >= this.config.qualityThreshold) {
          return a.estimatedCost - b.estimatedCost;
        }
        // If quality is below threshold, prefer higher quality
        return b.quality - a.quality;
      } else {
        // Prefer higher quality, but respect cost limits
        if (a.estimatedCost <= this.config.maxCostPerMatch && b.estimatedCost <= this.config.maxCostPerMatch) {
          return b.quality - a.quality;
        }
        // If cost is above limit, prefer cheaper
        return a.estimatedCost - b.estimatedCost;
      }
    });

    return sortedModels[0].model;
  }

  /**
   * Get quality score for each model (0-1)
   */
  private getModelQuality(model: ModelName): number {
    const qualityScores: Record<ModelName, number> = {
      'gpt-4': 1.0,           // Best quality
      'gpt-4-turbo': 0.95,    // Very high quality
      'gpt-3.5-turbo-16k': 0.85, // High quality
      'gpt-3.5-turbo': 0.75   // Good quality
    };
    return qualityScores[model];
  }

  /**
   * Estimate token count for a prompt
   */
  private estimateTokenCount(prompt: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(prompt.length / 4);
  }

  /**
   * Optimized AI matching with cost control
   */
  async matchWithCostOptimization(
    jobs: any[],
    userPrefs: any,
    prompt: string,
    options: {
      maxRetries?: number;
      qualityRequired?: number;
      maxTokens?: number;
    } = {}
  ): Promise<{ matches: any; provenance: AiProvenance; cost: number }> {
    const estimatedTokens = this.estimateTokenCount(prompt);
    const qualityRequired = options.qualityRequired || 0.7;
    const maxTokens = options.maxTokens || Math.min(estimatedTokens * 2, 2000);

    try {
      // Select optimal model
      const selectedModel = this.selectOptimalModel(estimatedTokens, qualityRequired);
      
      console.log(`💰 Using ${selectedModel} for cost optimization (estimated: $${(estimatedTokens / 1000 * (MODEL_COSTS[selectedModel].input + MODEL_COSTS[selectedModel].output)).toFixed(4)})`);

      // Make the AI call
      const result = await aiMatchWithProvenance({
        openai: this.openai,
        model: selectedModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: maxTokens,
        maxRetries: options.maxRetries || 2
      });

      // Update daily cost
      if (result.prov.ai_cost_usd) {
        this.dailyCost += result.prov.ai_cost_usd;
        console.log(`💰 Daily cost: $${this.dailyCost.toFixed(4)} / $${this.config.maxTotalDailyCost}`);
      }

      return {
        matches: result.scores,
        provenance: result.prov,
        cost: result.prov.ai_cost_usd || 0
      };

    } catch (error) {
      console.error('Cost-optimized AI matching failed:', error);
      
      // Return fallback provenance
      const fallbackProvenance: AiProvenance = {
        match_algorithm: 'rules',
        fallback_reason: error instanceof Error ? error.message : 'cost_optimization_failed',
        ai_latency_ms: 0,
        ai_cost_usd: 0,
        error_category: 'unknown'
      };

      return {
        matches: null,
        provenance: fallbackProvenance,
        cost: 0
      };
    }
  }

  /**
   * Get current cost status
   */
  getCostStatus() {
    return {
      dailyCost: this.dailyCost,
      dailyLimit: this.config.maxTotalDailyCost,
      remainingBudget: this.config.maxTotalDailyCost - this.dailyCost,
      resetTime: this.dailyReset
    };
  }

  /**
   * Reset daily cost counter
   */
  resetDailyCost() {
    this.dailyCost = 0;
    this.dailyReset = new Date().toDateString();
    console.log('💰 Daily cost counter reset');
  }
}
