import { SemanticMatchingEngine } from '../../Utils/semanticMatching';

const mockOpenAI = {
  embeddings: { create: jest.fn() },
  chat: { completions: { create: jest.fn() } }
} as any;

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis()
} as any;

describe('Semantic Matching Engine', () => {
  let semanticEngine: SemanticMatchingEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    semanticEngine = new SemanticMatchingEngine(
      mockOpenAI as any,
      'https://test.supabase.co',
      'test-key'
    );
  });

  describe('Embedding Generation', () => {
    it('should generate embeddings for text', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbedding }]
      });

      const result = await (semanticEngine as any).generateEmbedding('test text');
      expect(result).toEqual(mockEmbedding);
    });
  });

  describe('User Profile Extraction', () => {
    it('should extract user semantic profile correctly', async () => {
      const userPrefs = {
        professional_expertise: 'software development',
        entry_level_preference: 'graduate',
        career_path: ['frontend', 'fullstack'],
        company_types: ['startup', 'tech'],
        work_environment: 'remote',
        target_cities: ['London', 'Dublin'],
        languages_spoken: ['English', 'Spanish'],
        work_authorization: 'EU citizen',
        target_employment_start_date: '2024-09-01',
        roles_selected: { frontend: true, backend: false },
        professional_experience: 'entry-level'
      };

      const profile = await semanticEngine.extractUserSemanticProfile(userPrefs);
      
      expect(profile.skills).toEqual(['software development']);
      expect(profile.experience_level).toBe('graduate');
      expect(profile.career_goals).toEqual(['frontend', 'fullstack']);
      expect(profile.preferred_industries).toEqual(['startup', 'tech']);
      expect(profile.work_style).toBe('remote');
      expect(profile.location_preferences).toEqual(['London', 'Dublin']);
      expect(profile.languages).toEqual(['English', 'Spanish']);
      expect(profile.work_authorization).toBe('EU citizen');
      expect(profile.target_start_date).toBe('2024-09-01');
      expect(profile.roles_selected).toEqual({ frontend: true, backend: false });
      expect(profile.professional_experience).toBe('entry-level');
    });

    it('should handle missing user preferences gracefully', async () => {
      const userPrefs = {};
      const profile = await semanticEngine.extractUserSemanticProfile(userPrefs);
      
      expect(profile.skills).toEqual([]);
      expect(profile.experience_level).toBe('entry-level');
      expect(profile.career_goals).toEqual([]);
      expect(profile.preferred_industries).toEqual([]);
      expect(profile.work_style).toBe('flexible');
      expect(profile.location_preferences).toEqual([]);
      expect(profile.languages).toEqual([]);
      expect(profile.work_authorization).toBe('any');
      expect(profile.target_start_date).toBe('flexible');
      expect(profile.roles_selected).toEqual({});
      expect(profile.professional_experience).toBe('entry-level');
    });
  });

  describe('Skill Extraction', () => {
    it('should extract skills from job description', async () => {
      const job = {
        title: 'Frontend Developer',
        company: 'Tech Corp',
        description: 'We are looking for a React developer with JavaScript experience'
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'React, JavaScript, Frontend Development' } }]
      });

      const skills = await (semanticEngine as any).extractSkillsFromJob(job);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: [{ 
          role: 'user', 
          content: expect.stringContaining('Extract the key technical skills')
        }],
        temperature: 0.1,
        max_tokens: 100
      });

      expect(skills).toEqual(['React', 'JavaScript', 'Frontend Development']);
    });
  });

  describe('Industry Inference', () => {
    it('should correctly infer industry from job context', () => {
      const testCases = [
        {
          job: {
            title: 'Software Engineer',
            description: 'Build software applications using coding and programming',
            company: 'Tech Corp'
          },
          expected: 'Technology'
        },
        {
          job: {
            title: 'Data Analyst',
            description: 'Analyze data and create reports',
            company: 'Analytics Inc'
          },
          expected: 'Data & Analytics'
        },
        {
          job: {
            title: 'Product Manager',
            description: 'Lead product strategy and business development',
            company: 'Innovation Ltd'
          },
          expected: 'Product & Business'
        }
      ];

      testCases.forEach(({ job, expected }) => {
        const industry = (semanticEngine as any).inferIndustry(job);
        expect(industry).toBe(expected);
      });
    });
  });

  describe('Company Size Inference', () => {
    it('should correctly infer company size', () => {
      const testCases = [
        { company: 'Startup Inc', expected: 'Startup' },
        { company: 'Big Corp Ltd', expected: 'Medium-Large' },
        { company: 'Agency XYZ', expected: 'Small' },
        { company: 'Microsoft', expected: 'Enterprise' },
        { company: 'Unknown Company', expected: 'Unknown' }
      ];

      testCases.forEach(({ company, expected }) => {
        const size = (semanticEngine as any).inferCompanySize(company);
        expect(size).toBe(expected);
      });
    });
  });

  describe('Role Level Inference', () => {
    it('should correctly infer role level', () => {
      const testCases = [
        {
          title: 'Senior Software Engineer',
          description: 'Lead development team with 5+ years experience',
          expected: 'senior'
        },
        {
          title: 'Mid-level Developer',
          description: '2-5 years of experience required',
          expected: 'mid'
        },
        {
          title: 'Graduate Software Engineer',
          description: 'Entry-level role for recent graduates',
          expected: 'entry'
        },
        {
          title: 'Junior Developer',
          description: '0-2 years experience, perfect for new grads',
          expected: 'entry'
        }
      ];

      testCases.forEach(({ title, description, expected }) => {
        const level = (semanticEngine as any).inferRoleLevel(title, description);
        expect(level).toBe(expected);
      });
    });
  });

  describe('Semantic Matching', () => {
    it('should perform semantic matching between user and jobs', async () => {
      const userPrefs = {
        professional_expertise: 'software development',
        target_cities: ['London']
      };

      const jobs = [
        {
          job_hash: 'job1',
          title: 'Software Engineer',
          company: 'Tech Corp',
          description: 'Build software applications',
          location: 'London'
        },
        {
          job_hash: 'job2',
          title: 'Data Analyst',
          company: 'Analytics Inc',
          description: 'Analyze data and create reports',
          location: 'Dublin'
        }
      ];

      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3] }]
      });

      const matches = await semanticEngine.performSemanticMatching(userPrefs, jobs);

      expect(matches).toHaveLength(2);
      expect(matches[0]).toHaveProperty('job_hash');
      expect(matches[0]).toHaveProperty('semantic_score');
      expect(matches[0]).toHaveProperty('explanation');
    });

    it('should handle errors gracefully', async () => {
      mockOpenAI.embeddings.create.mockRejectedValue(new Error('API Error'));

      const userPrefs = { professional_expertise: 'software' };
      const jobs = [{ job_hash: 'job1', title: 'Developer' }];

      const matches = await semanticEngine.performSemanticMatching(userPrefs, jobs);

      expect(matches).toEqual([]);
    });
  });

  describe('Utility Functions', () => {
    it('should calculate cosine similarity correctly', () => {
      const vecA = [1, 0, 0];
      const vecB = [1, 0, 0];
      const vecC = [0, 1, 0];

      const similarityAB = (semanticEngine as any).cosineSimilarity(vecA, vecB);
      const similarityAC = (semanticEngine as any).cosineSimilarity(vecA, vecC);

      expect(similarityAB).toBe(1); // Identical vectors
      expect(similarityAC).toBe(0); // Perpendicular vectors
    });

    it('should handle vectors of different lengths', () => {
      const vecA = [1, 2, 3];
      const vecB = [1, 2];

      const similarity = (semanticEngine as any).cosineSimilarity(vecA, vecB);

      expect(similarity).toBe(0);
    });
  });
});
