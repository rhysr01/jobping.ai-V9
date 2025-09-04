import { 
  aiMatchWithProvenance, 
  createCacheProvenance, 
  createRulesProvenance, 
  createHybridProvenance,
  type AiProvenance 
} from '../../Utils/aiProvenance';

// Mock OpenAI client
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
} as any;

describe('AI Provenance Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('aiMatchWithProvenance', () => {
    it('should track successful AI matching with full provenance', async () => {
      const mockResponse = {
        choices: [{ 
          message: { 
            function_call: {
              name: 'return_job_matches',
              arguments: JSON.stringify({
                matches: [
                  {
                    job_index: 1,
                    match_score: 85,
                    match_reason: 'Mock AI response'
                  }
                ]
              })
            }
          } 
        }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
        model: 'gpt-4'
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await aiMatchWithProvenance({
        openai: mockOpenAI,
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test prompt' }],
        temperature: 0.3,
        max_tokens: 2000,
        promptVersion: 'v2'
      });

      expect(result.scores).toBeDefined();
      expect(Array.isArray(result.scores)).toBe(true);
      expect(result.prov.match_algorithm).toBe('ai');
      expect(result.prov.ai_model).toBe('gpt-4');
      expect(result.prov.prompt_version).toBe('v2');
             expect(result.prov.ai_latency_ms).toBeGreaterThanOrEqual(0);
       expect(result.prov.ai_cost_usd).toBeGreaterThan(0);
      expect(result.prov.cache_hit).toBeUndefined();
      expect(result.prov.fallback_reason).toBeUndefined();
    });

    it('should handle AI failures and return rules fallback provenance', async () => {
      const mockError = new Error('API rate limit exceeded');
      mockOpenAI.chat.completions.create.mockRejectedValue(mockError);

      const result = await aiMatchWithProvenance({
        openai: mockOpenAI,
        messages: [{ role: 'user', content: 'Test prompt' }]
      });

      expect(result.scores).toBeNull();
      expect(result.prov.match_algorithm).toBe('rules');
      expect(result.prov.fallback_reason).toBe('API rate limit exceeded');
             expect(result.prov.ai_latency_ms).toBeGreaterThanOrEqual(0);
      expect(result.prov.ai_cost_usd).toBeUndefined();
    });

    it('should use default prompt version when not specified', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Test response' } }],
        usage: { prompt_tokens: 50, completion_tokens: 25 },
        model: 'gpt-3.5-turbo'
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await aiMatchWithProvenance({
        openai: mockOpenAI,
        messages: [{ role: 'user', content: 'Test' }]
      });

      expect(result.prov.prompt_version).toBe('v1'); // Default from env or fallback
    });
  });

  describe('createCacheProvenance', () => {
    it('should create provenance for cache hits', () => {
      const provenance = createCacheProvenance('v3');

      expect(provenance.match_algorithm).toBe('ai');
      expect(provenance.prompt_version).toBe('v3');
      expect(provenance.cache_hit).toBe(true);
      expect(provenance.ai_latency_ms).toBe(0);
      expect(provenance.ai_cost_usd).toBe(0);
    });

    it('should use default prompt version when not specified', () => {
      const provenance = createCacheProvenance();

      expect(provenance.prompt_version).toBe('v1');
    });
  });

  describe('createRulesProvenance', () => {
    it('should create provenance for rules-based matching', () => {
      const provenance = createRulesProvenance('ai_timeout');

      expect(provenance.match_algorithm).toBe('rules');
      expect(provenance.fallback_reason).toBe('ai_timeout');
      expect(provenance.ai_latency_ms).toBe(0);
      expect(provenance.ai_cost_usd).toBe(0);
    });

    it('should use default fallback reason when not specified', () => {
      const provenance = createRulesProvenance();

      expect(provenance.fallback_reason).toBe('ai_unavailable');
    });
  });

  describe('createHybridProvenance', () => {
    it('should create hybrid provenance from AI provenance', () => {
      const aiProvenance: AiProvenance = {
        match_algorithm: 'ai',
        ai_model: 'gpt-4',
        prompt_version: 'v2',
        ai_latency_ms: 1500,
        ai_cost_usd: 0.0025
      };

      const hybridProvenance = createHybridProvenance(aiProvenance);

      expect(hybridProvenance.match_algorithm).toBe('hybrid');
      expect(hybridProvenance.ai_model).toBe('gpt-4');
      expect(hybridProvenance.prompt_version).toBe('v2');
      expect(hybridProvenance.ai_latency_ms).toBe(1500);
      expect(hybridProvenance.ai_cost_usd).toBe(0.0025);
      expect(hybridProvenance.fallback_reason).toBeUndefined();
    });

    it('should include fallback reason when rules are used', () => {
      const aiProvenance: AiProvenance = {
        match_algorithm: 'ai',
        ai_model: 'gpt-4',
        prompt_version: 'v2'
      };

      const hybridProvenance = createHybridProvenance(aiProvenance, true);

      expect(hybridProvenance.match_algorithm).toBe('hybrid');
      expect(hybridProvenance.fallback_reason).toBe('partial_ai_fallback');
    });
  });

  describe('cost estimation', () => {
    it('should estimate costs for different models', async () => {
      const gpt4Response = {
        choices: [{ 
          message: { 
            function_call: {
              name: 'return_job_matches',
              arguments: JSON.stringify({
                matches: [
                  {
                    job_index: 1,
                    match_score: 85,
                    match_reason: 'Response'
                  }
                ]
              })
            }
          } 
        }],
        usage: { prompt_tokens: 1000, completion_tokens: 500 },
        model: 'gpt-4'
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(gpt4Response);

      const result = await aiMatchWithProvenance({
        openai: mockOpenAI,
        messages: [{ role: 'user', content: 'Test' }]
      });

      // GPT-4: 1000 * 0.03/1000 + 500 * 0.06/1000 = 0.03 + 0.03 = 0.06
      expect(result.prov.ai_cost_usd).toBeCloseTo(0.06, 5);
    });

    it('should handle models without pricing gracefully', async () => {
      const unknownModelResponse = {
        choices: [{ 
          message: { 
            function_call: {
              name: 'return_job_matches',
              arguments: JSON.stringify({
                matches: [
                  {
                    job_index: 1,
                    match_score: 85,
                    match_reason: 'Response'
                  }
                ]
              })
            }
          } 
        }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
        model: 'unknown-model'
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(unknownModelResponse);

      const result = await aiMatchWithProvenance({
        openai: mockOpenAI,
        messages: [{ role: 'user', content: 'Test' }]
      });

      expect(result.prov.ai_cost_usd).toBe(0);
    });
  });
});
