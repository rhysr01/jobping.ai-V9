import { 
  aiMatchWithProvenance, 
  createCacheProvenance, 
  createRulesProvenance, 
  createHybridProvenance,
  type AiProvenance,
  JobMatchSchema,
  MatchesResponseSchema
} from '../../Utils/aiProvenance';

// Mock OpenAI client
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
} as any;

describe('Enhanced AI Provenance Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Function Calling Implementation', () => {
    it('should use function calling for structured responses', async () => {
      const mockFunctionCall = {
        choices: [{
          message: {
            function_call: {
              name: 'return_job_matches',
              arguments: JSON.stringify({
                matches: [
                  {
                    job_index: 1,
                    match_score: 85,
                    match_reason: 'Strong career path match',
                    match_quality: 'excellent',
                    confidence: 0.9
                  }
                ]
              })
            }
          },
          usage: { prompt_tokens: 100, completion_tokens: 50 }
        }],
        model: 'gpt-4'
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockFunctionCall);

      const result = await aiMatchWithProvenance({
        openai: mockOpenAI,
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test prompt' }],
        temperature: 0.3,
        max_tokens: 2000,
        promptVersion: 'v2',
        maxRetries: 3
      });

      expect(result.scores).toBeDefined();
      expect(result.prov.match_algorithm).toBe('ai');
      expect(result.prov.ai_model).toBe('gpt-4');
      expect(result.prov.retry_count).toBe(0);
      expect(result.prov.error_category).toBeUndefined();

      // Verify function calling was used
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          functions: expect.arrayContaining([
            expect.objectContaining({
              name: 'return_job_matches'
            })
          ]),
          function_call: { name: 'return_job_matches' }
        })
      );
    });

    it('should validate responses with Zod schema', async () => {
      const mockFunctionCall = {
        choices: [{
          message: {
            function_call: {
              name: 'return_job_matches',
              arguments: JSON.stringify({
                matches: [
                  {
                    job_index: 1,
                    match_score: 85,
                    match_reason: 'Strong career path match'
                  }
                ]
              })
            }
          },
          usage: { prompt_tokens: 100, completion_tokens: 50 }
        }],
        model: 'gpt-4'
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockFunctionCall);

      const result = await aiMatchWithProvenance({
        openai: mockOpenAI,
        messages: [{ role: 'user', content: 'Test' }]
      });

      expect(result.scores).toBeDefined();
      expect(Array.isArray(result.scores)).toBe(true);
      expect(result.scores[0]).toMatchObject({
        job_index: 1,
        match_score: 85,
        match_reason: 'Strong career path match'
      });
    });
  });

  describe('Retry Logic and Error Categorization', () => {
    it('should retry on rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.code = '429';

      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue({
          choices: [{
            message: {
              function_call: {
                name: 'return_job_matches',
                arguments: JSON.stringify({
                  matches: [{ job_index: 1, match_score: 80, match_reason: 'Match' }]
                })
              }
            },
            usage: { prompt_tokens: 50, completion_tokens: 25 }
          }],
          model: 'gpt-4'
        });

      const result = await aiMatchWithProvenance({
        openai: mockOpenAI,
        messages: [{ role: 'user', content: 'Test' }],
        maxRetries: 3
      });

      expect(result.prov.retry_count).toBe(2);
      expect(result.prov.error_category).toBe('rate_limit');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);
    });

    it('should not retry on parsing errors', async () => {
      const parsingError = new Error('Invalid JSON response');
      mockOpenAI.chat.completions.create.mockRejectedValue(parsingError);

      const result = await aiMatchWithProvenance({
        openai: mockOpenAI,
        messages: [{ role: 'user', content: 'Test' }],
        maxRetries: 3
      });

      expect(result.prov.match_algorithm).toBe('rules');
      expect(result.prov.error_category).toBe('parsing');
      expect(result.prov.retry_count).toBe(0);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    it('should categorize different error types correctly', async () => {
      const testCases = [
        { error: new Error('Rate limit exceeded'), expected: 'rate_limit' },
        { error: new Error('Request timeout'), expected: 'timeout' },
        { error: new Error('Invalid JSON'), expected: 'parsing' },
        { error: new Error('API error'), expected: 'unknown' }, // Generic error message won't match api_error pattern
        { error: new Error('Unknown error'), expected: 'unknown' }
      ];

      for (const { error, expected } of testCases) {
        mockOpenAI.chat.completions.create.mockRejectedValue(error);

        const result = await aiMatchWithProvenance({
          openai: mockOpenAI,
          messages: [{ role: 'user', content: 'Test' }],
          maxRetries: 1
        });

        expect(result.prov.error_category).toBe(expected);
      }
    });
  });

  describe('Schema Validation', () => {
    it('should validate individual job matches', () => {
      const validMatch = {
        job_index: 1,
        match_score: 85,
        match_reason: 'Strong match',
        match_quality: 'excellent',
        confidence: 0.9
      };

      const result = JobMatchSchema.safeParse(validMatch);
      expect(result.success).toBe(true);
    });

    it('should reject invalid job matches', () => {
      const invalidMatches = [
        { job_index: 0, match_score: 85, match_reason: 'Invalid index' }, // index < 1
        { job_index: 1, match_score: 150, match_reason: 'Invalid score' }, // score > 100
        { job_index: 1, match_score: 85 }, // missing required field
        { job_index: 1, match_score: 85, match_reason: '', match_quality: 'invalid' } // invalid enum
      ];

      invalidMatches.forEach(match => {
        const result = JobMatchSchema.safeParse(match);
        expect(result.success).toBe(false);
      });
    });

    it('should validate response arrays', () => {
      const validResponse = {
        matches: [
          { job_index: 1, match_score: 85, match_reason: 'Match 1' },
          { job_index: 2, match_score: 75, match_reason: 'Match 2' }
        ]
      };

      const result = MatchesResponseSchema.safeParse(validResponse.matches);
      expect(result.success).toBe(true);
    });
  });

  describe('Enhanced Provenance Fields', () => {
    it('should include retry count in provenance', async () => {
      const mockFunctionCall = {
        choices: [{
          message: {
            function_call: {
              name: 'return_job_matches',
              arguments: JSON.stringify({
                matches: [{ job_index: 1, match_score: 80, match_reason: 'Match' }]
              })
            }
          },
          usage: { prompt_tokens: 50, completion_tokens: 25 }
        }],
        model: 'gpt-4'
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockFunctionCall);

      const result = await aiMatchWithProvenance({
        openai: mockOpenAI,
        messages: [{ role: 'user', content: 'Test' }]
      });

      expect(result.prov.retry_count).toBe(0);
      expect(result.prov.error_category).toBeUndefined();
    });

    it('should include error category in fallback provenance', async () => {
      const parsingError = new Error('Invalid JSON response');
      mockOpenAI.chat.completions.create.mockRejectedValue(parsingError);

      const result = await aiMatchWithProvenance({
        openai: mockOpenAI,
        messages: [{ role: 'user', content: 'Test' }],
        maxRetries: 1
      });

      expect(result.prov.error_category).toBe('parsing');
      expect(result.prov.retry_count).toBe(0);
    });
  });
});
