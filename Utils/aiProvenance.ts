/* ============================
   AI Provenance Tracking
   Centralized OpenAI wrapper with performance and cost tracking
   ============================ */

import OpenAI from 'openai';
import { z } from 'zod';

// Response validation schemas
export const JobMatchSchema = z.object({
  job_index: z.number().min(1),
  match_score: z.number().min(0).max(100),
  match_reason: z.string().min(1).max(500),
  match_quality: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  confidence: z.number().min(0).max(1).optional()
});

export const MatchesResponseSchema = z.array(JobMatchSchema);

// Provenance tracking interface
export interface AiProvenance {
  match_algorithm: 'ai' | 'rules' | 'hybrid';
  ai_model?: string;
  prompt_version?: string;
  ai_latency_ms?: number;
  ai_cost_usd?: number;
  cache_hit?: boolean;
  fallback_reason?: string;
  retry_count?: number;
  error_category?: 'rate_limit' | 'timeout' | 'parsing' | 'api_error' | 'unknown';
}

// Cost estimation based on OpenAI pricing (as of 2024)
const COST_PER_1K_TOKENS = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
  'gpt-3.5-turbo-16k': { input: 0.003, output: 0.004 }
};

// Estimate cost in USD based on token usage
function estimateCostUSD(
  tokensIn: number, 
  tokensOut: number, 
  model: string
): number {
  const pricing = COST_PER_1K_TOKENS[model as keyof typeof COST_PER_1K_TOKENS];
  if (!pricing) return 0;
  
  const inputCost = (tokensIn / 1000) * pricing.input;
  const outputCost = (tokensOut / 1000) * pricing.output;
  
  return Math.round((inputCost + outputCost) * 100000) / 100000; // Round to 5 decimal places
}

// Error categorization
function categorizeError(error: any): 'rate_limit' | 'timeout' | 'parsing' | 'api_error' | 'unknown' {
  if (!error) return 'unknown';
  
  const message = error.message?.toLowerCase() || '';
  const code = error.code?.toLowerCase() || '';
  
  if (message.includes('rate limit') || code.includes('429') || message.includes('quota')) {
    return 'rate_limit';
  }
  
  if (message.includes('timeout') || message.includes('timed out') || code.includes('timeout')) {
    return 'timeout';
  }
  
  if (message.includes('parse') || message.includes('json') || message.includes('invalid')) {
    return 'parsing';
  }
  
  if (code.includes('4') || code.includes('5')) {
    return 'api_error';
  }
  
  return 'unknown';
}

// Check if error is retryable
function isRetryableError(error: any): boolean {
  const category = categorizeError(error);
  return ['rate_limit', 'timeout', 'api_error'].includes(category);
}

// Delay utility for retries
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main AI matching function with provenance tracking and retry logic
export async function aiMatchWithProvenance(
  args: {
    openai: OpenAI;
    model?: string;
    messages: any[];
    temperature?: number;
    max_tokens?: number;
    promptVersion?: string;
    maxRetries?: number;
  }
): Promise<{ scores: any; prov: AiProvenance }> {
  const start = Date.now();
  const maxRetries = args.maxRetries || 3;
  let lastError: any;
  
  let prov: AiProvenance = { 
    match_algorithm: 'ai', 
    prompt_version: args.promptVersion || process.env.PROMPT_VERSION || 'v1',
    retry_count: 0
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Make the OpenAI call with function calling
      const response = await args.openai.chat.completions.create({
        model: args.model || 'gpt-4',
        messages: args.messages,
        temperature: args.temperature || 0.3,
        max_tokens: args.max_tokens || 2000,
        functions: [{
          name: 'return_job_matches',
          description: 'Return job matches in structured format',
          parameters: {
            type: 'object',
            properties: {
              matches: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    job_index: { type: 'number', minimum: 1 },
                    match_score: { type: 'number', minimum: 0, maximum: 100 },
                    match_reason: { type: 'string', maxLength: 500 },
                    match_quality: { 
                      type: 'string', 
                      enum: ['excellent', 'good', 'fair', 'poor'] 
                    },
                    confidence: { type: 'number', minimum: 0, maximum: 1 }
                  },
                  required: ['job_index', 'match_score', 'match_reason']
                }
              }
            },
            required: ['matches']
          }
        }],
        function_call: { name: 'return_job_matches' }
      });

      // Extract function call response
      const functionCall = response.choices[0]?.message?.function_call;
      if (!functionCall || functionCall.name !== 'return_job_matches') {
        throw new Error('Invalid function call response');
      }

      // Parse and validate the function arguments
      let functionArgs: any;
      try {
        functionArgs = JSON.parse(functionCall.arguments);
      } catch (parseError) {
        throw new Error(`Failed to parse function arguments: ${parseError}`);
      }

      // Validate with Zod schema
      const validatedMatches = MatchesResponseSchema.parse(functionArgs.matches);
      
      // Set provenance data
      prov.ai_model = response.model;
      prov.ai_latency_ms = Date.now() - start;
      prov.ai_cost_usd = estimateCostUSD(
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0,
        response.model
      );
      prov.retry_count = attempt - 1;

      return { scores: validatedMatches, prov };

    } catch (error: any) {
      lastError = error;
      prov.retry_count = attempt - 1;
      prov.error_category = categorizeError(error);
      
      console.error(`AI matching attempt ${attempt} failed:`, error.message);
      
      // If this is the last attempt, don't retry
      if (attempt === maxRetries) {
        break;
      }
      
      // If error is not retryable, don't retry
      if (!isRetryableError(error)) {
        console.log('Non-retryable error, stopping retries');
        break;
      }
      
      // Wait before retrying (exponential backoff)
      const delayMs = Math.pow(2, attempt - 1) * 1000;
      console.log(`Retrying in ${delayMs}ms...`);
      await delay(delayMs);
    }
  }

  // All retries failed, return fallback provenance
  prov.match_algorithm = 'rules';
  prov.fallback_reason = lastError?.message || 'max_retries_exceeded';
  prov.ai_latency_ms = Date.now() - start;
  prov.error_category = categorizeError(lastError);
  
  console.error('AI matching failed after all retries, falling back to rules');
  
  return { scores: null, prov };
}

// Helper function to create provenance for cache hits
export function createCacheProvenance(
  promptVersion?: string
): AiProvenance {
  return {
    match_algorithm: 'ai',
    prompt_version: promptVersion || process.env.PROMPT_VERSION || 'v1',
    cache_hit: true,
    ai_latency_ms: 0, // Cache hits are instant
    ai_cost_usd: 0,   // No cost for cache hits
    retry_count: 0,
    error_category: undefined
  };
}

// Helper function to create provenance for rules-based matching
export function createRulesProvenance(
  fallbackReason?: string
): AiProvenance {
  return {
    match_algorithm: 'rules',
    fallback_reason: fallbackReason || 'ai_unavailable',
    ai_latency_ms: 0,
    ai_cost_usd: 0,
    retry_count: 0,
    error_category: 'unknown'
  };
}

// Helper function to create provenance for hybrid matching
export function createHybridProvenance(
  aiProvenance: AiProvenance,
  rulesUsed: boolean = false
): AiProvenance {
  return {
    ...aiProvenance,
    match_algorithm: 'hybrid',
    fallback_reason: rulesUsed ? 'partial_ai_fallback' : undefined
  };
}
