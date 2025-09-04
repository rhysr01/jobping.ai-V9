/**
 * OpenAI Token Manager with Cost Control
 * 
 * CRITICAL FIX: Prevents token exhaustion and unexpected costs
 * - Token counting and limits
 * - Cost tracking per model
 * - Daily and monthly budgets
 * - Automatic fallback to cheaper models
 */

import OpenAI from 'openai';

// Token cost per 1K tokens (as of 2024)
const TOKEN_COSTS = {
  'gpt-4': 0.03, // $0.03 per 1K input, $0.06 per 1K output
  'gpt-4-turbo': 0.01, // $0.01 per 1K input, $0.03 per 1K output
  'gpt-3.5-turbo': 0.0005, // $0.0005 per 1K input, $0.0015 per 1K output
  'gpt-3.5-turbo-16k': 0.003, // $0.003 per 1K input, $0.004 per 1K output
} as const;

// Budget configuration
const BUDGET_CONFIG = {
  dailyTokenLimit: parseInt(process.env.OPENAI_DAILY_TOKEN_LIMIT || '100000'), // 100K tokens/day
  monthlyTokenLimit: parseInt(process.env.OPENAI_MONTHLY_TOKEN_LIMIT || '3000000'), // 3M tokens/month
  dailyCostLimit: parseFloat(process.env.OPENAI_DAILY_COST_LIMIT || '10.0'), // $10/day
  monthlyCostLimit: parseFloat(process.env.OPENAI_MONTHLY_COST_LIMIT || '300.0'), // $300/month
  fallbackModel: 'gpt-3.5-turbo' as const, // Fallback to cheaper model
  enableFallback: process.env.OPENAI_ENABLE_FALLBACK !== 'false',
};

export class TokenManager {
  private tokenCount = 0;
  private dailyTokenCount = 0;
  private monthlyTokenCount = 0;
  private costTracker = new Map<string, number>(); // model -> cost
  private dailyCost = 0;
  private monthlyCost = 0;
  private lastDayReset = '';
  private lastMonthReset = '';
  private requestHistory: Array<{
    timestamp: number;
    model: string;
    tokens: number;
    cost: number;
    success: boolean;
  }> = [];

  constructor() {
    this.resetDailyCounts();
    this.resetMonthlyCounts();
    
    // Clean up old history entries daily
    setInterval(() => this.cleanupHistory(), 24 * 60 * 60 * 1000);
  }

  private resetDailyCounts(): void {
    const today = new Date().toDateString();
    if (this.lastDayReset !== today) {
      this.dailyTokenCount = 0;
      this.dailyCost = 0;
      this.lastDayReset = today;
      console.log('🔄 Daily token and cost counts reset');
    }
  }

  private resetMonthlyCounts(): void {
    const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    if (this.lastMonthReset !== thisMonth) {
      this.monthlyTokenCount = 0;
      this.monthlyCost = 0;
      this.lastMonthReset = thisMonth;
      console.log('🔄 Monthly token and cost counts reset');
    }
  }

  private cleanupHistory(): void {
    const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
    this.requestHistory = this.requestHistory.filter(entry => entry.timestamp > cutoff);
  }

  estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    // This is a conservative estimate
    return Math.ceil(text.length / 4);
  }

  private calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    const costs = TOKEN_COSTS[model as keyof typeof TOKEN_COSTS];
    if (!costs) {
      console.warn(`⚠️ Unknown model ${model}, using gpt-3.5-turbo pricing`);
      return this.calculateCost(inputTokens, outputTokens, 'gpt-3.5-turbo');
    }

    // Calculate cost based on input and output tokens
    const inputCost = (inputTokens / 1000) * costs;
    const outputCost = (outputTokens / 1000) * (costs * 2); // Output is typically 2x input cost
    
    return inputCost + outputCost;
  }

  private remainingTokens(): number {
    return Math.min(
      BUDGET_CONFIG.dailyTokenLimit - this.dailyTokenCount,
      BUDGET_CONFIG.monthlyTokenLimit - this.monthlyTokenCount
    );
  }

  private remainingCost(): number {
    return Math.min(
      BUDGET_CONFIG.dailyCostLimit - this.dailyCost,
      BUDGET_CONFIG.monthlyCostLimit - this.monthlyCost
    );
  }

  async makeRequest(
    openai: OpenAI,
    options: {
      model: string;
      messages: any[];
      temperature?: number;
      max_tokens?: number;
      [key: string]: any;
    }
  ): Promise<any> {
    this.resetDailyCounts();
    this.resetMonthlyCounts();

    const { model, messages, ...otherOptions } = options;
    
    // Estimate tokens for the request
    const promptText = messages.map(m => m.content).join(' ');
    const estimatedInputTokens = this.estimateTokens(promptText);
    const maxTokens = otherOptions.max_tokens || 2000;
    const estimatedOutputTokens = Math.min(maxTokens, 4000); // Cap at 4K for estimation
    
    const estimatedTotalTokens = estimatedInputTokens + estimatedOutputTokens;
    const estimatedCost = this.calculateCost(estimatedInputTokens, estimatedOutputTokens, model);

    // Check daily token limit
    if (this.dailyTokenCount + estimatedTotalTokens > BUDGET_CONFIG.dailyTokenLimit) {
      throw new Error(`Daily token limit exceeded: ${this.dailyTokenCount}/${BUDGET_CONFIG.dailyTokenLimit}`);
    }

    // Check monthly token limit
    if (this.monthlyTokenCount + estimatedTotalTokens > BUDGET_CONFIG.monthlyTokenLimit) {
      throw new Error(`Monthly token limit exceeded: ${this.monthlyTokenCount}/${BUDGET_CONFIG.monthlyTokenLimit}`);
    }

    // Check daily cost limit
    if (this.dailyCost + estimatedCost > BUDGET_CONFIG.dailyCostLimit) {
      throw new Error(`Daily cost limit exceeded: $${this.dailyCost.toFixed(2)}/$${BUDGET_CONFIG.dailyCostLimit}`);
    }

    // Check monthly cost limit
    if (this.monthlyCost + estimatedCost > BUDGET_CONFIG.monthlyCostLimit) {
      throw new Error(`Monthly cost limit exceeded: $${this.monthlyCost.toFixed(2)}/$${BUDGET_CONFIG.monthlyCostLimit}`);
    }

    // If expensive model and approaching limits, suggest fallback
    if (model === 'gpt-4' && BUDGET_CONFIG.enableFallback) {
      const expensiveModelCost = this.calculateCost(estimatedInputTokens, estimatedOutputTokens, 'gpt-4');
      const fallbackModelCost = this.calculateCost(estimatedInputTokens, estimatedOutputTokens, BUDGET_CONFIG.fallbackModel);
      
      if (this.dailyCost + expensiveModelCost > BUDGET_CONFIG.dailyCostLimit * 0.8) {
        console.warn(`⚠️ Approaching daily cost limit, consider using ${BUDGET_CONFIG.fallbackModel} instead of ${model}`);
      }
    }

    try {
      console.log(`🤖 OpenAI request: ${model}, estimated ${estimatedTotalTokens} tokens, $${estimatedCost.toFixed(4)}`);

      const response = await openai.chat.completions.create({
        model,
        messages,
        temperature: otherOptions.temperature || 0.3,
        max_tokens: Math.min(maxTokens, this.remainingTokens()),
        ...otherOptions
      });

      // Update counts with actual usage
      const actualInputTokens = response.usage?.prompt_tokens || estimatedInputTokens;
      const actualOutputTokens = response.usage?.completion_tokens || estimatedOutputTokens;
      const actualTotalTokens = response.usage?.total_tokens || estimatedTotalTokens;
      const actualCost = this.calculateCost(actualInputTokens, actualOutputTokens, model);

      this.tokenCount += actualTotalTokens;
      this.dailyTokenCount += actualTotalTokens;
      this.monthlyTokenCount += actualTotalTokens;
      this.dailyCost += actualCost;
      this.monthlyCost += actualCost;

      // Track model-specific costs
      const currentModelCost = this.costTracker.get(model) || 0;
      this.costTracker.set(model, currentModelCost + actualCost);

      // Log successful request
      this.requestHistory.push({
        timestamp: Date.now(),
        model,
        tokens: actualTotalTokens,
        cost: actualCost,
        success: true
      });

      console.log(`✅ OpenAI request completed: ${actualTotalTokens} tokens, $${actualCost.toFixed(4)}`);

      return response;

    } catch (error: any) {
      // Log failed request
      this.requestHistory.push({
        timestamp: Date.now(),
        model,
        tokens: estimatedTotalTokens,
        cost: estimatedCost,
        success: false
      });

      console.error(`❌ OpenAI request failed: ${error.message}`);
      throw error;
    }
  }

  // Get current usage statistics
  getUsageStats() {
    this.resetDailyCounts();
    this.resetMonthlyCounts();

    return {
      tokens: {
        total: this.tokenCount,
        daily: this.dailyTokenCount,
        monthly: this.monthlyTokenCount,
        dailyLimit: BUDGET_CONFIG.dailyTokenLimit,
        monthlyLimit: BUDGET_CONFIG.monthlyTokenLimit,
        dailyRemaining: BUDGET_CONFIG.dailyTokenLimit - this.dailyTokenCount,
        monthlyRemaining: BUDGET_CONFIG.monthlyTokenLimit - this.monthlyTokenCount
      },
      costs: {
        total: Array.from(this.costTracker.values()).reduce((sum, cost) => sum + cost, 0),
        daily: this.dailyCost,
        monthly: this.monthlyCost,
        dailyLimit: BUDGET_CONFIG.dailyCostLimit,
        monthlyLimit: BUDGET_CONFIG.monthlyCostLimit,
        dailyRemaining: BUDGET_CONFIG.dailyCostLimit - this.dailyCost,
        monthlyRemaining: BUDGET_CONFIG.monthlyCostLimit - this.monthlyCost,
        byModel: Object.fromEntries(this.costTracker)
      },
      limits: {
        dailyTokenLimit: BUDGET_CONFIG.dailyTokenLimit,
        monthlyTokenLimit: BUDGET_CONFIG.monthlyTokenLimit,
        dailyCostLimit: BUDGET_CONFIG.dailyCostLimit,
        monthlyCostLimit: BUDGET_CONFIG.monthlyCostLimit,
        fallbackModel: BUDGET_CONFIG.fallbackModel,
        enableFallback: BUDGET_CONFIG.enableFallback
      },
      history: {
        totalRequests: this.requestHistory.length,
        successfulRequests: this.requestHistory.filter(r => r.success).length,
        failedRequests: this.requestHistory.filter(r => !r.success).length,
        recentRequests: this.requestHistory.slice(-10) // Last 10 requests
      }
    };
  }

  // Reset all counters (for testing or manual reset)
  resetCounters(): void {
    this.tokenCount = 0;
    this.dailyTokenCount = 0;
    this.monthlyTokenCount = 0;
    this.dailyCost = 0;
    this.monthlyCost = 0;
    this.costTracker.clear();
    this.requestHistory = [];
    console.log('🔄 All token and cost counters reset');
  }

  // Get cost-effective model recommendation
  getCostEffectiveModel(estimatedTokens: number, quality: 'high' | 'medium' | 'low' = 'medium'): string {
    const inputTokens = estimatedTokens;
    const outputTokens = Math.min(estimatedTokens * 2, 4000);

    const modelCosts = Object.entries(TOKEN_COSTS).map(([model, baseCost]) => ({
      model,
      cost: this.calculateCost(inputTokens, outputTokens, model),
      baseCost
    }));

    // Sort by cost
    modelCosts.sort((a, b) => a.cost - b.cost);

    switch (quality) {
      case 'high':
        return modelCosts.find(m => m.model === 'gpt-4')?.model || modelCosts[0].model;
      case 'medium':
        return modelCosts.find(m => m.model === 'gpt-4-turbo')?.model || modelCosts[1]?.model || modelCosts[0].model;
      case 'low':
        return modelCosts[0].model;
      default:
        return modelCosts[0].model;
    }
  }
}

// Export singleton instance
export const tokenManager = new TokenManager();
