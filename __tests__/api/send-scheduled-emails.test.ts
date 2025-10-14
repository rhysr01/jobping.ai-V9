import { POST, GET } from '@/app/api/send-scheduled-emails/route';
import { NextRequest } from 'next/server';

// Mock dependencies
// Note: emailUtils and jobMatching have been removed/refactored

jest.mock('@/Utils/consolidatedMatching', () => ({
  createConsolidatedMatcher: jest.fn(() => ({
    performMatching: jest.fn(() => Promise.resolve({
      matches: [
        {
          job_hash: 'hash1',
          match_score: 85,
          match_reason: 'Great match for your skills'
        }
      ],
      method: 'ai',
      processingTime: 100,
      cacheHit: false
    })),
    testConnection: jest.fn(() => Promise.resolve(true))
  })),
  generateRobustFallbackMatches: jest.fn(() => [
    {
      job_hash: 'hash2',
      match_score: 75,
      match_reason: 'Fallback match based on location and role',
      confidence_score: 0.7
    }
  ])
}));

jest.mock('@/Utils/email', () => ({
  sendMatchedJobsEmail: jest.fn(() => Promise.resolve())
}));

jest.mock('@/Utils/email/subjectBuilder', () => ({
  buildPersonalizedSubject: jest.fn(() => 'Your Weekly Job Matches')
}));

jest.mock('@/Utils/matching', () => ({
  generateRobustFallbackMatches: jest.fn(() => [])
}));

jest.mock('@/Utils/matching/logging.service', () => ({
  logMatchSession: jest.fn(() => Promise.resolve())
}));

jest.mock('@/Utils/ai-cost-manager', () => ({
  aiCostManager: {
    trackCost: jest.fn(),
    getCosts: jest.fn(() => ({ total: 0 }))
  }
}));

jest.mock('@/Utils/job-queue.service', () => ({
  jobQueue: {
    add: jest.fn(),
    process: jest.fn()
  }
}));

jest.mock('@/Utils/engagementTracker', () => ({
  shouldSendEmailToUser: jest.fn(() => true),
  updateUserEngagement: jest.fn(() => Promise.resolve())
}));

jest.mock('@/Utils/supabase', () => ({
  getSupabaseClient: jest.fn(() => ({
    from: jest.fn((table: string) => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gte: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({
              data: table === 'users' ? [
                {
                  id: 1,
                  email: 'test@example.com',
                  full_name: 'Test User',
                  subscription_active: true,
                  email_verified: true,
                  target_cities: ['London'],
                  roles_selected: ['Software Engineer'],
                  entry_level_preference: 'entry'
                }
              ] : table === 'jobs' ? [
                {
                  id: 1,
                  job_hash: 'hash1',
                  title: 'Software Engineer',
                  company: 'Tech Corp',
                  location: 'London, UK',
                  job_url: 'https://example.com/job1',
                  description: 'Great job...',
                  created_at: new Date().toISOString(),
                  status: 'active',
                  source: 'test'
                }
              ] : [],
              error: null
            }))
          })),
          in: jest.fn(() => Promise.resolve({
            data: [],
            error: null
          }))
        })),
        in: jest.fn(() => Promise.resolve({
          data: [],
          error: null
        }))
      })),
      insert: jest.fn(() => Promise.resolve({ error: null }))
    }))
  }))
}));

// Requires full environment setup (DB, Redis, OpenAI, email service)
// TODO: Set up proper test environment with mocked services
describe.skip('/api/send-scheduled-emails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SCRAPE_API_KEY = 'test-api-key';
    

    
    // Set up mock data
    global.__SB_MOCK__ = {
      users: [
        {
          id: 1,
          email: 'test-api@getjobping.com',
          full_name: 'Test User',
          email_verified: true,
          subscription_active: true,
          created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), // 72 hours ago
          last_email_sent: new Date(Date.now() - 168 * 60 * 60 * 1000).toISOString(), // 7 days ago (eligible for free tier)
          email_count: 2,
          onboarding_complete: true,
          email_phase: 'regular',
          target_cities: 'madrid|barcelona',
          languages_spoken: 'English,Spanish',
          company_types: 'startup,tech',
          roles_selected: 'software engineer,data analyst',
          professional_expertise: 'entry',
          visa_status: 'eu-citizen',
          start_date: new Date().toISOString(),
          work_environment: 'hybrid',
          career_path: 'marketing',
          entry_level_preference: 'entry',
          subscription_tier: 'free'
        }
      ],
      jobs: [
        {
          id: '1',
          title: 'Junior Software Engineer',
          company: 'Test Company',
          location: 'Madrid, Spain',
          job_url: 'https://example.com/job1',
          description: 'Entry-level software engineering position...',
          created_at: new Date().toISOString(),
          job_hash: 'hash1',
          is_sent: false,
          status: 'active',
          freshness_tier: 'fresh',
          original_posted_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          last_seen_at: new Date().toISOString(),
          categories: 'career:tech|early-career|loc:madrid'
        },
        {
          id: '2',
          title: 'Data Analyst',
          company: 'Tech Corp',
          location: 'Barcelona, Spain',
          job_url: 'https://example.com/job2',
          description: 'Data analysis role for recent graduates...',
          created_at: new Date().toISOString(),
          job_hash: 'hash2',
          is_sent: false,
          status: 'active',
          freshness_tier: 'ultra_fresh',
          original_posted_date: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          last_seen_at: new Date().toISOString(),
          categories: 'career:marketing|early-career|loc:barcelona'
        }
      ],
      matches: [],
      match_logs: []
    };
  });

  it('should return 401 for missing API key', async () => {
    const req = new NextRequest('http://localhost:3000/api/send-scheduled-emails', {
      method: 'POST',
      headers: {}
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 401 for invalid API key', async () => {
    const req = new NextRequest('http://localhost:3000/api/send-scheduled-emails', {
      method: 'POST',
      headers: {
        'x-api-key': 'wrong-key'
      }
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 405 for GET method', async () => {
    const req = new NextRequest('http://localhost:3000/api/send-scheduled-emails', {
      method: 'GET'
    });

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(405);
    expect(data.error).toBe('Method not allowed. This endpoint is designed for POST requests only.');
  });

  it('should return success for valid request with API key', async () => {
    const req = new NextRequest('http://localhost:3000/api/send-scheduled-emails', {
      method: 'POST',
      headers: {
        'x-api-key': 'test-api-key'
      }
    });

    const response = await POST(req);
    const data = await response.json();

    console.log('Response data:', data);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Scheduled email delivery completed');
    expect(data.usersProcessed).toBe(1);
    expect(data.emailsSent).toBe(1);
    expect(data.errors).toBe(0);
  });
});
