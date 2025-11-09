/**
 * Comprehensive tests for CV Parser Service
 * Tests CV parsing, AI extraction, WOW insights
 */

import { CVParserService, getCVParser } from '@/Utils/cv/parser.service';

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }));
});

jest.mock('fetch', () => jest.fn());

describe('CV Parser Service', () => {
  let parser: CVParserService;
  let mockOpenAI: any;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.OPENAI_API_KEY = 'sk-test-123';

    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  name: 'John Doe',
                  email: 'john@example.com',
                  total_years_experience: 3,
                  current_role: 'Software Engineer',
                  current_company: 'Tech Corp',
                  previous_companies: ['Google'],
                  technical_skills: ['React', 'TypeScript'],
                  soft_skills: ['Leadership'],
                  languages: ['English'],
                  university: 'MIT',
                  degree: 'Computer Science',
                  graduation_year: 2020,
                  notable_projects: [],
                  is_currently_employed: true,
                  career_level: 'mid',
                  career_trajectory: 'upward',
                  unique_strengths: ['Full-stack'],
                  career_highlights: ['Shipped product']
                })
              }
            }]
          })
        }
      }
    };

    const OpenAI = require('openai');
    OpenAI.mockReturnValue(mockOpenAI);

    parser = new CVParserService();
  });

  describe('parseCV', () => {
    it('should parse CV from URL', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('CV content here')
      });

      const result = await parser.parseCV('https://example.com/cv.txt', 'user@example.com');

      expect(result).toBeDefined();
      expect(result?.name).toBe('John Doe');
    });

    it('should handle PDF URLs', async () => {
      const result = await parser.parseCV('https://example.com/cv.pdf', 'user@example.com');

      expect(result).toBeNull();
    });

    it('should handle fetch errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Fetch failed'));

      const result = await parser.parseCV('https://example.com/cv.txt', 'user@example.com');

      expect(result).toBeNull();
    });

    it('should handle AI parsing errors', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('CV content')
      });

      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('AI error'));

      const result = await parser.parseCV('https://example.com/cv.txt', 'user@example.com');

      expect(result).toBeNull();
    });
  });

  describe('generateWOWInsights', () => {
    it('should generate insights for experienced users', () => {
      const cvData = {
        name: 'John Doe',
        email: 'john@example.com',
        total_years_experience: 5,
        previous_companies: ['Google'],
        technical_skills: ['React', 'Node.js'],
        graduation_year: 2020,
        unique_strengths: ['Full-stack expertise']
      };

      const insights = parser.generateWOWInsights(cvData as any);

      expect(insights.length).toBeGreaterThan(0);
      expect(insights.some(i => i.includes('5 years'))).toBe(true);
    });

    it('should highlight big tech companies', () => {
      const cvData = {
        name: 'John Doe',
        email: 'john@example.com',
        previous_companies: ['Google', 'Meta'],
        technical_skills: [],
        unique_strengths: []
      };

      const insights = parser.generateWOWInsights(cvData as any);

      expect(insights.some(i => i.toLowerCase().includes('google'))).toBe(true);
    });

    it('should identify full-stack developers', () => {
      const cvData = {
        name: 'John Doe',
        email: 'john@example.com',
        technical_skills: ['React', 'Node.js', 'Python'],
        previous_companies: [],
        unique_strengths: []
      };

      const insights = parser.generateWOWInsights(cvData as any);

      expect(insights.some(i => i.toLowerCase().includes('full-stack'))).toBe(true);
    });

    it('should identify recent graduates', () => {
      const currentYear = new Date().getFullYear();
      const cvData = {
        name: 'John Doe',
        email: 'john@example.com',
        graduation_year: currentYear - 1,
        technical_skills: [],
        previous_companies: [],
        unique_strengths: []
      };

      const insights = parser.generateWOWInsights(cvData as any);

      expect(insights.some(i => i.toLowerCase().includes('recent grad'))).toBe(true);
    });
  });

  describe('getCVParser', () => {
    it('should return singleton instance', () => {
      const parser1 = getCVParser();
      const parser2 = getCVParser();

      expect(parser1).toBe(parser2);
    });
  });

  describe('parseWithAI', () => {
    it('should parse CV text with GPT-4o-mini', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('CV content here')
      });

      await parser.parseCV('https://example.com/cv.txt', 'user@example.com');

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          temperature: 0.1
        })
      );
    });

    it('should clean JSON response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('CV content')
      });

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '```json\n{"name": "John"}\n```'
          }
        }]
      });

      const result = await parser.parseCV('https://example.com/cv.txt', 'user@example.com');

      expect(result).toBeDefined();
    });
  });
});

