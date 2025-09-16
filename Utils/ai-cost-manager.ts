/**
 * AI Cost Management System
 * Prevents runaway costs and implements smart model selection
 */

import { createClient } from '@supabase/supabase-js';

interface DailyCostLimits {
  maxDailyCost: number;
  maxCallsPerUser: number;
  maxCallsPerDay: number;
  emergencyStopThreshold: number;
}

interface CostMetrics {
  dailyCost: number;
  dailyCalls: number;
  userCalls: Record<string, number>;
  lastReset: string;
}

export class AICostManager {
  private supabase: any;
  private dailyLimits: DailyCostLimits;
  private costMetrics: CostMetrics;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    this.dailyLimits = {
      maxDailyCost: parseFloat(process.env.AI_MAX_DAILY_COST || '15'), // $15/day
      maxCallsPerUser: parseInt(process.env.AI_MAX_CALLS_PER_USER || '5'),
      maxCallsPerDay: parseInt(process.env.AI_MAX_CALLS_PER_DAY || '200'),
      emergencyStopThreshold: parseFloat(process.env.AI_EMERGENCY_STOP || '20') // $20/day
    };

    this.costMetrics = {
      dailyCost: 0,
      dailyCalls: 0,
      userCalls: {},
      lastReset: new Date().toISOString().split('T')[0]
    };
  }

  /**
   * Check if AI call is allowed and track costs
   */
  async canMakeAICall(userEmail: string, estimatedCost: number): Promise<{
    allowed: boolean;
    reason?: string;
    suggestedModel?: 'gpt-3.5-turbo' | 'gpt-4';
  }> {
    await this.loadDailyMetrics();

    // Emergency stop
    if (this.costMetrics.dailyCost >= this.dailyLimits.emergencyStopThreshold) {
      return { allowed: false, reason: 'Emergency cost limit reached' };
    }

    // Daily cost limit
    if (this.costMetrics.dailyCost + estimatedCost > this.dailyLimits.maxDailyCost) {
      return { 
        allowed: false, 
        reason: 'Daily cost limit would be exceeded',
        suggestedModel: 'gpt-3.5-turbo' // Suggest cheaper model
      };
    }

    // Daily call limit
    if (this.costMetrics.dailyCalls >= this.dailyLimits.maxCallsPerDay) {
      return { allowed: false, reason: 'Daily call limit reached' };
    }

    // Per-user call limit
    const userCallCount = this.costMetrics.userCalls[userEmail] || 0;
    if (userCallCount >= this.dailyLimits.maxCallsPerUser) {
      return { allowed: false, reason: 'User call limit reached' };
    }

    return { allowed: true };
  }

  /**
   * Record AI call cost and usage
   */
  async recordAICall(
    userEmail: string, 
    model: string, 
    actualCost: number,
    tokens: number
  ): Promise<void> {
    await this.loadDailyMetrics();

    // Update metrics
    this.costMetrics.dailyCost += actualCost;
    this.costMetrics.dailyCalls += 1;
    this.costMetrics.userCalls[userEmail] = (this.costMetrics.userCalls[userEmail] || 0) + 1;

    // Save to database
    await this.supabase
      .from('ai_usage_logs')
      .insert({
        user_email: userEmail,
        model: model,
        cost_usd: actualCost,
        tokens_used: tokens,
        created_at: new Date().toISOString()
      });

    // Update daily metrics
    await this.updateDailyMetrics();
  }

  /**
   * Smart model selection based on cost and complexity
   */
  selectOptimalModel(
    jobCount: number, 
    userComplexity: number,
    userTier: 'free' | 'premium'
  ): 'gpt-3.5-turbo' | 'gpt-4' {
    // Free users always get GPT-3.5
    if (userTier === 'free') {
      return 'gpt-3.5-turbo';
    }

    // Premium users get GPT-4 for complex cases only
    const complexityScore = (jobCount / 20) + (userComplexity / 10);
    
    if (complexityScore > 1.5) {
      return 'gpt-4';
    }
    
    return 'gpt-3.5-turbo';
  }

  /**
   * Estimate cost for a potential AI call
   */
  estimateCost(model: 'gpt-3.5-turbo' | 'gpt-4', jobCount: number): number {
    const pricing = {
      'gpt-3.5-turbo': { input: 0.001 / 1000, output: 0.002 / 1000 },
      'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 }
    };

    // Estimate tokens based on job count
    const estimatedInputTokens = jobCount * 150 + 200; // ~150 tokens per job + prompt
    const estimatedOutputTokens = Math.min(jobCount * 20, 500); // ~20 tokens per match

    const inputCost = estimatedInputTokens * pricing[model].input;
    const outputCost = estimatedOutputTokens * pricing[model].output;

    return inputCost + outputCost;
  }

  /**
   * Get current cost metrics
   */
  async getCostMetrics(): Promise<CostMetrics> {
    await this.loadDailyMetrics();
    return { ...this.costMetrics };
  }

  private async loadDailyMetrics(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    if (this.costMetrics.lastReset !== today) {
      // Reset daily metrics
      this.costMetrics = {
        dailyCost: 0,
        dailyCalls: 0,
        userCalls: {},
        lastReset: today
      };
    }

    // Load from database
    const { data } = await this.supabase
      .from('ai_usage_logs')
      .select('*')
      .gte('created_at', today);

    if (data) {
      this.costMetrics.dailyCost = data.reduce((sum, log) => sum + log.cost_usd, 0);
      this.costMetrics.dailyCalls = data.length;
      
      // Count per-user calls
      data.forEach((log: any) => {
        this.costMetrics.userCalls[log.user_email] = 
          (this.costMetrics.userCalls[log.user_email] || 0) + 1;
      });
    }
  }

  private async updateDailyMetrics(): Promise<void> {
    // Could implement caching here for better performance
  }
}

// Singleton instance
export const aiCostManager = new AICostManager();
